import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, render_template, request, redirect, url_for, jsonify, session

from core import db as dbmod
from core.pipeline import process_file, commit_import

app = Flask(__name__)
app.secret_key = "dev-secret-key-obraapp"

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads_tmp")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# previews vivem em memória (chave = id da sessão de import), simples o suficiente pro protótipo
PENDING_PREVIEWS = {}


@app.route("/")
def index():
    conn = dbmod.get_conn()
    stats = {
        "produtos": conn.execute("SELECT COUNT(*) c FROM produtos").fetchone()["c"],
        "fornecedores": conn.execute("SELECT COUNT(*) c FROM fornecedores").fetchone()["c"],
        "categorias": conn.execute("SELECT COUNT(*) c FROM categorias_produtos").fetchone()["c"],
        "compras": conn.execute("SELECT COUNT(*) c FROM compras").fetchone()["c"],
        "cotacoes": conn.execute("SELECT COUNT(*) c FROM cotacoes").fetchone()["c"],
    }
    imports = conn.execute("SELECT * FROM import_log ORDER BY criado_em DESC LIMIT 20").fetchall()
    return render_template("index.html", stats=stats, imports=imports)


@app.route("/upload", methods=["POST"])
def upload():
    files = request.files.getlist("files")
    conn = dbmod.get_conn()
    batch_id = str(uuid.uuid4())
    previews = []
    errors = []
    for f in files:
        if not f.filename:
            continue
        path = os.path.join(UPLOAD_DIR, f.filename)
        f.save(path)
        try:
            preview = process_file(path, conn)
            previews.append(preview)
        except Exception as e:
            errors.append(f"{f.filename}: {e}")

    PENDING_PREVIEWS[batch_id] = previews
    session["batch_id"] = batch_id
    if errors:
        session["errors"] = errors
    return redirect(url_for("review", batch_id=batch_id))


@app.route("/review/<batch_id>")
def review(batch_id):
    previews = PENDING_PREVIEWS.get(batch_id, [])
    errors = session.pop("errors", [])
    return render_template("review.html", previews=previews, batch_id=batch_id, errors=errors)


@app.route("/commit/<batch_id>", methods=["POST"])
def commit(batch_id):
    previews = PENDING_PREVIEWS.get(batch_id, [])
    conn = dbmod.get_conn()
    decisions_by_doc = request.get_json(force=True) or {}
    for doc_idx, preview in enumerate(previews):
        decisions = decisions_by_doc.get(str(doc_idx), {})
        commit_import(preview, decisions, conn)
    del PENDING_PREVIEWS[batch_id]
    return jsonify({"status": "ok"})


@app.route("/catalogo")
def catalogo():
    conn = dbmod.get_conn()
    produtos = conn.execute("""
        SELECT p.*, c.nome as categoria_nome
        FROM produtos p LEFT JOIN categorias_produtos c ON p.categoria_id = c.id
        ORDER BY c.nome, p.nome
    """).fetchall()
    fornecedores = conn.execute("SELECT * FROM fornecedores ORDER BY nome").fetchall()
    return render_template("catalogo.html", produtos=produtos, fornecedores=fornecedores)


if __name__ == "__main__":
    dbmod.init_db(reset=False)
    app.run(host="0.0.0.0", port=5000, debug=True)
