# app.py
# Importa o núcleo do Flask e os recursos usados para receber e devolver dados
from flask import Flask, jsonify, request
# Importa o CORS para permitir comunicação entre front-end e back-end
from flask_cors import CORS
# Importa a biblioteca de conexão com o PostgreSQL
import psycopg
# Importa a URL de conexão do banco vinda do arquivo de configuração
from config import DB_URL
# Cria a aplicação principal Flask
app = Flask(__name__)
# Habilita CORS para permitir chamadas da interface web para a API
CORS(app)


# Rota criada para testar se a aplicação consegue acessar o banco de dados
@app.route('/api/status')
def status_banco():
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1;")
        return jsonify({"status": "conectado", "banco": "neondb"}), 200
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 500

# Recebe os dados enviados pelo front-end no formato JSON
@app.route('/api/login', methods=['POST'])
def login():
    dados = request.get_json()
    matricula = dados.get('matricula')
    senha = dados.get('senha')

# Consulta a tabela usuario para verificar se existe um usuário ativo com essas credenciais
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT nome, tp_usuario FROM usuario WHERE login_matricula = %s AND senha = %s AND ativo = 'S';",
                    (matricula, senha)
                )
                usuario = cursor.fetchone()
# Retorna sucesso se encontrar o usuário, erro de login se não encontrar, ou erro interno se a consulta falhar
        if usuario:
            return jsonify({"sucesso": True, "nome": usuario[0], "perfil": usuario[1]}), 200
        else:
            return jsonify({"sucesso": False, "mensagem": "Matrícula ou senha inválida."}), 401

    except Exception as e:
        return jsonify({"sucesso": False, "mensagem": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True)