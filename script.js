// ===================== LOGIN =====================
async function fazerLogin(e) {
    e.preventDefault();
    const matricula = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;
    const msgErro = document.getElementById('msgErroLogin');
    msgErro.textContent = '';
    try {
        const resposta = await fetch('https://controlepatrimonio.onrender.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula, senha })
        });
        const dados = await resposta.json();
        if (dados.sucesso) {
            document.getElementById('telaLogin').classList.add('oculto');
            document.getElementById('telaDashboard').style.display = 'block';
            renderizarGrafico();
        } else {
            msgErro.textContent = dados.mensagem;
        }
    } catch (erro) {
        msgErro.textContent = 'Erro ao conectar com o servidor.';
    }
}

// ===================== LOGOUT =====================
function fazerLogout() {
    document.getElementById('telaDashboard').style.display = 'none';
    document.getElementById('telaLogin').classList.remove('oculto');
}

// ===================== TOGGLE SIDEBAR =====================
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('fechado');
}

// ===================== NAVEGAÇÃO =====================
function mostrarConteudo(idConteudo, elementoMenu) {
    document.querySelectorAll('.conteudo-secao').forEach(secao => {
        secao.classList.remove('ativo');
    });
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.classList.remove('ativo');
    });
    document.getElementById(idConteudo + '-content').classList.add('ativo');
    elementoMenu.parentElement.classList.add('ativo');
    const titulos = {
        'dashboard': 'Dashboard',
        'patrimonio': 'Gestão de Patrimônios',
        'usuarios': 'Cadastro de Usuários',
        'relatorios': 'Relatórios Gerenciais'
    };
    document.querySelector('.topbar-titulo').textContent = titulos[idConteudo] || 'Dashboard';
    if (idConteudo === 'usuarios') {
        carregarUsuarios();
    }
}

// ===================== GRÁFICO =====================
function renderizarGrafico() {
    const canvas = document.getElementById('graficoCategoria');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.myChart instanceof Chart) {
        window.myChart.destroy();
    }
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Computadores', 'Impressoras', 'Câmeras de Segurança', 'Instrumentos Musicais'],
            datasets: [{
                label: 'Valor (R$)',
                data: [80000, 20000, 15000, 5000],
                backgroundColor: ['#0058b7', '#c8102e', '#009bd8', '#003f80'],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => 'R$ ' + value.toLocaleString('pt-BR') }
                }
            }
        }
    });
}

// ===================== USUÁRIOS — VARIÁVEL GLOBAL =====================
let listaUsuarios = [];

// ===================== USUÁRIOS — CARREGAR DA API =====================
async function carregarUsuarios() {
    const tbody = document.getElementById('tabelaUsuarios');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center text-muted py-4">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Carregando usuários...
            </td>
        </tr>`;
    try {
        const resposta = await fetch('https://controlepatrimonio.onrender.com/api/usuarios');
        const dados = await resposta.json();
        if (dados.sucesso) {
            listaUsuarios = dados.usuarios;
            renderizarTabela(listaUsuarios);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">${dados.mensagem}</td></tr>`;
        }
    } catch (erro) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-3">Erro ao carregar usuários.</td></tr>';
    }
}

// ===================== USUÁRIOS — RENDERIZAR TABELA =====================
function renderizarTabela(usuarios) {
    const tbody = document.getElementById('tabelaUsuarios');
    const msgNenhum = document.getElementById('msgNenhumResultado');
    if (usuarios.length === 0) {
        tbody.innerHTML = '';
        msgNenhum.classList.remove('d-none');
        return;
    }
    msgNenhum.classList.add('d-none');
    const perfilNome  = { 'A': 'Administrador', 'O': 'Operador', 'V': 'Visualizador' };
    const perfilBadge = { 'A': 'bg-danger', 'O': 'bg-primary', 'V': 'bg-secondary' };
    tbody.innerHTML = usuarios.map(u => `
        <tr>
            <td><strong>${u.nome}</strong></td>
            <td>${u.matricula}</td>
            <td>
                <span class="badge ${perfilBadge[u.perfil] || 'bg-secondary'}">
                    ${perfilNome[u.perfil] || u.perfil}
                </span>
            </td>
            <td>
                <span class="badge ${u.ativo === 'S' ? 'bg-success' : 'bg-danger'}">
                    ${u.ativo === 'S' ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-warning" title="Editar"
                    onclick="abrirEdicaoUsuario(${u.id}, '${u.nome}', '${u.matricula}', '${u.perfil}', '${u.ativo}')">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ===================== USUÁRIOS — PESQUISA =====================
function filtrarUsuarios() {
    const termo = document.getElementById('campoPesquisaUsuario').value.toLowerCase().trim();
    if (!termo) {
        renderizarTabela(listaUsuarios);
        return;
    }
    const filtrados = listaUsuarios.filter(u =>
        u.nome.toLowerCase().includes(termo) ||
        u.matricula.toLowerCase().includes(termo)
    );
    renderizarTabela(filtrados);
}

// ===================== USUÁRIOS — INCLUIR =====================
async function salvarUsuario() {
    const nome      = document.getElementById('novoNome').value.trim();
    const matricula = document.getElementById('novaMatricula').value.trim();
    const senha     = document.getElementById('novaSenha').value.trim();
    const perfil    = document.getElementById('novoPerfil').value;
    const msgErro    = document.getElementById('msgErroUsuario');
    const msgSucesso = document.getElementById('msgSucessoUsuario');
    msgErro.classList.add('d-none');
    msgErro.textContent = '';
    msgSucesso.classList.add('d-none');
    msgSucesso.textContent = '';
    if (!nome || !matricula || !senha || !perfil) {
        msgErro.textContent = 'Preencha todos os campos obrigatórios.';
        msgErro.classList.remove('d-none');
        return;
    }
    try {
        const resposta = await fetch('https://controlepatrimonio.onrender.com/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, matricula, senha, perfil })
        });
        const dados = await resposta.json();
        if (dados.sucesso) {
            msgSucesso.textContent = dados.mensagem;
            msgSucesso.classList.remove('d-none');
            document.getElementById('formNovoUsuario').reset();
            carregarUsuarios();
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('modalNovoUsuario')).hide();
                msgSucesso.classList.add('d-none');
            }, 1500);
        } else {
            msgErro.textContent = dados.mensagem;
            msgErro.classList.remove('d-none');
        }
    } catch (erro) {
        msgErro.textContent = 'Erro ao conectar com o servidor.';
        msgErro.classList.remove('d-none');
    }
}

// ===================== USUÁRIOS — ABRIR MODAL EDITAR =====================
function abrirEdicaoUsuario(id, nome, matricula, perfil, ativo) {
    document.getElementById('editarId').value = id;
    document.getElementById('editarNome').value = nome;
    document.getElementById('editarMatricula').value = matricula;
    document.getElementById('editarPerfil').value = perfil;
    document.getElementById('editarAtivo').checked = (ativo === 'S');
    document.getElementById('editarSenha').value = '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditarUsuario')).show();
}

// ===================== USUÁRIOS — SALVAR EDIÇÃO =====================
async function salvarEdicaoUsuario() {
    const id        = document.getElementById('editarId').value;
    const nome      = document.getElementById('editarNome').value.trim();
    const matricula = document.getElementById('editarMatricula').value.trim();
    const senha     = document.getElementById('editarSenha').value.trim();
    const perfil    = document.getElementById('editarPerfil').value;
    const ativo     = document.getElementById('editarAtivo').checked ? 'S' : 'N';

    try {
        const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, matricula, senha, perfil, ativo })
        });
        const dados = await resposta.json();

        if (dados.sucesso) {
            bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario')).hide();
            carregarUsuarios();
        } else {
            alert(dados.mensagem);
        }
    } catch (erro) {
        alert('Erro ao conectar com o servidor.');
    }
}