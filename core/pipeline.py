import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from parsers.unified import parse_any
from core.normalize import extract_header_metadata, normalize_name, normalize_unit, parse_decimal_br
from core.classify import classify_document
from core import matching, db as dbmod


def process_file(path, conn):
    parsed = parse_any(path)
    meta = extract_header_metadata(parsed["raw_header_lines"])
    tipo, confianca = classify_document(meta, parsed["rows"])

    fornecedor_match = None
    if meta.get("fornecedor_nome"):
        fornecedor_match = matching.match_fornecedor(
            conn, meta["fornecedor_nome"], meta.get("fornecedor_cnpj"), meta.get("cidade")
        )

    items_preview = []
    for row in parsed["rows"]:
        nome = str(row.get("nome", "")).strip()
        if not nome:
            continue
        unidade_raw = str(row.get("un", "")).strip()
        unidade = normalize_unit(unidade_raw)
        qtd = parse_decimal_br(row.get("qtd"))
        valor = parse_decimal_br(row.get("valor"))

        produto_match = matching.match_produto(conn, nome, unidade)
        categoria_sugerida = matching.infer_category(nome)

        items_preview.append({
            "nome_original": nome,
            "nome_normalizado": normalize_name(nome),
            "unidade": unidade,
            "codigo_origem": row.get("codigo"),
            "quantidade": qtd,
            "valor": valor,
            "produto_match": produto_match,
            "categoria_sugerida": categoria_sugerida,
        })

    return {
        "source_file": parsed["source_file"],
        "meta": meta,
        "tipo_documento": tipo,
        "confianca_classificacao": confianca,
        "fornecedor_match": fornecedor_match,
        "items": items_preview,
    }


def commit_import(preview, decisions, conn):
    """
    decisions: dict item_index -> 'auto'|'new'|'link:<produto_id>' (override manual)
    Grava fornecedor (se novo/aprovado), produtos, categorias, unidades, preços,
    e a entidade certa (compras ou cotacao/propostas) conforme tipo_documento.
    """
    meta = preview["meta"]
    tipo = preview["tipo_documento"]

    # --- fornecedor ---
    fm = preview["fornecedor_match"]
    fornecedor_id = None
    if fm and fm["match"] and fm["decision"] in ("auto",):
        fornecedor_id = fm["match"]["id"]
    elif meta.get("fornecedor_nome"):
        fornecedor_id = dbmod.new_id()
        conn.execute(
            "INSERT INTO fornecedores (id, nome, cnpj, cidade) VALUES (?, ?, ?, ?)",
            (fornecedor_id, meta["fornecedor_nome"], meta.get("fornecedor_cnpj"), meta.get("cidade")),
        )

    cotacao_id = None
    if tipo == "cotacao":
        cotacao_id = dbmod.new_id()
        conn.execute(
            "INSERT INTO cotacoes (id, descricao, documento_origem) VALUES (?, ?, ?)",
            (cotacao_id, f"Cotação {meta.get('numero_documento')}", preview["source_file"]),
        )
        if fornecedor_id:
            conn.execute(
                "INSERT INTO cotacao_fornecedores (id, cotacao_id, fornecedor_id) VALUES (?, ?, ?)",
                (dbmod.new_id(), cotacao_id, fornecedor_id),
            )
        proposta_id = dbmod.new_id()
        total_valor = sum(i["valor"] * i["quantidade"] for i in preview["items"])
        conn.execute(
            "INSERT INTO propostas (id, cotacao_id, fornecedor_id, valor) VALUES (?, ?, ?, ?)",
            (proposta_id, cotacao_id, fornecedor_id, total_valor),
        )

    local_product_cache = {}  # (nome_normalizado, unidade) -> produto_id, para duplicatas dentro do mesmo documento
    for idx, item in enumerate(preview["items"]):
        decision_override = decisions.get(str(idx)) if decisions else None
        pm = item["produto_match"]
        cache_key = (item["nome_normalizado"], item["unidade"])

        if cache_key in local_product_cache:
            produto_id = local_product_cache[cache_key]
            conn.execute("UPDATE produtos SET preco_ultimo = ? WHERE id = ?", (item["valor"], produto_id))
        elif decision_override and decision_override.startswith("link:"):
            produto_id = decision_override.split(":", 1)[1]
        elif decision_override == "new" or not pm["match"]:
            existing = conn.execute(
                "SELECT id FROM produtos WHERE nome_normalizado = ? AND unidade = ?",
                (item["nome_normalizado"], item["unidade"]),
            ).fetchone()
            if existing:
                produto_id = existing["id"]
                conn.execute("UPDATE produtos SET preco_ultimo = ? WHERE id = ?", (item["valor"], produto_id))
            else:
                produto_id = dbmod.new_id()
                cat_id = matching.get_or_create_categoria(conn, item["categoria_sugerida"])
                matching.get_or_create_unidade(conn, item["unidade"])
                conn.execute(
                    "INSERT INTO produtos (id, nome, nome_normalizado, unidade, categoria_id, preco_ultimo) VALUES (?, ?, ?, ?, ?, ?)",
                    (produto_id, item["nome_original"], item["nome_normalizado"], item["unidade"], cat_id, item["valor"]),
                )
        else:
            produto_id = pm["match"]["id"]
            conn.execute("UPDATE produtos SET preco_ultimo = ? WHERE id = ?", (item["valor"], produto_id))

        local_product_cache[cache_key] = produto_id

        conn.execute(
            "INSERT INTO produto_precos_historico (id, produto_id, fornecedor_id, valor, documento_origem) VALUES (?, ?, ?, ?, ?)",
            (dbmod.new_id(), produto_id, fornecedor_id, item["valor"], preview["source_file"]),
        )

        if tipo == "cotacao":
            conn.execute(
                "INSERT INTO itens_cotacao (id, cotacao_id, produto_id, quantidade) VALUES (?, ?, ?, ?)",
                (dbmod.new_id(), cotacao_id, produto_id, item["quantidade"]),
            )
            conn.execute(
                "INSERT INTO proposta_itens (id, proposta_id, produto_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?, ?)",
                (dbmod.new_id(), proposta_id, produto_id, item["quantidade"], item["valor"]),
            )
        else:  # pedido / ordem_venda / lista_precos -> compras
            conn.execute(
                "INSERT INTO compras (id, fornecedor_id, produto_id, quantidade, valor_unitario, valor_total, documento_origem) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (dbmod.new_id(), fornecedor_id, produto_id, item["quantidade"], item["valor"],
                 item["valor"] * item["quantidade"], preview["source_file"]),
            )

    conn.execute(
        "INSERT INTO import_log (id, source_file, tipo_documento, confianca) VALUES (?, ?, ?, ?)",
        (dbmod.new_id(), preview["source_file"], tipo, preview["confianca_classificacao"]),
    )
    conn.commit()
