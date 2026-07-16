"""
Normalização: texto de produto/fornecedor, unidades de medida, e parsing
de metadados de cabeçalho (fornecedor, cnpj, cidade, numero do documento).
"""
import re
import unicodedata


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def normalize_name(name: str) -> str:
    """Chave canônica para matching de produto: sem acento, minúsculo, espaços únicos, sem pontuação solta."""
    s = strip_accents(name or "").lower()
    s = re.sub(r"[^\w\s/.,]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


UNIT_MAP = {
    "pc": "peça",
    "un": "unidade",
    "kg": "quilograma",
    "mt": "metro",
    "m": "metro",
    "m3": "metro cúbico",
    "m²": "metro quadrado",
    "m2": "metro quadrado",
    "sc": "saco",
    "gl": "galão",
    "lt": "litro",
    "br": "barra",
    "par": "par",
    "tb": "tubo/bisnaga",
    "rl": "rolo",
    "bd": "balde",
    "kit": "kit",
    "cx": "caixa",
}


def normalize_unit(raw_unit: str) -> str:
    key = (raw_unit or "").strip().lower()
    return UNIT_MAP.get(key, key or "unidade")


def parse_decimal_br(value) -> float:
    """Converts '1.234,56' or '1234.56' or '1234,56' into float."""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace("R$", "").strip()
    if not s:
        return 0.0
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


CNPJ_RE = re.compile(r"\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}")
CPF_RE = re.compile(r"\d{3}\.\d{3}\.\d{3}-\d{2}")


def extract_header_metadata(header_lines):
    """
    Extracts fornecedor / cnpj / cidade / numero_documento / tipo_documento
    from free-text header lines seen across all sample formats:
      'Fornecedor: X Materiais Ltda'
      'CNPJ: xx.xxx.xxx/0001-xx'
      'Cidade: Y'
      'Pedido: ORC-xxxxx'   -> tipo = pedido
      'Cotacao: COT-xxxxx'  -> tipo = cotacao
      (Ordem de Venda PDFs have a different, richer layout)
    """
    joined = "\n".join(header_lines)
    meta = {
        "fornecedor_nome": None,
        "fornecedor_cnpj": None,
        "cidade": None,
        "numero_documento": None,
        "tipo_documento": None,
        "cliente_nome": None,
        "cliente_endereco": None,
    }

    m = re.search(r"Fornecedor\s*:\s*(.+)", joined, re.IGNORECASE)
    if m:
        meta["fornecedor_nome"] = m.group(1).strip()

    m = CNPJ_RE.search(joined)
    if m:
        meta["fornecedor_cnpj"] = m.group(0)

    m = re.search(r"Cidade\s*:\s*(.+)", joined, re.IGNORECASE)
    if m:
        meta["cidade"] = m.group(1).strip()

    m = re.search(r"Pedido\s*:\s*(\S+)", joined, re.IGNORECASE)
    if m:
        meta["numero_documento"] = m.group(1).strip()
        meta["tipo_documento"] = "pedido"

    m = re.search(r"Cota[cç][aã]o\s*:\s*(\S+)", joined, re.IGNORECASE)
    if m:
        meta["numero_documento"] = m.group(1).strip()
        meta["tipo_documento"] = "cotacao"

    # Ordem de Venda (PDF) layout
    if re.search(r"ORDEM DE VENDA", joined, re.IGNORECASE):
        meta["tipo_documento"] = "ordem_venda"
        mnum = re.search(r"ORDEM DE VENDA\s*:\s*(\d+)", joined, re.IGNORECASE)
        if mnum:
            meta["numero_documento"] = mnum.group(1)
        mloja = re.search(r"Loja\s*:\s*(.+)", joined, re.IGNORECASE)
        if mloja:
            meta["fornecedor_nome"] = mloja.group(1).split("CNPJ")[0].strip()
        mcnpj = re.search(r"CNPJ\.?\s*:\s*([\d./-]+)", joined, re.IGNORECASE)
        if mcnpj:
            meta["fornecedor_cnpj"] = mcnpj.group(1).strip()
        mcli = re.search(r"Cliente\.?\s*:\s*(.+)", joined, re.IGNORECASE)
        if mcli:
            meta["cliente_nome"] = mcli.group(1).strip()
        mend = re.search(r"Endere[cç]o\s*:\s*(.+)", joined, re.IGNORECASE)
        if mend:
            meta["cliente_endereco"] = mend.group(1).strip()

    return meta
