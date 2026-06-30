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
      sessionStorage.setItem('matriculaUsuario', dados.matricula || '');

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
  sessionStorage.removeItem('matriculaUsuario');

  window.location.href = 'index.html';
}

// ===================== USUÁRIO LOGADO / REQUISIÇÕES ===================== //

function obterMatriculaUsuarioLogado() {
  return sessionStorage.getItem('matriculaUsuario') || '';
}

function obterHeadersComMatricula(headersExtras = {}) {
  const matricula = obterMatriculaUsuarioLogado();

  return {
    'Content-Type': 'application/json',
    'X-Usuario-Matricula': matricula,
    ...headersExtras
  };
}

async function fetchComMatricula(url, options = {}) {
  const headersOriginais = options.headers || {};

  const optionsFinal = {
    ...options,
    headers: obterHeadersComMatricula(headersOriginais)
  };

  return fetch(url, optionsFinal);
}

// ===================== HELPERS NÍVEL DE USUÁRIO =====================
function obterPerfilUsuarioLogado() {
  return sessionStorage.getItem('perfilUsuario') || '';
}

function podeIncluir() {
  const perfil = obterPerfilUsuarioLogado();
  return perfil === 'A' || perfil === 'O';
}

function podeEditarOuExcluir() {
  const perfil = obterPerfilUsuarioLogado();
  return perfil === 'A';
}

function somenteVisualiza() {
  return obterPerfilUsuarioLogado() === 'V';
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

// ===================== GRÁFICO ===================== //
// Renderiza o gráfico do dashboard com dados reais.
function renderizarGrafico(labels = [], valores = []) {
  const canvas = document.getElementById('graficoCategoria');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (window.myChart instanceof Chart) {
    window.myChart.destroy();
  }

  window.myChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Valor (R$)',
        data: valores,
        backgroundColor: ['#0058b7', '#c8102e', '#009bd8', '#003f80', '#28a745', '#fd7e14'],
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
            callback: value => 'R$ ' + Number(value).toLocaleString('pt-BR')
          }
        }
      }
    }
  });
}

// ===================== DASHBOARD - FORMATAÇÕES ===================== //
function formatarMoedaBR(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function traduzirSituacaoPatrimonio(situacao) {
  switch (situacao) {
    case 'A':
      return { texto: 'Ativo', classe: 'badge-ativo' };
    case 'M':
      return { texto: 'Em Manutenção', classe: 'badge-manut' };
    case 'E':
      return { texto: 'Extraviado', classe: 'badge-extravio' };
    case 'B':
      return { texto: 'Baixado', classe: 'badge-extravio' };
    default:
      return { texto: situacao || '-', classe: 'badge-extravio' };
  }
}

// ===================== DASHBOARD - INDICADORES ===================== //
function preencherIndicadoresDashboard(indicadores) {
  const elValorTotal = document.getElementById('indicadorValorTotal');
  const elAtivos = document.getElementById('indicadorAtivos');
  const elManutencao = document.getElementById('indicadorManutencao');
  const elBaixadosExtraviados = document.getElementById('indicadorBaixadosExtraviados');

  if (elValorTotal) {
    elValorTotal.textContent = formatarMoedaBR(indicadores.valor_total_patrimonial);
  }

  if (elAtivos) {
    elAtivos.textContent = `${indicadores.patrimonios_ativos || 0} itens`;
  }

  if (elManutencao) {
    elManutencao.textContent = `${indicadores.em_manutencao || 0} itens`;
  }

  if (elBaixadosExtraviados) {
    elBaixadosExtraviados.textContent = `${indicadores.baixados_extraviados || 0} itens`;
  }
}

// ===================== DASHBOARD - TABELA ===================== //
function preencherTabelaUltimosPatrimonios(lista) {
  const tbody = document.getElementById('tabelaUltimosPatrimonios');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted py-4">
          Nenhum patrimônio cadastrado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(item => {
    const situacao = traduzirSituacaoPatrimonio(item.situacao);

    return `
      <tr>
        <td><strong>${item.codigo_selo ?? '-'}</strong></td>
        <td>${item.descricao ?? '-'}</td>
        <td>${item.setor ?? '-'}</td>
        <td><span class="${situacao.classe}">${situacao.texto}</span></td>
      </tr>
    `;
  }).join('');
}

// ===================== DASHBOARD - CARGA GERAL ===================== //
async function carregarDashboard() {
  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/dashboard');
    const dados = await resposta.json();

    if (dados.sucesso) {
      preencherIndicadoresDashboard(dados.indicadores || {});

      const categorias = dados.categorias_mais_valiosas || [];
      renderizarGrafico(
        categorias.map(item => item.categoria),
        categorias.map(item => item.valor_total)
      );

      preencherTabelaUltimosPatrimonios(dados.ultimos_patrimonios || []);
    } else {
      console.error(dados.mensagem || 'Erro ao carregar dashboard.');
    }
  } catch (erro) {
    console.error('Erro ao conectar com o servidor.', erro);

    const tbody = document.getElementById('tabelaUltimosPatrimonios');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-danger py-4">
            Erro ao carregar dados do dashboard.
          </td>
        </tr>
      `;
    }
  }
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
    const resposta = await fetchComMatricula('https://controlepatrimonio.onrender.com/api/usuarios', {
      method: 'POST',
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
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/usuarios/${id}`, {
      method: 'PUT',
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
    const resposta = await fetchComMatricula('https://controlepatrimonio.onrender.com/api/locais', {
      method: 'POST',
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
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/locais/${id}`, {
      method: 'PUT',
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
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/locais/${idLocalParaExcluir}`, {
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
    const resposta = await fetchComMatricula('https://controlepatrimonio.onrender.com/api/categorias', {
      method: 'POST',
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
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/categorias/${id}`, {
      method: 'PUT',
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
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/categorias/${idCategoriaParaExcluir}`, {
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


// ===================== RESPONSÁVEIS =====================
// Este bloco controla toda a tela de responsáveis no front-end.
// Ele busca os dados da API, renderiza a tabela, abre/fecha modais,
// salva alterações e exclui registros.
// A regra de negócio aplicada aqui é simples: responsável aparece ativo na tela
// e só deixa de aparecer quando for excluído do banco.

let listaResponsaveis = [];
let listaResponsaveisFiltrada = [];
let idResponsavelParaExcluir = null;

async function carregarResponsaveis() {
  const tbody = document.getElementById('tabelaResponsaveis');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted py-4">
        Carregando responsáveis...
      </td>
    </tr>
  `;

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/responsaveis');
    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || 'Erro ao carregar responsáveis.');
    }

    listaResponsaveis = dados.responsaveis || [];
    listaResponsaveisFiltrada = [...listaResponsaveis];
    renderizarResponsaveis(listaResponsaveisFiltrada);

  } catch (erro) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger py-4">
          Erro ao carregar responsáveis.
        </td>
      </tr>
    `;
    console.error('Erro ao carregar responsáveis:', erro);
  }
}


// ===================== RENDERIZAÇÃO =====================
// Monta as linhas da tabela.
// Quando não houver registros, exibe a mensagem centralizada.
function renderizarResponsaveis(lista) {
  const tbody = document.getElementById('tabelaResponsaveis');
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          Nenhum responsável cadastrado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(responsavel => `
    <tr>
      <td>${responsavel.nome}</td>
      <td>${responsavel.matricula}</td>
      <td>${responsavel.cargo}</td>
      <td><span class="badge-status-ativo">Ativo</span></td>
      <td>
        <div class="acoes-tabela">
          <button
            type="button"
            class="btn-editar-usuario"
            onclick="abrirModalEditarResponsavel(${responsavel.id})">
            Editar
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-danger"
            onclick="abrirModalExcluirResponsavel(${responsavel.id})">
            Excluir
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}


// ===================== FILTRO =====================
// Filtra a lista localmente por nome, matrícula ou cargo.
function filtrarResponsaveis(valor) {
  const termo = (valor || '').toLowerCase().trim();

  listaResponsaveisFiltrada = listaResponsaveis.filter(responsavel =>
    responsavel.nome.toLowerCase().includes(termo) ||
    responsavel.matricula.toLowerCase().includes(termo) ||
    responsavel.cargo.toLowerCase().includes(termo)
  );

  renderizarResponsaveis(listaResponsaveisFiltrada);
}


// ===================== MODAL NOVO =====================
// Abre e fecha o modal de cadastro, limpando campos e mensagens.
function abrirModalNovoResponsavel() {
  document.getElementById('novoNomeResponsavel').value = '';
  document.getElementById('novaMatriculaResponsavel').value = '';
  document.getElementById('novoCargoResponsavel').value = '';

  const msg = document.getElementById('msgErroNovoResponsavel');
  msg.style.display = 'none';
  msg.textContent = '';

  document.getElementById('modalNovoResponsavel').style.display = 'flex';
}

function fecharModalNovoResponsavel() {
  document.getElementById('modalNovoResponsavel').style.display = 'none';
}


// ===================== SALVAR RESPONSÁVEL =====================
// Envia os dados do novo responsável para a API.
// Em caso de erro, mostra a mensagem no modal sem quebrar a tela.
async function salvarResponsavel() {
  const nome = document.getElementById('novoNomeResponsavel').value.trim();
  const matricula = document.getElementById('novaMatriculaResponsavel').value.trim();
  const cargo = document.getElementById('novoCargoResponsavel').value.trim();
  const msg = document.getElementById('msgErroNovoResponsavel');

  msg.style.display = 'none';
  msg.textContent = '';

  if (!nome || !matricula || !cargo) {
    msg.textContent = 'Preencha nome, matrícula e cargo.';
    msg.style.display = 'block';
    return;
  }

  try {
    const resposta = await fetchComMatricula('https://controlepatrimonio.onrender.com/api/responsaveis', {
      method: 'POST',
      body: JSON.stringify({ nome, matricula, cargo })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      msg.textContent = dados.mensagem || 'Erro ao cadastrar responsável.';
      msg.style.display = 'block';
      return;
    }

    fecharModalNovoResponsavel();
    await carregarResponsaveis();

  } catch (erro) {
    msg.textContent = 'Erro ao conectar com o servidor.';
    msg.style.display = 'block';
    console.error('Erro ao salvar responsável:', erro);
  }
}


// ===================== MODAL EDITAR =====================
// Carrega os dados do responsável selecionado no modal de edição.
function abrirModalEditarResponsavel(id) {
  const responsavel = listaResponsaveis.find(item => item.id === id);
  if (!responsavel) return;

  document.getElementById('editarIdResponsavel').value = responsavel.id;
  document.getElementById('editarNomeResponsavel').value = responsavel.nome;
  document.getElementById('editarMatriculaResponsavel').value = responsavel.matricula;
  document.getElementById('editarCargoResponsavel').value = responsavel.cargo;

  const msg = document.getElementById('msgErroEditarResponsavel');
  msg.style.display = 'none';
  msg.textContent = '';

  document.getElementById('modalEditarResponsavel').style.display = 'flex';
}

function fecharModalEditarResponsavel() {
  document.getElementById('modalEditarResponsavel').style.display = 'none';
}


// ===================== ATUALIZAR RESPONSÁVEL =====================
// Envia a atualização do responsável para a API.
// Não existe edição de status nessa tela.
async function atualizarResponsavel() {
  const id = document.getElementById('editarIdResponsavel').value;
  const nome = document.getElementById('editarNomeResponsavel').value.trim();
  const matricula = document.getElementById('editarMatriculaResponsavel').value.trim();
  const cargo = document.getElementById('editarCargoResponsavel').value.trim();
  const msg = document.getElementById('msgErroEditarResponsavel');

  msg.style.display = 'none';
  msg.textContent = '';

  if (!nome || !matricula || !cargo) {
    msg.textContent = 'Preencha nome, matrícula e cargo.';
    msg.style.display = 'block';
    return;
  }

  try {
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/responsaveis/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nome, matricula, cargo })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      msg.textContent = dados.mensagem || 'Erro ao atualizar responsável.';
      msg.style.display = 'block';
      return;
    }

    fecharModalEditarResponsavel();
    await carregarResponsaveis();

  } catch (erro) {
    msg.textContent = 'Erro ao conectar com o servidor.';
    msg.style.display = 'block';
    console.error('Erro ao atualizar responsável:', erro);
  }
}


// ===================== MODAL EXCLUIR =====================
// Controla a confirmação de exclusão física do responsável.
function abrirModalExcluirResponsavel(id) {
  idResponsavelParaExcluir = id;
  document.getElementById('modalExcluirResponsavel').style.display = 'flex';
}

function fecharModalExcluirResponsavel() {
  idResponsavelParaExcluir = null;
  document.getElementById('modalExcluirResponsavel').style.display = 'none';
}


// ===================== EXCLUIR RESPONSÁVEL =====================
// Chama a API para excluir o responsável e recarrega a tabela.
async function confirmarExclusaoResponsavel() {
  if (!idResponsavelParaExcluir) return;

  try {
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/responsaveis/${idResponsavelParaExcluir}`, {
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
    console.error('Erro ao excluir responsável:', erro);
  }
}


// ===================== PATRIMÔNIOS - LISTAS GLOBAIS =====================
// Mantém em memória a lista completa, a lista filtrada e o controle de paginação.
let listaPatrimonios = [];
let listaPatrimoniosFiltrada = [];
let paginaAtualPatrimonios = 1;
const itensPorPaginaPatrimonios = 15;

let patrimonioPendenteInativacao = null;


// ===================== PATRIMÔNIOS - APOIO =====================
// Funções auxiliares para status, ordenação e formatação.
function formatarDataPatrimonio(data) {
  if (!data) return '-';

  const partes = String(data).slice(0, 10).split('-');
  if (partes.length !== 3) return '-';

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterBadgeSituacaoPatrimonio(situacao) {
  if (situacao === 'A') return '<span class="badge-ativo">Ativo</span>';
  if (situacao === 'M') return '<span class="badge-manut">Manutenção</span>';
  if (situacao === 'B') return '<span class="badge-baixado">Baixado</span>';
  if (situacao === 'E') return '<span class="badge-extravio">Extraviado</span>';

  return '<span class="badge-inativo">Não informado</span>';
}

function obterBadgeStatusPatrimonio(situacao) {
  if (situacao === 'A' || situacao === 'M') {
    return '<span class="badge-ativo">Ativo</span>';
  }

  return '<span class="badge-inativo">Inativo</span>';
}

function ordenarPatrimonios(lista) {
  const ordemSituacao = {
    'A': 1,
    'M': 2,
    'B': 3,
    'E': 4
  };

  return [...lista].sort((a, b) => {
    const ordemA = ordemSituacao[a.situacao] || 99;
    const ordemB = ordemSituacao[b.situacao] || 99;

    if (ordemA !== ordemB) {
      return ordemA - ordemB;
    }

    const descricaoA = (a.descricao || '').toLowerCase();
    const descricaoB = (b.descricao || '').toLowerCase();

    return descricaoA.localeCompare(descricaoB, 'pt-BR');
  });
}


// ===================== PATRIMÔNIOS - CARREGAR =====================
// Busca os patrimônios no backend e prepara a tabela.
async function carregarPatrimonios() {
  const tbody = document.getElementById('tabelaPatrimonios');
  if (!tbody) {
    console.error('tbody tabelaPatrimonios não encontrado');
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="9" class="text-center text-muted py-4">
        <i class="bi bi-arrow-repeat me-2"></i>Carregando patrimônios...
      </td>
    </tr>
  `;

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/patrimonios');
    const dados = await resposta.json();

    if (!dados.sucesso) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-danger py-4">
            ${dados.mensagem || 'Erro ao carregar patrimônios.'}
          </td>
        </tr>
      `;
      return;
    }

    listaPatrimonios = Array.isArray(dados.patrimonios) ? dados.patrimonios : [];
    listaPatrimoniosFiltrada = ordenarPatrimonios(listaPatrimonios);
    paginaAtualPatrimonios = 1;

    renderizarPatrimonios(listaPatrimoniosFiltrada);
    renderizarPaginacaoPatrimonios();
  } catch (erro) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-danger py-4">
          Erro ao carregar patrimônios.
        </td>
      </tr>
    `;
  }
}


// ===================== PATRIMÔNIOS - RENDERIZAR =====================
// Renderiza os itens da página atual.
function renderizarPatrimonios(lista) {
  const tbody = document.getElementById('tabelaPatrimonios');
  if (!tbody) {
    console.error('tbody tabelaPatrimonios não encontrado');
    return;
  }

  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Nenhum patrimônio cadastrado.</td></tr>';
    return;
  }

  const inicio = (paginaAtualPatrimonios - 1) * itensPorPaginaPatrimonios;
  const fim = inicio + itensPorPaginaPatrimonios;
  const pagina = lista.slice(inicio, fim);

  tbody.innerHTML = pagina.map((patrimonio, index) => {
    const situacao = obterBadgeSituacaoPatrimonio(patrimonio.situacao);
    const status = obterBadgeStatusPatrimonio(patrimonio.situacao);

    return `
      <tr>
        <td>${inicio + index + 1}</td>
        <td>${patrimonio.num_patrimonio || '-'}</td>
        <td>${patrimonio.descricao || '-'}</td>
        <td>${patrimonio.categoria || '-'}</td>
        <td>${patrimonio.local || '-'}</td>
        <td>${patrimonio.responsavel || '-'}</td>
        <td>${situacao}</td>
        <td>${status}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalEditarPatrimonio(${patrimonio.id})">Editar</button>
        </td>
      </tr>
    `;
  }).join('');
}


// ===================== PATRIMÔNIOS - PAGINAÇÃO =====================
// Cria os botões de navegação da tabela.
function renderizarPaginacaoPatrimonios() {
  const container = document.getElementById('paginacaoPatrimonios');
  if (!container) return;

  const totalPaginas = Math.ceil(listaPatrimoniosFiltrada.length / itensPorPaginaPatrimonios);

  if (totalPaginas <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  html += `
    <button class="btn btn-sm btn-outline-secondary" ${paginaAtualPatrimonios === 1 ? 'disabled' : ''} onclick="irParaPaginaPatrimonios(${paginaAtualPatrimonios - 1})">
      Anterior
    </button>
  `;

  for (let i = 1; i <= totalPaginas; i++) {
    html += `
      <button class="btn btn-sm ${i === paginaAtualPatrimonios ? 'btn-primary' : 'btn-outline-primary'}" onclick="irParaPaginaPatrimonios(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button class="btn btn-sm btn-outline-secondary" ${paginaAtualPatrimonios === totalPaginas ? 'disabled' : ''} onclick="irParaPaginaPatrimonios(${paginaAtualPatrimonios + 1})">
      Próxima
    </button>
  `;

  container.innerHTML = html;
}

function irParaPaginaPatrimonios(pagina) {
  const totalPaginas = Math.ceil(listaPatrimoniosFiltrada.length / itensPorPaginaPatrimonios);

  if (pagina < 1 || pagina > totalPaginas) return;

  paginaAtualPatrimonios = pagina;
  renderizarPatrimonios(listaPatrimoniosFiltrada);
  renderizarPaginacaoPatrimonios();
}


// ===================== PATRIMÔNIOS - FILTRAR =====================
// Filtra por descrição, categoria, local ou responsável.
function filtrarPatrimonios() {
  const termo = document.getElementById('campoBuscaPatrimonio').value.trim().toLowerCase();

  if (!termo) {
    listaPatrimoniosFiltrada = ordenarPatrimonios(listaPatrimonios);
    paginaAtualPatrimonios = 1;
    renderizarPatrimonios(listaPatrimoniosFiltrada);
    renderizarPaginacaoPatrimonios();
    return;
  }

  listaPatrimoniosFiltrada = ordenarPatrimonios(
    listaPatrimonios.filter(p =>
      (p.descricao && p.descricao.toLowerCase().includes(termo)) ||
      (p.categoria && p.categoria.toLowerCase().includes(termo)) ||
      (p.local && p.local.toLowerCase().includes(termo)) ||
      (p.responsavel && p.responsavel.toLowerCase().includes(termo))
    )
  );

  paginaAtualPatrimonios = 1;
  renderizarPatrimonios(listaPatrimoniosFiltrada);
  renderizarPaginacaoPatrimonios();
}


// ===================== PATRIMÔNIOS - SELECTS =====================
// Carrega categorias, locais e responsáveis para os modais.
async function carregarCategoriasPatrimonio() {
  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/categorias');
    const dados = await resposta.json();

    if (!dados.sucesso) return;

    const selectIncluir = document.getElementById('incluirCategoria');
    const selectEditar = document.getElementById('editarCategoria');

    if (selectIncluir) {
      selectIncluir.innerHTML = '<option value="">Selecione...</option>' +
        dados.categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    }

    if (selectEditar) {
      selectEditar.innerHTML = '<option value="">Selecione...</option>' +
        dados.categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    }
  } catch (erro) {
    console.error('Erro ao carregar categorias:', erro);
  }
}

async function carregarLocaisPatrimonio() {
  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/locais');
    const dados = await resposta.json();

    if (!dados.sucesso) return;

    const selectIncluir = document.getElementById('incluirLocal');
    const selectEditar = document.getElementById('editarLocal');

    if (selectIncluir) {
      selectIncluir.innerHTML = '<option value="">Selecione...</option>' +
        dados.locais.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
    }

    if (selectEditar) {
      selectEditar.innerHTML = '<option value="">Selecione...</option>' +
        dados.locais.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
    }
  } catch (erro) {
    console.error('Erro ao carregar locais:', erro);
  }
}

async function carregarResponsaveisPatrimonio() {
  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/responsaveis');
    const dados = await resposta.json();

    if (!dados.sucesso) return;

    const selectIncluir = document.getElementById('incluirResponsavel');
    const selectEditar = document.getElementById('editarResponsavel');

    if (selectIncluir) {
      selectIncluir.innerHTML = '<option value="">Selecione...</option>' +
        dados.responsaveis.map(r => `<option value="${r.id}">${r.nome}</option>`).join('');
    }

    if (selectEditar) {
      selectEditar.innerHTML = '<option value="">Selecione...</option>' +
        dados.responsaveis.map(r => `<option value="${r.id}">${r.nome}</option>`).join('');
    }
  } catch (erro) {
    console.error('Erro ao carregar responsáveis:', erro);
  }
}

async function carregarSelectsPatrimonio() {
  await Promise.all([
    carregarCategoriasPatrimonio(),
    carregarLocaisPatrimonio(),
    carregarResponsaveisPatrimonio()
  ]);
}


// ===================== PATRIMÔNIOS - MODAL INCLUIR =====================
// Abre o modal de inclusão e limpa os campos.
async function abrirModalIncluirPatrimonio() {
  await carregarSelectsPatrimonio();

  document.getElementById('incluirNumPatrimonio').value = '';
  document.getElementById('incluirNumNFE').value = '';
  document.getElementById('incluirDescricao').value = '';
  document.getElementById('incluirDtCompra').value = '';
  document.getElementById('incluirVlrCompra').value = '';
  document.getElementById('incluirCategoria').value = '';
  document.getElementById('incluirLocal').value = '';
  document.getElementById('incluirResponsavel').value = '';
  document.getElementById('incluirSituacao').value = '';

  document.getElementById('msgErroIncluirPatrimonio').textContent = '';
  document.getElementById('msgErroIncluirPatrimonio').style.display = 'none';
  document.getElementById('modalIncluirPatrimonio').style.display = 'flex';
}

function fecharModalIncluirPatrimonio() {
  document.getElementById('modalIncluirPatrimonio').style.display = 'none';
}


// ===================== PATRIMÔNIOS - CADASTRAR =====================
// Valida e envia os dados do novo patrimônio.
async function salvarPatrimonio() {
  const num_patrimonio = document.getElementById('incluirNumPatrimonio').value.trim();
  const num_nfe = document.getElementById('incluirNumNFE').value.trim();
  const descricao = document.getElementById('incluirDescricao').value.trim();
  const dt_compra = document.getElementById('incluirDtCompra').value;
  const vlr_compra = document.getElementById('incluirVlrCompra').value.trim();
  const id_categoria = document.getElementById('incluirCategoria').value;
  const id_local = document.getElementById('incluirLocal').value;
  const id_responsavel_patrimonio = document.getElementById('incluirResponsavel').value;
  const situacao_atual = document.getElementById('incluirSituacao').value;
  const msg = document.getElementById('msgErroIncluirPatrimonio');

  msg.textContent = '';
  msg.style.display = 'none';

  if (!num_patrimonio || !num_nfe || !descricao || !dt_compra || !vlr_compra || !id_categoria || !id_local || !id_responsavel_patrimonio || !situacao_atual) {
    msg.textContent = 'Todos os campos são obrigatórios.';
    msg.style.display = 'block';
    return;
  }

  try {
    const resposta = await fetchComMatricula('https://controlepatrimonio.onrender.com/api/patrimonios', {
      method: 'POST',
      body: JSON.stringify({
        num_patrimonio,
        num_nfe,
        descricao,
        dt_compra,
        vlr_compra,
        id_categoria,
        id_local,
        id_responsavel_patrimonio,
        situacao_atual
      })
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      fecharModalIncluirPatrimonio();
      carregarPatrimonios();
    } else {
      msg.textContent = dados.mensagem || 'Erro ao cadastrar patrimônio.';
      msg.style.display = 'block';
    }
  } catch (erro) {
    msg.textContent = 'Erro ao cadastrar patrimônio.';
    msg.style.display = 'block';
  }
}


// ===================== PATRIMÔNIOS - MODAL EDITAR =====================
// Abre o modal de edição preenchendo os dados atuais.
async function abrirModalEditarPatrimonio(id) {
  const patrimonio = listaPatrimonios.find(p => p.id === id);
  if (!patrimonio) return;

  await carregarSelectsPatrimonio();

  document.getElementById('editarIdPatrimonio').value = patrimonio.id;
  document.getElementById('editarNumPatrimonio').value = patrimonio.num_patrimonio || '';
  document.getElementById('editarNumNFE').value = patrimonio.num_nfe || '';
  document.getElementById('editarDescricao').value = patrimonio.descricao || '';
  document.getElementById('editarDtCompra').value = patrimonio.dt_compra ? String(patrimonio.dt_compra).slice(0, 10) : '';
  document.getElementById('editarVlrCompra').value = patrimonio.vlr_compra || '';
  document.getElementById('editarCategoria').value = patrimonio.id_categoria || '';
  document.getElementById('editarLocal').value = patrimonio.id_local || '';
  document.getElementById('editarResponsavel').value = patrimonio.id_responsavel_patrimonio || '';
  document.getElementById('editarSituacao').value = patrimonio.situacao || '';

  document.getElementById('msgErroEditarPatrimonio').textContent = '';
  document.getElementById('msgErroEditarPatrimonio').style.display = 'none';
  document.getElementById('modalEditarPatrimonio').style.display = 'flex';
}

function fecharModalEditarPatrimonio() {
  document.getElementById('modalEditarPatrimonio').style.display = 'none';
}


// ===================== PATRIMÔNIOS - EDITAR =====================
// Atualiza normalmente ou prepara a inativação quando a situação for B ou E.
async function atualizarPatrimonio() {
  const id = document.getElementById('editarIdPatrimonio').value;
  const num_patrimonio = document.getElementById('editarNumPatrimonio').value.trim();
  const num_nfe = document.getElementById('editarNumNFE').value.trim();
  const descricao = document.getElementById('editarDescricao').value.trim();
  const dt_compra = document.getElementById('editarDtCompra').value;
  const vlr_compra = document.getElementById('editarVlrCompra').value.trim();
  const id_categoria = document.getElementById('editarCategoria').value;
  const id_local = document.getElementById('editarLocal').value;
  const id_responsavel_patrimonio = document.getElementById('editarResponsavel').value;
  const situacao_atual = document.getElementById('editarSituacao').value;
  const msg = document.getElementById('msgErroEditarPatrimonio');

  msg.textContent = '';
  msg.style.display = 'none';

  if (!num_patrimonio || !num_nfe || !descricao || !dt_compra || !vlr_compra || !id_categoria || !id_local || !id_responsavel_patrimonio || !situacao_atual) {
    msg.textContent = 'Todos os campos são obrigatórios.';
    msg.style.display = 'block';
    return;
  }

  if (situacao_atual === 'B' || situacao_atual === 'E') {
    patrimonioPendenteInativacao = {
      id,
      situacao_atual
    };

    document.getElementById('modalConfirmarInativacaoPatrimonio').style.display = 'flex';
    return;
  }

  try {
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/patrimonios/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        num_patrimonio,
        num_nfe,
        descricao,
        dt_compra,
        vlr_compra,
        id_categoria,
        id_local,
        id_responsavel_patrimonio,
        situacao_atual
      })
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      fecharModalEditarPatrimonio();
      carregarPatrimonios();
    } else {
      msg.textContent = dados.mensagem || 'Erro ao salvar alterações.';
      msg.style.display = 'block';
    }
  } catch (erro) {
    msg.textContent = 'Erro ao salvar alterações do patrimônio.';
    msg.style.display = 'block';
  }
}


// ===================== PATRIMÔNIOS - INATIVAÇÃO =====================
// Realiza a exclusão lógica via DELETE, alterando apenas a situação no banco.
function fecharModalInativacaoPatrimonio() {
  document.getElementById('modalConfirmarInativacaoPatrimonio').style.display = 'none';
  patrimonioPendenteInativacao = null;
}

async function confirmarInativacaoPatrimonio() {
  if (!patrimonioPendenteInativacao) return;

  const msg = document.getElementById('msgErroEditarPatrimonio');

  try {
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/patrimonios/${patrimonioPendenteInativacao.id}`, {
      method: 'DELETE',
      body: JSON.stringify({
        situacao_atual: patrimonioPendenteInativacao.situacao_atual
      })
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      fecharModalInativacaoPatrimonio();
      fecharModalEditarPatrimonio();
      carregarPatrimonios();
    } else {
      msg.textContent = dados.mensagem || 'Erro ao inativar patrimônio.';
      msg.style.display = 'block';
    }
  } catch (erro) {
    msg.textContent = 'Erro ao inativar patrimônio.';
    msg.style.display = 'block';
  }
}

// ===================== MANUTENÇÃO - LISTAS GLOBAIS =====================
// Mantém em memória a lista completa, lista filtrada e paginação da tela.
let listaManutencoes = [];
let listaManutencoesFiltrada = [];
let paginaAtualManutencoes = 1;
const itensPorPaginaManutencoes = 15;

// Guarda o último valor confirmado do campo "Resolvido" durante a edição.
let valorResolvidoAnteriorManutencao = 'N';

// Controla se a mudança para "S" já foi confirmada pelo usuário.
let resolucaoConfirmadaManutencao = false;


// ===================== MANUTENÇÃO - FUNÇÕES AUXILIARES =====================
// Funções de apoio para máscara visual, ordenação e formatação.
function formatarDataManutencao(data) {
  if (!data) return '-';

  const partes = String(data).slice(0, 10).split('-');
  if (partes.length !== 3) return '-';

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarValorMoedaManutencao(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function obterBadgeResolvidoManutencao(resolvido) {
  if (resolvido === 'S') {
    return '<span class="badge-ativo">Sim</span>';
  }

  return '<span class="badge-inativo">Não</span>';
}

function ordenarManutencoes(lista) {
  return [...lista].sort((a, b) => {
    const pesoA = a.resolvido === 'N' ? 0 : 1;
    const pesoB = b.resolvido === 'N' ? 0 : 1;

    if (pesoA !== pesoB) {
      return pesoA - pesoB;
    }

    const dataA = a.dt_envio_manutencao ? new Date(a.dt_envio_manutencao) : new Date(0);
    const dataB = b.dt_envio_manutencao ? new Date(b.dt_envio_manutencao) : new Date(0);

    return dataB - dataA;
  });
}


// ===================== MANUTENÇÃO - CARREGAR LISTAGEM =====================
// Busca os registros no backend e prepara a renderização.
async function carregarManutencoes() {
  const tbody = document.getElementById('tabelaManutencoes');
  if (!tbody) {
    console.error('tbody tabelaManutencoes não encontrado');
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="10" class="text-center text-muted py-4">
        <i class="bi bi-arrow-repeat me-2"></i>Carregando registros de manutenção...
      </td>
    </tr>
  `;

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/manutencoes');
    const dados = await resposta.json();

    if (!dados.sucesso) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center text-danger py-4">
            ${dados.mensagem || 'Erro ao carregar registros de manutenção.'}
          </td>
        </tr>
      `;
      return;
    }

    listaManutencoes = Array.isArray(dados.manutencoes) ? dados.manutencoes : [];
    listaManutencoesFiltrada = ordenarManutencoes(listaManutencoes);
    paginaAtualManutencoes = 1;

    renderizarManutencoes(listaManutencoesFiltrada);
    renderizarPaginacaoManutencoes();
  } catch (erro) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center text-danger py-4">
          Erro ao carregar registros de manutenção.
        </td>
      </tr>
    `;
  }
}


// ===================== MANUTENÇÃO - RENDERIZAÇÃO =====================
// Renderiza somente os itens da página atual.
function renderizarManutencoes(lista) {
  const tbody = document.getElementById('tabelaManutencoes');
  if (!tbody) {
    console.error('tbody tabelaManutencoes não encontrado');
    return;
  }

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center text-muted py-4">
          Nenhum histórico de manutenção cadastrado.
        </td>
      </tr>
    `;
    return;
  }

  const inicio = (paginaAtualManutencoes - 1) * itensPorPaginaManutencoes;
  const fim = inicio + itensPorPaginaManutencoes;
  const pagina = lista.slice(inicio, fim);

  tbody.innerHTML = pagina.map((manutencao, index) => `
  <tr>
    <td>${inicio + index + 1}</td>
    <td>${manutencao.patrimonio || '-'}</td>
    <td>${manutencao.problema_identificado || '-'}</td>
    <td>${manutencao.fornecedor_tecnico || '-'}</td>
    <td>${formatarDataManutencao(manutencao.dt_envio_manutencao)}</td>
    <td>${formatarDataManutencao(manutencao.dt_volta_manutencao)}</td>
    <td>${obterBadgeResolvidoManutencao(manutencao.resolvido)}</td>
    <td>${formatarValorMoedaManutencao(manutencao.vlr_gasto)}</td>
    <td>${manutencao.usuario || '-'}</td>
    <td>
      <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalEditarManutencao(${manutencao.id})">
        Editar
      </button>
      <button class="btn btn-sm btn-outline-danger" onclick="abrirModalExclusaoManutencao(${manutencao.id})">
        Excluir
      </button>
    </td>
  </tr>
`).join('');
}


// ===================== MANUTENÇÃO - PAGINAÇÃO =====================
// Cria os botões da paginação quando houver mais de 15 registros.
function renderizarPaginacaoManutencoes() {
  const container = document.getElementById('paginacaoManutencoes');
  if (!container) return;

  const totalPaginas = Math.ceil(listaManutencoesFiltrada.length / itensPorPaginaManutencoes);

  if (totalPaginas <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  html += `
    <button class="btn btn-sm btn-outline-secondary" ${paginaAtualManutencoes === 1 ? 'disabled' : ''} onclick="irParaPaginaManutencoes(${paginaAtualManutencoes - 1})">
      Anterior
    </button>
  `;

  for (let i = 1; i <= totalPaginas; i++) {
    html += `
      <button class="btn btn-sm ${i === paginaAtualManutencoes ? 'btn-primary' : 'btn-outline-primary'}" onclick="irParaPaginaManutencoes(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button class="btn btn-sm btn-outline-secondary" ${paginaAtualManutencoes === totalPaginas ? 'disabled' : ''} onclick="irParaPaginaManutencoes(${paginaAtualManutencoes + 1})">
      Próxima
    </button>
  `;

  container.innerHTML = html;
}

function irParaPaginaManutencoes(pagina) {
  const totalPaginas = Math.ceil(listaManutencoesFiltrada.length / itensPorPaginaManutencoes);

  if (pagina < 1 || pagina > totalPaginas) return;

  paginaAtualManutencoes = pagina;
  renderizarManutencoes(listaManutencoesFiltrada);
  renderizarPaginacaoManutencoes();
}


// ===================== MANUTENÇÃO - FILTRO =====================
// Filtra por patrimônio, problema ou fornecedor/técnico.
function filtrarManutencoes() {
  const campo = document.getElementById('campoBuscaManutencao');
  if (!campo) return;

  const termo = campo.value.trim().toLowerCase();

  if (!termo) {
    listaManutencoesFiltrada = ordenarManutencoes(listaManutencoes);
    paginaAtualManutencoes = 1;
    renderizarManutencoes(listaManutencoesFiltrada);
    renderizarPaginacaoManutencoes();
    return;
  }

  listaManutencoesFiltrada = ordenarManutencoes(
    listaManutencoes.filter(m =>
      (m.patrimonio && m.patrimonio.toLowerCase().includes(termo)) ||
      (m.problema_identificado && m.problema_identificado.toLowerCase().includes(termo)) ||
      (m.fornecedor_tecnico && m.fornecedor_tecnico.toLowerCase().includes(termo))
    )
  );

  paginaAtualManutencoes = 1;
  renderizarManutencoes(listaManutencoesFiltrada);
  renderizarPaginacaoManutencoes();
}


// ===================== MANUTENÇÃO - CARREGAR SELECTS =====================
// Carrega patrimônios em manutenção e usuários cadastrados.
async function carregarPatrimoniosManutencao() {
  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/patrimonios/manutencao');
    const dados = await resposta.json();

    if (!dados.sucesso) return;

    const selectIncluir = document.getElementById('incluirPatrimonioManutencao');
    const selectEditar = document.getElementById('editarPatrimonioManutencao');

    const options = '<option value="">Selecione...</option>' +
      dados.patrimonios.map(p => `<option value="${p.id}">${p.num_patrimonio} - ${p.descricao}</option>`).join('');

    if (selectIncluir) selectIncluir.innerHTML = options;
    if (selectEditar) selectEditar.innerHTML = options;
  } catch (erro) {
    console.error('Erro ao carregar patrimônios da manutenção:', erro);
  }
}

async function carregarUsuariosManutencao() {
  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/usuarios');
    const dados = await resposta.json();

    if (!dados.sucesso) return;

    const selectIncluir = document.getElementById('incluirUsuarioManutencao');
    const selectEditar = document.getElementById('editarUsuarioManutencao');

    const options = '<option value="">Selecione...</option>' +
      dados.usuarios
        .filter(u => u.ativo === 'S')
        .map(u => `<option value="${u.id}">${u.nome}</option>`)
        .join('');

    if (selectIncluir) selectIncluir.innerHTML = options;
    if (selectEditar) selectEditar.innerHTML = options;
  } catch (erro) {
    console.error('Erro ao carregar usuários da manutenção:', erro);
  }
}

async function carregarSelectsManutencao() {
  await Promise.all([
    carregarPatrimoniosManutencao(),
    carregarUsuariosManutencao()
  ]);
}


// ===================== MANUTENÇÃO - MODAL INCLUIR =====================
// Abre modal e prepara os campos vazios.
async function abrirModalIncluirManutencao() {
  await carregarSelectsManutencao();

  document.getElementById('incluirPatrimonioManutencao').value = '';
  document.getElementById('incluirUsuarioManutencao').value = '';
  document.getElementById('incluirProblemaManutencao').value = '';
  document.getElementById('incluirDtEnvioManutencao').value = '';
  document.getElementById('incluirDtVoltaManutencao').value = '';
  document.getElementById('incluirFornecedorManutencao').value = '';
  document.getElementById('incluirServicoRealizadoManutencao').value = '';
  document.getElementById('incluirResolvidoManutencao').value = 'N';
  document.getElementById('incluirVlrGastoManutencao').value = '';

  const msg = document.getElementById('msgErroIncluirManutencao');
  msg.textContent = '';
  msg.style.display = 'none';

  document.getElementById('modalIncluirManutencao').style.display = 'flex';
}

function fecharModalIncluirManutencao() {
  document.getElementById('modalIncluirManutencao').style.display = 'none';
}


// ===================== MANUTENÇÃO - INCLUIR =====================
// Valida e envia um novo histórico de manutenção.
async function salvarManutencao() {
  const id_patrimonio = document.getElementById('incluirPatrimonioManutencao').value;
  const id_usuario = document.getElementById('incluirUsuarioManutencao').value;
  const problema_identificado = document.getElementById('incluirProblemaManutencao').value.trim();
  const dt_envio_manutencao = document.getElementById('incluirDtEnvioManutencao').value;
  const dt_volta_manutencao = document.getElementById('incluirDtVoltaManutencao').value;
  const fornecedor_tecnico = document.getElementById('incluirFornecedorManutencao').value.trim();
  const descricao_servico_realizado = document.getElementById('incluirServicoRealizadoManutencao').value.trim();
  const resolvido = document.getElementById('incluirResolvidoManutencao').value;
  const vlr_gasto = document.getElementById('incluirVlrGastoManutencao').value.trim();
  const msg = document.getElementById('msgErroIncluirManutencao');

  msg.textContent = '';
  msg.style.display = 'none';

  if (!id_patrimonio || !id_usuario || !problema_identificado || !dt_envio_manutencao || !fornecedor_tecnico || !resolvido) {
    msg.textContent = 'Preencha todos os campos obrigatórios.';
    msg.style.display = 'block';
    return;
  }

  try {
    const resposta = await fetchComMatricula('https://controlepatrimonio.onrender.com/api/manutencoes', {
      method: 'POST',
      body: JSON.stringify({
        id_patrimonio,
        id_usuario,
        problema_identificado,
        dt_envio_manutencao,
        dt_volta_manutencao,
        fornecedor_tecnico,
        descricao_servico_realizado,
        resolvido,
        vlr_gasto
      })
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      fecharModalIncluirManutencao();
      carregarManutencoes();
    } else {
      msg.textContent = dados.mensagem || 'Erro ao registrar manutenção.';
      msg.style.display = 'block';
    }
  } catch (erro) {
    msg.textContent = 'Erro ao registrar manutenção.';
    msg.style.display = 'block';
  }
}


// ===================== MANUTENÇÃO - MODAL EDITAR =====================
// Abre o modal preenchendo os dados atuais do registro.
async function abrirModalEditarManutencao(id) {
  const manutencao = listaManutencoes.find(m => m.id === id);
  if (!manutencao) return;

  await carregarSelectsManutencao();

  document.getElementById('editarIdManutencao').value = manutencao.id;
  document.getElementById('editarPatrimonioManutencao').value = manutencao.id_patrimonio || '';
  document.getElementById('editarUsuarioManutencao').value = manutencao.id_usuario || '';
  document.getElementById('editarProblemaManutencao').value = manutencao.problema_identificado || '';
  document.getElementById('editarDtEnvioManutencao').value = manutencao.dt_envio_manutencao ? String(manutencao.dt_envio_manutencao).slice(0, 10) : '';
  document.getElementById('editarDtVoltaManutencao').value = manutencao.dt_volta_manutencao ? String(manutencao.dt_volta_manutencao).slice(0, 10) : '';
  document.getElementById('editarFornecedorManutencao').value = manutencao.fornecedor_tecnico || '';
  document.getElementById('editarServicoRealizadoManutencao').value = manutencao.descricao_servico_realizado || '';
  document.getElementById('editarResolvidoManutencao').value = manutencao.resolvido || 'N';
  document.getElementById('editarVlrGastoManutencao').value = manutencao.vlr_gasto ?? '';

  valorResolvidoAnteriorManutencao = manutencao.resolvido || 'N';
  resolucaoConfirmadaManutencao = false;

  const msg = document.getElementById('msgErroEditarManutencao');
  msg.textContent = '';
  msg.style.display = 'none';

  document.getElementById('modalEditarManutencao').style.display = 'flex';
}

function fecharModalEditarManutencao() {
  document.getElementById('modalEditarManutencao').style.display = 'none';
}


// ===================== MANUTENÇÃO - CONFIRMAÇÃO DE RESOLUÇÃO =====================
// Ao trocar para "S", abre confirmação antes de manter o valor.
function prepararConfirmacaoResolucaoManutencao() {
  const select = document.getElementById('editarResolvidoManutencao');
  if (!select) return;

  const novoValor = select.value;

  if (novoValor === 'S' && valorResolvidoAnteriorManutencao !== 'S' && !resolucaoConfirmadaManutencao) {
    document.getElementById('modalConfirmarResolucaoManutencao').style.display = 'flex';
    return;
  }

  valorResolvidoAnteriorManutencao = novoValor;
}

function cancelarConfirmacaoResolucaoManutencao() {
  const select = document.getElementById('editarResolvidoManutencao');
  if (select) {
    select.value = valorResolvidoAnteriorManutencao || 'N';
  }

  resolucaoConfirmadaManutencao = false;
  document.getElementById('modalConfirmarResolucaoManutencao').style.display = 'none';
}

function confirmarResolucaoManutencao() {
  const select = document.getElementById('editarResolvidoManutencao');
  if (select) {
    select.value = 'S';
  }

  valorResolvidoAnteriorManutencao = 'S';
  resolucaoConfirmadaManutencao = true;
  document.getElementById('modalConfirmarResolucaoManutencao').style.display = 'none';
}


// ===================== MANUTENÇÃO - EDITAR =====================
// Atualiza o histórico de manutenção selecionado.
async function atualizarManutencao() {
  const id = document.getElementById('editarIdManutencao').value;
  const id_patrimonio = document.getElementById('editarPatrimonioManutencao').value;
  const id_usuario = document.getElementById('editarUsuarioManutencao').value;
  const problema_identificado = document.getElementById('editarProblemaManutencao').value.trim();
  const dt_envio_manutencao = document.getElementById('editarDtEnvioManutencao').value;
  const dt_volta_manutencao = document.getElementById('editarDtVoltaManutencao').value;
  const fornecedor_tecnico = document.getElementById('editarFornecedorManutencao').value.trim();
  const descricao_servico_realizado = document.getElementById('editarServicoRealizadoManutencao').value.trim();
  const resolvido = document.getElementById('editarResolvidoManutencao').value;
  const vlr_gasto = document.getElementById('editarVlrGastoManutencao').value.trim();
  const msg = document.getElementById('msgErroEditarManutencao');

  msg.textContent = '';
  msg.style.display = 'none';

  if (!id_patrimonio || !id_usuario || !problema_identificado || !dt_envio_manutencao || !fornecedor_tecnico || !resolvido) {
    msg.textContent = 'Preencha todos os campos obrigatórios.';
    msg.style.display = 'block';
    return;
  }

  try {
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/manutencoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        id_patrimonio,
        id_usuario,
        problema_identificado,
        dt_envio_manutencao,
        dt_volta_manutencao,
        fornecedor_tecnico,
        descricao_servico_realizado,
        resolvido,
        vlr_gasto
      })
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      fecharModalEditarManutencao();
      carregarManutencoes();
    } else {
      msg.textContent = dados.mensagem || 'Erro ao atualizar manutenção.';
      msg.style.display = 'block';
    }
  } catch (erro) {
    msg.textContent = 'Erro ao atualizar manutenção.';
    msg.style.display = 'block';
  }
}

// ===================== MANUTENÇÃO - EXCLUSÃO ===================== //
let idManutencaoParaExcluir = null;

function abrirModalExclusaoManutencao(id) {
  idManutencaoParaExcluir = id;
  const modal = document.getElementById('modalConfirmarExclusaoManutencao');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function fecharModalExclusaoManutencao() {
  idManutencaoParaExcluir = null;
  const modal = document.getElementById('modalConfirmarExclusaoManutencao');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function confirmarExclusaoManutencao() {
  if (!idManutencaoParaExcluir) return;

  try {
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/manutencoes/${idManutencaoParaExcluir}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      fecharModalExclusaoManutencao();
      carregarManutencoes();
    } else {
      alert(dados.mensagem || 'Erro ao excluir manutenção.');
    }
  } catch (erro) {
    alert('Erro ao conectar com o servidor.');
  }
}


// ===================== MOVIMENTAÇÕES - VARIÁVEIS GLOBAIS =====================
// Armazena os registros carregados, listas auxiliares e o ID pendente de exclusão.
let listaMovimentacoes = [];
let listaMovimentacoesFiltrada = [];
let listaUsuariosMovimentacao = [];
let listaLocaisMovimentacao = [];
let listaResponsaveisMovimentacao = [];
let listaPatrimoniosMovimentacao = [];
let idMovimentacaoParaExcluir = null;

// ===================== MOVIMENTAÇÕES - FUNÇÕES AUXILIARES =====================
// Formata a data no padrão brasileiro para exibição na tabela.
function formatarDataMovimentacao(data) {
  if (!data) return '-';

  const partes = String(data).split('-');
  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Escapa caracteres especiais antes de inserir conteúdo no HTML.
function escaparHtmlMovimentacao(texto) {
  if (texto === null || texto === undefined) return '';

  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Exibe ou oculta mensagens de erro nos modais da página.
function exibirMensagemErroMovimentacao(idElemento, mensagem = '') {
  const elemento = document.getElementById(idElemento);
  if (!elemento) return;

  elemento.textContent = mensagem;
  elemento.style.display = mensagem ? 'block' : 'none';
}

// Preenche os selects auxiliares com os dados vindos da API.
function preencherSelectMovimentacao(idSelect, lista, placeholder = 'Selecione...') {
  const select = document.getElementById(idSelect);
  if (!select) return;

  select.innerHTML = `<option value="">${placeholder}</option>`;

  lista.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.nome;
    select.appendChild(option);
  });
}

// ===================== MOVIMENTAÇÕES - CARREGAR LISTAGEM =====================
// Busca as movimentações cadastradas e renderiza na tabela principal.
async function carregarMovimentacoes() {
  const tbody = document.getElementById('tabelaMovimentacoes');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="9" class="text-center text-muted py-4">
        <i class="bi bi-arrow-repeat me-2"></i>Carregando registros de movimentação...
      </td>
    </tr>
  `;

  try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/movimentacoes');
    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-danger py-4">
            ${escaparHtmlMovimentacao(dados.mensagem || 'Erro ao carregar movimentações.')}
          </td>
        </tr>
      `;
      return;
    }

    listaMovimentacoes = Array.isArray(dados.movimentacoes) ? dados.movimentacoes : [];
    listaMovimentacoesFiltrada = [...listaMovimentacoes];
    renderizarMovimentacoes(listaMovimentacoesFiltrada);
  } catch (erro) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-danger py-4">
          <i class="bi bi-wifi-off me-2"></i>Erro ao conectar com o servidor.
        </td>
      </tr>
    `;
  }
}

// ===================== MOVIMENTAÇÕES - RENDERIZAR TABELA =====================
// Monta as linhas da tabela com os dados da lista filtrada.
function renderizarMovimentacoes(lista) {
  const tbody = document.getElementById('tabelaMovimentacoes');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4">
          Nenhum registro de movimentação encontrado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(item => `
    <tr>
      <td>${escaparHtmlMovimentacao(item.id)}</td>
      <td>${escaparHtmlMovimentacao(item.patrimonio_nome || '-')}</td>
      <td>${escaparHtmlMovimentacao(item.local_origem_nome || '-')}</td>
      <td>${escaparHtmlMovimentacao(item.local_destino_nome || '-')}</td>
      <td>${escaparHtmlMovimentacao(item.responsavel_nome || '-')}</td>
      <td>${escaparHtmlMovimentacao(item.usuario_nome || '-')}</td>
      <td>${escaparHtmlMovimentacao(formatarDataMovimentacao(item.data_transferencia))}</td>
      <td>${escaparHtmlMovimentacao(item.observacoes || '-')}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarMovimentacao(${item.id})">
            Editar
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="abrirModalExclusaoMovimentacao(${item.id})">
            Excluir
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===================== MOVIMENTAÇÕES - FILTRAR =====================
// Filtra a lista por patrimônio, locais, responsável, usuário ou observações.
function filtrarMovimentacoes() {
  const termo = document.getElementById('campoBuscaMovimentacao').value.trim().toLowerCase();

  if (!termo) {
    listaMovimentacoesFiltrada = [...listaMovimentacoes];
    renderizarMovimentacoes(listaMovimentacoesFiltrada);
    return;
  }

  listaMovimentacoesFiltrada = listaMovimentacoes.filter(item =>
    String(item.id || '').toLowerCase().includes(termo) ||
    String(item.patrimonio_nome || '').toLowerCase().includes(termo) ||
    String(item.local_origem_nome || '').toLowerCase().includes(termo) ||
    String(item.local_destino_nome || '').toLowerCase().includes(termo) ||
    String(item.responsavel_nome || '').toLowerCase().includes(termo) ||
    String(item.usuario_nome || '').toLowerCase().includes(termo) ||
    String(item.observacoes || '').toLowerCase().includes(termo)
  );

  renderizarMovimentacoes(listaMovimentacoesFiltrada);
}

// ===================== MOVIMENTAÇÕES - CARREGAR DADOS AUXILIARES =====================
// Busca usuários, locais e responsáveis para preencher os campos dos modais.
async function carregarDadosAuxiliaresMovimentacao() {
  try {
    const [respostaUsuarios, respostaLocais, respostaResponsaveis] = await Promise.all([
      fetch('https://controlepatrimonio.onrender.com/api/usuarios'),
      fetch('https://controlepatrimonio.onrender.com/api/locais'),
      fetch('https://controlepatrimonio.onrender.com/api/responsaveis')
    ]);

    const dadosUsuarios = await respostaUsuarios.json();
    const dadosLocais = await respostaLocais.json();
    const dadosResponsaveis = await respostaResponsaveis.json();

    listaUsuariosMovimentacao = Array.isArray(dadosUsuarios.usuarios)
      ? dadosUsuarios.usuarios
          .filter(usuario => usuario.ativo === 'S')
          .map(usuario => ({ id: usuario.id, nome: usuario.nome }))
      : [];

    listaLocaisMovimentacao = Array.isArray(dadosLocais.locais)
      ? dadosLocais.locais.map(local => ({ id: local.id, nome: local.nome }))
      : [];

    listaResponsaveisMovimentacao = Array.isArray(dadosResponsaveis.responsaveis)
      ? dadosResponsaveis.responsaveis.map(responsavel => ({ id: responsavel.id, nome: responsavel.nome }))
      : [];

    preencherSelectMovimentacao('incluirUsuarioMovimentacao', listaUsuariosMovimentacao);
    preencherSelectMovimentacao('editarUsuarioMovimentacao', listaUsuariosMovimentacao);

    preencherSelectMovimentacao('incluirLocalOrigemMovimentacao', listaLocaisMovimentacao);
    preencherSelectMovimentacao('editarLocalOrigemMovimentacao', listaLocaisMovimentacao);

    preencherSelectMovimentacao('incluirLocalDestinoMovimentacao', listaLocaisMovimentacao);
    preencherSelectMovimentacao('editarLocalDestinoMovimentacao', listaLocaisMovimentacao);

    preencherSelectMovimentacao('incluirResponsavelMovimentacao', listaResponsaveisMovimentacao);
    preencherSelectMovimentacao('editarResponsavelMovimentacao', listaResponsaveisMovimentacao);
  } catch (erro) {
    console.error('Erro ao carregar dados auxiliares de movimentação:', erro);
  }
}

// ===================== MOVIMENTAÇÕES - PESQUISAR PATRIMÔNIO =====================
// Pesquisa patrimônios ativos conforme o usuário digita no campo.
async function pesquisarPatrimonioMovimentacao(termo, modo) {
  const valor = termo.trim();
  const idListaResultado = modo === 'editar'
    ? 'resultadosBuscaPatrimonioEditar'
    : 'resultadosBuscaPatrimonioIncluir';

  const listaResultado = document.getElementById(idListaResultado);
  if (!listaResultado) return;

  if (valor.length < 2) {
    listaResultado.innerHTML = '';
    return;
  }

  try {
    const resposta = await fetch(`https://controlepatrimonio.onrender.com/api/patrimonios/busca?termo=${encodeURIComponent(valor)}`);
    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      listaResultado.innerHTML = '';
      return;
    }

    listaPatrimoniosMovimentacao = Array.isArray(dados.patrimonios) ? dados.patrimonios : [];

    if (listaPatrimoniosMovimentacao.length === 0) {
      listaResultado.innerHTML = `
        <button type="button" class="list-group-item list-group-item-action disabled">
          Nenhum patrimônio ativo encontrado.
        </button>
      `;
      return;
    }

    listaResultado.innerHTML = listaPatrimoniosMovimentacao.map(item => `
      <button
        type="button"
        class="list-group-item list-group-item-action"
        onclick="selecionarPatrimonioMovimentacao(${item.id}, '${String(item.nome || '').replace(/'/g, "\\'")}', '${modo}')"
      >
        ${escaparHtmlMovimentacao(item.nome)}
      </button>
    `).join('');
  } catch (erro) {
    listaResultado.innerHTML = '';
  }
}

// Define o patrimônio selecionado na pesquisa dinâmica.
function selecionarPatrimonioMovimentacao(id, nome, modo) {
  if (modo === 'editar') {
    document.getElementById('editarPatrimonioMovimentacao').value = id;
    document.getElementById('buscaPatrimonioEditarMovimentacao').value = nome;
    document.getElementById('resultadosBuscaPatrimonioEditar').innerHTML = '';
    return;
  }

  document.getElementById('incluirPatrimonioMovimentacao').value = id;
  document.getElementById('buscaPatrimonioMovimentacao').value = nome;
  document.getElementById('resultadosBuscaPatrimonioIncluir').innerHTML = '';
}

// ===================== MOVIMENTAÇÕES - MODAL INCLUIR =====================
// Abre o modal de cadastro e limpa os campos antes do preenchimento.
async function abrirModalIncluirMovimentacao() {
  exibirMensagemErroMovimentacao('msgErroIncluirMovimentacao', '');
  await carregarDadosAuxiliaresMovimentacao();

  document.getElementById('incluirPatrimonioMovimentacao').value = '';
  document.getElementById('buscaPatrimonioMovimentacao').value = '';
  document.getElementById('resultadosBuscaPatrimonioIncluir').innerHTML = '';
  document.getElementById('incluirUsuarioMovimentacao').value = '';
  document.getElementById('incluirResponsavelMovimentacao').value = '';
  document.getElementById('incluirLocalOrigemMovimentacao').value = '';
  document.getElementById('incluirLocalDestinoMovimentacao').value = '';
  document.getElementById('incluirDtTransferenciaMovimentacao').value = '';
  document.getElementById('incluirObservacoesMovimentacao').value = '';

  document.getElementById('modalIncluirMovimentacao').style.display = 'flex';
}

// Fecha o modal de cadastro de movimentação.
function fecharModalIncluirMovimentacao() {
  document.getElementById('modalIncluirMovimentacao').style.display = 'none';
}

// ===================== MOVIMENTAÇÕES - CADASTRAR =====================
// Valida os campos obrigatórios e envia o novo registro para a API.
async function salvarMovimentacao() {
  const id_patrimonio = document.getElementById('incluirPatrimonioMovimentacao').value;
  const id_usuario = document.getElementById('incluirUsuarioMovimentacao').value;
  const id_responsavel_patrimonio = document.getElementById('incluirResponsavelMovimentacao').value;
  const id_local_origem = document.getElementById('incluirLocalOrigemMovimentacao').value;
  const id_local_destino = document.getElementById('incluirLocalDestinoMovimentacao').value;
  const dt_transferencia = document.getElementById('incluirDtTransferenciaMovimentacao').value;
  const observacoes = document.getElementById('incluirObservacoesMovimentacao').value.trim();

  exibirMensagemErroMovimentacao('msgErroIncluirMovimentacao', '');

  if (!id_patrimonio || !id_usuario || !id_responsavel_patrimonio || !id_local_origem || !id_local_destino || !dt_transferencia) {
    exibirMensagemErroMovimentacao('msgErroIncluirMovimentacao', 'Preencha todos os campos obrigatórios.');
    return;
  }

  try {
    const resposta = await fetchComMatricula('https://controlepatrimonio.onrender.com/api/movimentacoes', {
      method: 'POST',
      body: JSON.stringify({
        id_patrimonio,
        id_usuario,
        id_local_origem,
        id_local_destino,
        id_responsavel_patrimonio,
        dt_transferencia,
        observacoes
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      exibirMensagemErroMovimentacao('msgErroIncluirMovimentacao', dados.mensagem || 'Erro ao salvar movimentação.');
      return;
    }

    fecharModalIncluirMovimentacao();
    await carregarMovimentacoes();
  } catch (erro) {
    exibirMensagemErroMovimentacao('msgErroIncluirMovimentacao', 'Erro ao conectar com o servidor.');
  }
}

// ===================== MOVIMENTAÇÕES - MODAL EDITAR =====================
// Abre o modal de edição com os dados da movimentação selecionada.
async function abrirModalEditarMovimentacao(id) {
  const movimentacao = listaMovimentacoes.find(item => Number(item.id) === Number(id));
  if (!movimentacao) return;

  await carregarDadosAuxiliaresMovimentacao();
  exibirMensagemErroMovimentacao('msgErroEditarMovimentacao', '');

  document.getElementById('editarIdMovimentacao').value = movimentacao.id;
  document.getElementById('editarPatrimonioMovimentacao').value = movimentacao.id_patrimonio || '';
  document.getElementById('buscaPatrimonioEditarMovimentacao').value = movimentacao.patrimonio_nome || '';
  document.getElementById('resultadosBuscaPatrimonioEditar').innerHTML = '';
  document.getElementById('editarUsuarioMovimentacao').value = movimentacao.id_usuario || '';
  document.getElementById('editarResponsavelMovimentacao').value = movimentacao.id_responsavel_patrimonio || '';
  document.getElementById('editarLocalOrigemMovimentacao').value = movimentacao.id_local_origem || '';
  document.getElementById('editarLocalDestinoMovimentacao').value = movimentacao.id_local_destino || '';
  document.getElementById('editarDtTransferenciaMovimentacao').value = movimentacao.data_transferencia || '';
  document.getElementById('editarObservacoesMovimentacao').value = movimentacao.observacoes || '';

  document.getElementById('modalEditarMovimentacao').style.display = 'flex';
}

// Fecha o modal de edição de movimentação.
function fecharModalEditarMovimentacao() {
  document.getElementById('modalEditarMovimentacao').style.display = 'none';
}

// ===================== MOVIMENTAÇÕES - ATUALIZAR =====================
// Envia para a API os dados alterados no modal de edição.
async function atualizarMovimentacao() {
  const id = document.getElementById('editarIdMovimentacao').value;
  const id_patrimonio = document.getElementById('editarPatrimonioMovimentacao').value;
  const id_usuario = document.getElementById('editarUsuarioMovimentacao').value;
  const id_responsavel_patrimonio = document.getElementById('editarResponsavelMovimentacao').value;
  const id_local_origem = document.getElementById('editarLocalOrigemMovimentacao').value;
  const id_local_destino = document.getElementById('editarLocalDestinoMovimentacao').value;
  const dt_transferencia = document.getElementById('editarDtTransferenciaMovimentacao').value;
  const observacoes = document.getElementById('editarObservacoesMovimentacao').value.trim();

  exibirMensagemErroMovimentacao('msgErroEditarMovimentacao', '');

  if (!id || !id_patrimonio || !id_usuario || !id_responsavel_patrimonio || !id_local_origem || !id_local_destino || !dt_transferencia) {
    exibirMensagemErroMovimentacao('msgErroEditarMovimentacao', 'Preencha todos os campos obrigatórios.');
    return;
  }

  try {
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/movimentacoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        id_patrimonio,
        id_usuario,
        id_local_origem,
        id_local_destino,
        id_responsavel_patrimonio,
        dt_transferencia,
        observacoes
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      exibirMensagemErroMovimentacao('msgErroEditarMovimentacao', dados.mensagem || 'Erro ao atualizar movimentação.');
      return;
    }

    fecharModalEditarMovimentacao();
    await carregarMovimentacoes();
  } catch (erro) {
    exibirMensagemErroMovimentacao('msgErroEditarMovimentacao', 'Erro ao conectar com o servidor.');
  }
}

// ===================== MOVIMENTAÇÕES - EXCLUSÃO =====================
// Abre o modal de confirmação e guarda o ID da movimentação selecionada.
function abrirModalExclusaoMovimentacao(id) {
  idMovimentacaoParaExcluir = id;
  document.getElementById('modalConfirmarExclusaoMovimentacao').style.display = 'flex';
}

// Fecha o modal de confirmação de exclusão.
function fecharModalExclusaoMovimentacao() {
  idMovimentacaoParaExcluir = null;
  document.getElementById('modalConfirmarExclusaoMovimentacao').style.display = 'none';
}

// Exclui o registro fisicamente após confirmação do usuário.
async function confirmarExclusaoMovimentacao() {
  if (!idMovimentacaoParaExcluir) return;

  try {
    const resposta = await fetchComMatricula(`https://controlepatrimonio.onrender.com/api/movimentacoes/${idMovimentacaoParaExcluir}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();
    fecharModalExclusaoMovimentacao();

    if (!resposta.ok || !dados.sucesso) {
      alert(dados.mensagem || 'Erro ao excluir movimentação.');
      return;
    }

    await carregarMovimentacoes();
  } catch (erro) {
    fecharModalExclusaoMovimentacao();
    alert('Erro ao conectar com o servidor.');
  }
}

// ===================== MOVIMENTAÇÕES - FECHAR LISTAS DE PESQUISA =====================
// Fecha as listas de resultado da pesquisa de patrimônio ao clicar fora do campo.
document.addEventListener('click', function (event) {
  const campoIncluir = document.getElementById('buscaPatrimonioMovimentacao');
  const listaIncluir = document.getElementById('resultadosBuscaPatrimonioIncluir');

  const campoEditar = document.getElementById('buscaPatrimonioEditarMovimentacao');
  const listaEditar = document.getElementById('resultadosBuscaPatrimonioEditar');

  if (campoIncluir && listaIncluir) {
    if (!campoIncluir.contains(event.target) && !listaIncluir.contains(event.target)) {
      listaIncluir.innerHTML = '';
    }
  }

  if (campoEditar && listaEditar) {
    if (!campoEditar.contains(event.target) && !listaEditar.contains(event.target)) {
      listaEditar.innerHTML = '';
    }
  }
});


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

  if (paginaAtual === 'patrimonio.html') {
    carregarPatrimonios();
  }

  if (paginaAtual === 'manutencao.html') {
    carregarManutencoes();
  }

  if (paginaAtual === 'movimentacao.html') {
    carregarMovimentacoes();
  }

});