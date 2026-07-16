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

    // Fetch user's fornecedores + produtos for matching
    const [{ data: fornecedores }, { data: produtos }] = await Promise.all([
      supabase.from('fornecedores').select('id, nome, cnpj').eq('user_id', userData.user.id),
      supabase.from('produtos').select('id, nome, unidade').eq('user_id', userData.user.id),
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
      meta,
      tipo_documento: tipo,
      confianca_classificacao: confianca,
      fornecedor_match,
      items,
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
// The zone between VAL_LIQ and PRECO_TOTAL (ENT/OF/ENC) is matched loosely with `.*?`
// instead of a fixed single-letter column, because those trailing columns are often
// blank or of variable width depending on the source ERP — a rigid single-token match
// silently drops every row on documents where they aren't exactly one blank letter.
const PDF_ITEM_RE = /^(\d+)\s+(\S+)\s+([\d.,]+)\s+([A-Z][A-Z0-9]{0,3})\s+(.+?)\s+R\$\s*[\d.,]+\s+R\$\s*[\d.,]+\s+R\$\s*([\d.,]+)\s+.*?R\$\s*[\d.,]+\s*$/;
// Detects the start of an item row (item, código, qtde, un) without requiring the
// R$ columns on the same physical line — used to re-join rows that pdf.js splits
// across two extracted lines when the product name pushes the row past a wrap point.
const PDF_ROW_START_RE = /^(\d+)\s+(\S+)\s+([\d.,]+)\s+([A-Z][A-Z0-9]{0,3})\s+/;

function parsePdfText(text: string): { header_lines: string[]; rows: Row[] } {
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const STOP = ["Vendedor", "FORMA", "ENTREGA", "OBSERVA", "Total", "Usuário",
    "ITEM CÓDIGO", "ORDEM DE VENDA", "NÃO É", "SITUAÇÃO", "Loja:", "End.:",
    "Cliente", "Endereço", "Cidade", "CNPJ", "liberação"];

  // Re-join a row-start line with no "R$" on it to the following line(s) until one
  // containing "R$" appears, so a wrapped row is evaluated as a single logical line.
  const lines: string[] = [];
  let buf = "";
  for (const line of rawLines) {
    if (buf) {
      buf += " " + line;
      if (/R\$/.test(line)) { lines.push(buf); buf = ""; }
      continue;
    }
    if (PDF_ROW_START_RE.test(line) && !/R\$/.test(line)) { buf = line; continue; }
    lines.push(line);
  }
  if (buf) lines.push(buf);

  const header_lines: string[] = [];
  const rows: Row[] = [];
  let nameBuf: string[] = [];
  for (const line of lines) {
    const m = line.match(PDF_ITEM_RE);
    if (m) {
      const [, , codigo, qtd, un, nome, valLiq] = m;
      const parts = [...nameBuf, ...(nome ? [nome.trim()] : [])].filter(Boolean);
      rows.push({
        codigo, nome: parts.join(' ').trim() || '(produto)',
        un, qtd, valor: valLiq,
      });
      nameBuf = [];
    } else if (STOP.some(s => line.startsWith(s))) {
      header_lines.push(line);
      nameBuf = [];
    } else {
      nameBuf.push(line);
    }
  }

  if (rows.length === 0) {
    // No file-system/log access to the failing PDF was available while diagnosing this —
    // log the raw extracted text so a real failure can be root-caused from Supabase logs
    // instead of guessed at again.
    console.error("parsePdfText: 0 rows extracted, raw text follows:\n" + text.slice(0, 4000));
  }

  return { header_lines, rows };
}
