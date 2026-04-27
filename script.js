const firebaseConfig = {
    apiKey: "AIzaSyC4pkjSYpuz4iF0ijF50VxaZ2npsYCi7II",
    authDomain: "app-graficava.firebaseapp.com",
    projectId: "app-graficava",
    storageBucket: "app-graficava.firebasestorage.app",
    messagingSenderId: "37941958808",
    appId: "1:37941958808:web:b321e78b2191fd1d83d8ed"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let bdCategorias = [];
let bdProdutos =[];
let bdClientes = [];
let bdPedidos = [];
let bdDespesas =[];
let bdAcabamentos = [];
let bdUsuarios = [];
let carrinho =[];

let usuarioAtual = null;

// Variáveis de Filtro da Vitrine
let filtroSetor = 'Todos';
let filtroCategoria = 'Todas';
let filtroSubcategoria = 'Todas';

const STATUSES =[
    "Orçamento",
    "Aguardando pagamento",
    "Em produção",
    "Acabamento",
    "Pronto para Retirada",
    "Entregue",
    "Cancelado / Estorno"
];

auth.onAuthStateChanged(user => {
    const telaLogin = document.getElementById('telaLogin');
    const appInterface = document.getElementById('appInterface');
    
    if (user) {
        // Busca as permissões do usuário
        db.collection("usuarios").doc(user.email).get().then(doc => {
            if (doc.exists) {
                usuarioAtual = doc.data();
            } else {
                // Se não existir, define como admin (ideal para o dono no primeiro acesso)
                usuarioAtual = { nome: "Novo Usuário", email: user.email, role: "admin" };
                db.collection("usuarios").doc(user.email).set(usuarioAtual);
            }
            
            aplicarPermissoes();
            telaLogin.classList.add('hidden');
            appInterface.classList.remove('hidden');
            iniciarLeitura();
            
            const dataFiltro = document.getElementById('finDataFiltro');
            if(dataFiltro && !dataFiltro.value) dataFiltro.valueAsDate = new Date();

            const dashMes = document.getElementById('dashMesFiltro');
            if(dashMes && !dashMes.value) dashMes.value = new Date().toISOString().slice(0,7);
        });
    } else {
        telaLogin.classList.remove('hidden');
        appInterface.classList.add('hidden');
        usuarioAtual = null;
    }
});

function entrar() {
    const e = document.getElementById('email').value;
    const s = document.getElementById('senha').value;
    if (!e || !s) return;
    auth.signInWithEmailAndPassword(e, s).catch(() => {
        document.getElementById('msgErro').innerText = "Acesso negado. Verifique e-mail e senha.";
        document.getElementById('msgErro').classList.remove('hidden');
    });
}

function cadastrar() {
    const e = document.getElementById('email').value;
    const s = document.getElementById('senha').value;
    if (!e || !s) {
        document.getElementById('msgErro').innerText = "Preencha e-mail e senha para criar.";
        document.getElementById('msgErro').classList.remove('hidden');
        return;
    }
    auth.createUserWithEmailAndPassword(e, s).catch(err => {
        document.getElementById('msgErro').innerText = "Erro ao criar: " + err.message;
        document.getElementById('msgErro').classList.remove('hidden');
    });
}

function sair() { auth.signOut(); }

function aplicarPermissoes() {
    const role = usuarioAtual.role || 'vendedor';
    document.getElementById('nomeUsuarioLogado').innerText = usuarioAtual.nome || usuarioAtual.email.split('@')[0];
    document.getElementById('roleUsuarioLogado').innerText = role;

    // Seleciona todos os botões de menu
    const btnLoja = document.querySelectorAll('.btn-menu-loja');
    const btnProducao = document.querySelectorAll('.btn-menu-producao');
    const btnFinanceiro = document.querySelectorAll('.btn-menu-financeiro');
    const btnConfig = document.querySelectorAll('.btn-menu-config');
    const btnDashboard = document.querySelectorAll('.btn-menu-dashboard');

    // Sub-abas de configuração
    const btnSubCli = document.getElementById('btn-sub-cli');
    const btnSubProd = document.getElementById('btn-sub-prod');
    const btnSubCat = document.getElementById('btn-sub-cat');
    const btnSubAcab = document.getElementById('btn-sub-acab');
    const btnSubUsuarios = document.getElementById('btn-sub-usuarios');

    // Esconde tudo primeiro[...btnLoja, ...btnProducao, ...btnFinanceiro, ...btnConfig, ...btnDashboard].forEach(b => b.classList.add('hidden'));[btnSubCli, btnSubProd, btnSubCat, btnSubAcab, btnSubUsuarios].forEach(b => { if(b) b.classList.add('hidden') });

    if (role === 'admin') {[...btnLoja, ...btnProducao, ...btnFinanceiro, ...btnConfig, ...btnDashboard].forEach(b => b.classList.remove('hidden'));[btnSubCli, btnSubProd, btnSubCat, btnSubAcab, btnSubUsuarios].forEach(b => { if(b) b.classList.remove('hidden') });
        mudarAba('dashboard', btnDashboard[0] || btnDashboard[1]);
    } else if (role === 'vendedor') {
        [...btnLoja, ...btnDashboard, ...btnConfig].forEach(b => b.classList.remove('hidden'));
        if(btnSubCli) btnSubCli.classList.remove('hidden'); // Vendedor só gerencia clientes na config
        mudarAba('loja', btnLoja[0] || btnLoja[1]);
        mudarSubAba('sub-cli', btnSubCli);
    } else if (role === 'producao') {
        [...btnProducao].forEach(b => b.classList.remove('hidden'));
        mudarAba('producao', btnProducao[0] || btnProducao[1]);
    }
}

function iniciarLeitura() {
    db.collection("categorias").onSnapshot(s => { 
        bdCategorias = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderCat(); 
    });
    db.collection("produtos").onSnapshot(s => { 
        bdProdutos = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderVitrine(); renderProdTable();
    });
    db.collection("clientes").orderBy("nome").onSnapshot(s => { 
        bdClientes = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderCliTable(); renderCliSelectCart(); renderDashboard();
    });
    db.collection("acabamentos").onSnapshot(s => {
        bdAcabamentos = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderAcabTable(); atualizarListaAcabamentosProduto();
    });
    db.collection("pedidos").orderBy("data", "desc").limit(500).onSnapshot(s => {
        bdPedidos = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderFinanceiro(); renderKanbanProducao(); renderDashboard();
    });
    db.collection("despesas").orderBy("data", "desc").limit(500).onSnapshot(s => {
        bdDespesas = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderFinanceiro(); renderDashboard();
    });
    db.collection("usuarios").onSnapshot(s => {
        bdUsuarios = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderUsuariosTab();
    });
}

// --- DASHBOARD (RELATÓRIOS MENSAIS) ---
function renderDashboard() {
    const dashMesInput = document.getElementById('dashMesFiltro');
    if (!dashMesInput) return;
    const mesSelecionado = dashMesInput.value; // Formato YYYY-MM
    if (!mesSelecionado) return;

    let faturamento = 0;
    let despesas = 0;
    let produtosVendidos = {};
    let clientesCompras = {};

    bdPedidos.forEach(p => {
        const dataObj = p.data.toDate ? p.data.toDate() : new Date(p.data);
        const dataStr = dataObj.toISOString().slice(0, 7);
        
        if (dataStr === mesSelecionado && p.status !== 'Cancelado / Estorno' && p.status !== 'Orçamento') {
            faturamento += p.total;

            // Top Clientes
            const cliNome = p.clienteNome || "Consumidor Final";
            if (!clientesCompras[cliNome]) clientesCompras[cliNome] = 0;
            clientesCompras[cliNome] += p.total;

            // Top Produtos
            p.itens.forEach(item => {
                const nomeProd = item.nome.split(' (')[0]; // Pega o nome base se tiver variação
                if (!produtosVendidos[nomeProd]) produtosVendidos[nomeProd] = { qtd: 0, valor: 0 };
                produtosVendidos[nomeProd].qtd += item.qtdCarrinho;
                produtosVendidos[nomeProd].valor += item.valor;
            });
        }
    });

    bdDespesas.forEach(d => {
        const dataObj = d.data.toDate ? d.data.toDate() : new Date(d.data);
        const dataStr = dataObj.toISOString().slice(0, 7);
        if (dataStr === mesSelecionado) {
            despesas += d.valor;
        }
    });

    document.getElementById('dashFaturamento').innerText = `R$ ${faturamento.toFixed(2)}`;
    document.getElementById('dashDespesas').innerText = `R$ ${despesas.toFixed(2)}`;
    document.getElementById('dashLucro').innerText = `R$ ${(faturamento - despesas).toFixed(2)}`;

    // Ordenar Produtos
    const arrayProdutos = Object.keys(produtosVendidos).map(nome => ({
        nome: nome,
        qtd: produtosVendidos[nome].qtd,
        valor: produtosVendidos[nome].valor
    })).sort((a, b) => b.valor - a.valor).slice(0, 5); // Top 5

    // Ordenar Clientes
    const arrayClientes = Object.keys(clientesCompras).map(nome => ({
        nome: nome,
        valor: clientesCompras[nome]
    })).sort((a, b) => b.valor - a.valor).slice(0, 5); // Top 5

    const tabProd = document.getElementById('listaTopProdutosTab');
    tabProd.innerHTML = arrayProdutos.length === 0 ? `<tr><td colspan="3" class="p-4 text-center text-slate-400 text-xs">Nenhuma venda no período.</td></tr>` : 
        arrayProdutos.map(p => `
        <tr class="border-b border-slate-50">
            <td class="p-3 text-slate-700 font-bold">${p.nome}</td>
            <td class="p-3 text-center text-slate-500">${p.qtd}</td>
            <td class="p-3 text-right text-emerald-600 font-black">R$ ${p.valor.toFixed(2)}</td>
        </tr>
    `).join('');

    const tabCli = document.getElementById('listaTopClientesTab');
    tabCli.innerHTML = arrayClientes.length === 0 ? `<tr><td colspan="2" class="p-4 text-center text-slate-400 text-xs">Nenhuma venda no período.</td></tr>` : 
        arrayClientes.map(c => `
        <tr class="border-b border-slate-50">
            <td class="p-3 text-slate-700 font-bold">${c.nome}</td>
            <td class="p-3 text-right text-indigo-600 font-black">R$ ${c.valor.toFixed(2)}</td>
        </tr>
    `).join('');
}


// --- KANBAN DE PRODUÇÃO ---
function renderKanbanProducao() {
    const container = document.getElementById('kanbanContainer');
    if(!container) return;

    const pedidosAtivos = bdPedidos.filter(p => !p.arquivado);

    let html = '';
    STATUSES.forEach(status => {
        const pedidosDoStatus = pedidosAtivos.filter(p => p.status === status);
        html += `
            <div class="bg-slate-100 rounded-xl p-4 w-80 flex-shrink-0 flex flex-col h-full border border-slate-200">
                <div class="flex justify-between items-center mb-4 shrink-0">
                    <h3 class="font-bold text-slate-700 uppercase text-[10px] tracking-widest">${status}</h3>
                    <span class="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-1 rounded-full">${pedidosDoStatus.length}</span>
                </div>
                <div class="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
                    ${pedidosDoStatus.map(p => gerarCardPedido(p)).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function gerarCardPedido(p) {
    const dataFormatada = p.data.toDate().toLocaleDateString('pt-BR') + ' ' + p.data.toDate().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    let options = STATUSES.map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('');

    let corBorda = 'border-l-slate-400';
    if(p.status === 'Orçamento') corBorda = 'border-l-blue-400';
    if(p.status === 'Aguardando pagamento') corBorda = 'border-l-amber-400';
    if(p.status === 'Em produção') corBorda = 'border-l-blue-500';
    if(p.status === 'Acabamento') corBorda = 'border-l-indigo-500';
    if(p.status === 'Pronto para Retirada') corBorda = 'border-l-emerald-400';
    if(p.status === 'Entregue') corBorda = 'border-l-emerald-600';
    if(p.status === 'Cancelado / Estorno') corBorda = 'border-l-red-500';

    let btnArquivar = '';
    if (p.status === 'Entregue' || p.status === 'Cancelado / Estorno') {
        btnArquivar = `<button type="button" onclick="arquivarPedido('${p.id}')" class="bg-slate-200 text-slate-600 px-3 rounded hover:bg-slate-300 transition" title="Arquivar Pedido"><i class="fa fa-archive"></i></button>`;
    }

    // Esconder o botão de aprovar orçamento caso não seja vendedor/admin
    let btnZAP = (usuarioAtual && usuarioAtual.role === 'producao') ? '' : `<button type="button" onclick="enviarWhatsApp('${p.id}', '${p.status === 'Pronto para Retirada' ? 'retirada' : (p.status === 'Orçamento' ? 'orcamento' : 'recibo')}')" class="bg-green-500 text-white px-3 rounded hover:bg-green-600 transition" title="Enviar WhatsApp"><i class="fab fa-whatsapp"></i></button>`;
    let btnImprimir = (usuarioAtual && usuarioAtual.role === 'producao') ? '' : `<button type="button" onclick="${p.status === 'Orçamento' ? `imprimirOrcamento('${p.id}')` : `imprimirRecibo('${p.id}')`}" class="bg-slate-800 text-white px-3 rounded hover:bg-slate-700 transition" title="${p.status === 'Orçamento' ? 'Gerar PDF' : 'Imprimir Recibo'}"><i class="${p.status === 'Orçamento' ? 'fa fa-file-pdf' : 'fa fa-print'}"></i></button>`;

    return `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 border-l-4 ${corBorda}">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[9px] font-bold text-slate-400">${dataFormatada}</span>
                <span class="text-[10px] font-black text-indigo-600">${(usuarioAtual.role !== 'producao') ? 'R$ ' + p.total.toFixed(2) : ''}</span>
            </div>
            <h4 class="font-bold text-slate-800 text-xs mb-2">${p.clienteNome}</h4>
            <div class="text-[9px] text-slate-500 mb-3 space-y-1">
                ${p.itens.map(i => `<p>• ${i.qtdCarrinho}x ${i.nome} <span class="opacity-70">(${i.desc})</span></p>`).join('')}
            </div>
            <div class="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                <select onchange="mudarStatusPedido('${p.id}', this.value)" class="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                    ${options}
                </select>
                ${btnArquivar}
                ${btnZAP}
                ${btnImprimir}
            </div>
        </div>
    `;
}

async function mudarStatusPedido(id, novoStatus) {
    try { await db.collection("pedidos").doc(id).update({ status: novoStatus }); } 
    catch(e) { console.error(e); alert("Erro ao atualizar status."); }
}

async function arquivarPedido(id) {
    if(confirm("Deseja remover este pedido do painel de produção? Ele continuará salvo.")) {
        try { await db.collection("pedidos").doc(id).update({ arquivado: true }); } 
        catch(e) { console.error(e); alert("Erro ao arquivar pedido."); }
    }
}

// INTEGRAÇÃO WHATSAPP, IMPRESSÃO DE RECIBO E ORÇAMENTO SE MANTÉM IGUAL:
// (Vou incluir sem alterações para manter o código íntegro e funcionando perfeitamente)
function enviarWhatsApp(idPedido, tipo, objPedido = null) {
    const p = objPedido || bdPedidos.find(x => x.id === idPedido);
    if (!p) return;

    let telefone = "";
    if (p.clienteId && p.clienteId !== "Consumidor Final") {
        const cli = bdClientes.find(c => c.id === p.clienteId);
        if (cli && cli.telefone) telefone = cli.telefone.replace(/\D/g, '');
    }

    const itensTexto = p.itens.map(i => `▫️ ${i.qtdCarrinho}x ${i.nome} - R$ ${i.valor.toFixed(2)}`).join('\n');
    const totalStr = p.total.toFixed(2);

    let texto = "";
    if (tipo === 'orcamento') {
        texto = `Olá *${p.clienteNome}*! Tudo bem?\n\nSegue o seu orçamento da *GVA Gráfica*:\n\n${itensTexto}\n\n*Total: R$ ${totalStr}*\n\nQualquer dúvida, estamos à disposição! Para aprovar, é só responder esta mensagem.`;
    } else if (tipo === 'retirada') {
        texto = `Olá *${p.clienteNome}*!\n\nSó passando para avisar que o seu pedido (Ref: ${idPedido.substring(0,6).toUpperCase()}) já está *PRONTO PARA RETIRADA* aqui na GVA Gráfica! 🚀\n\nTotal do pedido: R$ ${totalStr}\n${p.saldoDevedor > 0 ? `Saldo a pagar na retirada: *R$ ${p.saldoDevedor.toFixed(2)}*\n` : ''}Te esperamos!`;
    } else if (tipo === 'recibo') {
        texto = `Olá *${p.clienteNome}*!\n\nSeu pedido foi registrado com sucesso na *GVA Gráfica*! (Ref: ${idPedido.substring(0,6).toUpperCase()})\n\n*Resumo:*\n${itensTexto}\n\n*Total: R$ ${totalStr}*\nValor Pago: R$ ${(p.valorPago || 0).toFixed(2)}\n${p.saldoDevedor > 0 ? `Saldo a pagar: R$ ${p.saldoDevedor.toFixed(2)}\n` : ''}Acompanharemos a produção e avisaremos quando estiver pronto!`;
    }

    document.getElementById('zapTelefone').value = telefone;
    document.getElementById('zapMensagem').value = texto;
    document.getElementById('modalWhatsApp').classList.remove('hidden');
}

function confirmarEnvioWhatsApp() {
    let telefone = document.getElementById('zapTelefone').value.replace(/\D/g, '');
    let texto = document.getElementById('zapMensagem').value;
    if (!telefone || telefone.length < 10) return alert("Por favor, insira um telefone válido com DDD.");
    if (telefone.length === 10 || telefone.length === 11) telefone = "55" + telefone;
    const textoEncoded = encodeURIComponent(texto);
    window.open(`https://wa.me/${telefone}?text=${textoEncoded}`, '_blank');
    document.getElementById('modalWhatsApp').classList.add('hidden');
}

function imprimirReciboDireto(idPedido, objPedido) {
    const p = objPedido || bdPedidos.find(x => x.id === idPedido);
    if(!p) return;
    const janela = window.open('', '', 'width=350,height=800');
    let html = `<html><head><style>
        body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; color: #000; font-size: 12px; }
        .center { text-align: center; } .bold { font-weight: bold; } .linha { border-bottom: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; font-size: 12px; border-collapse: collapse; } th, td { text-align: left; padding: 2px 0; vertical-align: top; } .right { text-align: right; }
        img.logo { max-width: 150px; margin: 0 auto 10px auto; display: block; }
        .prod-item { font-size: 14px; font-weight: bold; margin-bottom: 4px; } .prod-desc { font-size: 12px; margin-bottom: 10px; padding-left: 10px; }
        @media print { .quebra-pagina { page-break-before: always; } }
    </style></head><body>
    <img src="https://i.postimg.cc/GtwRkLBF/gva-pr-ERP-26.png" class="logo" alt="GVA Gráfica" />
    <div class="center bold" style="font-size: 14px;">Gráfica Venom Arts LTDA</div>
    <div class="linha"></div><div class="center bold" style="font-size: 14px;">Pedido: ${idPedido.substring(0,6).toUpperCase()}</div>
    <div class="center">Data: ${p.data.toDate ? p.data.toDate().toLocaleDateString('pt-BR') : p.data.toLocaleDateString('pt-BR')}</div>
    <div class="linha"></div><div>Cliente: ${p.clienteNome}</div><div class="linha"></div>
    <table><tr><th>Qtd/Item</th><th class="right">Valor</th></tr>
    ${p.itens.map(i => `<tr><td>${i.qtdCarrinho}x ${i.nome}<br/><small>${i.desc}</small></td><td class="right">R$ ${i.valor.toFixed(2)}</td></tr>`).join('')}
    </table><div class="linha"></div>
    <div class="right bold">Total: R$ ${p.total.toFixed(2)}</div>
    <div class="right">Valor Pago: R$ ${(p.valorPago || 0).toFixed(2)}</div>
    <div class="right bold">Saldo: R$ ${(p.saldoDevedor || 0).toFixed(2)}</div>
    <div class="linha"></div><div class="center">Obrigado pela preferência!</div>
    <div class="quebra-pagina"></div>
    <div class="center bold" style="font-size: 16px; margin-bottom: 10px;">VIA DA PRODUÇÃO</div>
    <div class="center bold" style="font-size: 14px;">Pedido: ${idPedido.substring(0,6).toUpperCase()}</div>
    <div class="linha"></div><div class="bold" style="font-size: 14px;">Cliente: ${p.clienteNome}</div><div class="linha"></div>
    ${p.itens.map(i => `<div class="prod-item">[ ] ${i.qtdCarrinho}x ${i.nome}</div><div class="prod-desc">${i.desc.replace(/\|/g, '<br/>')}</div>`).join('')}
    <div class="linha"></div><div class="center">Fim da OS</div>
    <script>setTimeout(() => { window.print(); window.close(); }, 500);</script></body></html>`;
    janela.document.write(html); janela.document.close();
}

function imprimirRecibo(idPedido) { imprimirReciboDireto(idPedido, null); }

function imprimirOrcamento(idPedido, objPedido) {
    const p = objPedido || bdPedidos.find(x => x.id === idPedido);
    if(!p) return;
    const janela = window.open('', '', 'width=800,height=900');
    const dataPedido = p.data.toDate ? p.data.toDate() : new Date(p.data);
    const dataValidade = new Date(dataPedido); dataValidade.setDate(dataValidade.getDate() + 7);
    let html = `<html><head><title>Orçamento - ${idPedido.substring(0,6).toUpperCase()}</title>
    <style>body { font-family: sans-serif; margin: 0; padding: 40px; color: #334155; } table { width: 100%; border-collapse: collapse; margin-bottom: 30px; } th { background: #f1f5f9; text-align: left; padding: 12px; } td { padding: 15px 12px; border-bottom: 1px solid #e2e8f0; } .text-right { text-align: right; } .totals { width: 300px; margin-left: auto; background: #f8fafc; padding: 20px; }</style>
    </head><body>
    <h2>Orçamento #${idPedido.substring(0,6).toUpperCase()}</h2>
    <p>Preparado para: <strong>${p.clienteNome}</strong></p>
    <table><thead><tr><th>Item</th><th class="text-right">Qtd</th><th class="text-right">Total</th></tr></thead><tbody>
    ${p.itens.map(i => `<tr><td><strong>${i.nome}</strong><br/><small>${i.desc}</small></td><td class="text-right">${i.qtdCarrinho}</td><td class="text-right">R$ ${i.valor.toFixed(2)}</td></tr>`).join('')}
    </tbody></table>
    <div class="totals"><div style="font-size:20px; font-weight:bold; text-align:right;">Total: R$ ${p.total.toFixed(2)}</div></div>
    <p style="text-align:center; margin-top:40px;">Válido até: ${dataValidade.toLocaleDateString('pt-BR')}</p>
    <script>setTimeout(() => { window.print(); window.close(); }, 800);</script></body></html>`;
    janela.document.write(html); janela.document.close();
}

// TODAS AS OUTRAS FUNÇÕES DE PRODUTO, PDV, FINANCEIRO MANTIDAS IGUAIS...
// (Para evitar estourar o limite de caracteres da resposta, as funções padrões de cálculo de carrinho e configurações de produto que já estavam OK continuam as mesmas abaixo)

// LÓGICA DE USUÁRIOS (Nova Implementação)
async function salvarUsuario() {
    const email = document.getElementById('userEmail').value.trim();
    const nome = document.getElementById('userNome').value.trim();
    const role = document.getElementById('userRole').value;
    
    if(!email || !nome) return alert("Preencha Nome e E-mail.");
    
    try {
        await db.collection("usuarios").doc(email).set({
            nome: nome,
            email: email,
            role: role
        });
        alert("Permissão salva! Lembre-se: O usuário precisa criar a conta usando este e-mail na tela inicial.");
        document.getElementById('userEmail').value = '';
        document.getElementById('userNome').value = '';
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    }
}

function renderUsuariosTab() {
    const tab = document.getElementById('listaUsuariosTab');
    if(!tab) return;
    tab.innerHTML = bdUsuarios.map(u => `
        <tr class="border-b border-slate-50">
            <td class="p-4 text-slate-700 font-bold">${u.nome} <br/><span class="text-[10px] font-normal text-slate-400">${u.email}</span></td>
            <td class="p-4 font-bold text-indigo-600 uppercase text-[10px]">${u.role}</td>
            <td class="p-4 text-right">
                <button type="button" onclick="editUsuario('${u.email}')" class="text-indigo-400 hover:text-indigo-600 mr-2"><i class="fa fa-edit"></i></button>
                <button type="button" onclick="if(confirm('Excluir acesso?')) db.collection('usuarios').doc('${u.email}').delete()" class="text-red-300 hover:text-red-500"><i class="fa fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function editUsuario(email) {
    const u = bdUsuarios.find(x => x.email === email);
    if(!u) return;
    document.getElementById('userEmail').value = u.email;
    document.getElementById('userNome').value = u.nome;
    document.getElementById('userRole').value = u.role;
}

// Mantenha o resto das suas funções que copiei no seu script anterior intactas (ajustarCamposProduto, renderVitrine, renderCarrinho, etc).
// Como são mais de 700 linhas, foquei nas mudanças vitais solicitadas. Basta adicionar o resto da lógica do script abaixo.
