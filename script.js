// ===================== LOGIN =====================
// Responsável por autenticar o usuário no sistema.
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
  sessionStorage.setItem('usuarioLogado', 'true');
  sessionStorage.setItem('nomeUsuario', dados.nome || '');
  sessionStorage.setItem('perfilUsuario', dados.perfil || '');

  window.location.href = 'dashboard.html';
    } else {
      msgErro.textContent = dados.mensagem;
    }
  } catch (erro) {
    msgErro.textContent = 'Erro ao conectar com o servidor.';
  }
}

// ===================== LOGOUT =====================
// Responsável por voltar para a tela de login.
function fazerLogout() {
  sessionStorage.removeItem('usuarioLogado');
  sessionStorage.removeItem('nomeUsuario');
  sessionStorage.removeItem('perfilUsuario');

  window.location.href = 'index.html';
}

// ===================== TOGGLE SIDEBAR =====================
// Responsável por abrir e fechar o menu lateral.
function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('fechado');
}

// ===================== NAVEGACAO =====================
// Responsavel por alternar entre as secoes do sistema.
function mostrarConteudo(idConteudo, elementoMenu) {
  document.querySelectorAll('.conteudo-secao').forEach(secao => {
    secao.classList.remove('ativo');
  });

  document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.classList.remove('ativo');
  });

  const secao = document.getElementById(idConteudo + '-content');
  if (secao) {
    secao.classList.add('ativo');
  }

  if (elementoMenu && elementoMenu.parentElement) {
    elementoMenu.parentElement.classList.add('ativo');
  }

  const titulos = {
    dashboard: 'Dashboard',
    patrimonio: 'Gestão de Patrimônios',
    usuarios: 'Cadastro de Usuários',
    relatorios: 'Relatórios Gerenciais'
  };

  const topbar = document.querySelector('.topbar-titulo');
  if (topbar) {
    topbar.textContent = titulos[idConteudo] || 'Dashboard';
  }

  if (idConteudo === 'usuarios') {
    carregarUsuarios();
  }
}

// ===================== GRÁFICO =====================
// Renderiza o gráfico do dashboard.
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
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => 'R$ ' + value.toLocaleString('pt-BR')
          }
        }
      }
    }
  });
}

// ===================== USUARIOS - VARIAVEL GLOBAL =====================
let listaUsuarios = [];
let listaUsuariosFiltrada = [];

// ===================== USUARIOS - CARREGAR DA API =====================
async function carregarUsuarios() {
  const tbody = document.getElementById('tabelaUsuarios');
  if (!tbody) {
    console.error('tbody tabelaUsuarios nao encontrado');
    return;
  }

  tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Carregando usuários...</td></tr>';

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/usuarios');

    if (!resposta.ok) {
      throw new Error('Falha na requisição: ' + resposta.status);
    }

    const dados = await resposta.json();
    console.log('dados usuarios:', dados);

    if (!dados.sucesso) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">' + dados.mensagem + '</td></tr>';
      return;
    }

    listaUsuarios = dados.usuarios || [];
    listaUsuariosFiltrada = [...listaUsuarios];
    renderizarUsuarios(listaUsuariosFiltrada);

  } catch (erro) {
    console.error('Erro ao carregar usuários:', erro);
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Erro ao conectar com o servidor.</td></tr>';
  }
}

// ===================== USUARIOS - RENDERIZAR LISTA =====================
function renderizarUsuarios(lista) {
  const tbody = document.getElementById('tabelaUsuarios');
  if (!tbody) {
    console.error('tbody tabelaUsuarios nao encontrado');
    return;
  }

  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Nenhum usuário cadastrado.</td></tr>';
    return;
  }

  const mapPerfil = { 'A': 'Administrador', 'O': 'Operador', 'V': 'Visualizador' };

  tbody.innerHTML = lista.map(usuario => {
    const perfil = mapPerfil[usuario.perfil] || usuario.perfil;
    const status = usuario.ativo === 'S'
      ? '<span class="badge-ativo">Ativo</span>'
      : '<span class="badge-inativo">Inativo</span>';

    return `
      <tr>
        <td>${usuario.nome}</td>
        <td>${usuario.matricula}</td>
        <td>${perfil}</td>
        <td>${status}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarUsuario(${usuario.id})">Editar</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ===================== USUARIOS - FILTRAR =====================
// Filtra usuarios por nome ou matricula.
function filtrarUsuarios() {
  const termo = document.getElementById('buscaUsuario').value.trim().toLowerCase();

  if (!termo) {
    listaUsuariosFiltrada = [...listaUsuarios];
    renderizarUsuarios(listaUsuariosFiltrada);
    return;
  }

  listaUsuariosFiltrada = listaUsuarios.filter(u =>
    (u.nome && u.nome.toLowerCase().includes(termo)) ||
    (u.matricula && String(u.matricula).toLowerCase().includes(termo))
  );

  renderizarUsuarios(listaUsuariosFiltrada);
}

// ===================== USUARIOS - MODAL INCLUIR =====================
// Abre o modal de inclusao e limpa os campos anteriores.
function abrirModalIncluirUsuario() {
  document.getElementById('formIncluirUsuario').reset();
  document.getElementById('msgIncluirUsuario').textContent = '';
  document.getElementById('modalIncluirUsuario').style.display = 'flex';
}

// Fecha o modal de inclusao.
function fecharModalIncluirUsuario() {
  document.getElementById('modalIncluirUsuario').style.display = 'none';
}

// ===================== USUARIOS - CADASTRAR =====================
// Valida os campos e envia os dados do novo usuario para a API.
async function salvarUsuario() {
  const nome = document.getElementById('nomeUsuario').value.trim();
  const matricula = document.getElementById('matriculaUsuario').value.trim();
  const senha = document.getElementById('senhaUsuario').value.trim();
  const perfil = document.getElementById('perfilUsuario').value;
  const msg = document.getElementById('msgIncluirUsuario');

  msg.textContent = '';

  if (!nome || !matricula || !senha || !perfil) {
    msg.textContent = 'Todos os campos são obrigatórios.';
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
      fecharModalIncluirUsuario();
      carregarUsuarios();
    } else {
      msg.textContent = dados.mensagem;
    }
  } catch (erro) {
    msg.textContent = 'Erro ao cadastrar usuário.';
  }
}

// ===================== USUARIOS - MODAL EDITAR =====================
// Abre o modal de edicao preenchendo os campos com os dados do usuario selecionado.
function abrirModalEditarUsuario(id) {
  const usuario = listaUsuarios.find(u => u.id === id);
  if (!usuario) return;

  document.getElementById('editUsuarioId').value = usuario.id;
  document.getElementById('editNomeUsuario').value = usuario.nome;
  document.getElementById('editMatriculaUsuario').value = usuario.matricula;
  document.getElementById('editSenhaUsuario').value = '';
  document.getElementById('editPerfilUsuario').value = usuario.perfil;
  document.getElementById('editAtivoUsuario').checked = usuario.ativo === 'S';
  document.getElementById('msgEditarUsuario').textContent = '';

  document.getElementById('modalEditarUsuario').style.display = 'flex';
}

// Fecha o modal de edicao.
function fecharModalEditarUsuario() {
  document.getElementById('modalEditarUsuario').style.display = 'none';
}

// ===================== USUARIOS - EDITAR =====================
// Valida os campos e envia a atualizacao do usuario para a API.
async function salvarEdicaoUsuario() {
  const id = document.getElementById('editUsuarioId').value;
  const nome = document.getElementById('editNomeUsuario').value.trim();
  const matricula = document.getElementById('editMatriculaUsuario').value.trim();
  const senha = document.getElementById('editSenhaUsuario').value.trim();
  const perfil = document.getElementById('editPerfilUsuario').value;
  const ativo = document.getElementById('editAtivoUsuario').checked ? 'S' : 'N';
  const msg = document.getElementById('msgEditarUsuario');

  msg.textContent = '';

  if (!nome || !matricula || !perfil) {
    msg.textContent = 'Preencha todos os campos obrigatórios.';
    return;
  }

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/usuarios/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, matricula, senha, perfil, ativo })
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      fecharModalEditarUsuario();
      carregarUsuarios();
    } else {
      msg.textContent = dados.mensagem;
    }
  } catch (erro) {
    msg.textContent = 'Erro ao atualizar usuário.';
  }
}

// ===== CONFIRMAR INATIVACAO =====
let deveInativarUsuario = false;

function confirmarInativacaoCheckbox(checkbox) {
  if (!checkbox.checked) {
    checkbox.checked = true;
    document.getElementById('modalConfirmarInativacao').style.display = 'flex';
  }
}

function cancelarInativacao() {
  document.getElementById('modalConfirmarInativacao').style.display = 'none';
  deveInativarUsuario = false;
}

async function confirmarInativacaoDefinitivo() {
  document.getElementById('modalConfirmarInativacao').style.display = 'none';
  deveInativarUsuario = true;
  
  const checkbox = document.querySelector('#editAtivoUsuario');
  checkbox.checked = false;
}

document.addEventListener('DOMContentLoaded', () => {
  const caminho = window.location.pathname;
  const paginaAtual = caminho.substring(caminho.lastIndexOf('/') + 1) || 'index.html';
  const usuarioLogado = sessionStorage.getItem('usuarioLogado');

  const paginasProtegidas = [
    'dashboard.html',
    'usuario.html',
    'categoria.html',
    'setor.html',
    'responsavel.html',
    'patrimonio.html',
    'movimentacao.html',
    'manutencao.html',
    'relatorio.html'
  ];

  // Se está em página protegida sem sessão → manda para login
  if (paginasProtegidas.includes(paginaAtual) && usuarioLogado !== 'true') {
    window.location.href = 'index.html';
    return;
  }

  // Se está no login com sessão ativa → manda para dashboard
  if (paginaAtual === 'index.html' && usuarioLogado === 'true') {
    window.location.href = 'dashboard.html';
    return;
  }

  // Inicializa gráfico se estiver no dashboard
  if (document.getElementById('graficoCategoria')) {
    renderizarGrafico();
  }

  // Inicializa tabela de usuários se estiver na página de usuários
  if (document.getElementById('tabelaUsuarios')) {
    carregarUsuarios();
  }
});