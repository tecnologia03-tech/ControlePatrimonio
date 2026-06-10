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
    dados = request.get_json()

    nome = dados.get('nome', '').strip()
    matricula = dados.get('matricula', '').strip()
    senha = dados.get('senha', '').strip()
    perfil = dados.get('perfil', '').strip()
    ativo = dados.get('ativo', 'S')

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


# ROTA PARA INATIVAR UM USUÁRIO
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
    
# Rota para listar todos os setores cadastrados
# Observação: no banco a tabela continua se chamando Local,
# mas na API usamos o nome de negócio "setores"
@app.route('/api/setores', methods=['GET'])
def listar_locais():
    try:
        with get_conn() as conn:
            with conn.cursor() as cursor:

                # Consulta os setores ordenados pelo nome
                cursor.execute(
                    """
                    SELECT Id_Local, Nome_Local, Sala_Aula
                    FROM Local
                    ORDER BY Nome_Local ASC;
                    """
                )

                # Recupera todas as linhas encontradas
                rows = cursor.fetchall()

        # Monta a lista de setores em formato JSON
        locais = [
            {
                'id_local': row[0],
                'nome_local': row[1],
                'sala_aula': row[2]
            }
            for row in rows
        ]

        # Retorna a lista de setores
        return jsonify({
            'sucesso': True,
            'locais': locais
        }), 200

    except Exception as e:
        # Retorna erro caso a consulta falhe
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


# Rota para incluir um novo setor
@app.route('/api/setores', methods=['POST'])
def incluir_local():
    # Recebe os dados enviados pelo front-end
    dados = request.get_json(silent=True) or {}

    # Captura os campos e faz limpeza básica
    nome_local = (dados.get('nome_local') or '').strip()
    sala_aula = normalizar_flag_sn(dados.get('sala_aula'), 'N')

    # Valida o campo obrigatório
    if not nome_local:
        return jsonify({
            'sucesso': False,
            'mensagem': 'Informe o nome do setor.'
        }), 400

    try:
        with get_conn() as conn:
            with conn.cursor() as cursor:

                # Verifica se já existe um setor com o mesmo nome
                cursor.execute(
                    'SELECT 1 FROM Local WHERE UPPER(TRIM(Nome_Local)) = UPPER(TRIM(%s));',
                    (nome_local,)
                )

                # Se já existir, impede cadastro duplicado
                if cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Já existe um setor com este nome.'
                    }), 409

                # Insere o novo setor na tabela Local
                cursor.execute(
                    """
                    INSERT INTO Local (Nome_Local, Sala_Aula)
                    VALUES (%s, %s);
                    """,
                    (nome_local, sala_aula)
                )

                # Confirma a transação no banco
                conn.commit()

        # Retorna sucesso após o cadastro
        return jsonify({
            'sucesso': True,
            'mensagem': 'Setor cadastrado com sucesso!'
        }), 201

    except Exception as e:
        # Retorna erro se houver falha ao cadastrar
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


# Rota para editar um setor já existente
@app.route('/api/setores/<int:id_local>', methods=['PUT'])
def editar_local(id_local):
    # Recebe os dados enviados pelo front-end
    dados = request.get_json(silent=True) or {}

    # Captura e limpa os campos enviados
    nome_local = (dados.get('nome_local') or '').strip()
    sala_aula = normalizar_flag_sn(dados.get('sala_aula'), 'N')

    # Valida o nome do setor
    if not nome_local:
        return jsonify({
            'sucesso': False,
            'mensagem': 'Informe o nome do setor.'
        }), 400

    try:
        with get_conn() as conn:
            with conn.cursor() as cursor:

                # Verifica se o setor existe antes de editar
                cursor.execute(
                    'SELECT 1 FROM Local WHERE Id_Local = %s;',
                    (id_local,)
                )

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Setor não encontrado.'
                    }), 404

                # Verifica se o novo nome já está sendo usado por outro setor
                cursor.execute(
                    """
                    SELECT 1
                    FROM Local
                    WHERE UPPER(TRIM(Nome_Local)) = UPPER(TRIM(%s))
                      AND Id_Local != %s;
                    """,
                    (nome_local, id_local)
                )

                if cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Já existe outro setor com este nome.'
                    }), 409

                # Atualiza os dados do setor
                cursor.execute(
                    """
                    UPDATE Local
                    SET Nome_Local = %s,
                        Sala_Aula = %s
                    WHERE Id_Local = %s;
                    """,
                    (nome_local, sala_aula, id_local)
                )

                # Confirma a alteração no banco
                conn.commit()

        # Retorna sucesso após atualizar o setor
        return jsonify({
            'sucesso': True,
            'mensagem': 'Setor atualizado com sucesso!'
        }), 200

    except Exception as e:
        # Retorna erro se ocorrer falha no processo
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


# Rota para excluir um setor
@app.route('/api/setores/<int:id_local>', methods=['DELETE'])
def excluir_local(id_local):
    try:
        with get_conn() as conn:
            with conn.cursor() as cursor:

                # Verifica se o setor existe antes de tentar excluir
                cursor.execute(
                    'SELECT 1 FROM Local WHERE Id_Local = %s;',
                    (id_local,)
                )

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Setor não encontrado.'
                    }), 404

                # Verifica se o setor está vinculado a patrimônios
                cursor.execute(
                    'SELECT 1 FROM Patrimonio WHERE Id_Local = %s LIMIT 1;',
                    (id_local,)
                )

                if cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Este setor não pode ser excluído porque está vinculado a patrimônios.'
                    }), 409

                # Verifica se o setor já foi utilizado em movimentações
                cursor.execute(
                    'SELECT 1 FROM Historico_Movimentacao WHERE Id_Local_Origem = %s OR Id_Local_Destino = %s LIMIT 1;',
                    (id_local, id_local)
                )

                if cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Este setor não pode ser excluído porque já possui histórico de movimentação.'
                    }), 409

                # Exclui o setor fisicamente da tabela
                cursor.execute(
                    'DELETE FROM Local WHERE Id_Local = %s;',
                    (id_local,)
                )

                # Confirma a exclusão no banco
                conn.commit()

        # Retorna sucesso após excluir
        return jsonify({
            'sucesso': True,
            'mensagem': 'Setor excluído com sucesso!'
        }), 200

    except Exception as e:
        # Retorna erro se houver falha na exclusão
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


# Inicializa a aplicação Flask em modo de desenvolvimento
if __name__ == '__main__':
    app.run(debug=True)
