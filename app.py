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
    
# ROTA PARA EXCLUIR UM USUÁRIO (INATIVAR)
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

# ROTA PARA LISTAR TODOS OS LOCAIS
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

# ROTA PARA INCLUIR UM NOVO LOCAL
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

# ROTA PARA EDITAR UM LOCAL EXISTENTE
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

# ROTA PARA EXCLUIR UM LOCAL
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


# ===================== CATEGORIAS ===================== #

# ROTA PARA LISTAR TODAS AS CATEGORIAS
@app.route('/api/categorias', methods=['GET'])
def listar_categorias():
    """
    Lista todas as categorias cadastradas no sistema.
    O retorno já vem no formato consumido pela interface.
    """
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT Id_Categoria, Nome_Categoria
                    FROM Categoria
                    ORDER BY Nome_Categoria ASC;
                """)

                rows = cursor.fetchall()

        categorias = [
            {
                'id': row[0],
                'nome': row[1]
            }
            for row in rows
        ]

        return jsonify({
            'sucesso': True,
            'categorias': categorias
        }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500

# ROTA PARA INCLUIR UMA NOVA CATEGORIA
@app.route('/api/categorias', methods=['POST'])
def incluir_categoria():
    """
    Cadastra uma nova categoria.
    Valida nome obrigatório e duplicidade por nome.
    """
    dados = request.get_json(silent=True) or {}

    nome = (dados.get('nome') or '').strip()

    if not nome:
        return jsonify({
            'sucesso': False,
            'mensagem': 'Informe o nome da categoria.'
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Categoria
                    WHERE UPPER(TRIM(Nome_Categoria)) = UPPER(TRIM(%s));
                """, (nome,))

                if cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Já existe uma categoria com este nome.'
                    }), 409

                cursor.execute("""
                    INSERT INTO Categoria (Nome_Categoria)
                    VALUES (%s);
                """, (nome,))

                conn.commit()

        return jsonify({
            'sucesso': True,
            'mensagem': 'Categoria cadastrada com sucesso!'
        }), 201

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500

# ROTA PARA EDITAR UMA CATEGORIA EXISTENTE
@app.route('/api/categorias/<int:id_categoria>', methods=['PUT'])
def editar_categoria(id_categoria):
    """
    Atualiza o nome de uma categoria existente.
    Também impede duplicidade com outra categoria já cadastrada.
    """
    dados = request.get_json(silent=True) or {}

    nome = (dados.get('nome') or '').strip()

    if not nome:
        return jsonify({
            'sucesso': False,
            'mensagem': 'Informe o nome da categoria.'
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Categoria
                    WHERE Id_Categoria = %s;
                """, (id_categoria,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Categoria não encontrada.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Categoria
                    WHERE UPPER(TRIM(Nome_Categoria)) = UPPER(TRIM(%s))
                      AND Id_Categoria <> %s;
                """, (nome, id_categoria))

                if cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Já existe outra categoria com este nome.'
                    }), 409

                cursor.execute("""
                    UPDATE Categoria
                    SET Nome_Categoria = %s
                    WHERE Id_Categoria = %s;
                """, (nome, id_categoria))

                conn.commit()

        return jsonify({
            'sucesso': True,
            'mensagem': 'Categoria atualizada com sucesso!'
        }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500

# ROTA PARA EXCLUIR UMA CATEGORIA
@app.route('/api/categorias/<int:id_categoria>', methods=['DELETE'])
def excluir_categoria(id_categoria):
    """
    Exclui fisicamente uma categoria somente quando ela não
    estiver vinculada a nenhum patrimônio.
    """
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Categoria
                    WHERE Id_Categoria = %s;
                """, (id_categoria,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Categoria não encontrada.'
                    }), 404

                # Regra de negócio:
                # se a categoria estiver sendo usada em qualquer patrimônio,
                # a exclusão deve ser bloqueada.
                cursor.execute("""
                    SELECT 1
                    FROM Patrimonio
                    WHERE Id_Categoria = %s
                    LIMIT 1;
                """, (id_categoria,))

                if cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Impossível excluir categoria vinculada a um patrimônio.'
                    }), 409

                cursor.execute("""
                    DELETE FROM Categoria
                    WHERE Id_Categoria = %s;
                """, (id_categoria,))

                conn.commit()

        return jsonify({
            'sucesso': True,
            'mensagem': 'Categoria excluída com sucesso!'
        }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500

# ===================== RESPONSÁVEIS =====================
# Este bloco implementa o CRUD da tela de responsáveis.
# Regra de negócio: a matrícula do responsável só precisa ser única
# dentro da tabela Responsavel_Patrimonio, sem validar na tabela Usuario.
# A exclusão é física e o responsável removido deixa de aparecer na tela.

@app.route('/api/responsaveis', methods=['GET'])
def listar_responsaveis():
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        Id_Responsavel_Patrimonio,
                        Nome_Completo,
                        Matricula,
                        Cargo
                    FROM Responsavel_Patrimonio
                    ORDER BY Nome_Completo ASC;
                """)

                rows = cursor.fetchall()

                responsaveis = [
                    {
                        "id": row[0],
                        "nome": row[1],
                        "matricula": row[2],
                        "cargo": row[3]
                    }
                    for row in rows
                ]

        return jsonify({
            "sucesso": True,
            "responsaveis": responsaveis
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": str(e)
        }), 500


# ===================== INCLUIR RESPONSÁVEL =====================
# Cadastra um novo responsável.
# A validação de matrícula é feita somente na tabela de responsáveis.
@app.route('/api/responsaveis', methods=['POST'])
def incluir_responsavel():
    dados = request.get_json(silent=True) or {}

    nome = (dados.get('nome') or '').strip()
    matricula = (dados.get('matricula') or '').strip()
    cargo = (dados.get('cargo') or '').strip()

    if not nome or not matricula or not cargo:
        return jsonify({
            "sucesso": False,
            "mensagem": "Preencha nome, matrícula e cargo."
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Responsavel_Patrimonio
                    WHERE Matricula = %s;
                """, (matricula,))

                if cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Já existe um responsável com esta matrícula."
                    }), 409

                cursor.execute("""
                    INSERT INTO Responsavel_Patrimonio
                        (Nome_Completo, Matricula, Cargo, Ativo)
                    VALUES
                        (%s, %s, %s, 'S');
                """, (nome, matricula, cargo))

                conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Responsável cadastrado com sucesso!"
        }), 201

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": str(e)
        }), 500


# ===================== EDITAR RESPONSÁVEL =====================
# Atualiza nome, matrícula e cargo do responsável.
# Não existe edição de status nessa tela.
@app.route('/api/responsaveis/<int:id_responsavel>', methods=['PUT'])
def editar_responsavel(id_responsavel):
    dados = request.get_json(silent=True) or {}

    nome = (dados.get('nome') or '').strip()
    matricula = (dados.get('matricula') or '').strip()
    cargo = (dados.get('cargo') or '').strip()

    if not nome or not matricula or not cargo:
        return jsonify({
            "sucesso": False,
            "mensagem": "Preencha nome, matrícula e cargo."
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Responsavel_Patrimonio
                    WHERE Id_Responsavel_Patrimonio = %s;
                """, (id_responsavel,))

                if not cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Responsável não encontrado."
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Responsavel_Patrimonio
                    WHERE Matricula = %s
                      AND Id_Responsavel_Patrimonio <> %s;
                """, (matricula, id_responsavel))

                if cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Já existe outro responsável com esta matrícula."
                    }), 409

                cursor.execute("""
                    UPDATE Responsavel_Patrimonio
                    SET Nome_Completo = %s,
                        Matricula = %s,
                        Cargo = %s
                    WHERE Id_Responsavel_Patrimonio = %s;
                """, (nome, matricula, cargo, id_responsavel))

                conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Responsável atualizado com sucesso!"
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": str(e)
        }), 500


# ===================== EXCLUIR RESPONSÁVEL =====================
# Remove fisicamente o responsável da tabela.
# Após excluir, ele deixa de aparecer na listagem.
@app.route('/api/responsaveis/<int:id_responsavel>', methods=['DELETE'])
def excluir_responsavel(id_responsavel):
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Responsavel_Patrimonio
                    WHERE Id_Responsavel_Patrimonio = %s;
                """, (id_responsavel,))

                if not cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Responsável não encontrado."
                    }), 404

                cursor.execute("""
                    DELETE FROM Responsavel_Patrimonio
                    WHERE Id_Responsavel_Patrimonio = %s;
                """, (id_responsavel,))

                conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Responsável excluído com sucesso!"
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": str(e)
        }), 500


# ===================== PATRIMÔNIOS - LISTAR =====================
# Lista os patrimônios com categoria, local e responsável já resolvidos por JOIN.
@app.route('/api/patrimonios', methods=['GET'])
def listar_patrimonios():
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        p.Id_Patrimonio,
                        p.Num_Patrimonio,
                        p.Descricao,
                        p.Dt_Compra,
                        p.Vlr_Compra,
                        p.Num_NFE,
                        p.Situacao_Atual,
                        p.Id_Categoria,
                        p.Id_Local,
                        p.Id_Responsavel_Patrimonio,
                        c.Nome_Categoria AS Categoria,
                        l.Nome_Local AS Local,
                        r.Nome_Completo AS Responsavel
                    FROM Patrimonio p
                    LEFT JOIN Categoria c
                        ON p.Id_Categoria = c.Id_Categoria
                    LEFT JOIN Local l
                        ON p.Id_Local = l.Id_Local
                    LEFT JOIN Responsavel_Patrimonio r
                        ON p.Id_Responsavel_Patrimonio = r.Id_Responsavel_Patrimonio
                    ORDER BY
                        CASE p.Situacao_Atual
                            WHEN 'A' THEN 1
                            WHEN 'M' THEN 2
                            WHEN 'B' THEN 3
                            WHEN 'E' THEN 4
                            ELSE 5
                        END,
                        p.Descricao ASC;
                """)

                rows = cursor.fetchall()

                patrimonios = []
                for row in rows:
                    patrimonios.append({
                        "id": row[0],
                        "num_patrimonio": row[1],
                        "descricao": row[2],
                        "dt_compra": row[3].isoformat() if row[3] else None,
                        "vlr_compra": float(row[4]) if row[4] is not None else 0,
                        "num_nfe": row[5],
                        "situacao": row[6],
                        "id_categoria": row[7],
                        "id_local": row[8],
                        "id_responsavel_patrimonio": row[9],
                        "categoria": row[10],
                        "local": row[11],
                        "responsavel": row[12]
                    })

        return jsonify({
            "sucesso": True,
            "patrimonios": patrimonios
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": f"Erro ao listar patrimônios: {str(e)}"
        }), 500

# ===================== PATRIMÔNIOS - CADASTRAR =====================
# Valida todos os campos obrigatórios e insere um novo patrimônio.
@app.route('/api/patrimonios', methods=['POST'])
def cadastrar_patrimonio():
    try:
        dados = request.get_json(silent=True) or {}

        num_patrimonio = str(dados.get('num_patrimonio', '')).strip()
        num_nfe = str(dados.get('num_nfe', '')).strip()
        descricao = str(dados.get('descricao', '')).strip()
        dt_compra = str(dados.get('dt_compra', '')).strip()
        vlr_compra = str(dados.get('vlr_compra', '')).strip()
        id_categoria = str(dados.get('id_categoria', '')).strip()
        id_local = str(dados.get('id_local', '')).strip()
        id_responsavel_patrimonio = str(dados.get('id_responsavel_patrimonio', '')).strip()
        situacao_atual = str(dados.get('situacao_atual', '')).strip().upper()

        if not num_patrimonio or not num_nfe or not descricao or not dt_compra or not vlr_compra or not id_categoria or not id_local or not id_responsavel_patrimonio or not situacao_atual:
            return jsonify({
                "sucesso": False,
                "mensagem": "Todos os campos são obrigatórios."
            }), 400

        if situacao_atual not in ['A', 'M', 'B', 'E']:
            return jsonify({
                "sucesso": False,
                "mensagem": "Situação atual inválida."
            }), 400

        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Patrimonio
                    WHERE Num_Patrimonio = %s;
                """, (num_patrimonio,))

                if cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Já existe um patrimônio com este número."
                    }), 400

                cursor.execute("""
                    INSERT INTO Patrimonio (
                        Num_Patrimonio,
                        Descricao,
                        Dt_Compra,
                        Vlr_Compra,
                        Num_NFE,
                        Situacao_Atual,
                        Id_Categoria,
                        Id_Local,
                        Id_Responsavel_Patrimonio
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    int(num_patrimonio),
                    descricao,
                    dt_compra,
                    vlr_compra,
                    num_nfe,
                    situacao_atual,
                    int(id_categoria),
                    int(id_local),
                    int(id_responsavel_patrimonio)
                ))

                conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Patrimônio cadastrado com sucesso."
        }), 201

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": f"Erro ao cadastrar patrimônio: {str(e)}"
        }), 500


# ===================== PATRIMÔNIOS - EDITAR =====================
# Atualiza os dados do patrimônio mantendo a regra de inativação
# apenas por situação Baixado ou Extraviado, sem exclusão física.
@app.route('/api/patrimonios/<int:id_patrimonio>', methods=['PUT'])
def editar_patrimonio(id_patrimonio):
    try:
        dados = request.get_json(silent=True) or {}

        num_patrimonio = str(dados.get('num_patrimonio', '')).strip()
        num_nfe = str(dados.get('num_nfe', '')).strip()
        descricao = str(dados.get('descricao', '')).strip()
        dt_compra = str(dados.get('dt_compra', '')).strip()
        vlr_compra = str(dados.get('vlr_compra', '')).strip()
        id_categoria = str(dados.get('id_categoria', '')).strip()
        id_local = str(dados.get('id_local', '')).strip()
        id_responsavel_patrimonio = str(dados.get('id_responsavel_patrimonio', '')).strip()
        situacao_atual = str(dados.get('situacao_atual', '')).strip().upper()

        if not num_patrimonio or not num_nfe or not descricao or not dt_compra or not vlr_compra or not id_categoria or not id_local or not id_responsavel_patrimonio or not situacao_atual:
            return jsonify({
                "sucesso": False,
                "mensagem": "Todos os campos são obrigatórios."
            }), 400

        if situacao_atual not in ['A', 'M', 'B', 'E']:
            return jsonify({
                "sucesso": False,
                "mensagem": "Situação atual inválida."
            }), 400

        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Patrimonio
                    WHERE Id_Patrimonio = %s;
                """, (id_patrimonio,))

                if not cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Patrimônio não encontrado."
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Patrimonio
                    WHERE Num_Patrimonio = %s
                      AND Id_Patrimonio <> %s;
                """, (num_patrimonio, id_patrimonio))

                if cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Já existe outro patrimônio com este número."
                    }), 400

                cursor.execute("""
                    UPDATE Patrimonio
                    SET
                        Num_Patrimonio = %s,
                        Descricao = %s,
                        Dt_Compra = %s,
                        Vlr_Compra = %s,
                        Num_NFE = %s,
                        Situacao_Atual = %s,
                        Id_Categoria = %s,
                        Id_Local = %s,
                        Id_Responsavel_Patrimonio = %s
                    WHERE Id_Patrimonio = %s;
                """, (
                    int(num_patrimonio),
                    descricao,
                    dt_compra,
                    vlr_compra,
                    num_nfe,
                    situacao_atual,
                    int(id_categoria),
                    int(id_local),
                    int(id_responsavel_patrimonio),
                    id_patrimonio
                ))

                conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Patrimônio atualizado com sucesso."
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": f"Erro ao atualizar patrimônio: {str(e)}"
        }), 500

# ===================== PATRIMÔNIOS - INATIVAR =====================
# Realiza a exclusão lógica do patrimônio, alterando apenas a situação.
@app.route('/api/patrimonios/<int:id_patrimonio>', methods=['DELETE'])
def inativar_patrimonio(id_patrimonio):
    try:
        dados = request.get_json(silent=True) or {}
        situacao_atual = str(dados.get('situacao_atual', 'B')).strip().upper()

        if situacao_atual not in ['B', 'E']:
            return jsonify({
                "sucesso": False,
                "mensagem": "A inativação só pode ser feita com situação 'B' (Baixado) ou 'E' (Extraviado)."
            }), 400

        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Patrimonio
                    WHERE Id_Patrimonio = %s;
                """, (id_patrimonio,))

                if not cursor.fetchone():
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Patrimônio não encontrado."
                    }), 404

                cursor.execute("""
                    UPDATE Patrimonio
                    SET Situacao_Atual = %s
                    WHERE Id_Patrimonio = %s;
                """, (situacao_atual, id_patrimonio))

                conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Patrimônio inativado com sucesso."
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": f"Erro ao inativar patrimônio: {str(e)}"
        }), 500

# ===================== MANUTENÇÃO - FUNÇÃO AUXILIAR =====================
# Normaliza o campo Resolvido para garantir somente S ou N.
def normalizar_resolvido(valor, padrao='N'):
    if valor is None:
        return padrao

    valor = str(valor).strip().upper()

    if valor not in ('S', 'N'):
        return padrao

    return valor


# ===================== PATRIMÔNIOS EM MANUTENÇÃO - SELECT AUXILIAR =====================
# Retorna apenas patrimônios cuja situação atual esteja marcada como M.
@app.route('/api/patrimonios/manutencao', methods=['GET'])
def listar_patrimonios_em_manutencao():
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        Id_Patrimonio,
                        Num_Patrimonio,
                        Descricao
                    FROM Patrimonio
                    WHERE Situacao_Atual = 'M'
                    ORDER BY Descricao ASC;
                """)

                rows = cursor.fetchall()

                patrimonios = []
                for row in rows:
                    patrimonios.append({
                        "id": row[0],
                        "num_patrimonio": row[1],
                        "descricao": row[2]
                    })

        return jsonify({
            "sucesso": True,
            "patrimonios": patrimonios
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": f"Erro ao carregar patrimônios em manutenção: {str(e)}"
        }), 500


# ===================== MANUTENÇÃO - LISTAR =====================
# Lista os históricos de manutenção com joins de patrimônio e usuário.
# Registros não resolvidos ficam no topo.
@app.route('/api/manutencoes', methods=['GET'])
def listar_manutencoes():
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        hm.Id_Manutencao,
                        hm.Problema_Identificado,
                        hm.Dt_Envio_Manutencao,
                        hm.Dt_Volta_Manutencao,
                        hm.Fornecedor_Tecnico,
                        hm.Descricao_Servico_Realizado,
                        hm.Resolvido,
                        hm.Vlr_Gasto,
                        hm.Id_Patrimonio,
                        hm.Id_Usuario,
                        p.Num_Patrimonio,
                        p.Descricao,
                        u.Nome
                    FROM Historico_Manutencao hm
                    LEFT JOIN Patrimonio p
                        ON hm.Id_Patrimonio = p.Id_Patrimonio
                    LEFT JOIN Usuario u
                        ON hm.Id_Usuario = u.Id_Usuario
                    ORDER BY
                        CASE hm.Resolvido
                            WHEN 'N' THEN 0
                            WHEN 'S' THEN 1
                            ELSE 2
                        END,
                        hm.Dt_Envio_Manutencao DESC,
                        hm.Id_Manutencao DESC;
                """)

                rows = cursor.fetchall()

                manutencoes = []
                for row in rows:
                    patrimonio_label = '-'
                    if row[10] or row[11]:
                        num_patrimonio = row[10] or ''
                        descricao = row[11] or ''
                        patrimonio_label = f"{num_patrimonio} - {descricao}".strip(' -')

                    manutencoes.append({
                        "id": row[0],
                        "problema_identificado": row[1],
                        "dt_envio_manutencao": row[2].isoformat() if row[2] else None,
                        "dt_volta_manutencao": row[3].isoformat() if row[3] else None,
                        "fornecedor_tecnico": row[4],
                        "descricao_servico_realizado": row[5],
                        "resolvido": row[6],
                        "vlr_gasto": float(row[7]) if row[7] is not None else 0,
                        "id_patrimonio": row[8],
                        "id_usuario": row[9],
                        "patrimonio": patrimonio_label,
                        "usuario": row[12]
                    })

        return jsonify({
            "sucesso": True,
            "manutencoes": manutencoes
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": f"Erro ao listar manutenções: {str(e)}"
        }), 500


# ===================== MANUTENÇÃO - INCLUIR =====================
# Cadastra um novo histórico de manutenção.
@app.route('/api/manutencoes', methods=['POST'])
def incluir_manutencao():
    try:
        dados = request.get_json() or {}

        problema_identificado = dados.get('problema_identificado', '').strip()
        dt_envio_manutencao = dados.get('dt_envio_manutencao')
        dt_volta_manutencao = dados.get('dt_volta_manutencao') or None
        fornecedor_tecnico = dados.get('fornecedor_tecnico', '').strip()
        descricao_servico_realizado = dados.get('descricao_servico_realizado', '').strip()
        resolvido = normalizar_resolvido(dados.get('resolvido'), 'N')
        vlr_gasto = dados.get('vlr_gasto') if dados.get('vlr_gasto') not in ('', None) else None
        id_patrimonio = dados.get('id_patrimonio')
        id_usuario = dados.get('id_usuario')

        if not problema_identificado or not dt_envio_manutencao or not fornecedor_tecnico or not id_patrimonio or not id_usuario:
            return jsonify({
                "sucesso": False,
                "mensagem": "Preencha todos os campos obrigatórios."
            }), 400

        with pool.connection() as conn:
            with conn.cursor() as cursor:
                # Valida se o patrimônio existe e está em manutenção.
                cursor.execute("""
                    SELECT 1
                    FROM Patrimonio
                    WHERE Id_Patrimonio = %s
                      AND Situacao_Atual = 'M';
                """, (id_patrimonio,))
                patrimonio_ok = cursor.fetchone()

                if not patrimonio_ok:
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "O patrimônio informado não está disponível para manutenção."
                    }), 400

                # Valida se o usuário existe e está ativo.
                cursor.execute("""
                    SELECT 1
                    FROM Usuario
                    WHERE Id_Usuario = %s
                      AND Ativo = 'S';
                """, (id_usuario,))
                usuario_ok = cursor.fetchone()

                if not usuario_ok:
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "O usuário informado não está ativo ou não existe."
                    }), 400

                cursor.execute("""
                    INSERT INTO Historico_Manutencao (
                        Problema_Identificado,
                        Dt_Envio_Manutencao,
                        Dt_Volta_Manutencao,
                        Fornecedor_Tecnico,
                        Descricao_Servico_Realizado,
                        Resolvido,
                        Vlr_Gasto,
                        Id_Patrimonio,
                        Id_Usuario
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING Id_Manutencao;
                """, (
                    problema_identificado,
                    dt_envio_manutencao,
                    dt_volta_manutencao,
                    fornecedor_tecnico,
                    descricao_servico_realizado,
                    resolvido,
                    vlr_gasto,
                    id_patrimonio,
                    id_usuario
                ))

                novo_id = cursor.fetchone()[0]
                conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Manutenção cadastrada com sucesso!",
            "id": novo_id
        }), 201

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": f"Erro ao cadastrar manutenção: {str(e)}"
        }), 500


# ===================== MANUTENÇÃO - EDITAR =====================
# Atualiza um histórico de manutenção existente.
@app.route('/api/manutencoes/<int:id_manutencao>', methods=['PUT'])
def editar_manutencao(id_manutencao):
    try:
        dados = request.get_json() or {}

        problema_identificado = dados.get('problema_identificado', '').strip()
        dt_envio_manutencao = dados.get('dt_envio_manutencao')
        dt_volta_manutencao = dados.get('dt_volta_manutencao') or None
        fornecedor_tecnico = dados.get('fornecedor_tecnico', '').strip()
        descricao_servico_realizado = dados.get('descricao_servico_realizado', '').strip()
        resolvido = normalizar_resolvido(dados.get('resolvido'), 'N')
        vlr_gasto = dados.get('vlr_gasto') if dados.get('vlr_gasto') not in ('', None) else None
        id_patrimonio = dados.get('id_patrimonio')
        id_usuario = dados.get('id_usuario')

        if not problema_identificado or not dt_envio_manutencao or not fornecedor_tecnico or not id_patrimonio or not id_usuario:
            return jsonify({
                "sucesso": False,
                "mensagem": "Preencha todos os campos obrigatórios."
            }), 400

        with pool.connection() as conn:
            with conn.cursor() as cursor:
                # Valida existência do registro.
                cursor.execute("""
                    SELECT 1
                    FROM Historico_Manutencao
                    WHERE Id_Manutencao = %s;
                """, (id_manutencao,))
                registro_ok = cursor.fetchone()

                if not registro_ok:
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "Registro de manutenção não encontrado."
                    }), 404

                # Valida patrimônio em manutenção.
                cursor.execute("""
                    SELECT 1
                    FROM Patrimonio
                    WHERE Id_Patrimonio = %s
                      AND Situacao_Atual = 'M';
                """, (id_patrimonio,))
                patrimonio_ok = cursor.fetchone()

                if not patrimonio_ok:
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "O patrimônio informado não está disponível para manutenção."
                    }), 400

                # Valida usuário ativo.
                cursor.execute("""
                    SELECT 1
                    FROM Usuario
                    WHERE Id_Usuario = %s
                      AND Ativo = 'S';
                """, (id_usuario,))
                usuario_ok = cursor.fetchone()

                if not usuario_ok:
                    return jsonify({
                        "sucesso": False,
                        "mensagem": "O usuário informado não está ativo ou não existe."
                    }), 400

                cursor.execute("""
                    UPDATE Historico_Manutencao
                    SET
                        Problema_Identificado = %s,
                        Dt_Envio_Manutencao = %s,
                        Dt_Volta_Manutencao = %s,
                        Fornecedor_Tecnico = %s,
                        Descricao_Servico_Realizado = %s,
                        Resolvido = %s,
                        Vlr_Gasto = %s,
                        Id_Patrimonio = %s,
                        Id_Usuario = %s
                    WHERE Id_Manutencao = %s;
                """, (
                    problema_identificado,
                    dt_envio_manutencao,
                    dt_volta_manutencao,
                    fornecedor_tecnico,
                    descricao_servico_realizado,
                    resolvido,
                    vlr_gasto,
                    id_patrimonio,
                    id_usuario,
                    id_manutencao
                ))

                conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Manutenção atualizada com sucesso!"
        }), 200

    except Exception as e:
        return jsonify({
            "sucesso": False,
            "mensagem": f"Erro ao atualizar manutenção: {str(e)}"
        }), 500

# ===================== RESPONSÁVEIS - BUSCA PARA MOVIMENTAÇÃO ===================== #

# ROTA PARA LISTAR TODOS OS RESPONSÁVEIS
@app.route('/api/responsaveis', methods=['GET'])
def listar_responsaveis_movimentacao():
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT Id_Responsavel_Patrimonio, Nome
                    FROM Responsavel_Patrimonio
                    ORDER BY Nome ASC;
                """)

                rows = cursor.fetchall()

                responsaveis = [
                    {
                        'id': row[0],
                        'nome': row[1]
                    }
                    for row in rows
                ]

                return jsonify({
                    'sucesso': True,
                    'responsaveis': responsaveis
                }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


# ===================== PATRIMÔNIOS - BUSCA PARA MOVIMENTAÇÃO ===================== #

# ROTA PARA PESQUISAR PATRIMÔNIOS ATIVOS PELO NOME OU TOMBO
@app.route('/api/patrimonios/busca', methods=['GET'])
def buscar_patrimonios_movimentacao():
    termo = (request.args.get('termo') or '').strip()

    if len(termo) < 2:
        return jsonify({
            'sucesso': True,
            'patrimonios': []
        }), 200

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        Id_Patrimonio,
                        NomePatrimonio,
                        NumeroTombo
                    FROM Patrimonio
                    WHERE Situacao_Atual = 'A'
                      AND (
                        UPPER(NomePatrimonio) LIKE UPPER(%s)
                        OR CAST(NumeroTombo AS TEXT) LIKE %s
                      )
                    ORDER BY NomePatrimonio ASC
                    LIMIT 20;
                """, (f'%{termo}%', f'%{termo}%'))

                rows = cursor.fetchall()

                patrimonios = [
                    {
                        'id': row[0],
                        'nome': f'{row[1]} - Tombo: {row[2]}' if row[2] is not None else row[1]
                    }
                    for row in rows
                ]

                return jsonify({
                    'sucesso': True,
                    'patrimonios': patrimonios
                }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


# ===================== MOVIMENTAÇÕES ===================== #

# ROTA PARA LISTAR TODAS AS MOVIMENTAÇÕES
@app.route('/api/movimentacoes', methods=['GET'])
def listar_movimentacoes():
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        hm.Id_Movimentacao,
                        hm.Id_Patrimonio,
                        p.NomePatrimonio,
                        hm.Id_Local_Origem,
                        lo.Nome_Local,
                        hm.Id_Local_Destino,
                        ld.Nome_Local,
                        hm.Id_Responsavel_Patrimonio,
                        rp.Nome,
                        hm.Id_Usuario,
                        u.Nome,
                        hm.Dt_Transferencia,
                        hm.Observacoes
                    FROM Historico_Movimentacao hm
                    INNER JOIN Patrimonio p
                        ON p.Id_Patrimonio = hm.Id_Patrimonio
                    INNER JOIN Local lo
                        ON lo.Id_Local = hm.Id_Local_Origem
                    INNER JOIN Local ld
                        ON ld.Id_Local = hm.Id_Local_Destino
                    INNER JOIN Responsavel_Patrimonio rp
                        ON rp.Id_Responsavel_Patrimonio = hm.Id_Responsavel_Patrimonio
                    INNER JOIN Usuario u
                        ON u.Id_Usuario = hm.Id_Usuario
                    ORDER BY hm.Id_Movimentacao DESC;
                """)

                rows = cursor.fetchall()

                movimentacoes = [
                    {
                        'id': row[0],
                        'id_patrimonio': row[1],
                        'patrimonio_nome': row[2],
                        'id_local_origem': row[3],
                        'local_origem_nome': row[4],
                        'id_local_destino': row[5],
                        'local_destino_nome': row[6],
                        'id_responsavel_patrimonio': row[7],
                        'responsavel_nome': row[8],
                        'id_usuario': row[9],
                        'usuario_nome': row[10],
                        'data_transferencia': row[11].isoformat() if row[11] else None,
                        'observacoes': row[12]
                    }
                    for row in rows
                ]

                return jsonify({
                    'sucesso': True,
                    'movimentacoes': movimentacoes
                }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


# ROTA PARA CADASTRAR UMA NOVA MOVIMENTAÇÃO
@app.route('/api/movimentacoes', methods=['POST'])
def incluir_movimentacao():
    dados = request.get_json(silent=True) or {}

    id_patrimonio = dados.get('id_patrimonio')
    id_usuario = dados.get('id_usuario')
    id_local_origem = dados.get('id_local_origem')
    id_local_destino = dados.get('id_local_destino')
    id_responsavel_patrimonio = dados.get('id_responsavel_patrimonio')
    dt_transferencia = (dados.get('dt_transferencia') or '').strip()
    observacoes = (dados.get('observacoes') or '').strip()

    if not id_patrimonio or not id_usuario or not id_local_origem or not id_local_destino or not id_responsavel_patrimonio or not dt_transferencia:
        return jsonify({
            'sucesso': False,
            'mensagem': 'Preencha todos os campos obrigatórios.'
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Patrimonio
                    WHERE Id_Patrimonio = %s
                      AND Situacao_Atual = 'A';
                """, (id_patrimonio,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Patrimônio ativo não encontrado.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Usuario
                    WHERE Id_Usuario = %s
                      AND Ativo = 'S';
                """, (id_usuario,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Usuário não encontrado.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Local
                    WHERE Id_Local = %s;
                """, (id_local_origem,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Local de origem não encontrado.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Local
                    WHERE Id_Local = %s;
                """, (id_local_destino,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Local de destino não encontrado.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Responsavel_Patrimonio
                    WHERE Id_Responsavel_Patrimonio = %s;
                """, (id_responsavel_patrimonio,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Responsável não encontrado.'
                    }), 404

                cursor.execute("""
                    INSERT INTO Historico_Movimentacao (
                        Id_Patrimonio,
                        Id_Local_Origem,
                        Id_Local_Destino,
                        Id_Responsavel_Patrimonio,
                        Id_Usuario,
                        Dt_Transferencia,
                        Observacoes
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s);
                """, (
                    id_patrimonio,
                    id_local_origem,
                    id_local_destino,
                    id_responsavel_patrimonio,
                    id_usuario,
                    dt_transferencia,
                    observacoes if observacoes else None
                ))

                cursor.execute("""
                    UPDATE Patrimonio
                    SET Id_Local = %s,
                        Id_Responsavel_Patrimonio = %s
                    WHERE Id_Patrimonio = %s;
                """, (
                    id_local_destino,
                    id_responsavel_patrimonio,
                    id_patrimonio
                ))

                conn.commit()

                return jsonify({
                    'sucesso': True,
                    'mensagem': 'Movimentação cadastrada com sucesso!'
                }), 201

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


# ROTA PARA EDITAR UMA MOVIMENTAÇÃO EXISTENTE
@app.route('/api/movimentacoes/<int:id_movimentacao>', methods=['PUT'])
def editar_movimentacao(id_movimentacao):
    dados = request.get_json(silent=True) or {}

    id_patrimonio = dados.get('id_patrimonio')
    id_usuario = dados.get('id_usuario')
    id_local_origem = dados.get('id_local_origem')
    id_local_destino = dados.get('id_local_destino')
    id_responsavel_patrimonio = dados.get('id_responsavel_patrimonio')
    dt_transferencia = (dados.get('dt_transferencia') or '').strip()
    observacoes = (dados.get('observacoes') or '').strip()

    if not id_patrimonio or not id_usuario or not id_local_origem or not id_local_destino or not id_responsavel_patrimonio or not dt_transferencia:
        return jsonify({
            'sucesso': False,
            'mensagem': 'Preencha todos os campos obrigatórios.'
        }), 400

    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 1
                    FROM Historico_Movimentacao
                    WHERE Id_Historico_Movimentacao = %s;
                """, (id_movimentacao,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Movimentação não encontrada.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Patrimonio
                    WHERE Id_Patrimonio = %s
                      AND Situacao_Atual = 'A';
                """, (id_patrimonio,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Patrimônio ativo não encontrado.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Usuario
                    WHERE Id_Usuario = %s
                      AND Ativo = 'S';
                """, (id_usuario,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Usuário não encontrado.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Local
                    WHERE Id_Local = %s;
                """, (id_local_origem,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Local de origem não encontrado.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Local
                    WHERE Id_Local = %s;
                """, (id_local_destino,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Local de destino não encontrado.'
                    }), 404

                cursor.execute("""
                    SELECT 1
                    FROM Responsavel_Patrimonio
                    WHERE Id_Responsavel_Patrimonio = %s;
                """, (id_responsavel_patrimonio,))

                if not cursor.fetchone():
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Responsável não encontrado.'
                    }), 404

                cursor.execute("""
                    UPDATE Historico_Movimentacao
                    SET Id_Patrimonio = %s,
                        Id_Local_Origem = %s,
                        Id_Local_Destino = %s,
                        Id_Responsavel_Patrimonio = %s,
                        Id_Usuario = %s,
                        Dt_Transferencia = %s,
                        Observacoes = %s
                    WHERE Id_Historico_Movimentacao = %s;
                """, (
                    id_patrimonio,
                    id_local_origem,
                    id_local_destino,
                    id_responsavel_patrimonio,
                    id_usuario,
                    dt_transferencia,
                    observacoes if observacoes else None,
                    id_movimentacao
                ))

                cursor.execute("""
                    UPDATE Patrimonio
                    SET Id_Local = %s,
                        Id_Responsavel_Patrimonio = %s
                    WHERE Id_Patrimonio = %s;
                """, (
                    id_local_destino,
                    id_responsavel_patrimonio,
                    id_patrimonio
                ))

                conn.commit()

                return jsonify({
                    'sucesso': True,
                    'mensagem': 'Movimentação atualizada com sucesso!'
                }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500


# ROTA PARA EXCLUIR UMA MOVIMENTAÇÃO
@app.route('/api/movimentacoes/<int:id_movimentacao>', methods=['DELETE'])
def excluir_movimentacao(id_movimentacao):
    try:
        with pool.connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT Id_Patrimonio
                    FROM Historico_Movimentacao
                    WHERE Id_Historico_Movimentacao = %s;
                """, (id_movimentacao,))

                row = cursor.fetchone()

                if not row:
                    return jsonify({
                        'sucesso': False,
                        'mensagem': 'Movimentação não encontrada.'
                    }), 404

                cursor.execute("""
                    DELETE FROM Historico_Movimentacao
                    WHERE Id_Historico_Movimentacao = %s;
                """, (id_movimentacao,))

                conn.commit()

                return jsonify({
                    'sucesso': True,
                    'mensagem': 'Movimentação excluída com sucesso!'
                }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'mensagem': str(e)
        }), 500

# Inicializa a aplicação Flask em modo de desenvolvimento
if __name__ == '__main__':
    app.run(debug=True)
