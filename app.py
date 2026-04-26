# app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg
from config import DB_URL

app = Flask(__name__)
CORS(app)


# Conexão com o banco usando
@app.route('/api/status')
def status_banco():
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1;")
        return jsonify({"status": "conectado", "banco": "neondb"}), 200
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    dados = request.get_json()
    matricula = dados.get('matricula')
    senha = dados.get('senha')

    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT nome, tp_usuario FROM usuario WHERE login_matricula = %s AND senha = %s AND ativo = 'S';",
                    (matricula, senha)
                )
                usuario = cursor.fetchone()

        if usuario:
            return jsonify({"sucesso": True, "nome": usuario[0], "perfil": usuario[1]}), 200
        else:
            return jsonify({"sucesso": False, "mensagem": "Matrícula ou senha inválida."}), 401

    except Exception as e:
        return jsonify({"sucesso": False, "mensagem": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True)