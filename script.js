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
// Responsável por voltar para a tela de login.
function fazerLogout() {
  document.getElementById('telaDashboard').style.display = 'none';
  document.getElementById('telaLogin').classList.remove('oculto');
}

// ===================== TOGGLE SIDEBAR =====================
// Responsável por abrir e fechar o menu lateral.
function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('fechado');
}

// ===================== NAVEGAÇÃO =====================
// Responsável por alternar as telas internas do sistema.
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

// ===================== USUÁRIOS — VARIÁVEL GLOBAL =====================
// Armazena os usuários carregados da API.
let listaUsuarios = [];

// ===================== USUÁRIOS — CARREGAR DA API =====================
// Busca os usuários cadastrados no backend e monta a tabela.
async function carregarUsuarios() {
  const tbody = document.getElementById('tabelaUsuarios');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted py-4">Carregando usuários...</td>
    </tr>
  `;

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/usuarios');
    const dados = await resposta.json();

    if (!dados.sucesso) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger py-4">${dados.mensagem}</td>
        </tr>
      `;
      return;
    }

    listaUsuarios = dados.usuarios;

    if (listaUsuarios.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">Nenhum usuário cadastrado.</td>
        </tr>
      `;
      return;
    }

    const mapPerfil = {
      'A': 'Administrador',
      'O': 'Operador',
      'V': 'Visualizador'
    };

    tbody.innerHTML = listaUsuarios.map(usuario => `
      <tr>
        <td>${usuario.nome}</td>
        <td>${usuario.matricula}</td>
        <td>${mapPerfil[usuario.perfil] || usuario.perfil}</td>
        <td>
          <span class="${usuario.ativo === 'S' ? 'badge-ativo' : 'badge-inativo'}">
            ${usuario.ativo === 'S' ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarUsuario(${usuario.id})">
              Editar
            </button>
            ${usuario.ativo === 'S' ? `
              <button class="btn btn-sm btn-outline-danger" onclick="inativarUsuario(${usuario.id})">
                Inativar
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');

  } catch (erro) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger py-4">Erro ao conectar com o servidor.</td>
      </tr>
    `;
  }
}

// ===================== USUÁRIOS — MODAL INCLUIR =====================
// Abre o modal de inclusão e limpa os campos.
function abrirModalIncluirUsuario() {
  document.getElementById('formIncluirUsuario').reset();
  document.getElementById('msgIncluirUsuario').textContent = '';
  document.getElementById('modalIncluirUsuario').style.display = 'flex';
}

// Fecha o modal de inclusão.
function fecharModalIncluirUsuario() {
  document.getElementById('modalIncluirUsuario').style.display = 'none';
}

// ===================== USUÁRIOS — CADASTRAR =====================
// Envia os dados do novo usuário para a API.
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

// ===================== USUÁRIOS — MODAL EDITAR =====================
// Abre o modal de edição preenchendo os campos com os dados existentes.
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

// Fecha o modal de edição.
function fecharModalEditarUsuario() {
  document.getElementById('modalEditarUsuario').style.display = 'none';
}

// ===================== USUÁRIOS — EDITAR =====================
// Envia a atualização do usuário para a API.
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
    const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/usuarios/${id}`, {
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

// ===================== USUÁRIOS — INATIVAR =====================
// Inativa o usuário sem removê-lo fisicamente do banco.
async function inativarUsuario(id) {
  const confirmar = confirm('Deseja realmente inativar este usuário?');
  if (!confirmar) return;

  try {
    const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/usuarios/${id}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      carregarUsuarios();
    } else {
      alert(dados.mensagem);
    }
  } catch (erro) {
    alert('Erro ao inativar usuário.');
  }
}