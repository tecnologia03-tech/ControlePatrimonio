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
# ← crie o pool aqui, depois do app e antes das rotas
pool = ConnectionPool(DB_URL, min_size=1, max_size=5)


# Rota criada para testar se a aplicação consegue acessar o banco de dados
@app.route('/api/status')
def status_banco():
    try:
        # Abre uma conexão com o banco usando o pool
        with pool.connection() as conn:
            # Cria um cursor para executar comandos SQL
            with conn.cursor() as cursor:
                # Executa um comando simples apenas para validar a conexão
                cursor.execute("SELECT 1;")

        # Retorna sucesso se a conexão com o banco estiver funcionando
        return jsonify({"status": "conectado", "banco": "neondb"}), 200

    except Exception as e:
        # Retorna erro caso ocorra qualquer falha de conexão
        return jsonify({"status": "erro", "mensagem": str(e)}), 500


# Recebe os dados enviados pelo front-end no formato JSON para autenticar o usuário
@app.route('/api/login', methods=['POST'])
def login():
    # Captura o JSON enviado pelo front-end
    dados = request.get_json()

    # Extrai os campos de login informados na tela
    matricula = dados.get('matricula')
    senha = dados.get('senha')

    # Consulta a tabela Usuario para verificar se existe um usuário ativo com essas credenciais
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT Nome, Tp_Usuario
                    FROM Usuario
                    WHERE Login_Matricula = %s
                      AND Senha = %s
                      AND Ativo = 'S';
                    """,
                    (matricula, senha)
                )

                # Busca o primeiro usuário encontrado
                usuario = cursor.fetchone()

        # Retorna sucesso se encontrar o usuário
        if usuario:
            return jsonify({
                "sucesso": True,
                "nome": usuario[0],
                "perfil": usuario[1]
            }), 200

        # Retorna erro de autenticação se não encontrar o usuário
        else:
            return jsonify({
                "sucesso": False,
                "mensagem": "Matrícula ou senha inválida."
            }), 401

    except Exception as e:
        # Retorna erro interno caso ocorra falha no processo de login
        return jsonify({"sucesso": False, "mensagem": str(e)}), 500


# Rota para listar todos os usuários cadastrados no sistema
@app.route('/api/usuarios', methods=['GET'])
def listar_usuarios():
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                # Consulta os principais dados dos usuários para exibição em tabela
                cursor.execute("""
                    SELECT Id_Usuario, Nome, Login_Matricula, Tp_Usuario, Ativo
                    FROM Usuario
                    ORDER BY Nome ASC;
                """)

                # Recupera todas as linhas retornadas pela consulta
                rows = cursor.fetchall()

        # Converte o resultado da consulta em uma lista de dicionários
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

        # Retorna a lista de usuários em formato JSON
        return jsonify({"sucesso": True, "usuarios": usuarios}), 200

    except Exception as e:
        # Retorna erro se houver falha ao consultar os usuários
        return jsonify({"sucesso": False, "mensagem": str(e)}), 500


# Inclui um novo usuário no sistema
@app.route('/api/usuarios', methods=['POST'])
def incluir_usuario():
    # Recebe os dados enviados pelo front-end
    dados = request.get_json()

    # Captura e limpa os campos recebidos
    nome = dados.get('nome', '').strip()
    matricula = dados.get('matricula', '').strip()
    senha = dados.get('senha', '').strip()
    perfil = dados.get('perfil', '').strip()

    # Validação básica dos campos obrigatórios
    if not nome or not matricula or not senha or not perfil:
        return jsonify({
            "sucesso": False,
            "mensagem": "Todos os campos são obrigatórios."
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                # Verifica se já existe usuário com a mesma matrícula
                cursor.execute(
                    "SELECT 1 FROM Usuario WHERE Login_Matricula = %s;",
                    (matricula,)
                )

                # Se encontrar, impede o cadastro duplicado
                if cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Matrícula já cadastrada."
                    }), 409

                # Insere o novo usuário com status ativo por padrão
                cursor.execute("""
                    INSERT INTO Usuario (Nome, Login_Matricula, Senha, Tp_Usuario, Ativo)
                    VALUES (%s, %s, %s, %s, 'S');
                """, (nome, matricula, senha, perfil))

            # Confirma a transação no banco
            conn.commit()

        # Retorna sucesso após cadastrar o usuário
        return jsonify({
            "sucesso": True,
            "mensagem": "Usuário cadastrado com sucesso!"
        }), 201

    except Exception as e:
        # Retorna erro se houver falha na inclusão
        return jsonify({"sucesso": False, "mensagem": str(e)}), 500


# Rota para editar um usuário existente
@app.route('/api/usuarios/<int:id>', methods=['PUT'])
def editar_usuario(id):
    # Recebe os dados enviados pelo front-end
    dados = request.get_json()

    # Captura e limpa os campos enviados
    nome = dados.get('nome', '').strip()
    matricula = dados.get('matricula', '').strip()
    senha = dados.get('senha', '').strip()
    perfil = dados.get('perfil', '').strip()
    ativo = dados.get('ativo', 'S')

    # Valida os campos obrigatórios da edição
    if not nome or not matricula or not perfil:
        return jsonify({
            "sucesso": False,
            "mensagem": "Preencha todos os campos obrigatórios."
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                # Verifica se a matrícula informada já pertence a outro usuário
                cursor.execute(
                    """
                    SELECT 1
                    FROM Usuario
                    WHERE Login_Matricula = %s
                      AND Id_Usuario != %s;
                    """,
                    (matricula, id)
                )

                # Se encontrar, bloqueia a atualização duplicada
                if cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Matrícula já cadastrada para outro usuário."
                    }), 409

                # Se a senha foi informada, atualiza também a senha
                if senha:
                    cursor.execute("""
                        UPDATE Usuario
                        SET Nome = %s,
                            Login_Matricula = %s,
                            Senha = %s,
                            Tp_Usuario = %s,
                            Ativo = %s
                        WHERE Id_Usuario = %s;
                    """, (nome, matricula, senha, perfil, ativo, id))

                # Se a senha não foi informada, mantém a senha atual
                else:
                    cursor.execute("""
                        UPDATE Usuario
                        SET Nome = %s,
                            Login_Matricula = %s,
                            Tp_Usuario = %s,
                            Ativo = %s
                        WHERE Id_Usuario = %s;
                    """, (nome, matricula, perfil, ativo, id))

            # Confirma a alteração no banco
            conn.commit()

        # Retorna sucesso após atualizar o usuário
        return jsonify({
            "sucesso": True,
            "mensagem": "Usuário atualizado com sucesso!"
        }), 200

    except Exception as e:
        # Retorna erro se houver falha no processo de edição
        return jsonify({"sucesso": False, "mensagem": str(e)}), 500


# Rota para inativar um usuário do sistema
@app.route('/api/usuarios/<int:id>', methods=['DELETE'])
def excluir_usuario(id):
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                # Verifica se o usuário realmente existe antes de inativar
                cursor.execute("SELECT 1 FROM Usuario WHERE Id_Usuario = %s;", (id,))

                # Se não existir, retorna erro 404
                if not cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Usuário não encontrado."
                    }), 404

                # Em vez de excluir fisicamente, apenas marca como inativo
                cursor.execute(
                    "UPDATE Usuario SET Ativo = 'N' WHERE Id_Usuario = %s;",
                    (id,)
                )

            # Confirma a alteração no banco
            conn.commit()

        # Retorna sucesso após inativar o usuário
        return jsonify({
            "sucesso": True,
            "mensagem": "Usuário inativado com sucesso!"
        }), 200

    except Exception as e:
        return jsonify({"sucesso": False, "mensagem": str(e)}), 500


# Inicializa a aplicação Flask em modo de desenvolvimento
if __name__ == '__main__':
    app.run(debug=True)