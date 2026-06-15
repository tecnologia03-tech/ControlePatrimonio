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
    const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, matricula, senha, perfil, ativo })
    });

    const dados = await resposta.json();

    if (!dados.sucesso) {
      msg.textContent = dados.mensagem || 'Erro ao salvar alterações.';
      return;
    }

    fecharModalEditarUsuario();
    await carregarUsuarios();
  } catch (erro) {
    console.error('Erro ao salvar edição do usuário:', erro);
    msg.textContent = 'Erro ao salvar alterações do usuário.';
  }
}

// ===================== USUARIOS - INATIVAR ===================== //
let checkboxAtivoUsuario = null;
let idUsuarioInativar = null;

function confirmarInativacaoCheckbox(checkbox) {
  if (checkbox.checked) return;

  checkboxAtivoUsuario = checkbox;
  idUsuarioInativar = document.getElementById('editUsuarioId').value;
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
  idUsuarioInativar = null;
}

function confirmarInativacao() {
  document.getElementById('modalConfirmarInativacao').style.display = 'none';

  if (checkboxAtivoUsuario) {
    checkboxAtivoUsuario.checked = false;
  }

  checkboxAtivoUsuario = null;
}

// ===================== LOCAIS - VARIÁVEIS GLOBAIS ===================== //
let listaLocais = [];
let listaLocaisFiltrada = [];
let idLocalParaExcluir = null;

// ===================== LOCAIS - CARREGAR ===================== //
async function carregarLocais() {
  const tbody = document.getElementById('tabelaLocais');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center text-muted py-4">
        <i class="bi bi-arrow-repeat me-2"></i>Carregando locais...
      </td>
    </tr>
  `;

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/locais');
    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-danger py-4">
            ${dados.mensagem || 'Erro ao carregar locais.'}
          </td>
        </tr>
      `;
      return;
    }

    listaLocais = dados.locais || [];
    listaLocaisFiltrada = [...listaLocais];
    renderizarLocais(listaLocaisFiltrada);
  } catch (erro) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-danger py-4">
          <i class="bi bi-wifi-off me-2"></i>Erro ao conectar com o servidor.
        </td>
      </tr>
    `;
  }
}

// ===================== LOCAIS - RENDERIZAR ===================== //
function renderizarLocais(locais) {
  const tbody = document.getElementById('tabelaLocais');
  if (!tbody) return;

  if (!locais.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted py-4">
          Nenhum local encontrado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = locais.map((local, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${local.nome}</td>
      <td>
        ${local.sala_aula === 'S'
          ? '<span class="badge-status-ativo">Sim</span>'
          : '<span class="badge-inativo">Não</span>'}
      </td>
      <td>
        <div class="acoes-tabela">
          <button class="btn-editar-usuario" onclick="abrirModalEditarLocal(${local.id})">Editar</button>
          <button class="btn btn-sm btn-outline-danger" onclick="abrirModalExclusaoLocal(${local.id})">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===================== LOCAIS - FILTRO ===================== //
function filtrarLocais(termo) {
  const filtro = (termo || '').trim().toLowerCase();

  if (!filtro) {
    listaLocaisFiltrada = [...listaLocais];
  } else {
    listaLocaisFiltrada = listaLocais.filter(local =>
      (local.nome || '').toLowerCase().includes(filtro)
    );
  }

  renderizarLocais(listaLocaisFiltrada);
}

// ===================== LOCAIS - MODAL INCLUIR ===================== //
function abrirModalIncluirLocal() {
  document.getElementById('incluirNomeLocal').value = '';
  document.getElementById('incluirSalaAula').value = 'N';

  const msg = document.getElementById('msgErroIncluirLocal');
  msg.style.display = 'none';
  msg.textContent = '';

  document.getElementById('modalIncluirLocal').style.display = 'flex';
}

function fecharModalIncluirLocal() {
  document.getElementById('modalIncluirLocal').style.display = 'none';
}

async function salvarLocal() {
  const nome = document.getElementById('incluirNomeLocal').value.trim();
  const sala_aula = document.getElementById('incluirSalaAula').value;
  const msg = document.getElementById('msgErroIncluirLocal');

  msg.style.display = 'none';
  msg.textContent = '';

  if (!nome) {
    msg.textContent = 'Informe o nome do local.';
    msg.style.display = 'block';
    return;
  }

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/locais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, sala_aula })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      msg.textContent = dados.mensagem || 'Erro ao salvar local.';
      msg.style.display = 'block';
      return;
    }

    fecharModalIncluirLocal();
    await carregarLocais();
  } catch (erro) {
    msg.textContent = 'Erro ao conectar com o servidor.';
    msg.style.display = 'block';
  }
}

// ===================== LOCAIS - MODAL EDITAR ===================== //
function abrirModalEditarLocal(id) {
  const local = listaLocais.find(item => item.id === id);
  if (!local) return;

  document.getElementById('editarIdLocal').value = local.id;
  document.getElementById('editarNomeLocal').value = local.nome;
  document.getElementById('editarSalaAula').value = local.sala_aula || 'N';

  const msg = document.getElementById('msgErroEditarLocal');
  msg.style.display = 'none';
  msg.textContent = '';

  document.getElementById('modalEditarLocal').style.display = 'flex';
}

function fecharModalEditarLocal() {
  document.getElementById('modalEditarLocal').style.display = 'none';
}

async function atualizarLocal() {
  const id = document.getElementById('editarIdLocal').value;
  const nome = document.getElementById('editarNomeLocal').value.trim();
  const sala_aula = document.getElementById('editarSalaAula').value;
  const msg = document.getElementById('msgErroEditarLocal');

  msg.style.display = 'none';
  msg.textContent = '';

  if (!nome) {
    msg.textContent = 'Informe o nome do local.';
    msg.style.display = 'block';
    return;
  }

  try {
    const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/locais/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, sala_aula })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      msg.textContent = dados.mensagem || 'Erro ao atualizar local.';
      msg.style.display = 'block';
      return;
    }

    fecharModalEditarLocal();
    await carregarLocais();
  } catch (erro) {
    msg.textContent = 'Erro ao conectar com o servidor.';
    msg.style.display = 'block';
  }
}

// ===================== LOCAIS - EXCLUSÃO ===================== //
function abrirModalExclusaoLocal(id) {
  idLocalParaExcluir = id;
  document.getElementById('modalConfirmarExclusaoLocal').style.display = 'flex';
}

function fecharModalExclusaoLocal() {
  idLocalParaExcluir = null;
  document.getElementById('modalConfirmarExclusaoLocal').style.display = 'none';
}

async function confirmarExclusaoLocal() {
  if (!idLocalParaExcluir) return;

  try {
    const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/locais/${idLocalParaExcluir}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();
    fecharModalExclusaoLocal();

    if (!resposta.ok || !dados.sucesso) {
      alert(dados.mensagem || 'Erro ao excluir local.');
      return;
    }

    await carregarLocais();
  } catch (erro) {
    fecharModalExclusaoLocal();
    alert('Erro ao conectar com o servidor.');
  }
}


/* =========================================================
   CATEGORIAS
   ---------------------------------------------------------
   Este bloco controla toda a tela de categorias:
   - carregamento da listagem
   - filtro local por nome
   - inclusão
   - edição
   - exclusão
   ========================================================= */

let listaCategorias = [];
let listaCategoriasFiltrada = [];
let idCategoriaParaExcluir = null;

/* Busca todas as categorias cadastradas na API */
async function carregarCategorias() {
  const tbody = document.getElementById('tabelaCategorias');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="3" class="text-center text-muted py-4">
        <i class="bi bi-arrow-repeat me-2"></i>Carregando categorias...
      </td>
    </tr>
  `;

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/categorias');
    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-danger py-4">
            ${dados.mensagem || 'Erro ao carregar categorias.'}
          </td>
        </tr>
      `;
      return;
    }

    listaCategorias = dados.categorias || [];
    listaCategoriasFiltrada = [...listaCategorias];
    renderizarCategorias(listaCategoriasFiltrada);
  } catch (erro) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center text-danger py-4">
          <i class="bi bi-wifi-off me-2"></i>Erro ao conectar com o servidor.
        </td>
      </tr>
    `;
  }
}

/* Renderiza a tabela de categorias no HTML */
function renderizarCategorias(categorias) {
  const tbody = document.getElementById('tabelaCategorias');
  if (!tbody) return;

  if (!categorias.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center text-muted py-4">
          Nenhuma categoria encontrada.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = categorias.map((categoria, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${categoria.nome}</td>
      <td>
        <div class="acoes-tabela">
          <button class="btn-editar-usuario" onclick="abrirModalEditarCategoria(${categoria.id})">Editar</button>
          <button class="btn btn-sm btn-outline-danger" onclick="abrirModalExclusaoCategoria(${categoria.id})">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* Filtra a lista em memória para melhorar a experiência da busca */
function filtrarCategorias(termo) {
  const filtro = (termo || '').trim().toLowerCase();

  if (!filtro) {
    listaCategoriasFiltrada = [...listaCategorias];
  } else {
    listaCategoriasFiltrada = listaCategorias.filter(categoria =>
      (categoria.nome || '').toLowerCase().includes(filtro)
    );
  }

  renderizarCategorias(listaCategoriasFiltrada);
}

/* ===================== MODAL DE INCLUSÃO ===================== */

function abrirModalIncluirCategoria() {
  document.getElementById('incluirNomeCategoria').value = '';

  const msg = document.getElementById('msgErroIncluirCategoria');
  msg.style.display = 'none';
  msg.textContent = '';

  document.getElementById('modalIncluirCategoria').style.display = 'flex';
}

function fecharModalIncluirCategoria() {
  document.getElementById('modalIncluirCategoria').style.display = 'none';
}

async function salvarCategoria() {
  const nome = document.getElementById('incluirNomeCategoria').value.trim();
  const msg = document.getElementById('msgErroIncluirCategoria');

  msg.style.display = 'none';
  msg.textContent = '';

  if (!nome) {
    msg.textContent = 'Informe o nome da categoria.';
    msg.style.display = 'block';
    return;
  }

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      msg.textContent = dados.mensagem || 'Erro ao salvar categoria.';
      msg.style.display = 'block';
      return;
    }

    fecharModalIncluirCategoria();
    await carregarCategorias();
  } catch (erro) {
    msg.textContent = 'Erro ao conectar com o servidor.';
    msg.style.display = 'block';
  }
}

/* ===================== MODAL DE EDIÇÃO ===================== */

function abrirModalEditarCategoria(id) {
  const categoria = listaCategorias.find(item => item.id === id);
  if (!categoria) return;

  document.getElementById('editarIdCategoria').value = categoria.id;
  document.getElementById('editarNomeCategoria').value = categoria.nome;

  const msg = document.getElementById('msgErroEditarCategoria');
  msg.style.display = 'none';
  msg.textContent = '';

  document.getElementById('modalEditarCategoria').style.display = 'flex';
}

function fecharModalEditarCategoria() {
  document.getElementById('modalEditarCategoria').style.display = 'none';
}

async function atualizarCategoria() {
  const id = document.getElementById('editarIdCategoria').value;
  const nome = document.getElementById('editarNomeCategoria').value.trim();
  const msg = document.getElementById('msgErroEditarCategoria');

  msg.style.display = 'none';
  msg.textContent = '';

  if (!nome) {
    msg.textContent = 'Informe o nome da categoria.';
    msg.style.display = 'block';
    return;
  }

  try {
    const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/categorias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      msg.textContent = dados.mensagem || 'Erro ao atualizar categoria.';
      msg.style.display = 'block';
      return;
    }

    fecharModalEditarCategoria();
    await carregarCategorias();
  } catch (erro) {
    msg.textContent = 'Erro ao conectar com o servidor.';
    msg.style.display = 'block';
  }
}

/* ===================== MODAL DE EXCLUSÃO ===================== */

function abrirModalExclusaoCategoria(id) {
  idCategoriaParaExcluir = id;
  document.getElementById('modalConfirmarExclusaoCategoria').style.display = 'flex';
}

function fecharModalExclusaoCategoria() {
  idCategoriaParaExcluir = null;
  document.getElementById('modalConfirmarExclusaoCategoria').style.display = 'none';
}

async function confirmarExclusaoCategoria() {
  if (!idCategoriaParaExcluir) return;

  try {
    const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/categorias/${idCategoriaParaExcluir}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();
    fecharModalExclusaoCategoria();

    if (!resposta.ok || !dados.sucesso) {
      alert(dados.mensagem || 'Erro ao excluir categoria.');
      return;
    }

    await carregarCategorias();
  } catch (erro) {
    fecharModalExclusaoCategoria();
    alert('Erro ao conectar com o servidor.');
  }
}


/* =========================================================
   RESPONSÁVEIS
   ---------------------------------------------------------
   Este bloco concentra toda a lógica da página de responsáveis:
   listagem, inclusão, edição e exclusão.
   ========================================================= */

let listaResponsaveis = [];
let idResponsavelParaExcluir = null;

/* Preenche o nome do usuário no topo, mantendo padrão visual
   com as demais páginas protegidas do sistema. */
function preencherNomeUsuarioTopo() {
  const nome = sessionStorage.getItem('nomeUsuario') || 'Usuário';
  const elemento = document.getElementById('nomeUsuarioTopo');

  if (elemento) {
    elemento.textContent = nome;
  }
}

/* Busca todos os responsáveis cadastrados na API
   e atualiza a tabela da tela. */
async function carregarResponsaveis() {
  const tbody = document.getElementById('tabelaResponsaveis');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5">Carregando responsáveis...</td>
    </tr>
  `;

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/responsaveis');
    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">${dados.mensagem || 'Erro ao carregar responsáveis.'}</td>
        </tr>
      `;
      return;
    }

    listaResponsaveis = dados.responsaveis || [];
    renderizarResponsaveis(listaResponsaveis);
  } catch (erro) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Erro ao conectar com o servidor.</td>
      </tr>
    `;
  }
}

/* Renderiza a tabela principal de responsáveis. */
function renderizarResponsaveis(lista) {
  const tbody = document.getElementById('tabelaResponsaveis');
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Nenhum responsável cadastrado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(responsavel => `
    <tr>
      <td>${responsavel.nome}</td>
      <td>${responsavel.matricula}</td>
      <td>${responsavel.cargo}</td>
      <td>${responsavel.ativo === 'S' ? 'Ativo' : 'Inativo'}</td>
      <td>
        <div class="acoes-tabela">
          <button class="btn btn-editar" onclick="abrirModalEditarResponsavel(${responsavel.id})">Editar</button>
          <button class="btn btn-perigo-outline" onclick="abrirModalExcluirResponsavel(${responsavel.id})">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ===================== INCLUSÃO ===================== */

function abrirModalNovoResponsavel() {
  document.getElementById('novoNomeResponsavel').value = '';
  document.getElementById('novaMatriculaResponsavel').value = '';
  document.getElementById('novoCargoResponsavel').value = '';
  document.getElementById('msgErroNovoResponsavel').textContent = '';
  document.getElementById('modalNovoResponsavel').style.display = 'flex';
}

function fecharModalNovoResponsavel() {
  document.getElementById('modalNovoResponsavel').style.display = 'none';
}

async function salvarResponsavel() {
  const nome = document.getElementById('novoNomeResponsavel').value.trim();
  const matricula = document.getElementById('novaMatriculaResponsavel').value.trim();
  const cargo = document.getElementById('novoCargoResponsavel').value.trim();
  const msgErro = document.getElementById('msgErroNovoResponsavel');

  msgErro.textContent = '';

  if (!nome || !matricula || !cargo) {
    msgErro.textContent = 'Preencha nome, matrícula e cargo.';
    return;
  }

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/responsaveis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, matricula, cargo })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      msgErro.textContent = dados.mensagem || 'Erro ao salvar responsável.';
      return;
    }

    fecharModalNovoResponsavel();
    await carregarResponsaveis();
  } catch (erro) {
    msgErro.textContent = 'Erro ao conectar com o servidor.';
  }
}

/* ===================== EDIÇÃO ===================== */

function abrirModalEditarResponsavel(id) {
  const responsavel = listaResponsaveis.find(item => item.id === id);
  if (!responsavel) return;

  document.getElementById('editarIdResponsavel').value = responsavel.id;
  document.getElementById('editarNomeResponsavel').value = responsavel.nome;
  document.getElementById('editarMatriculaResponsavel').value = responsavel.matricula;
  document.getElementById('editarCargoResponsavel').value = responsavel.cargo;
  document.getElementById('editarAtivoResponsavel').value = responsavel.ativo;
  document.getElementById('msgErroEditarResponsavel').textContent = '';

  document.getElementById('modalEditarResponsavel').style.display = 'flex';
}

function fecharModalEditarResponsavel() {
  document.getElementById('modalEditarResponsavel').style.display = 'none';
}

async function atualizarResponsavel() {
  const id = document.getElementById('editarIdResponsavel').value;
  const nome = document.getElementById('editarNomeResponsavel').value.trim();
  const matricula = document.getElementById('editarMatriculaResponsavel').value.trim();
  const cargo = document.getElementById('editarCargoResponsavel').value.trim();
  const ativo = document.getElementById('editarAtivoResponsavel').value;
  const msgErro = document.getElementById('msgErroEditarResponsavel');

  msgErro.textContent = '';

  if (!nome || !matricula || !cargo) {
    msgErro.textContent = 'Preencha nome, matrícula e cargo.';
    return;
  }

  try {
    const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/responsaveis/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, matricula, cargo, ativo })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      msgErro.textContent = dados.mensagem || 'Erro ao atualizar responsável.';
      return;
    }

    fecharModalEditarResponsavel();
    await carregarResponsaveis();
  } catch (erro) {
    msgErro.textContent = 'Erro ao conectar com o servidor.';
  }
}

/* ===================== EXCLUSÃO ===================== */

function abrirModalExcluirResponsavel(id) {
  idResponsavelParaExcluir = id;
  document.getElementById('modalExcluirResponsavel').style.display = 'flex';
}

function fecharModalExcluirResponsavel() {
  idResponsavelParaExcluir = null;
  document.getElementById('modalExcluirResponsavel').style.display = 'none';
}

async function confirmarExclusaoResponsavel() {
  if (!idResponsavelParaExcluir) return;

  try {
    const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/responsaveis/${idResponsavelParaExcluir}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      alert(dados.mensagem || 'Erro ao excluir responsável.');
      return;
    }

    fecharModalExcluirResponsavel();
    await carregarResponsaveis();
  } catch (erro) {
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
    'local.html',
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

  if (paginasProtegidas.includes(paginaAtual) && usuarioLogado !== 'true') {
    window.location.href = 'index.html';
    return;
  }

  if (paginaAtual === 'local.html') {
    carregarLocais();
  }

  if (paginaAtual === 'categoria.html') {
    carregarCategorias();
  }

  if (paginaAtual === 'responsavel.html') {
    carregarResponsaveis();
  }

});