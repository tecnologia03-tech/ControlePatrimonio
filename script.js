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

// ===================== NAVEGAÇÃO =====================
// Responsável por alternar entre as seções do sistema.
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
      labels: [
        'Computadores',
        'Impressoras',
        'Câmeras de Segurança',
        'Instrumentos Musicais'
      ],
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

// ===================== USUÁRIOS - VARIÁVEL GLOBAL =====================
let listaUsuarios = [];
let listaUsuariosFiltrada = [];


// ===================== USUÁRIOS - CARREGAR DA API =====================
async function carregarUsuarios() {
  const tbody = document.getElementById('tabelaUsuarios');
  if (!tbody) {
    console.error('tbody tabelaUsuarios não encontrado');
    return;
  }

  tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Carregando usuários...</td></tr>';

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/usuarios');

    if (!resposta.ok) {
      throw new Error('Falha na requisição: ' + resposta.status);
    }

    const dados = await resposta.json();
    console.log('dados usuários:', dados);

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

// ===================== USUÁRIOS - RENDERIZAR LISTA =====================
function renderizarUsuarios(lista) {
  const tbody = document.getElementById('tabelaUsuarios');
  if (!tbody) {
    console.error('tbody tabelaUsuarios não encontrado');
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

// ===================== USUÁRIOS - FILTRAR =====================
// Filtra usuários por nome ou matrícula.
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

// ===================== USUÁRIOS - MODAL INCLUIR =====================
// Abre o modal de inclusão e limpa os campos anteriores.
function abrirModalIncluirUsuario() {
  document.getElementById('formIncluirUsuario').reset();
  document.getElementById('msgIncluirUsuario').textContent = '';
  document.getElementById('modalIncluirUsuario').style.display = 'flex';
}

// Fecha o modal de inclusão.
function fecharModalIncluirUsuario() {
  document.getElementById('modalIncluirUsuario').style.display = 'none';
}

// ===================== USUÁRIOS - CADASTRAR =====================
// Valida os campos e envia os dados do novo usuário para a API.
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

// ===================== USUÁRIOS - MODAL EDITAR =====================
// Abre o modal de edição preenchendo os campos com os dados do usuário selecionado.
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

// ===================== USUARIOS - EDITAR ===================== //
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
    const resposta = await fetch(
      `https://controlepatrimonio.onrender.com/api/usuarios/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome,
          matricula,
          senha,
          perfil,
          ativo
        })
      }
    );

    const dados = await resposta.json();

    if (!dados.sucesso) {
      msg.textContent = dados.mensagem;
      return;
    }

    fecharModalEditarUsuario();
    await carregarUsuarios();

  } catch (erro) {
    console.error(erro);
    msg.textContent = 'Erro ao conectar com o servidor.';
  }
}

// ===================== USUARIOS - INATIVAR ===================== //
let checkboxAtivoUsuario = null;


function confirmarInativacaoCheckbox(checkbox) {

  if (checkbox.checked) {
    return;
  }

  checkboxAtivoUsuario = checkbox;

  document.getElementById('modalConfirmarInativacao').style.display = 'flex';
}

function abrirModalConfirmarInativacao(id) {
  idUsuarioInativar = id;
  document.getElementById('modalConfirmarInativacao').style.display = 'flex';
}

function fecharModalConfirmacao() {

  document.getElementById('modalConfirmarInativacao').style.display = 'none';

  if (checkboxAtivoUsuario) {
    checkboxAtivoUsuario.checked = true;
  }

  checkboxAtivoUsuario = null;
}

async function confirmarInativacao() {

  document.getElementById('modalConfirmarInativacao').style.display = 'none';

  if (checkboxAtivoUsuario) {
    checkboxAtivoUsuario.checked = false;
  }

  checkboxAtivoUsuario = null;

  try {
    const resposta = await fetch(getApiUrl(`/api/usuarios/${idUsuarioInativar}`), {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (!dados.sucesso) {
      alert(dados.mensagem || 'Erro ao inativar usuário.');
      return;
    }

    await carregarUsuarios();

  } catch (erro) {
    alert('Erro ao conectar com o servidor.');
  }
}


// ===================== SETORES - VARIÁVEIS GLOBAIS =====================
// Lista completa de setores recebida da API
let listaSetores = [];

// Lista usada para exibição, podendo ser filtrada pela busca
let listaSetoresFiltrada = [];

// Armazena o ID do setor selecionado para exclusão
let idSetorParaExcluir = null;


// ===================== SETORES - CARREGAR DA API =====================
// Busca a lista de setores na API e exibe na tabela
async function carregarSetores() {
  const tbody = document.getElementById('tabelaSetores');
  if (!tbody) return;

  // Exibe mensagem de carregamento enquanto aguarda a resposta da API
  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center text-muted py-4">
        <i class="bi bi-arrow-repeat me-2"></i>Carregando setores...
      </td>
    </tr>`;

  try {
    // Faz a requisição GET para listar os setores
    const resposta = await fetch(getApiUrl('/api/setores'));
    const dados = await resposta.json();

    if (!dados.sucesso) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">${dados.mensagem || 'Erro ao carregar setores.'}</td></tr>`;
      return;
    }

    // Salva a lista completa e inicializa a lista filtrada com todos os registros
    listaSetores = dados.locais || [];
    listaSetoresFiltrada = [...listaSetores];

    // Renderiza os setores na tabela
    renderizarSetores(listaSetoresFiltrada);

  } catch (erro) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4"><i class="bi bi-wifi-off me-2"></i>Erro ao conectar com o servidor.</td></tr>`;
  }
}


// ===================== SETORES - RENDERIZAR TABELA =====================
// Recebe uma lista de setores e monta as linhas da tabela dinamicamente
function renderizarSetores(setores) {
  const tbody = document.getElementById('tabelaSetores');
  if (!tbody) return;

  // Exibe mensagem caso não haja registros para mostrar
  if (!setores.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Nenhum setor encontrado.</td></tr>`;
    return;
  }

  // Gera uma linha HTML para cada setor da lista
  tbody.innerHTML = setores.map((setor, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${setor.nome_local || '-'}</td>
      <td>${setor.sala_aula === 'S'
        ? '<span class="badge-status-ativo">Sim</span>'
        : '<span class="badge-inativo">Não</span>'}</td>
      <td>
        <button class="btn-editar-usuario me-1" onclick="abrirModalEditarSetor(${setor.id_local})">Editar</button>
        <button class="btn btn-sm btn-outline-danger" onclick="abrirModalExclusaoSetor(${setor.id_local})">Excluir</button>
      </td>
    </tr>
  `).join('');
}


// ===================== SETORES - FILTRAR =====================
// Filtra a lista de setores pelo nome digitado na busca
function filtrarSetores(termo) {
  const filtro = (termo || '').toLowerCase().trim();

  listaSetoresFiltrada = listaSetores.filter(setor =>
    (setor.nome_local || '').toLowerCase().includes(filtro)
  );

  renderizarSetores(listaSetoresFiltrada);
}


// ===================== SETORES - MODAL INCLUIR =====================
// Abre o modal de inclusão de novo setor com os campos limpos
function abrirModalIncluirSetor() {
  document.getElementById('incluirNomeSetor').value = '';
  document.getElementById('incluirSalaAula').value = 'N';

  // Oculta mensagem de erro de tentativas anteriores
  const msg = document.getElementById('msgErroIncluirSetor');
  if (msg) {
    msg.style.display = 'none';
    msg.textContent = '';
  }

  document.getElementById('modalIncluirSetor').style.display = 'flex';
}

// Fecha o modal de inclusão de setor
function fecharModalIncluirSetor() {
  document.getElementById('modalIncluirSetor').style.display = 'none';
}

// Envia os dados do formulário para a API e salva o novo setor
async function salvarSetor() {
  // Captura os valores digitados no formulário
  const nome_local = document.getElementById('incluirNomeSetor').value.trim();
  const sala_aula = document.getElementById('incluirSalaAula').value;
  const msgErro = document.getElementById('msgErroIncluirSetor');

  // Validação do campo obrigatório
  if (!nome_local) {
    msgErro.textContent = 'Informe o nome do setor.';
    msgErro.style.display = 'block';
    return;
  }

  msgErro.style.display = 'none';

  try {
    // Envia os dados para a API via POST
    const resposta = await fetch(getApiUrl('/api/setores'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_local, sala_aula })
    });

    const dados = await resposta.json();

    if (!dados.sucesso) {
      msgErro.textContent = dados.mensagem || 'Erro ao salvar setor.';
      msgErro.style.display = 'block';
      return;
    }

    // Fecha o modal e recarrega a tabela após salvar com sucesso
    fecharModalIncluirSetor();
    await carregarSetores();

  } catch (erro) {
    msgErro.textContent = 'Erro ao conectar com o servidor.';
    msgErro.style.display = 'block';
  }
}


// ===================== SETORES - MODAL EDITAR =====================
// Abre o modal de edição preenchendo os campos com os dados do setor selecionado
function abrirModalEditarSetor(id) {
  // Busca o setor na lista local pelo ID recebido
  const setor = listaSetores.find(item => item.id_local === id);
  if (!setor) return;

  // Preenche os campos do modal com os dados atuais do setor
  document.getElementById('editarIdSetor').value = setor.id_local;
  document.getElementById('editarNomeSetor').value = setor.nome_local || '';
  document.getElementById('editarSalaAula').value = setor.sala_aula || 'N';

  // Oculta mensagem de erro de tentativas anteriores
  const msg = document.getElementById('msgErroEditarSetor');
  if (msg) {
    msg.style.display = 'none';
    msg.textContent = '';
  }

  document.getElementById('modalEditarSetor').style.display = 'flex';
}

// Fecha o modal de edição de setor
function fecharModalEditarSetor() {
  document.getElementById('modalEditarSetor').style.display = 'none';
}

// Envia os dados alterados para a API e atualiza o setor
async function atualizarSetor() {
  // Captura os valores dos campos do modal de edição
  const id = document.getElementById('editarIdSetor').value;
  const nome_local = document.getElementById('editarNomeSetor').value.trim();
  const sala_aula = document.getElementById('editarSalaAula').value;
  const msgErro = document.getElementById('msgErroEditarSetor');

  // Validação do campo obrigatório
  if (!nome_local) {
    msgErro.textContent = 'Informe o nome do setor.';
    msgErro.style.display = 'block';
    return;
  }

  msgErro.style.display = 'none';

  try {
    // Envia os dados atualizados para a API via PUT, passando o ID na URL
    const resposta = await fetch(getApiUrl(`/api/setores/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_local, sala_aula })
    });

    const dados = await resposta.json();

    if (!dados.sucesso) {
      msgErro.textContent = dados.mensagem || 'Erro ao atualizar setor.';
      msgErro.style.display = 'block';
      return;
    }

    // Fecha o modal e recarrega a tabela após atualizar com sucesso
    fecharModalEditarSetor();
    await carregarSetores();

  } catch (erro) {
    msgErro.textContent = 'Erro ao conectar com o servidor.';
    msgErro.style.display = 'block';
  }
}


// ===================== SETORES - MODAL EXCLUIR =====================
// Abre o modal de confirmação de exclusão de setor
function abrirModalExclusaoSetor(id) {
  // Salva o ID do setor que será excluído na variável global
  idSetorParaExcluir = id;
  document.getElementById('modalConfirmarExclusaoSetor').style.display = 'flex';
}

// Fecha o modal de confirmação de exclusão
function fecharModalExclusaoSetor() {
  idSetorParaExcluir = null;
  document.getElementById('modalConfirmarExclusaoSetor').style.display = 'none';
}

// Confirma a exclusão do setor e envia a requisição para a API
async function confirmarExclusaoSetor() {
  if (!idSetorParaExcluir) return;

  try {
    // Envia a requisição DELETE para a API, passando o ID do setor na URL
    const resposta = await fetch(getApiUrl(`/api/setores/${idSetorParaExcluir}`), {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    // Fecha o modal independentemente do resultado
    fecharModalExclusaoSetor();

    if (!dados.sucesso) {
      // Exibe a mensagem de erro retornada pela API
      // (ex: setor vinculado a patrimônios ou movimentações)
      alert(dados.mensagem || 'Erro ao excluir setor.');
      return;
    }

    // Recarrega a tabela após excluir com sucesso
    await carregarSetores();

  } catch (erro) {
    fecharModalExclusaoSetor();
    alert('Erro ao conectar com o servidor.');
  }
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

  if (paginasProtegidas.includes(paginaAtual) && usuarioLogado !== 'true') {
    window.location.href = 'index.html';
    return;
  }

  if (paginaAtual === 'index.html' && usuarioLogado === 'true') {
    window.location.href = 'dashboard.html';
    return;
  }

  if (document.getElementById('graficoCategoria')) {
    renderizarGrafico();
  }

  if (document.getElementById('tabelaUsuarios')) {
    carregarUsuarios();
  }

});