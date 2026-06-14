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

# ← ALTERADO: Configuração robusta do pool para banco Neon (serverless)
# open=False   → não tenta conectar na inicialização (evita erro se .env ainda não foi carregado)
# min_size=0   → não mantém conexão ociosa aberta (Neon encerra conexões ociosas, isso evita conexões "podres")
# max_size=5   → no máximo 5 conexões simultâneas (suficiente para uso local/acadêmico)
# max_idle=300 → fecha conexão que ficou ociosa por mais de 5 minutos (antes do Neon matar)
# reconnect_timeout=10 → tenta reconectar por até 10 segundos antes de lançar erro
# kwargs       → connect_timeout=10 garante que uma tentativa de conexão falha rápido em vez de travar
pool = ConnectionPool(
    DB_URL,
    min_size=0,
    max_size=10,
    check=ConnectionPool.check_connection,
)

# Abre o pool explicitamente após criar o app, e verifica as conexões existentes
# pool.open()  → cria o pool de forma controlada
# pool.check() → descarta conexões inválidas/ociosas e substitui por conexões novas e saudáveis
with app.app_context():
    pool.open()
    pool.check()


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
    try:
        # Captura o JSON enviado pelo front-end; se vier vazio, usa um dicionário vazio
        dados = request.get_json(silent=True) or {}

        # Extrai os campos de login informados na tela
        matricula = (dados.get('matricula') or '').strip()
        senha = (dados.get('senha') or '').strip()

        # Validação básica antes de consultar o banco
        if not matricula or not senha:
            return jsonify({
                "sucesso": False,
                "mensagem": "Informe matrícula e senha."
            }), 400

        # Consulta a tabela Usuario para verificar se existe um usuário ativo com essas credenciais
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
        return jsonify({
            "sucesso": False,
            "mensagem": "Matrícula ou senha inválida."
        }), 401

    except Exception as e:
        # Retorna erro interno caso ocorra falha no processo de login
        return jsonify({
            "sucesso": False,
            "mensagem": str(e)
        }), 500


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


# ROTA PARA LISTAR TODOS OS USUÁRIOS
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
                        "ativo": r[4],
                    }
                    for r in rows
                ]

                return jsonify({
                    "sucesso": True,
                    "usuarios": usuarios
                }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": str(e)
        }), 500


# ROTA PARA EDITAR UM USUÁRIO EXISTENTE
@app.route('/api/usuarios/<int:id_usuario>', methods=['PUT'])
def editar_usuario(id_usuario):
    dados = request.get_json(silent=True) or {}

    nome = dados.get('nome', '').strip()
    matricula = dados.get('matricula', '').strip()
    senha = dados.get('senha', '').strip()
    perfil = dados.get('perfil', '').strip()
    ativo = dados.get('ativo', 'S').strip().upper()

    if not nome or not matricula or not perfil:
        return jsonify({
            "sucesso": False,
            "mensagem": "Preencha todos os campos obrigatórios."
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Usuario
                    WHERE Login_Matricula = %s
                      AND Id_Usuario != %s;
                """, (matricula, id_usuario))

                if cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Matrícula já cadastrada para outro usuário."
                    }), 409

                if senha:
                    cursor.execute("""
                        UPDATE Usuario
                           SET Nome = %s,
                               Login_Matricula = %s,
                               Senha = %s,
                               Tp_Usuario = %s,
                               Ativo = %s
                         WHERE Id_Usuario = %s;
                    """, (nome, matricula, senha, perfil, ativo, id_usuario))
                else:
                    cursor.execute("""
                        UPDATE Usuario
                           SET Nome = %s,
                               Login_Matricula = %s,
                               Tp_Usuario = %s,
                               Ativo = %s
                         WHERE Id_Usuario = %s;
                    """, (nome, matricula, perfil, ativo, id_usuario))

                if cursor.rowcount == 0:
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Usuário não encontrado."
                    }), 404

                conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Usuário atualizado com sucesso!"
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": str(e)
        }), 500

@app.route('/api/usuarios/<int:id_usuario>', methods=['DELETE'])
def excluir_usuario(id_usuario):
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1 FROM Usuario WHERE Id_Usuario = %s;", (id_usuario,))

                if not cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Usuário não encontrado."
                    }), 404

                cursor.execute(
                    "UPDATE Usuario SET Ativo = 'N' WHERE Id_Usuario = %s;",
                    (id_usuario,)
                )

                conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Usuário inativado com sucesso!"
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": str(e)
        }), 500
    
# ===================== LOCAIS ===================== #

@app.route('/api/locais', methods=['GET'])
def listar_locais():
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT Id_Local, Nome_Local, Sala_Aula
                    FROM Local
                    ORDER BY Nome_Local ASC;
                """)

                rows = cursor.fetchall()

        locais = [
            {
                'id': row[0],
                'nome': row[1],
                'sala_aula': row[2]
            }
            for row in rows
        ]

        return jsonify({
            'sucesso': True,
            'locais': locais
        }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


@app.route('/api/locais', methods=['POST'])
def incluir_local():
    dados = request.get_json(silent=True) or {}

    nome = (dados.get('nome') or '').strip()
    sala_aula = (dados.get('sala_aula') or 'N').strip().upper()

    if sala_aula not in ('S', 'N'):
        sala_aula = 'N'

    if not nome:
        return jsonify({
            'sucesso': False,
            'mensagem': 'Informe o nome do local.'
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Local
                    WHERE UPPER(TRIM(Nome_Local)) = UPPER(TRIM(%s));
                """, (nome,))

                if cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Já existe um local com este nome.'
                    }), 409

                cursor.execute("""
                    INSERT INTO Local (Nome_Local, Sala_Aula)
                    VALUES (%s, %s);
                """, (nome, sala_aula))

                conn.commit()

        return jsonify({
            'sucesso': True,
            'mensagem': 'Local cadastrado com sucesso!'
        }), 201

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


@app.route('/api/locais/<int:id_local>', methods=['PUT'])
def editar_local(id_local):
    dados = request.get_json(silent=True) or {}

    nome = (dados.get('nome') or '').strip()
    sala_aula = (dados.get('sala_aula') or 'N').strip().upper()

    if sala_aula not in ('S', 'N'):
        sala_aula = 'N'

    if not nome:
        return jsonify({
            'sucesso': False,
            'mensagem': 'Informe o nome do local.'
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Local
                    WHERE Id_Local = %s;
                """, (id_local,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Local não encontrado.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Local
                    WHERE UPPER(TRIM(Nome_Local)) = UPPER(TRIM(%s))
                      AND Id_Local <> %s;
                """, (nome, id_local))

                if cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Já existe outro local com este nome.'
                    }), 409

                cursor.execute("""
                    UPDATE Local
                    SET Nome_Local = %s,
                        Sala_Aula = %s
                    WHERE Id_Local = %s;
                """, (nome, sala_aula, id_local))

                conn.commit()

        return jsonify({
            'sucesso': True,
            'mensagem': 'Local atualizado com sucesso!'
        }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


@app.route('/api/locais/<int:id_local>', methods=['DELETE'])
def excluir_local(id_local):
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Local
                    WHERE Id_Local = %s;
                """, (id_local,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Local não encontrado.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Patrimonio
                    WHERE Id_Local = %s
                      AND Situacao_Atual IN ('A', 'M')
                    LIMIT 1;
                """, (id_local,))

                if cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Impossível excluir local vinculado a um patrimônio ativo ou em manutenção.'
                    }), 409

                cursor.execute("""
                    DELETE FROM Local
                    WHERE Id_Local = %s;
                """, (id_local,))

                conn.commit()

        return jsonify({
            'sucesso': True,
            'mensagem': 'Local excluído com sucesso!'
        }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500

# Inicializa a aplicação Flask em modo de desenvolvimento
if __name__ == '__main__':
    app.run(debug=True)
