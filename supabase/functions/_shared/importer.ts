// Shared logic ported from core/normalize.py, core/classify.py, core/matching.py

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeName(name: string): string {
  const s = stripAccents(name || "").toLowerCase();
  return s.replace(/[^\w\s/.,]/g, " ").replace(/\s+/g, " ").trim();
}

const UNIT_MAP: Record<string, string> = {
  pc: "peça", un: "unidade", kg: "quilograma", mt: "metro", m: "metro",
  m3: "metro cúbico", "m²": "metro quadrado", m2: "metro quadrado",
  sc: "saco", gl: "galão", lt: "litro", l: "litro", br: "barra", par: "par",
  tb: "tubo", rl: "rolo", bd: "balde", kit: "kit", cx: "caixa", pct: "pacote",
};

export function normalizeUnit(raw: string): string {
  const key = (raw || "").trim().toLowerCase();
  return UNIT_MAP[key] || key || "unidade";
}

export function parseDecimalBR(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  let s = String(value).trim().replace(/R\$/gi, "").trim();
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

const CNPJ_RE = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;

export interface HeaderMeta {
  fornecedor_nome: string | null;
  fornecedor_cnpj: string | null;
  cidade: string | null;
  numero_documento: string | null;
  tipo_documento: string | null;
  cliente_nome: string | null;
}

export function extractHeaderMetadata(lines: string[]): HeaderMeta {
  const joined = lines.join("\n");
  const meta: HeaderMeta = {
    fornecedor_nome: null, fornecedor_cnpj: null, cidade: null,
    numero_documento: null, tipo_documento: null, cliente_nome: null,
  };
  let m: RegExpMatchArray | null;
  if ((m = joined.match(/Fornecedor\s*:\s*(.+)/i))) meta.fornecedor_nome = m[1].trim();
  if ((m = joined.match(CNPJ_RE))) meta.fornecedor_cnpj = m[0];
  if ((m = joined.match(/Cidade\s*:\s*(.+)/i))) meta.cidade = m[1].trim();
  if ((m = joined.match(/Pedido\s*:\s*(\S+)/i))) { meta.numero_documento = m[1].trim(); meta.tipo_documento = "pedido"; }
  if ((m = joined.match(/Cota[cç][aã]o\s*:\s*(\S+)/i))) { meta.numero_documento = m[1].trim(); meta.tipo_documento = "cotacao"; }
  if (/ORDEM DE VENDA/i.test(joined)) {
    meta.tipo_documento = "ordem_venda";
    if ((m = joined.match(/ORDEM DE VENDA\s*:\s*(\d+)/i))) meta.numero_documento = m[1];
    if ((m = joined.match(/Loja\s*:\s*(.+)/i))) meta.fornecedor_nome = m[1].split(/CNPJ/i)[0].trim();
    if ((m = joined.match(/Cliente\.?\s*:\s*(.+)/i))) meta.cliente_nome = m[1].trim();
  }
  return meta;
}

export function classifyDocument(meta: HeaderMeta, rows: unknown[]): { tipo: string; confianca: number } {
  const t = meta.tipo_documento;
  if (t === "pedido" || t === "cotacao" || t === "ordem_venda") return { tipo: t, confianca: 0.95 };
  if (meta.cliente_nome && rows.length) return { tipo: "ordem_venda", confianca: 0.6 };
  if (meta.fornecedor_nome && !meta.cliente_nome && rows.length) return { tipo: "lista_precos", confianca: 0.5 };
  return { tipo: "desconhecido", confianca: 0 };
}

// Simple Levenshtein-based token sort ratio
function levenshtein(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[n];
}

export function tokenSortRatio(a: string, b: string): number {
  const sa = a.split(/\s+/).filter(Boolean).sort().join(" ");
  const sb = b.split(/\s+/).filter(Boolean).sort().join(" ");
  if (!sa && !sb) return 1;
  if (!sa || !sb) return 0;
  const d = levenshtein(sa, sb);
  return 1 - d / Math.max(sa.length, sb.length);
}

export const AUTO_THRESHOLD = 0.90;
export const REVIEW_THRESHOLD = 0.60;

const GENERIC = new Set(["materiais", "comercial", "ltda", "ltda.", "me", "eireli", "sa", "s/a", "construcao", "construção", "para"]);

function distinctive(name: string): string {
  const tokens = normalizeName(name || "").split(" ").filter(t => t && !GENERIC.has(t));
  return tokens.length ? tokens.join(" ") : normalizeName(name || "");
}

export interface Fornecedor { id: string; nome: string; cnpj?: string | null; }
export interface Produto { id: string; nome: string; unidade?: string | null; }

export function matchFornecedor(nome: string | null | undefined, cnpj: string | null | undefined, fornecedores: Fornecedor[]) {
  if (cnpj) {
    const byCnpj = fornecedores.find(f => f.cnpj === cnpj);
    if (byCnpj) return { match: byCnpj, score: 1.0, decision: "auto" as const };
    return { match: null, score: 0, decision: "new" as const };
  }
  if (!nome) return { match: null, score: 0, decision: "new" as const };
  const nomeD = distinctive(nome);
  let best: Fornecedor | null = null, bestScore = 0;
  for (const f of fornecedores) {
    if (f.cnpj) continue;
    const score = tokenSortRatio(nomeD, distinctive(f.nome));
    if (score > bestScore) { bestScore = score; best = f; }
  }
  if (bestScore >= AUTO_THRESHOLD) return { match: best, score: bestScore, decision: "auto" as const };
  if (bestScore >= REVIEW_THRESHOLD) return { match: best, score: bestScore, decision: "review" as const };
  return { match: null, score: bestScore, decision: "new" as const };
}

export function matchProduto(nome: string, unidade: string, produtos: Produto[]) {
  const norm = normalizeName(nome);
  // Exact same normalized name + unit
  const exact = produtos.find(p => normalizeName(p.nome) === norm && (p.unidade || "") === unidade);
  if (exact) return { match: exact, score: 1.0, decision: "auto" as const };
  let best: Produto | null = null, bestScore = 0;
  for (const p of produtos) {
    if ((p.unidade || "") !== unidade) continue;
    const score = tokenSortRatio(norm, normalizeName(p.nome));
    if (score > bestScore) { bestScore = score; best = p; }
  }
  if (bestScore >= AUTO_THRESHOLD) return { match: best, score: bestScore, decision: "auto" as const };
  if (bestScore >= REVIEW_THRESHOLD) return { match: best, score: bestScore, decision: "review" as const };
  return { match: null, score: bestScore, decision: "new" as const };
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Hidráulica": ["tubo", "joelho", "registro", "cano", "esgoto", "pvc", "mangueira", "adaptador", "sifonada", "eletroduto", "conduite"],
  "Elétrica": ["cabo", "disjuntor", "tomada", "fio", "caixa luz", "filtro de linha"],
  "Cimentício/Agregados": ["cimento", "areia", "brita", "argamassa", "pedra", "rejunte", "concreto"],
  "Madeira": ["tábua", "tabua", "sarrafo", "pontalete", "madeirite", "compensado"],
  "Ferragens": ["prego", "arame", "dobradiça", "cadeado", "parafuso", "bucha", "corrente"],
  "EPI/Segurança": ["capacete", "luva", "óculos", "oculos", "bota", "epi"],
  "Ferramentas": ["pá", "enxada", "martelo", "trena", "carrinho", "nível", "cavadeira"],
  "Acabamento/Pintura": ["tinta", "silicone", "vedante", "selador", "lixa", "fita crepe", "impermeabilizante", "verniz"],
  "Alvenaria": ["bloco cerâmico", "telha", "canaleta", "tapume"],
};

export function inferCategory(nome: string): string {
  const n = normalizeName(nome);
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of kws) if (n.includes(normalizeName(kw))) return cat;
  }
  return "Diversos";
}

// ---- Parsers ----

const COLUMN_ALIASES: Record<string, Set<string>> = {
  codigo: new Set(["codigo", "código", "cod"]),
  nome: new Set(["produto", "descricao", "descrição", "nome", "item"]),
  un: new Set(["un", "unidade", "und"]),
  qtd: new Set(["qtd", "qtde", "quantidade"]),
  valor: new Set(["valor", "preco", "preço", "val liq", "val unit", "valor unitario", "valor unitário", "valor unit."]),
};

function normalizeCol(col: string): string | null {
  const c = (col || "").trim().toLowerCase();
  for (const [canon, aliases] of Object.entries(COLUMN_ALIASES)) if (aliases.has(c)) return canon;
  return null;
}

export interface Row { codigo?: string; nome?: string; un?: string; qtd?: string | number; valor?: string | number; }

export function tableFromGrid(grid: unknown[][]): { header_lines: string[]; rows: Row[] } {
  let headerIdx = -1;
  let colMap: Record<string, number> = {};
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];
    const mapped: Record<number, string | null> = {};
    row.forEach((c, j) => mapped[j] = normalizeCol(String(c ?? "")));
    const hits = Object.values(mapped).filter(Boolean).length;
    if (hits >= 3) {
      headerIdx = i;
      colMap = {};
      for (const [j, v] of Object.entries(mapped)) if (v) colMap[v] = parseInt(j);
      break;
    }
  }
  if (headerIdx < 0) return { header_lines: [], rows: [] };
  const header_lines = grid.slice(0, headerIdx)
    .map(r => r.filter(Boolean).map(String).join(" ").trim())
    .filter(Boolean);
  const rows: Row[] = [];
  for (const r of grid.slice(headerIdx + 1)) {
    if (!r.some(c => c !== null && c !== undefined && String(c).trim())) continue;
    const entry: Row = {};
    for (const [canon, j] of Object.entries(colMap)) {
      if (j < r.length) (entry as any)[canon] = r[j];
    }
    if (entry.nome && String(entry.nome).trim()) rows.push(entry);
  }
  return { header_lines, rows };
}

export function parseCsvText(text: string): { header_lines: string[]; rows: Row[] } {
  const lines = text.split(/\r?\n/);
  const sample = lines.slice(0, 20).join("\n");
  const delim = (sample.match(/;/g)?.length ?? 0) > (sample.match(/,/g)?.length ?? 0) ? ";" : ",";
  let tableStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(delim);
    if (parts.length >= 2 && parts.some(p => normalizeCol(p))) { tableStart = i; break; }
  }
  const header_lines = tableStart > 0 ? lines.slice(0, tableStart).map(l => l.trim()).filter(Boolean) : [];
  const tableLines = tableStart >= 0 ? lines.slice(tableStart) : lines;
  // Simple CSV split (no quoted-comma support beyond basics)
  const grid = tableLines.map(l => parseCsvLine(l, delim));
  const { rows } = tableFromGrid(grid);
  return { header_lines, rows };
}

function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === delim && !inQ) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseMdOrTxt(text: string): { header_lines: string[]; rows: Row[] } {
  const lines = text.split(/\r?\n/);
  const pipeIdx = lines.findIndex(l => l.includes("|"));
  if (pipeIdx >= 0) {
    const header_lines = lines.slice(0, pipeIdx).map(l => l.trim()).filter(Boolean);
    const grid: string[][] = [];
    for (const l of lines.slice(pipeIdx)) {
      if (!l.trim()) continue;
      if (/^\s*\|?[\s:|-]+\|?\s*$/.test(l)) continue;
      grid.push(l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim()));
    }
    const { rows } = tableFromGrid(grid);
    return { header_lines, rows };
  }
  const tabIdx = lines.findIndex(l => l.includes("\t"));
  if (tabIdx >= 0) {
    const header_lines = lines.slice(0, tabIdx).map(l => l.trim()).filter(Boolean);
    const grid = lines.slice(tabIdx).filter(l => l.trim()).map(l => l.split("\t"));
    const { rows } = tableFromGrid(grid);
    return { header_lines, rows };
  }
  return { header_lines: lines.map(l => l.trim()).filter(Boolean), rows: [] };
}
