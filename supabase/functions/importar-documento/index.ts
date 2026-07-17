import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';
import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1';
import mammoth from 'npm:mammoth@1.8.0';
import {
  extractHeaderMetadata, classifyDocument, matchFornecedor, matchProduto,
  inferCategory, normalizeName, normalizeUnit, parseDecimalBR,
  parseCsvText, parseMdOrTxt, tableFromGrid, type Row, type Fornecedor, type Produto,
} from '../_shared/importer.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing auth' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const { storage_path, filename } = await req.json();
    if (!storage_path || typeof storage_path !== 'string') return json({ error: 'storage_path required' }, 400);

    // Download file
    const { data: fileData, error: dlErr } = await supabase.storage.from('documentos').download(storage_path);
    if (dlErr || !fileData) return json({ error: 'Download failed', details: dlErr?.message }, 400);

    // Hash the raw bytes to detect re-imports of the exact same file later (dedup check
    // below + persisted in commitar-importacao). Blob reads are not one-shot in Deno, so
    // calling .arrayBuffer()/.text() again further down for parsing is safe.
    const hashBuf = await crypto.subtle.digest('SHA-256', await fileData.arrayBuffer());
    const arquivo_hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    const ext = (filename || storage_path).toLowerCase().split('.').pop() || '';
    let parsed: { header_lines: string[]; rows: Row[] };

    if (ext === 'csv') {
      parsed = parseCsvText(await fileData.text());
    } else if (ext === 'md' || ext === 'txt') {
      parsed = parseMdOrTxt(await fileData.text());
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buf = new Uint8Array(await fileData.arrayBuffer());
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      parsed = tableFromGrid(grid);
    } else if (ext === 'docx') {
      const buf = await fileData.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
      parsed = parseDocxHtml(html);
    } else if (ext === 'pdf') {
      const buf = new Uint8Array(await fileData.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      parsed = parsePdfText(Array.isArray(text) ? text.join('\n') : text);
    } else {
      return json({ error: `Formato não suportado: .${ext}` }, 400);
    }

    const meta = extractHeaderMetadata(parsed.header_lines);
    const { tipo, confianca } = classifyDocument(meta, parsed.rows);

    // Fetch user's fornecedores + produtos for matching, and check whether this exact
    // file (by content hash) was already imported before, regardless of which obra.
    const [{ data: fornecedores }, { data: produtos }, { data: existingLog }] = await Promise.all([
      supabase.from('fornecedores').select('id, nome, cnpj').eq('user_id', userData.user.id),
      supabase.from('produtos').select('id, nome, unidade').eq('user_id', userData.user.id),
      supabase.from('importacoes_log').select('created_at, obras(nome)')
        .eq('user_id', userData.user.id).eq('arquivo_hash', arquivo_hash).maybeSingle(),
    ]);

    const fornecedor_match = meta.fornecedor_nome || meta.fornecedor_cnpj
      ? matchFornecedor(meta.fornecedor_nome, meta.fornecedor_cnpj, (fornecedores as Fornecedor[]) || [])
      : null;

    const items = parsed.rows.map((row) => {
      const nome = String(row.nome ?? '').trim();
      const unidade = normalizeUnit(String(row.un ?? ''));
      const qtd = parseDecimalBR(row.qtd);
      const valor = parseDecimalBR(row.valor);
      const pm = matchProduto(nome, unidade, (produtos as Produto[]) || []);
      return {
        nome_original: nome,
        nome_normalizado: normalizeName(nome),
        unidade,
        codigo_origem: row.codigo ?? null,
        quantidade: qtd,
        valor,
        produto_match: pm,
        categoria_sugerida: inferCategory(nome),
      };
    }).filter(i => i.nome_original);

    return json({
      source_file: filename || storage_path,
      storage_path,
      arquivo_hash,
      meta,
      tipo_documento: tipo,
      confianca_classificacao: confianca,
      fornecedor_match,
      items,
      duplicado: existingLog
        ? { importado_em: existingLog.created_at, obra_nome: existingLog.obras?.nome ?? null }
        : null,
    });
  } catch (e) {
    console.error('importar-documento error:', e);
    return json({ error: 'Falha ao importar', details: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseDocxHtml(html: string): { header_lines: string[]; rows: Row[] } {
  // Extract tables
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let allRows: Row[] = [];
  let tblMatch;
  while ((tblMatch = tableRegex.exec(html)) !== null) {
    const grid: string[][] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tblMatch[1])) !== null) {
      const cells: string[] = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(stripHtml(cellMatch[1]));
      }
      if (cells.length) grid.push(cells);
    }
    const { rows } = tableFromGrid(grid);
    allRows = allRows.concat(rows);
  }
  // Extract paragraphs as header lines
  const textOnly = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '');
  const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const header_lines: string[] = [];
  let p;
  while ((p = paraRegex.exec(textOnly)) !== null) {
    const t = stripHtml(p[1]).trim();
    if (t) header_lines.push(t);
  }
  return { header_lines, rows: allRows };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

// Matches an "ordem de venda" style item row:
//   ITEM CÓDIGO QTDE UN PRODUTO VAL_UNIT VAL_DESC VAL_LIQ [ENT [OF] [ENC]] PRECO_TOTAL
// No line anchors, matched with /g directly against the raw text instead of a
// per-line state machine: confirmed against real PDFs from this ERP that
// unpdf's extractText({ mergePages: true }) can return the ENTIRE page as one
// single line with zero "\n" characters at all — a line-based approach never
// has more than one "line" to work with in that case, so every row-matching
// attempt failed and the whole document silently produced 0 items. Scanning
// the continuous text with exec()/lastIndex instead works whether or not real
// line breaks are present, and naturally handles rows wrapped across lines too
// (`\s+` matches "\n" the same as a space). The zone between VAL_LIQ and
// PRECO_TOTAL (ENT/OF/ENC) is matched loosely with `.*?` instead of a fixed
// single-letter column, because those trailing columns are often blank or of
// variable width depending on the source ERP. PRODUTO itself is optional
// (guarded by a negative lookahead so it can't swallow the literal "R$" that
// follows) for layouts where nothing sits between UN and the first "R$".
const PDF_ITEM_RE = /(\d+)\s+(\S+)\s+([\d.,]+)\s+([A-Z][A-Z0-9]{0,3})\s+(?:(?!R\$)(.+?)\s+)?R\$\s*[\d.,]+\s+R\$\s*[\d.,]+\s+R\$\s*([\d.,]+)\s+.*?R\$\s*[\d.,]+/g;

function parsePdfText(text: string): { header_lines: string[]; rows: Row[] } {
  const header_lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const rows: Row[] = [];
  PDF_ITEM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PDF_ITEM_RE.exec(text)) !== null) {
    const [, , codigo, qtd, un, nome, valLiq] = m;
    rows.push({ codigo, nome: (nome || '').trim() || '(produto)', un, qtd, valor: valLiq });
  }

  if (rows.length === 0) {
    // Log the raw extracted text so a real failure can be root-caused from
    // Supabase logs instead of guessed at.
    console.error("parsePdfText: 0 rows extracted, raw text follows:\n" + text.slice(0, 4000));
  }

  return { header_lines, rows };
}
