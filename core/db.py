"""
Banco de demonstração (SQLite) espelhando o subset relevante do schema real
(produtos, categorias_produtos, unidades_medida, fornecedores, compras,
cotacoes, itens_cotacao, cotacao_fornecedores, propostas, proposta_itens).

Em produção isso vira o client do Supabase/Postgres real; aqui é local para
o protótipo poder rodar de ponta a ponta sem depender de credenciais.
"""
import sqlite3
import uuid
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "app.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(reset=False):
    if reset and os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    conn = get_conn()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS unidades_medida (
        id TEXT PRIMARY KEY, nome TEXT NOT NULL UNIQUE, descricao TEXT
    );
    CREATE TABLE IF NOT EXISTS categorias_produtos (
        id TEXT PRIMARY KEY, nome TEXT NOT NULL UNIQUE, descricao TEXT
    );
    CREATE TABLE IF NOT EXISTS produtos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        nome_normalizado TEXT NOT NULL,
        unidade TEXT NOT NULL,
        categoria_id TEXT,
        preco_ultimo REAL DEFAULT 0,
        UNIQUE(nome_normalizado, unidade)
    );
    CREATE TABLE IF NOT EXISTS fornecedores (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cnpj TEXT,
        cidade TEXT,
        categoria TEXT
    );
    CREATE TABLE IF NOT EXISTS produto_precos_historico (
        id TEXT PRIMARY KEY,
        produto_id TEXT NOT NULL,
        fornecedor_id TEXT,
        valor REAL NOT NULL,
        documento_origem TEXT,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS compras (
        id TEXT PRIMARY KEY,
        fornecedor_id TEXT,
        produto_id TEXT,
        quantidade REAL,
        valor_unitario REAL,
        valor_total REAL,
        documento_origem TEXT,
        obra_id TEXT
    );
    CREATE TABLE IF NOT EXISTS cotacoes (
        id TEXT PRIMARY KEY,
        descricao TEXT,
        documento_origem TEXT
    );
    CREATE TABLE IF NOT EXISTS itens_cotacao (
        id TEXT PRIMARY KEY,
        cotacao_id TEXT,
        produto_id TEXT,
        quantidade REAL
    );
    CREATE TABLE IF NOT EXISTS cotacao_fornecedores (
        id TEXT PRIMARY KEY,
        cotacao_id TEXT,
        fornecedor_id TEXT
    );
    CREATE TABLE IF NOT EXISTS propostas (
        id TEXT PRIMARY KEY,
        cotacao_id TEXT,
        fornecedor_id TEXT,
        valor REAL
    );
    CREATE TABLE IF NOT EXISTS proposta_itens (
        id TEXT PRIMARY KEY,
        proposta_id TEXT,
        produto_id TEXT,
        quantidade REAL,
        valor_unitario REAL
    );
    CREATE TABLE IF NOT EXISTS import_log (
        id TEXT PRIMARY KEY,
        source_file TEXT,
        tipo_documento TEXT,
        confianca REAL,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()
    conn.close()


def new_id():
    return str(uuid.uuid4())
