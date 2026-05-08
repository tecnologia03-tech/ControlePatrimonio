// Captura os dados digitados pelo usuário nos campos de login
 async function fazerLogin(e) {
    e.preventDefault();

    const matricula = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;
    const msgErro = document.getElementById('msgErroLogin');

    msgErro.textContent = '';

// Envia matrícula e senha para a API no formato JSON
    try {
    const resposta = await fetch('https://controlepatrimonio.onrender.com/api/login', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ matricula, senha })
    });

    const dados = await resposta.json();

// Se o login for válido, oculta a tela inicial e libera o dashboard
    if (dados.sucesso) {
        document.getElementById('telaLogin').classList.add('oculto');
        document.getElementById('telaDashboard').style.display = 'block';
        renderizarGrafico();
// Se os dados estiverem incorretos, exibe a mensagem retornada pelo servidor
    } else {
        msgErro.textContent = dados.mensagem;
    }
// Se houver falha de comunicação com a API, mostra erro de conexão
} catch (erro) {
    msgErro.textContent = 'Erro ao conectar com o servidor.';
}
}

  // Logout simulado
  function fazerLogout() {
    document.getElementById('telaDashboard').style.display = 'none';
    document.getElementById('telaLogin').classList.remove('oculto');
  }

  // Toggle sidebar
  function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('fechado');
  }
  
  // Navegação de conteúdo
  function mostrarConteudo(idConteudo, elementoMenu) {
    // Esconde todas as seções de conteúdo
    document.querySelectorAll('.conteudo-secao').forEach(secao => {
      secao.classList.remove('ativo');
    });
    
    // Remove a classe 'ativo' de todos os itens do menu
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.classList.remove('ativo');
    });

    // Mostra a seção de conteúdo correta
    document.getElementById(idConteudo + '-content').classList.add('ativo');
    
    // Adiciona a classe 'ativo' ao item de menu clicado
    elementoMenu.parentElement.classList.add('ativo');
    
    // Atualiza o título da topbar
    const titulos = {
        'dashboard': 'Dashboard',
        'patrimonio': 'Gestão de Patrimônios',
        'usuarios': 'Cadastro de Usuários',
        'relatorios': 'Relatórios Gerenciais'
    };
    document.querySelector('.topbar-titulo').textContent = titulos[idConteudo] || 'Dashboard';
  }

  // Gráfico de barras
  function renderizarGrafico() {
    const canvas = document.getElementById('graficoCategoria');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Destruir gráfico existente para evitar sobreposição
    if(window.myChart instanceof Chart) {
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

  // ===================== USUÁRIOS - INCLUIR =====================
 async function salvarUsuario() {
    const nome       = document.getElementById('novoNome').value.trim();
    const matricula  = document.getElementById('novaMatricula').value.trim();
    const senha      = document.getElementById('novaSenha').value.trim();
    const perfil     = document.getElementById('novoPerfil').value;
    const msgErro    = document.getElementById('msgErroUsuario');
    const msgSucesso = document.getElementById('msgSucessoUsuario');

    // Limpa mensagens anteriores
    msgErro.classList.add('d-none');
    msgErro.textContent = '';
    msgSucesso.classList.add('d-none');
    msgSucesso.textContent = '';

    if (!nome || !matricula || !senha || !perfil) {
        msgErro.textContent = 'Preencha todos os campos obrigatórios.';
        msgErro.classList.remove('d-none'); // ← Exibe o alerta vermelho
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
            msgSucesso.classList.remove('d-none'); // ← Exibe o alerta verde
            document.getElementById('formNovoUsuario').reset();
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoUsuario'));
                if (modal) modal.hide();
                msgSucesso.classList.add('d-none');
            }, 1500);
        } else {
            msgErro.textContent = dados.mensagem;
            msgErro.classList.remove('d-none'); // ← Exibe o alerta vermelho
        }

    } catch (erro) {
        msgErro.textContent = 'Erro ao conectar com o servidor.';
        msgErro.classList.remove('d-none');
    }
}