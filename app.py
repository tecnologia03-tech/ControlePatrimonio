# app.py
# Importa o núcleo do Flask e os recursos usados para receber e devolver dados
from flask import Flask, jsonify, request
# Importa o CORS para permitir comunicação entre front-end e back-end
from flask_cors import CORS
# Importa a biblioteca de conexão com o PostgreSQL
import psycopg
from psycopg_pool import ConnectionPool
# Importa a URL de conexão do banco vinda do arquivo de configuração
from config import DB_URL
# Cria a aplicação principal Flask
app = Flask(__name__)
# Habilita CORS para permitir chamadas da interface web para a API
CORS(app)
# Reduz a necessidade de criar novas conexões a cada requisição, usando um pool de conexões
# ← 2° crie o pool aqui, depois do app e antes das rotas
pool = ConnectionPool(DB_URL, min_size=1, max_size=5)

# Rota criada para testar se a aplicação consegue acessar o banco de dados
@app.route('/api/status')
def status_banco():
    try:
        with pool.connection() as conn:
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
        with pool.connection() as conn:
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
    
# Rota para listar todos os usuários ativos do sistema
@app.route('/api/usuarios', methods=['GET'])
def listar_usuarios():
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT Id_Usuario, Nome, Login_Matricula, Tp_Usuario, Ativo
                    FROM Usuario
                    ORDER BY Nome ASC;
                """)
                rows = cursor.fetchall()
                usuarios = [
                    {
                        "id": r[0],
                        "nome": r[1],
                        "matricula": r[2],
                        "perfil": r[3],
                        "ativo": r[4]
                    }
                    for r in rows
                ]
                return jsonify({"sucesso": True, "usuarios": usuarios}), 200
    except Exception as e:
        return jsonify({"sucesso": False, "mensagem": str(e)}), 500
    
# Inclui um novo usuário no sistema
@app.route('/api/usuarios', methods=['POST'])
def incluir_usuario():
    dados = request.get_json()
    nome = dados.get('nome', '').strip()
    matricula = dados.get('matricula', '').strip()
    senha = dados.get('senha', '').strip()
    perfil = dados.get('perfil', '').strip()

 # Validação básica dos campos obrigatórios
    if not nome or not matricula or not senha or not perfil:
        return jsonify({"sucesso": False, "mensagem": "Todos os campos são obrigatórios."}), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM Usuario WHERE Login_Matricula = %s;", (matricula,)
                )
                if cursor.fetchone():
                    return jsonify({"sucesso": False, "mensagem": "Matrícula já cadastrada."}), 409

                cursor.execute(
                    """INSERT INTO Usuario (Nome, Login_Matricula, Senha, Tp_Usuario, Ativo)
                       VALUES (%s, %s, %s, %s, 'S');""",
                    (nome, matricula, senha, perfil)
                )
                conn.commit()
                return jsonify({"sucesso": True, "mensagem": "Usuário cadastrado com sucesso!"}), 201
    except Exception as e:
        return jsonify({"sucesso": False, "mensagem": str(e)}), 500
    
# Rota para editar um usuário existente
@app.route('/api/usuarios/<int:id>', methods=['PUT'])
def editar_usuario(id):
    dados = request.get_json()
    nome      = dados.get('nome', '').strip()
    matricula = dados.get('matricula', '').strip()
    senha     = dados.get('senha', '').strip()
    perfil    = dados.get('perfil', '').strip()
    ativo     = dados.get('ativo', 'S')

    if not nome or not matricula or not perfil:
        return jsonify({"sucesso": False, "mensagem": "Preencha todos os campos obrigatórios."}), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                # Verifica se a matrícula já pertence a outro usuário
                cursor.execute(
                    "SELECT 1 FROM Usuario WHERE Login_Matricula = %s AND Id_Usuario != %s;",
                    (matricula, id)
                )
                if cursor.fetchone():
                    return jsonify({"sucesso": False, "mensagem": "Matrícula já cadastrada para outro usuário."}), 409

                # Se senha foi informada, atualiza também. Senão, mantém a atual.
                if senha:
                    cursor.execute("""
                        UPDATE Usuario
                        SET Nome = %s, Login_Matricula = %s, Senha = %s, Tp_Usuario = %s, Ativo = %s
                        WHERE Id_Usuario = %s;
                    """, (nome, matricula, senha, perfil, ativo, id))
                else:
                    cursor.execute("""
                        UPDATE Usuario
                        SET Nome = %s, Login_Matricula = %s, Tp_Usuario = %s, Ativo = %s
                        WHERE Id_Usuario = %s;
                    """, (nome, matricula, perfil, ativo, id))

                conn.commit()
                return jsonify({"sucesso": True, "mensagem": "Usuário atualizado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"sucesso": False, "mensagem": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True)