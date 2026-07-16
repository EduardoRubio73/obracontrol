"""
Motor de matching: decide se um item/fornecedor extraído corresponde a algo
que já existe na base, ou se deve ser criado como novo.

Regras de confiança:
- Fornecedor por CNPJ exato          -> 1.0 (match certo)
- Fornecedor por nome+cidade fuzzy   -> score da similaridade (0-1)
- Produto por nome_normalizado+unidade exato -> 1.0
- Produto por nome fuzzy (mesma unidade)     -> score da similaridade

Limiares (ajustáveis):
  >= 0.90  -> auto-associa
  0.60-0.90 -> fila de revisão humana
  <  0.60  -> tratado como novo registro
"""
from rapidfuzz import fuzz

from .normalize import normalize_name
from . import db as dbmod

AUTO_THRESHOLD = 0.90
REVIEW_THRESHOLD = 0.60


GENERIC_SUPPLIER_WORDS = {"materiais", "comercial", "ltda", "ltda.", "me", "eireli", "sa", "s/a", "construcao", "construção", "para"}


def _distinctive_name(nome):
    """Remove palavras genéricas de razão social antes do fuzzy match, para não
    confundir 'Beta Materiais Ltda' com 'Delta Materiais Ltda' só pelo sufixo comum."""
    tokens = [t for t in normalize_name(nome or "").split() if t not in GENERIC_SUPPLIER_WORDS]
    return " ".join(tokens) if tokens else normalize_name(nome or "")


def match_fornecedor(conn, nome, cnpj, cidade):
    # CNPJ é identificador forte: quando o documento traz CNPJ, ele é a única
    # fonte de verdade. Não caímos para fuzzy match nesse caso (evita colidir
    # "Beta Materiais Ltda" com "Delta Materiais Ltda" por sufixo genérico igual).
    if cnpj:
        row = conn.execute("SELECT * FROM fornecedores WHERE cnpj = ?", (cnpj,)).fetchone()
        if row:
            return {"match": dict(row), "score": 1.0, "decision": "auto"}
        return {"match": None, "score": 0.0, "decision": "new"}

    # Sem CNPJ no documento: fuzzy match pelo nome "distintivo" (sem boilerplate) + cidade
    best = None
    best_score = 0.0
    nome_dist = _distinctive_name(nome)
    for row in conn.execute("SELECT * FROM fornecedores").fetchall():
        if row["cnpj"]:
            continue  # não cruza fornecedor com CNPJ conhecido contra um sem CNPJ no documento
        score = fuzz.token_sort_ratio(nome_dist, _distinctive_name(row["nome"] or "")) / 100.0
        if cidade and row["cidade"] and normalize_name(cidade) == normalize_name(row["cidade"]):
            score = min(1.0, score + 0.1)
        if score > best_score:
            best_score = score
            best = dict(row)

    if best_score >= AUTO_THRESHOLD:
        return {"match": best, "score": best_score, "decision": "auto"}
    if best_score >= REVIEW_THRESHOLD:
        return {"match": best, "score": best_score, "decision": "review"}
    return {"match": None, "score": best_score, "decision": "new"}


def match_produto(conn, nome, unidade):
    norm = normalize_name(nome)
    exact = conn.execute(
        "SELECT * FROM produtos WHERE nome_normalizado = ? AND unidade = ?", (norm, unidade)
    ).fetchone()
    if exact:
        return {"match": dict(exact), "score": 1.0, "decision": "auto"}

    best = None
    best_score = 0.0
    for row in conn.execute("SELECT * FROM produtos WHERE unidade = ?", (unidade,)).fetchall():
        score = fuzz.token_sort_ratio(norm, row["nome_normalizado"]) / 100.0
        if score > best_score:
            best_score = score
            best = dict(row)

    if best_score >= AUTO_THRESHOLD:
        return {"match": best, "score": best_score, "decision": "auto"}
    if best_score >= REVIEW_THRESHOLD:
        return {"match": best, "score": best_score, "decision": "review"}
    return {"match": None, "score": best_score, "decision": "new"}


CATEGORY_KEYWORDS = {
    "Hidráulica": ["tubo", "joelho", "registro", "cano", "esgoto", "pvc", "mangueira", "tê soldável", "adaptador", "sifonada", "eletroduto", "conduite", "conduíte"],
    "Elétrica": ["cabo", "disjuntor", "tomada", "fio", "caixa luz", "filtro de linha"],
    "Cimentício/Agregados": ["cimento", "areia", "brita", "argamassa", "pedra", "rejunte", "concreto"],
    "Madeira": ["tábua", "tabua", "sarrafo", "pontalete", "madeirite", "maderit", "compensado"],
    "Ferragens": ["prego", "arame", "dobradiça", "cadeado", "parafuso", "bucha", "corrente"],
    "EPI/Segurança": ["capacete", "luva", "óculos", "oculos", "bota", "epi"],
    "Ferramentas": ["pá", "pa vanga", "enxada", "martelo", "trena", "carrinho de mão", "nível", "cavadeira", "vassourão"],
    "Acabamento/Pintura": ["tinta", "glasu", "silicone", "vedante", "selador", "lixa", "fita crepe", "impermeabilizante", "verniz"],
    "Alvenaria": ["bloco cerâmico", "telha", "canaleta", "tapume"],
}


def infer_category(nome):
    n = normalize_name(nome)
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if normalize_name(kw) in n:
                return cat
    return "Diversos"


def get_or_create_categoria(conn, nome):
    row = conn.execute("SELECT id FROM categorias_produtos WHERE nome = ?", (nome,)).fetchone()
    if row:
        return row["id"]
    cid = dbmod.new_id()
    conn.execute("INSERT INTO categorias_produtos (id, nome) VALUES (?, ?)", (cid, nome))
    return cid


def get_or_create_unidade(conn, nome_unidade):
    row = conn.execute("SELECT id FROM unidades_medida WHERE nome = ?", (nome_unidade,)).fetchone()
    if row:
        return row["id"]
    uid = dbmod.new_id()
    conn.execute("INSERT INTO unidades_medida (id, nome) VALUES (?, ?)", (uid, nome_unidade))
    return uid
