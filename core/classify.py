"""
Classificação do documento — regras determinísticas primeiro (baratas e
precisas nos sinais observados), com um gancho para fallback de IA quando
nenhuma regra bater.
"""

TIPOS = {
    "pedido": "Pedido de compra direta (fornecedor -> nós)",
    "cotacao": "Cotação recebida de fornecedor (proposta)",
    "ordem_venda": "Ordem de venda / nota do fornecedor para um cliente final",
    "lista_precos": "Lista de preços / catálogo sem cliente associado",
    "desconhecido": "Não foi possível classificar com confiança — revisão manual",
}


def classify_document(meta, rows):
    """meta vem de normalize.extract_header_metadata; rows são os itens extraídos."""
    tipo = meta.get("tipo_documento")
    if tipo in ("pedido", "cotacao", "ordem_venda"):
        return tipo, 0.95  # regra explícita encontrada no texto

    if meta.get("cliente_nome") and rows:
        return "ordem_venda", 0.6

    if meta.get("fornecedor_nome") and not meta.get("cliente_nome") and rows:
        return "lista_precos", 0.5

    return "desconhecido", 0.0
