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

let bdCategorias = [], bdProdutos = [], bdClientes = [], bdPedidos = [], bdAcabamentos = [], bdTransacoes = [], bdUsuarios = [], carrinho = [];
let bdEmpresa = {};
let usuarioAtual = null;
const STATUSES = ["Orçamento", "Aguardando pagamento", "Em produção", "Acabamento", "Pronto para Retirada", "Entregue", "Cancelado / Estorno"];

// --- UX: FECHAR MODAIS CLICANDO FORA ---
window.onclick = function(event) {
    if (event.target.classList.contains('fixed') && event.target.classList.contains('inset-0')) {
        event.target.classList.add('hidden');
    }
};

function fecharModal() { document.getElementById('modalW2P')?.classList.add('hidden'); }
function fecharModalFora(event) { if (event.target.id === 'modalW2P') fecharModal(); }

// --- AUTENTICAÇÃO E AUTO-LOGOUT ---
auth.onAuthStateChanged(async user => {
    const telaLogin = document.getElementById('telaLogin');
    const appInterface = document.getElementById('appInterface');
    const btnEntrar = document.getElementById('btnEntrar');
    
    if (user) {
        const hoje = new Date().toDateString();
        const ultimoAcesso = localStorage.getItem('dataUltimoAcesso');
        if (ultimoAcesso && ultimoAcesso !== hoje) {
            auth.signOut();
            localStorage.removeItem('dataUltimoAcesso');
            return; 
        }
        localStorage.setItem('dataUltimoAcesso', hoje);

        if(telaLogin) telaLogin.classList.add('hidden'); 
        if(appInterface) appInterface.classList.remove('hidden');
        if (btnEntrar) { btnEntrar.innerText = "Entrar no Sistema"; btnEntrar.disabled = false; }
        
        try {
            const doc = await db.collection("usuarios").doc(user.email).get();
            if (doc.exists) usuarioAtual = doc.data();
            else { 
                usuarioAtual = { nome: user.email.split('@')[0], email: user.email, role: "admin" }; 
                await db.collection("usuarios").doc(user.email).set(usuarioAtual); 
            }
        } catch (error) { 
            usuarioAtual = { nome: user.email.split('@')[0], email: user.email, role: "admin" }; 
        }
        
        aplicarPermissoes();
        
        const dashMes = document.getElementById('dashMesFiltro'); 
        if(dashMes && !dashMes.value) dashMes.value = new Date().toISOString().slice(0,7);
        
        iniciarLeitura();
    } else {
        if(telaLogin) telaLogin.classList.remove('hidden'); 
        if(appInterface) appInterface.classList.add('hidden'); 
        usuarioAtual = null;
        if (btnEntrar) { btnEntrar.innerText = "Entrar no Sistema"; btnEntrar.disabled = false; }
    }
});

function entrar() {
    const e = document.getElementById('email')?.value;
    const s = document.getElementById('senha')?.value;
    const msgErro = document.getElementById('msgErro');
    const btnEntrar = document.getElementById('btnEntrar');
    
    if (!e || !s) { 
        if(msgErro) { msgErro.innerText = "Preencha os dados."; msgErro.classList.remove('hidden'); }
        return; 
    }
    
    if(msgErro) msgErro.classList.add('hidden'); 
    if(btnEntrar) { btnEntrar.innerText = "Verificando..."; btnEntrar.disabled = true; }
    
    auth.signInWithEmailAndPassword(e, s).catch(() => { 
        if(msgErro) { msgErro.innerText = "Acesso negado. Verifique e-mail e senha."; msgErro.classList.remove('hidden'); }
        if(btnEntrar) { btnEntrar.innerText = "Entrar no Sistema"; btnEntrar.disabled = false; }
    });
}

function sair() { 
    localStorage.removeItem('dataUltimoAcesso');
    auth.signOut(); 
}

// --- PERMISSÕES DE USUÁRIO ---
function aplicarPermissoes() {
    if(!usuarioAtual) return;
    const role = usuarioAtual.role || 'vendedor';
    
    const elNome = document.getElementById('nomeUsuarioLogado');
    const elRole = document.getElementById('roleUsuarioLogado');
    if(elNome) elNome.innerText = usuarioAtual.nome || usuarioAtual.email.split('@')[0];
    if(elRole) elRole.innerText = role;
    
    const btnLoja = document.querySelectorAll('.btn-menu-loja');
    const btnProducao = document.querySelectorAll('.btn-menu-producao');
    const btnFinanceiro = document.querySelectorAll('.btn-menu-financeiro');
    const btnConfig = document.querySelectorAll('.btn-menu-config');
    const btnDashboard = document.querySelectorAll('.btn-menu-dashboard');
    
    [...btnLoja, ...btnProducao, ...btnFinanceiro, ...btnConfig, ...btnDashboard].forEach(b => b.classList.add('hidden'));

    if (role === 'admin') {
        [...btnLoja, ...btnProducao, ...btnFinanceiro, ...btnConfig, ...btnDashboard].forEach(b => b.classList.remove('hidden'));
        mudarAba('dashboard'); 
    } 
    else if (role === 'vendedor') {
        [...btnLoja, ...btnProducao, ...btnFinanceiro, ...btnConfig].forEach(b => b.classList.remove('hidden')); 
        mudarAba('loja'); 
        mudarSubAba('sub-cli'); 
    } 
    else if (role === 'producao') {
        [...btnProducao].forEach(b => b.classList.remove('hidden')); 
        mudarAba('producao'); 
    }
}

// --- LEITURA DE DADOS ---
function iniciarLeitura() {
    db.collection("categorias").onSnapshot(s => { 
        bdCategorias = s.docs.map(d => ({id: d.id, ...d.data()}));
        if(typeof renderCat === 'function') renderCat(); 
        if(typeof renderFiltrosVitrine === 'function') renderFiltrosVitrine();
    });
    db.collection("produtos").onSnapshot(s => { 
        bdProdutos = s.docs.map(d => ({id: d.id, ...d.data()}));
        if(typeof renderVitrine === 'function') renderVitrine(); 
        if(typeof renderProdTable === 'function') renderProdTable();
    });
    db.collection("clientes").orderBy("nome").onSnapshot(s => { 
        bdClientes = s.docs.map(d => ({id: d.id, ...d.data()}));
        if(typeof renderCliTable === 'function') renderCliTable(); 
        if(typeof renderCliSelectCart === 'function') renderCliSelectCart(); 
        if(typeof renderDashboard === 'function') renderDashboard();
    });
    db.collection("acabamentos").onSnapshot(s => {
        bdAcabamentos = s.docs.map(d => ({id: d.id, ...d.data()}));
        if(typeof renderAcabTable === 'function') renderAcabTable(); 
        if(typeof atualizarListaAcabamentosProduto === 'function') atualizarListaAcabamentosProduto();
    });
    db.collection("pedidos").orderBy("data", "desc").limit(500).onSnapshot(s => {
        bdPedidos = s.docs.map(d => ({id: d.id, ...d.data()}));
        if(typeof renderPedidosFinanceiro === 'function') renderPedidosFinanceiro(); 
        if(typeof renderKanbanProducao === 'function') renderKanbanProducao(); 
        if(typeof renderDashboard === 'function') renderDashboard(); 
        if(typeof renderOrcamentos === 'function') renderOrcamentos(); 
        if(typeof renderAReceber === 'function') renderAReceber();
        if(document.getElementById('modalHistoricoGeral') && !document.getElementById('modalHistoricoGeral').classList.contains('hidden')) {
            if(typeof renderHistoricoGeral === 'function') renderHistoricoGeral();
        }
    });
    db.collection("transacoes").orderBy("data", "desc").limit(500).onSnapshot(s => {
        bdTransacoes = s.docs.map(d => ({id: d.id, ...d.data()}));
        if(typeof renderPedidosFinanceiro === 'function') renderPedidosFinanceiro(); 
        if(typeof renderDashboard === 'function') renderDashboard();
    });
    db.collection("usuarios").onSnapshot(s => { 
        bdUsuarios = s.docs.map(d => ({id: d.id, ...d.data()})); 
        if(typeof renderUsuariosTab === 'function') renderUsuariosTab(); 
    });
    db.collection("empresa").doc("dados").onSnapshot(s => { 
        if(s.exists) bdEmpresa = s.data(); else bdEmpresa = {}; 
        if(typeof editEmpresa === 'function') editEmpresa(); 
    });
}

// --- NAVEGAÇÃO ---
function mudarAba(aba, btn) { 
    document.querySelectorAll('.aba-content').forEach(el => el.classList.add('hidden')); 
    document.getElementById('aba-'+aba)?.classList.remove('hidden'); 
    document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('active-aba')); 
    if(btn) btn.classList.add('active-aba'); 
}

function mudarSubAba(sub, btn) { 
    document.querySelectorAll('.sub-aba-content').forEach(el => el.classList.add('hidden')); 
    document.getElementById(sub)?.classList.remove('hidden'); 
    document.querySelectorAll('.sub-aba-btn').forEach(b => b.classList.remove('active-sub', 'text-indigo-600')); 
    if(btn) btn.classList.add('active-sub', 'text-indigo-600'); 
}
// --- DASHBOARD ---
function renderDashboard() {
    const dashMesInput = document.getElementById('dashMesFiltro'); 
    if (!dashMesInput || !dashMesInput.value) return;
    
    const mesSelecionado = dashMesInput.value; 
    let faturamento = 0, despesas = 0, produtosVendidos = {}, clientesCompras = {}, despesasCat = {};
    
    bdPedidos.forEach(p => {
        if (!p.data) return; 
        const dataStr = (p.data.toDate ? p.data.toDate() : new Date(p.data)).toISOString().slice(0, 7);
        // Ignora Orçamentos e Cancelados/Estornados no Faturamento
        if (dataStr === mesSelecionado && p.status !== 'Cancelado / Estorno' && p.status !== 'Orçamento') {
            faturamento += p.total; 
            const cliNome = p.clienteNome || "Consumidor Final";
            if (!clientesCompras[cliNome]) clientesCompras[cliNome] = 0; 
            clientesCompras[cliNome] += p.total;
            
            if(p.itens) {
                p.itens.forEach(item => {
                    const nomeProd = item.nome.split(' (')[0]; 
                    if (!produtosVendidos[nomeProd]) produtosVendidos[nomeProd] = { qtd: 0, valor: 0 };
                    let qtdNum = parseInt(item.qtdCarrinho); if (isNaN(qtdNum)) qtdNum = 1; 
                    let valNum = parseFloat(item.valorModal * item.qtdCarrinho); if (isNaN(valNum)) valNum = 0;
                    produtosVendidos[nomeProd].qtd += qtdNum; 
                    produtosVendidos[nomeProd].valor += valNum;
                });
            }
        }
    });
    
    bdTransacoes.forEach(t => { 
        if (!t.data || t.tipo !== 'saida') return; 
        const dataStr = (t.data.toDate ? t.data.toDate() : new Date(t.data)).toISOString().slice(0, 7); 
        if (dataStr === mesSelecionado) {
            despesas += t.valor;
            let cat = 'Outros'; 
            if(!despesasCat[cat]) despesasCat[cat] = 0;
            despesasCat[cat] += t.valor;
        } 
    });
    
    const elFat = document.getElementById('dashFaturamento'); if(elFat) elFat.innerText = `R$ ${faturamento.toFixed(2)}`; 
    const elDesp = document.getElementById('dashDespesas'); if(elDesp) elDesp.innerText = `R$ ${despesas.toFixed(2)}`; 
    const elLucro = document.getElementById('dashLucro'); if(elLucro) elLucro.innerText = `R$ ${(faturamento - despesas).toFixed(2)}`;
    
    const arrayProdutos = Object.keys(produtosVendidos).map(nome => ({ nome: nome, qtd: produtosVendidos[nome].qtd, valor: produtosVendidos[nome].valor })).sort((a, b) => b.valor - a.valor).slice(0, 5);
    const tabProd = document.getElementById('listaTopProdutosTab');
    if(tabProd) {
        tabProd.innerHTML = arrayProdutos.length === 0 ? `<tr><td colspan="3" class="p-4 text-center text-slate-400 text-xs">Nenhuma venda no período.</td></tr>` : arrayProdutos.map(p => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${p.nome}</td><td class="p-3 text-center text-slate-500">${p.qtd}</td><td class="p-3 text-right text-emerald-600 font-black">R$ ${p.valor.toFixed(2)}</td></tr>`).join('');
    }

    const arrayClientes = Object.keys(clientesCompras).map(nome => ({ nome: nome, valor: clientesCompras[nome] })).sort((a, b) => b.valor - a.valor).slice(0, 5);
    const tabCli = document.getElementById('listaTopClientesTab');
    if(tabCli) {
        tabCli.innerHTML = arrayClientes.length === 0 ? `<tr><td colspan="2" class="p-4 text-center text-slate-400 text-xs">Nenhuma venda no período.</td></tr>` : arrayClientes.map(c => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${c.nome}</td><td class="p-3 text-right text-indigo-600 font-black">R$ ${c.valor.toFixed(2)}</td></tr>`).join('');
    }

    const arrayDespCat = Object.keys(despesasCat).map(c => ({ cat: c, val: despesasCat[c] })).sort((a,b) => b.val - a.val);
    const tabDespCat = document.getElementById('listaDespesasCatTab');
    if(tabDespCat) {
        tabDespCat.innerHTML = arrayDespCat.length === 0 ? `<tr><td colspan="2" class="p-4 text-center text-slate-400 text-xs">Nenhuma despesa no período.</td></tr>` : arrayDespCat.map(d => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${d.cat}</td><td class="p-3 text-right text-red-500 font-black">R$ ${d.val.toFixed(2)}</td></tr>`).join('');
    }
}

function imprimirDashboard() {
    const mes = document.getElementById('dashMesFiltro')?.value; if(!mes) return;
    const [ano, mesNum] = mes.split('-'); 
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const mesFormatado = `${meses[parseInt(mesNum)-1]} de ${ano}`;
    
    const fat = document.getElementById('dashFaturamento')?.innerText || 'R$ 0.00';
    const desp = document.getElementById('dashDespesas')?.innerText || 'R$ 0.00';
    const lucro = document.getElementById('dashLucro')?.innerText || 'R$ 0.00';
    const tabProd = document.getElementById('listaTopProdutosTab')?.innerHTML || '';
    const tabCli = document.getElementById('listaTopClientesTab')?.innerHTML || '';
    
    const janela = window.open('', '', 'width=800,height=900');
    janela.document.write(`<html><head><title>Relatório Mensal - ${mesFormatado}</title><style>body{font-family:sans-serif;padding:40px;color:#334155}.header{text-align:center;margin-bottom:40px;border-bottom:2px solid #e2e8f0;padding-bottom:20px}h1{color:#3E4095;margin:0 0 10px 0;font-size:28px;text-transform:uppercase}.cards{display:flex;gap:20px;margin-bottom:40px}.card{border:1px solid #e2e8f0;padding:20px;border-radius:8px;flex:1;background:#f8fafc;text-align:center}.card h3{margin:0 0 10px 0;font-size:12px;text-transform:uppercase;color:#64748b}.card p{margin:0;font-size:24px;font-weight:bold;color:#0f172a}.card.lucro p{color:#10b981}.card.desp p{color:#ef4444}h2{color:#3E4095;font-size:16px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-top:40px}table{width:100%;border-collapse:collapse;margin-bottom:30px;font-size:14px}th,td{border-bottom:1px solid #e2e8f0;padding:12px 8px;text-align:left}th{background:#f1f5f9;color:#475569;font-size:12px;text-transform:uppercase}.text-right{text-align:right}.text-center{text-align:center}@media print{body{padding:0}}</style></head><body><div class="header"><h1>Relatório de Desempenho</h1><p style="margin:0;color:#64748b;font-weight:bold;">Período: ${mesFormatado}</p></div><div class="cards"><div class="card"><h3>Faturamento Bruto</h3><p>${fat}</p></div><div class="card desp"><h3>Total de Despesas</h3><p>${desp}</p></div><div class="card lucro"><h3>Saldo / Lucro</h3><p>${lucro}</p></div></div><h2>Produtos Mais Vendidos</h2><table><thead><tr><th>Produto</th><th class="text-center">Qtd Vendida</th><th class="text-right">Receita Bruta (S/ Desc)</th></tr></thead><tbody>${tabProd}</tbody></table><h2>Melhores Clientes</h2><table><thead><tr><th>Cliente</th><th class="text-right">Volume Comprado</th></tr></thead><tbody>${tabCli}</tbody></table><div style="text-align:center;margin-top:50px;font-size:12px;color:#94a3b8;">Gerado pelo sistema GVAsist em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div><script>setTimeout(()=>{window.print();window.close();},800);</script></body></html>`);
    janela.document.close();
}

// --- ORÇAMENTOS (FOLLOW-UP) ---
function renderOrcamentos() {
    const tbody = document.getElementById('listaOrcamentosTab');
    if(!tbody) return;
    const orcamentos = bdPedidos.filter(p => p.status === 'Orçamento' && !p.arquivado).sort((a,b) => b.data.toDate() - a.data.toDate());
    
    tbody.innerHTML = orcamentos.length === 0 ? `<tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum orçamento pendente.</td></tr>` : orcamentos.map(p => {
        const dataObj = p.data.toDate ? p.data.toDate() : new Date(p.data);
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        const dias = Math.floor((new Date() - dataObj) / (1000 * 60 * 60 * 24));
        let badgeDias = dias > 2 ? `<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] uppercase ml-2 font-black">${dias} dias pendente</span>` : `<span class="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[9px] uppercase ml-2 font-black">Novo</span>`;
        
        return `
        <tr class="border-b border-slate-50 hover:bg-slate-50">
            <td class="p-3 text-slate-500 font-medium">${dataFormatada} <br/><span class="text-[9px] text-slate-400 uppercase">${p.id.substring(0,6)}</span></td>
            <td class="p-3 font-bold text-slate-700">${p.clienteNome} ${badgeDias}</td>
            <td class="p-3 text-right font-black text-slate-800">R$ ${p.total.toFixed(2)}</td>
            <td class="p-3 text-center">
                <button type="button" onclick="imprimirOrcamento('${p.id}')" class="text-indigo-400 hover:text-indigo-600 mx-2" title="Imprimir PDF"><i class="fa fa-print"></i></button>
            </td>
        </tr>
        `;
    }).join('');
}

// --- KANBAN DE PRODUÇÃO (INTELIGENTE) ---
function renderKanbanProducao() {
    const container = document.getElementById('kanbanContainer');
    if(!container) return;

    let html = '';
    const pedidosAtivos = bdPedidos.filter(p => !p.arquivado);

    STATUSES.forEach(status => {
        if(status === 'Orçamento') return; 
        
        const pedidosDoStatus = pedidosAtivos.filter(p => p.status === status);
        const isVazio = pedidosDoStatus.length === 0;
        
        // Classes para minimizar a coluna se estiver vazia
        const minClass = isVazio ? 'minimized items-center' : '';
        const headerClass = isVazio ? 'flex-col-reverse justify-center' : 'justify-between items-center';
        const titleClass = isVazio ? 'vertical-text mt-6' : '';
        const badgeClass = isVazio ? 'mb-4' : '';

        html += `
            <div onclick="if(this.classList.contains('minimized')) { this.classList.remove('minimized', 'items-center'); this.querySelector('.k-header').classList.remove('flex-col-reverse', 'justify-center'); this.querySelector('.k-header').classList.add('justify-between', 'items-center'); this.querySelector('h3').classList.remove('vertical-text', 'mt-6'); this.querySelector('.k-badge').classList.remove('mb-4'); }" class="bg-slate-100 rounded-xl p-4 w-80 flex-shrink-0 flex flex-col kanban-col border border-slate-200 ${minClass}">
                <div class="k-header flex ${headerClass} w-full mb-4 shrink-0 transition-all">
                    <h3 class="font-bold text-slate-700 uppercase text-[10px] tracking-widest ${titleClass}">${status}</h3>
                    <span class="k-badge bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-1 rounded-full ${badgeClass}">${pedidosDoStatus.length}</span>
                </div>
                <div class="kanban-cards flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    ${pedidosDoStatus.map(p => gerarCardPedido(p)).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function gerarCardPedido(p) {
    const dataObj = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data);
    const dataF = dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    let options = STATUSES.filter(s => s !== 'Orçamento').map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('');

    let corBorda = 'border-l-slate-400';
    if(p.status === 'Aguardando pagamento') corBorda = 'border-l-amber-400';
    if(p.status === 'Em produção') corBorda = 'border-l-blue-500';
    if(p.status === 'Acabamento') corBorda = 'border-l-indigo-500';
    if(p.status === 'Pronto para Retirada') corBorda = 'border-l-emerald-400';
    if(p.status === 'Entregue') corBorda = 'border-l-emerald-600';
    if(p.status === 'Cancelado / Estorno') corBorda = 'border-l-red-500';

    let btnArquivar = (p.status === 'Entregue' || p.status === 'Cancelado / Estorno') ? `<button type="button" onclick="arquivarPedido('${p.id}')" class="bg-slate-200 text-slate-600 px-3 rounded hover:bg-slate-300 transition" title="Arquivar Pedido"><i class="fa fa-archive"></i></button>` : '';
    let btnZAP = `<button type="button" onclick="enviarWhatsApp('${p.id}', '${p.status === 'Pronto para Retirada' ? 'retirada' : 'recibo'}')" class="bg-green-500 text-white px-3 rounded hover:bg-green-600 transition" title="Enviar WhatsApp"><i class="fab fa-whatsapp"></i></button>`;

    const itensHtml = (p.itens || []).map(i => `<p>• ${i.qtdCarrinho || 1}x (${i.qtdModal || 1} un.) ${i.nome} <span class="opacity-70">(${i.desc})</span></p>`).join('');

    return `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 border-l-4 ${corBorda}">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[9px] font-bold text-slate-400">${dataF}</span>
                <span class="text-[10px] font-black text-indigo-600">R$ ${(p.total || 0).toFixed(2)}</span>
            </div>
            <h4 class="font-bold text-slate-800 text-xs mb-2">${p.clienteNome}</h4>
            <div class="text-[9px] text-slate-500 mb-3 space-y-1">${itensHtml}</div>
            <div class="mt-3 pt-3 border-t border-slate-100 flex gap-2 flex-wrap">
                <select onchange="mudarStatusPedido('${p.id}', this.value)" class="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 min-w-[100px]">
                    ${options}
                </select>
                ${btnArquivar}
                ${btnZAP}
                <button type="button" onclick="imprimirRecibo('${p.id}')" class="bg-slate-200 text-slate-600 px-3 rounded hover:bg-slate-300 transition" title="Imprimir Recibo Térmico"><i class="fa fa-print"></i></button>
                <button type="button" onclick="imprimirOSA4('${p.id}')" class="bg-slate-800 text-white px-3 rounded hover:bg-slate-700 transition" title="Imprimir OS (A4)"><i class="fa fa-file-pdf"></i></button>
            </div>
        </div>
    `;
}

async function mudarStatusPedido(id, novoStatus) {
    try { 
        await db.collection("pedidos").doc(id).update({ status: novoStatus }); 
    } catch(e) { 
        console.error(e); 
        alert("Erro ao atualizar status."); 
    }
}

async function arquivarPedido(id) { 
    if(confirm("Deseja remover este pedido do painel de produção? Ele continuará salvo no histórico e financeiro.")) { 
        try { await db.collection("pedidos").doc(id).update({ arquivado: true }); } 
        catch(e) { alert("Erro ao arquivar pedido."); } 
    } 
}

// --- HISTÓRICO GERAL ---
function abrirHistoricoGeral() { 
    document.getElementById('buscaHistoricoGeral').value = ''; 
    renderHistoricoGeral(); 
    document.getElementById('modalHistoricoGeral').classList.remove('hidden'); 
}

function renderHistoricoGeral() {
    const termo = document.getElementById('buscaHistoricoGeral').value.toLowerCase(); 
    const tbody = document.getElementById('listaHistoricoGeral');
    if(!tbody) return;
    
    let filtrados = bdPedidos; 
    if (termo) filtrados = bdPedidos.filter(p => p.clienteNome.toLowerCase().includes(termo) || p.status.toLowerCase().includes(termo) || p.id.toLowerCase().includes(termo));
    
    tbody.innerHTML = filtrados.length === 0 ? `<tr><td colspan="5" class="p-6 text-center text-slate-400">Nenhum pedido encontrado.</td></tr>` : filtrados.map(p => {
        const dataFormatada = p.data.toDate ? p.data.toDate().toLocaleDateString('pt-BR') : new Date(p.data).toLocaleDateString('pt-BR');
        const isArquivado = p.arquivado ? `<span class="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[9px] uppercase ml-2">Arquivado</span>` : '';
        let btnDesarquivar = p.arquivado ? `<button type="button" onclick="desarquivarPedido('${p.id}')" class="text-amber-500 hover:text-amber-700 mx-1" title="Voltar para Produção"><i class="fa fa-box-open"></i></button>` : '';
        let btnExcluir = (usuarioAtual && usuarioAtual.role === 'admin') ? `<button type="button" onclick="excluirPedido('${p.id}')" class="text-red-400 hover:text-red-600 mx-1" title="Excluir Pedido Permanentemente"><i class="fa fa-trash"></i></button>` : '';
        
        return `<tr class="border-b border-slate-50 hover:bg-slate-50"><td class="p-3 text-slate-500 font-medium">${dataFormatada} <br/><span class="text-[9px] text-slate-400 uppercase">${p.id.substring(0,6)}</span></td><td class="p-3 font-bold text-slate-700">${p.clienteNome} ${isArquivado}</td><td class="p-3"><span class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[9px] font-black uppercase">${p.status}</span></td><td class="p-3 text-right font-black text-slate-800">R$ ${p.total.toFixed(2)}</td><td class="p-3 text-center">${btnDesarquivar}<button type="button" onclick="${p.status === 'Orçamento' ? `imprimirOrcamento('${p.id}')` : `imprimirRecibo('${p.id}')`}" class="text-slate-400 hover:text-slate-600 mx-1" title="Imprimir Recibo/PDF"><i class="fa fa-print"></i></button>${btnExcluir}</td></tr>`;
    }).join('');
}

async function desarquivarPedido(id) { 
    if(confirm("Deseja voltar este pedido para o painel de Produção?")) { 
        try { await db.collection("pedidos").doc(id).update({ arquivado: false }); renderHistoricoGeral(); } 
        catch(e) { alert("Erro ao desarquivar pedido."); } 
    } 
}

async function excluirPedido(id) { 
    if(usuarioAtual.role !== 'admin') return alert("Sem permissão."); 
    if(confirm("ATENÇÃO: Tem certeza que deseja EXCLUIR PERMANENTEMENTE este pedido? Esta ação não pode ser desfeita.")) { 
        try { await db.collection("pedidos").doc(id).delete(); renderHistoricoGeral(); } 
        catch(e) { alert("Erro ao excluir pedido."); } 
    } 
}
// --- A RECEBER (FATURADOS) ---
function renderAReceber() {
    const tab = document.getElementById('listaAReceberTab');
    if(!tab) return;
    
    const devedores = bdPedidos.filter(p => p.saldoDevedor > 0 && p.status !== 'Cancelado / Estorno');
    let html = '';
    
    const clientesDev = {};
    devedores.forEach(p => {
        if(!clientesDev[p.clienteId]) clientesDev[p.clienteId] = { nome: p.clienteNome, pedidos: [], total: 0 };
        clientesDev[p.clienteId].pedidos.push(p);
        clientesDev[p.clienteId].total += p.saldoDevedor;
    });
    
    if(Object.keys(clientesDev).length === 0) {
        tab.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum cliente com saldo devedor.</td></tr>`;
        return;
    }
    
    for(let cliId in clientesDev) {
        const c = clientesDev[cliId];
        html += `
            <tr class="border-b border-slate-50 bg-slate-50/50">
                <td class="p-4 font-bold text-slate-700">${c.nome}</td>
                <td class="p-4 text-center text-slate-500">${c.pedidos.length} pedido(s)</td>
                <td class="p-4 text-right font-black text-red-500">R$ ${c.total.toFixed(2)}</td>
                <td class="p-4 text-center">
                    <button type="button" onclick="document.getElementById('dev-${cliId}').classList.toggle('hidden')" class="text-indigo-500 font-bold text-[10px] uppercase hover:underline">Ver Pedidos</button>
                </td>
            </tr>
            <tr id="dev-${cliId}" class="hidden">
                <td colspan="4" class="p-4 bg-white border-b border-slate-200">
                    <table class="w-full text-xs">
        `;
        c.pedidos.forEach(p => {
            const dataObj = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data);
            html += `
                <tr class="border-b border-slate-50">
                    <td class="py-2 text-slate-500">${dataObj.toLocaleDateString('pt-BR')} <br><span class="text-[9px] uppercase">ID: ${p.id.substring(0,6)}</span></td>
                    <td class="py-2 text-right font-bold text-red-400">Falta: R$ ${p.saldoDevedor.toFixed(2)}</td>
                    <td class="py-2 text-right">
                        <button type="button" onclick="abrirModalReceber('${p.id}', ${p.saldoDevedor})" class="bg-emerald-500 text-white px-3 py-1.5 rounded text-[9px] font-bold uppercase hover:bg-emerald-600 shadow-sm">Receber</button>
                        <button type="button" onclick="cobrarWhatsApp('${p.id}', ${p.saldoDevedor})" class="bg-green-500 text-white px-3 py-1.5 rounded text-[9px] font-bold uppercase hover:bg-green-600 shadow-sm ml-1"><i class="fab fa-whatsapp"></i> Cobrar</button>
                    </td>
                </tr>
            `;
        });
        html += `</table></td></tr>`;
    }
    tab.innerHTML = html;
}

function abrirModalReceber(idPedido, saldo) {
    document.getElementById('recSaldoIdPedido').value = idPedido;
    document.getElementById('recSaldoValor').value = saldo.toFixed(2);
    document.getElementById('modalReceberSaldo').classList.remove('hidden');
}

async function confirmarRecebimentoSaldo() {
    const idPedido = document.getElementById('recSaldoIdPedido').value;
    const valorRecebido = parseFloat(document.getElementById('recSaldoValor').value);
    const formaPagto = document.getElementById('recSaldoForma').value;
    
    if(!valorRecebido || valorRecebido <= 0) return alert("Informe um valor válido.");
    
    const p = bdPedidos.find(x => x.id === idPedido);
    if(!p) return;
    
    const novoValorPago = (p.valorPago || 0) + valorRecebido;
    const novoSaldo = p.total - p.desconto - novoValorPago;
    
    try {
        await db.collection("pedidos").doc(idPedido).update({
            valorPago: novoValorPago,
            saldoDevedor: novoSaldo < 0 ? 0 : novoSaldo,
            status: (novoSaldo <= 0 && p.status === 'Aguardando pagamento') ? 'Em produção' : p.status
        });
        
        await db.collection("transacoes").add({
            tipo: 'entrada',
            descricao: `Recebimento Faturado - Pedido ${idPedido.substring(0,6).toUpperCase()} (${p.clienteNome})`,
            valor: valorRecebido,
            formaPagamento: formaPagto,
            data: new Date()
        });
        
        alert("Pagamento recebido com sucesso!");
        document.getElementById('modalReceberSaldo').classList.add('hidden');
        renderAReceber();
    } catch(e) {
        alert("Erro ao processar recebimento.");
    }
}

function cobrarWhatsApp(idPedido, saldo) {
    const p = bdPedidos.find(x => x.id === idPedido);
    if (!p) return;
    let telefone = ""; 
    if (p.clienteId && p.clienteId !== "Consumidor Final") { 
        const cli = bdClientes.find(c => c.id === p.clienteId); 
        if (cli && cli.telefone) telefone = cli.telefone.replace(/\D/g, ''); 
    }
    
    const texto = `Olá *${p.clienteNome}*! Tudo bem?\n\nConsta em nosso sistema um saldo pendente no valor de *R$ ${saldo.toFixed(2)}* referente ao pedido *${idPedido.substring(0,6).toUpperCase()}*.\n\nPodemos confirmar a previsão de pagamento? Qualquer dúvida, estamos à disposição!`;
    
    if (!telefone || telefone.length < 10) return alert("Cliente sem telefone cadastrado. Atualize o cadastro primeiro.");
    if (telefone.length === 10 || telefone.length === 11) telefone = "55" + telefone;
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`, '_blank'); 
}

// --- WHATSAPP (GENÉRICO) ---
function enviarWhatsApp(idPedido, tipo, objPedido = null) {
    const p = objPedido || bdPedidos.find(x => x.id === idPedido); if (!p) return;
    let telefone = ""; 
    if (p.clienteId && p.clienteId !== "Consumidor Final") { 
        const cli = bdClientes.find(c => c.id === p.clienteId); 
        if (cli && cli.telefone) telefone = cli.telefone.replace(/\D/g, ''); 
    }
    
    const itensTexto = p.itens.map(i => `▫️ ${i.qtdCarrinho || 1}x ${i.nome} - R$ ${((i.valorModal || 0) * (i.qtdCarrinho || 1)).toFixed(2)}`).join('\n'); 
    const totalStr = p.total.toFixed(2);
    let texto = "";
    
    if (tipo === 'orcamento') texto = `Olá *${p.clienteNome}*! Tudo bem?\n\nSegue o seu orçamento da *GVA Gráfica*:\n\n${itensTexto}\n\n*Total: R$ ${totalStr}*\n\nQualquer dúvida, estamos à disposição! Para aprovar, é só responder esta mensagem.`;
    else if (tipo === 'retirada') texto = `Olá *${p.clienteNome}*!\n\nSó passando para avisar que o seu pedido (Ref: ${idPedido.substring(0,6).toUpperCase()}) já está *PRONTO PARA RETIRADA* aqui na GVA Gráfica! 🚀\n\nTotal do pedido: R$ ${totalStr}\n${p.saldoDevedor > 0 ? `Saldo a pagar na retirada: *R$ ${p.saldoDevedor.toFixed(2)}*\n` : ''}Te esperamos!`;
    else if (tipo === 'recibo') texto = `Olá *${p.clienteNome}*!\n\nSeu pedido foi registrado com sucesso na *GVA Gráfica*! (Ref: ${idPedido.substring(0,6).toUpperCase()})\n\n*Resumo:*\n${itensTexto}\n\n*Total: R$ ${totalStr}*\nValor Pago: R$ ${(p.valorPago || 0).toFixed(2)}\n${p.saldoDevedor > 0 ? `Saldo a pagar: R$ ${p.saldoDevedor.toFixed(2)}\n` : ''}Acompanharemos a produção e avisaremos quando estiver pronto!`;
    
    document.getElementById('zapTelefone').value = telefone; 
    document.getElementById('zapMensagem').value = texto; 
    document.getElementById('modalWhatsApp').classList.remove('hidden');
}

function confirmarEnvioWhatsApp() {
    let telefone = document.getElementById('zapTelefone').value.replace(/\D/g, ''); 
    let texto = document.getElementById('zapMensagem').value;
    if (!telefone || telefone.length < 10) return alert("Por favor, insira um número de telefone válido com DDD.");
    if (telefone.length === 10 || telefone.length === 11) telefone = "55" + telefone;
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`, '_blank'); 
    document.getElementById('modalWhatsApp').classList.add('hidden');
}

// --- FINANCEIRO ---
async function salvarMovimentacao() {
    const tipo = document.getElementById('finTipo').value;
    const desc = document.getElementById('finDesc').value;
    const valor = parseFloat(document.getElementById('finValor').value);

    if(!desc || !valor) return alert("Preencha descrição e valor!");

    await db.collection("transacoes").add({
        tipo: tipo,
        descricao: desc,
        valor: valor,
        data: new Date()
    });

    document.getElementById('finDesc').value = '';
    document.getElementById('finValor').value = '';
    alert("Movimentação lançada com sucesso!");
}

function renderPedidosFinanceiro() {
    const tabPedidos = document.getElementById('listaPedidosTab');
    const tabExtrato = document.getElementById('listaExtratoTab');
    
    const hoje = new Date(); 
    hoje.setHours(0,0,0,0);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    let vHoje = 0;
    let eMes = 0;
    let sMes = 0; 
    let extrato = [];

    // Processa Pedidos (Ignora Cancelados/Estornos no fluxo)
    const pedidosValidos = bdPedidos.filter(p => p.status !== 'Cancelado / Estorno' && p.status !== 'Orçamento');
    
    pedidosValidos.forEach(p => {
        const d = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data);
        const v = p.valorPago || 0; 
        const t = p.total || 0;
        if(d >= hoje) vHoje += t;
        if(d >= inicioMes) eMes += v;
        if(v > 0) extrato.push({ data: d, desc: `Venda: ${p.clienteNome}`, valor: v, tipo: 'entrada' });
    });

    // Processa Transações Manuais
    bdTransacoes.forEach(t => {
        const d = t.data && t.data.toDate ? t.data.toDate() : new Date(t.data);
        if(d >= inicioMes) { 
            if(t.tipo === 'entrada') eMes += t.valor; 
            else sMes += t.valor; 
        }
        extrato.push({ data: d, desc: t.descricao, valor: t.valor, tipo: t.tipo });
    });

    // Atualiza Cards
    if(document.getElementById('finVendasHoje')) document.getElementById('finVendasHoje').innerText = "R$ " + vHoje.toFixed(2);
    if(document.getElementById('finEntradasMes')) document.getElementById('finEntradasMes').innerText = "R$ " + eMes.toFixed(2);
    if(document.getElementById('finSaidasMes')) document.getElementById('finSaidasMes').innerText = "R$ " + sMes.toFixed(2);
    if(document.getElementById('finSaldoMes')) document.getElementById('finSaldoMes').innerText = "R$ " + (eMes - sMes).toFixed(2);

    // Renderiza Tabela de Pedidos (Limitado a 10)
    if(tabPedidos) {
        const ultimosPedidos = pedidosValidos.slice(0, 10);
        tabPedidos.innerHTML = ultimosPedidos.map(p => {
            const dataObj = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data);
            return `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                <td class="p-4 text-slate-400 font-medium">${dataObj.toLocaleDateString('pt-BR')}</td>
                <td class="p-4 font-bold text-slate-700">${p.clienteNome}</td>
                <td class="p-4 font-black text-indigo-600">R$ ${(p.total || 0).toFixed(2)}</td>
                <td class="p-4 text-center"><span class="bg-indigo-50 text-indigo-500 px-3 py-1 rounded text-[10px] font-black uppercase">${p.status}</span></td>
                <td class="p-4 text-center"><button type="button" onclick="imprimirRecibo('${p.id}')" class="text-slate-400 hover:text-indigo-600" title="Imprimir Recibo"><i class="fa fa-print"></i></button></td>
            </tr>
            `;
        }).join('');
    }

    // Renderiza Tabela de Extrato (Limitado a 10)
    if(tabExtrato) {
        extrato.sort((a,b) => b.data - a.data);
        const ultimoExtrato = extrato.slice(0, 10);
        tabExtrato.innerHTML = ultimoExtrato.map(i => {
            const corValor = i.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500';
            const sinal = i.tipo === 'entrada' ? '+' : '-';
            return `
                <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td class="p-4 text-slate-400 font-medium">${i.data.toLocaleDateString('pt-BR')}</td>
                    <td class="p-4 font-bold text-slate-700">${i.desc}</td>
                    <td class="p-4 text-right font-black ${corValor}">${sinal} R$ ${i.valor.toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    }
}

function imprimirFechamento(tipo) {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    
    let dataInicio = new Date(hoje);
    let titulo = "Fechamento Diário";
    
    if(tipo === 'semanal') {
        dataInicio.setDate(hoje.getDate() - 7);
        titulo = "Fechamento Semanal (Últimos 7 dias)";
    }

    let extrato = [];
    let totalEntradas = 0;
    let totalSaidas = 0;

    // Pega pagamentos de pedidos
    bdPedidos.forEach(p => {
        if(p.status === 'Cancelado / Estorno' || p.status === 'Orçamento') return;
        const d = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data);
        const v = p.valorPago || 0;
        if(d >= dataInicio && v > 0) {
            extrato.push({ data: d, desc: `Venda: ${p.clienteNome}`, valor: v, tipo: 'entrada' });
            totalEntradas += v;
        }
    });

    // Pega transações manuais
    bdTransacoes.forEach(t => {
        const d = t.data && t.data.toDate ? t.data.toDate() : new Date(t.data);
        if(d >= dataInicio) {
            extrato.push({ data: d, desc: t.descricao, valor: t.valor, tipo: t.tipo });
            if(t.tipo === 'entrada') totalEntradas += t.valor;
            else totalSaidas += t.valor;
        }
    });

    extrato.sort((a,b) => b.data - a.data);

    let htmlLinhas = extrato.map(i => {
        const cor = i.tipo === 'entrada' ? 'color: #10b981;' : 'color: #ef4444;';
        const sinal = i.tipo === 'entrada' ? '+' : '-';
        return `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i.data.toLocaleDateString('pt-BR')} ${i.data.toLocaleTimeString('pt-BR')}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i.desc}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; ${cor}">${sinal} R$ ${i.valor.toFixed(2)}</td>
        </tr>`;
    }).join('');

    if(extrato.length === 0) htmlLinhas = `<tr><td colspan="3" style="text-align:center; padding: 20px;">Nenhuma movimentação no período.</td></tr>`;

    const janela = window.open('', '', 'width=800,height=900');
    janela.document.write(`
        <html><head><title>${titulo}</title><style>
            body { font-family: sans-serif; padding: 40px; color: #334155; }
            h1 { color: #0f172a; text-transform: uppercase; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .resumo { display: flex; gap: 20px; margin-bottom: 30px; }
            .box { flex: 1; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f8fafc; }
            .box h3 { margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #64748b; }
            .box p { margin: 0; font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th { background: #f1f5f9; padding: 10px 8px; text-align: left; text-transform: uppercase; font-size: 12px; }
        </style></head><body>
            <h1>${titulo}</h1>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <div class="resumo">
                <div class="box"><h3 style="color: #10b981;">Total Entradas</h3><p style="color: #10b981;">R$ ${totalEntradas.toFixed(2)}</p></div>
                <div class="box"><h3 style="color: #ef4444;">Total Saídas</h3><p style="color: #ef4444;">R$ ${totalSaidas.toFixed(2)}</p></div>
                <div class="box"><h3 style="color: #0f172a;">Saldo Líquido</h3><p style="color: #0f172a;">R$ ${(totalEntradas - totalSaidas).toFixed(2)}</p></div>
            </div>
            <table>
                <thead><tr><th>Data/Hora</th><th>Descrição</th><th style="text-align: right;">Valor</th></tr></thead>
                <tbody>${htmlLinhas}</tbody>
            </table>
            <script>setTimeout(() => { window.print(); window.close(); }, 800);</script>
        </body></html>
    `);
    janela.document.close();
}

// --- USUÁRIOS ---
async function salvarUsuario() { 
    const email = document.getElementById('userEmail').value.trim();
    const nome = document.getElementById('userNome').value.trim();
    const role = document.getElementById('userRole').value;
    const senha = document.getElementById('userSenha').value; 
    
    if(!email || !nome) return alert("Preencha Nome e E-mail."); 
    
    try { 
        if (senha) { 
            if (senha.length < 6) return alert("A senha precisa ter no mínimo 6 caracteres."); 
            let secondaryApp; 
            try { secondaryApp = firebase.app("Secondary"); } 
            catch(e) { secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary"); } 
            await secondaryApp.auth().createUserWithEmailAndPassword(email, senha); 
            await secondaryApp.auth().signOut(); 
        } 
        await db.collection("usuarios").doc(email).set({ nome: nome, email: email, role: role }); 
        alert("Conta salva com sucesso!"); 
        document.getElementById('userEmail').value = ''; 
        document.getElementById('userNome').value = ''; 
        document.getElementById('userSenha').value = ''; 
    } catch (e) { 
        alert("Erro ao salvar usuário: " + e.message); 
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
                <button type="button" onclick="if(confirm('Excluir acesso?')) db.collection('usuarios').doc('${u.email}').delete()" class="text-red-300 hover:text-red-500"><i class="fa fa-trash"></i></button>
            </td>
        </tr>
    `).join(''); 
}

// --- DADOS DA EMPRESA ---
async function salvarDadosEmpresa() {
    const pix = document.getElementById('empresaPix').value.trim();
    const banco = document.getElementById('empresaBanco').value.trim();
    const agencia = document.getElementById('empresaAgencia').value.trim();
    const conta = document.getElementById('empresaConta').value.trim();
    
    try {
        await db.collection("empresa").doc("dados").set({
            pix: pix, banco: banco, agencia: agencia, conta: conta
        });
        alert("Dados bancários salvos com sucesso!");
    } catch(e) {
        alert("Erro ao salvar dados da empresa: " + e.message);
    }
}

function editEmpresa() {
    if(document.getElementById('empresaPix')) document.getElementById('empresaPix').value = bdEmpresa.pix || '';
    if(document.getElementById('empresaBanco')) document.getElementById('empresaBanco').value = bdEmpresa.banco || '';
    if(document.getElementById('empresaAgencia')) document.getElementById('empresaAgencia').value = bdEmpresa.agencia || '';
    if(document.getElementById('empresaConta')) document.getElementById('empresaConta').value = bdEmpresa.conta || '';
}
// --- PRODUTOS E ATRIBUTOS ---
function ajustarCamposProduto() {
    const r = document.getElementById('prodRegraPreco')?.value;
    const pre = document.getElementById('boxPrecoBase');
    const pac = document.getElementById('boxPacotes');
    const pro = document.getElementById('boxProgressivo');
    const med = document.getElementById('boxMedidas');
    
    if(pre) pre.style.display = (r === 'pacote' || r === 'progressivo') ? 'none' : 'block';
    if(pac) pac.style.display = r === 'pacote' ? 'block' : 'none';
    if(pro) pro.style.display = r === 'progressivo' ? 'block' : 'none';
    if(med) med.style.display = r === 'm2' ? 'grid' : 'none';
}

function addLinhaPacote(q='', p='') {
    const div = document.createElement('div');
    div.className = "flex gap-2";
    div.innerHTML = `
        <input type="text" placeholder="Ex: 1.000 Cartões" value="${q}" class="q w-full p-2 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-amber-500">
        <input type="number" placeholder="Total R$" value="${p}" class="p w-full p-2 border border-slate-200 rounded font-bold text-amber-600 text-xs outline-none focus:ring-2 focus:ring-amber-500">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-300 hover:text-red-500">✕</button>
    `;
    document.getElementById('listaGradePacotes')?.appendChild(div);
}

function addLinhaProgressivo(q='', p='') {
    const div = document.createElement('div');
    div.className = "flex gap-2";
    div.innerHTML = `
        <input type="number" placeholder="Qtd Mín" value="${q}" class="q w-full p-2 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-emerald-500">
        <input type="number" placeholder="Unit R$" value="${p}" class="p w-full p-2 border border-slate-200 rounded font-bold text-emerald-600 text-xs outline-none focus:ring-2 focus:ring-emerald-500">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-300 hover:text-red-500">✕</button>
    `;
    document.getElementById('listaGradeProgressivo')?.appendChild(div);
}

function addOpcaoAtrib(container, n = '', p = '', fixo = false) {
    const div = document.createElement('div');
    div.className = "flex gap-2 item-opcao items-center";
    const chk = fixo ? 'checked' : '';
    div.innerHTML = `
        <input type="text" placeholder="Opção" value="${n}" class="op-nome flex-1 text-xs p-2 border border-slate-200 rounded bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500">
        <input type="number" placeholder="R$" value="${p}" class="op-preco w-20 text-xs p-2 border border-slate-200 rounded bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500">
        <label class="text-[9px] font-bold text-slate-400 flex items-center gap-1"><input type="checkbox" class="op-fixo" ${chk}> Fixo</label>
        <button type="button" onclick="this.parentElement.remove()" class="text-slate-300 hover:text-red-500">✕</button>
    `;
    container.appendChild(div);
}

function addAtributo(nome = '', opcoes = []) {
    const div = document.createElement('div');
    div.className = "bg-white p-4 rounded border border-slate-100 shadow-sm item-atrib";
    div.innerHTML = `
        <div class="flex gap-2 mb-3">
            <input type="text" placeholder="Grupo (ex: Papel)" value="${nome}" class="atrib-nome flex-1 font-bold text-sm p-2 border-b-2 border-indigo-50 outline-none focus:border-indigo-500">
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-300 hover:text-red-500">✕</button>
        </div>
        <div class="lista-opcoes space-y-2"></div>
        <button type="button" class="btn-add-op mt-3 text-[10px] font-bold uppercase text-indigo-400 hover:text-indigo-600">+ Add Opção</button>
    `;
    document.getElementById('listaAtributos')?.appendChild(div);
    
    const containerOpcoes = div.querySelector('.lista-opcoes');
    div.querySelector('.btn-add-op').onclick = () => addOpcaoAtrib(containerOpcoes);
    
    if (opcoes && opcoes.length > 0) {
        opcoes.forEach(o => addOpcaoAtrib(containerOpcoes, o.nome, o.preco, o.fixo));
    } else {
        addOpcaoAtrib(containerOpcoes);
    }
}

function addAtributoManual() { addAtributo('', []); }

function atualizarListaAcabamentosProduto(salvos = []) {
    const container = document.getElementById('listaCheckAcabamentos');
    const catSelect = document.getElementById('prodCategoria');
    if(!container || !catSelect) return;
    
    const cat = catSelect.value;
    const filtrados = bdAcabamentos.filter(a => a.categoria === cat || a.categoria === "Geral");
    
    container.innerHTML = filtrados.map(a => {
        const obj = salvos.find(s => (s.id || s) === a.id);
        const checked = obj ? 'checked' : '';
        const starAtiva = (obj && obj.padrao) ? 'text-amber-400' : 'text-slate-200';
        return `
            <div class="flex items-center justify-between p-2 bg-white border border-slate-200 rounded">
                <label class="text-[10px] font-bold flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" class="check-acab-prod" value="${a.id}" ${checked}> ${a.nome}
                </label>
                <i class="fa fa-star cursor-pointer star-padrao ${starAtiva}" onclick="this.classList.toggle('text-amber-400'); this.classList.toggle('text-slate-200')"></i>
            </div>
        `;
    }).join('');
}

async function salvarProduto() {
    const id = document.getElementById('prodId')?.value;
    
    let atributos = [];
    document.querySelectorAll('.item-atrib').forEach(caixa => {
        let ops = [];
        caixa.querySelectorAll('.item-opcao').forEach(l => {
            const n = l.querySelector('.op-nome')?.value;
            const p = parseFloat(l.querySelector('.op-preco')?.value) || 0;
            const f = l.querySelector('.op-fixo')?.checked || false;
            if (n) ops.push({ nome: n, preco: p, fixo: f });
        });
        const nomeAtrib = caixa.querySelector('.atrib-nome')?.value;
        if (nomeAtrib) atributos.push({ nome: nomeAtrib, opcoes: ops });
    });

    let acabList = [];
    document.querySelectorAll('.check-acab-prod:checked').forEach(chk => {
        const star = chk.closest('div').querySelector('.star-padrao');
        acabList.push({ id: chk.value, padrao: star?.classList.contains('text-amber-400') || false });
    });

    let pacotes = [];
    document.querySelectorAll('#listaGradePacotes > div').forEach(d => {
        const q = d.querySelector('.q')?.value; 
        const p = parseFloat(d.querySelector('.p')?.value);
        if (q && p) pacotes.push({ qtd: q, preco: p });
    });

    let progressivo = [];
    document.querySelectorAll('#listaGradeProgressivo > div').forEach(d => {
        const q = parseInt(d.querySelector('.q')?.value); 
        const p = parseFloat(d.querySelector('.p')?.value);
        if (q && p) progressivo.push({ q: q, p: p });
    });

    const d = {
        nome: document.getElementById('prodNome')?.value || '',
        categoria: document.getElementById('prodCategoria')?.value || '',
        subcategoria: document.getElementById('prodSubcategoria')?.value || '',
        tipo: document.getElementById('prodTipo')?.value || 'grafico',
        regraPreco: document.getElementById('prodRegraPreco')?.value || 'unidade',
        preco: parseFloat(document.getElementById('prodPreco')?.value) || 0,
        foto: document.getElementById('prodFoto')?.value || '',
        mockupBg: document.getElementById('prodMockupBg')?.value || '',
        ref: document.getElementById('prodRef')?.value || '',
        material: document.getElementById('prodMaterial')?.value || '',
        gramatura: document.getElementById('prodGramatura')?.value || '',
        prazo: parseInt(document.getElementById('prodPrazo')?.value) || 0,
        larguraBobina: parseFloat(document.getElementById('prodLargBobina')?.value) || 0,
        larguraMax: parseFloat(document.getElementById('prodLargMax')?.value) || 0,
        compMax: parseFloat(document.getElementById('prodCompMax')?.value) || 0,
        obs: document.getElementById('prodObs')?.value || '',
        atributos: atributos,
        acabamentos: acabList,
        pacotes: pacotes,
        progressivo: progressivo
    };

    if (!d.nome) return alert("Nome obrigatório!");
    
    try {
        if (id) await db.collection("produtos").doc(id).update(d);
        else await db.collection("produtos").add(d);
        alert("Produto salvo com sucesso!");
        limparFormProd();
    } catch (e) { alert("Erro ao salvar produto: " + e.message); }
}

function editProd(id) {
    const p = bdProdutos.find(x => x.id === id);
    if (!p) return;
    
    if(document.getElementById('prodId')) document.getElementById('prodId').value = p.id;
    if(document.getElementById('prodNome')) document.getElementById('prodNome').value = p.nome || '';
    if(document.getElementById('prodCategoria')) document.getElementById('prodCategoria').value = p.categoria || '';
    if(document.getElementById('prodSubcategoria')) document.getElementById('prodSubcategoria').value = p.subcategoria || '';
    if(document.getElementById('prodTipo')) document.getElementById('prodTipo').value = p.tipo || 'grafico';
    if(document.getElementById('prodRegraPreco')) document.getElementById('prodRegraPreco').value = p.regraPreco || 'unidade';
    if(document.getElementById('prodPreco')) document.getElementById('prodPreco').value = p.preco || 0;
    if(document.getElementById('prodFoto')) document.getElementById('prodFoto').value = p.foto || '';
    if(document.getElementById('prodMockupBg')) document.getElementById('prodMockupBg').value = p.mockupBg || '';
    if(document.getElementById('prodRef')) document.getElementById('prodRef').value = p.ref || '';
    if(document.getElementById('prodMaterial')) document.getElementById('prodMaterial').value = p.material || '';
    if(document.getElementById('prodGramatura')) document.getElementById('prodGramatura').value = p.gramatura || '';
    if(document.getElementById('prodPrazo')) document.getElementById('prodPrazo').value = p.prazo || 0;
    if(document.getElementById('prodLargBobina')) document.getElementById('prodLargBobina').value = p.larguraBobina || 0;
    if(document.getElementById('prodLargMax')) document.getElementById('prodLargMax').value = p.larguraMax || 0;
    if(document.getElementById('prodCompMax')) document.getElementById('prodCompMax').value = p.compMax || 0;
    if(document.getElementById('prodObs')) document.getElementById('prodObs').value = p.obs || '';
    
    const divAtrib = document.getElementById('listaAtributos');
    if(divAtrib) { divAtrib.innerHTML = ''; if (p.atributos) p.atributos.forEach(a => addAtributo(a.nome, a.opcoes)); }
    
    const divPac = document.getElementById('listaGradePacotes');
    if(divPac) { divPac.innerHTML = ''; if (p.pacotes) p.pacotes.forEach(pct => addLinhaPacote(pct.qtd, pct.preco)); }

    const divProg = document.getElementById('listaGradeProgressivo');
    if(divProg) { divProg.innerHTML = ''; if (p.progressivo) p.progressivo.forEach(prg => addLinhaProgressivo(prg.q, prg.p)); }

    ajustarCamposProduto();
    atualizarListaAcabamentosProduto(p.acabamentos || []);
    mudarSubAba('sub-prod', document.querySelectorAll('.sub-aba-btn')[2]);
}

function limparFormProd() {
    document.querySelectorAll('#sub-prod input, #sub-prod textarea').forEach(i => i.value = '');
    const divAtrib = document.getElementById('listaAtributos'); if(divAtrib) divAtrib.innerHTML = '';
    const divPac = document.getElementById('listaGradePacotes'); if(divPac) divPac.innerHTML = '';
    const divProg = document.getElementById('listaGradeProgressivo'); if(divProg) divProg.innerHTML = '';
    document.querySelectorAll('.check-acab-prod').forEach(c => c.checked = false);
    document.querySelectorAll('.star-padrao').forEach(s => { s.classList.remove('text-amber-400'); s.classList.add('text-slate-200'); });
}

function renderProdTable() {
    const tab = document.getElementById('listaProdutosTab');
    if(!tab) return;
    tab.innerHTML = bdProdutos.map(p => `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
            <td class="p-4 font-bold text-slate-700">${p.nome}</td>
            <td class="p-4 text-slate-400 text-[10px] uppercase">${p.regraPreco}</td>
            <td class="p-4 text-center">
                <button type="button" onclick="editProd('${p.id}')" class="text-indigo-500 mr-3 font-bold text-[10px] uppercase hover:text-indigo-700">Editar</button>
                <button type="button" onclick="if(confirm('Excluir produto?')) db.collection('produtos').doc('${p.id}').delete()" class="text-red-300 font-bold text-[10px] hover:text-red-500">X</button>
            </td>
        </tr>
    `).join('');
}

// --- PDV E MODAL ---
function renderFiltrosVitrine() {
    const div = document.getElementById('menuFiltroCat');
    if(!div) return;
    div.innerHTML = `
        <button type="button" onclick="renderVitrine('Todos')" class="px-6 py-3 bg-white border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm whitespace-nowrap">Todos</button>
        <button type="button" onclick="renderVitrine('grafico')" class="px-6 py-3 bg-white border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm whitespace-nowrap">Gráfico</button>
        <button type="button" onclick="renderVitrine('visual')" class="px-6 py-3 bg-white border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm whitespace-nowrap">Com. Visual</button>
        <button type="button" onclick="renderVitrine('outros')" class="px-6 py-3 bg-white border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm whitespace-nowrap">Outros</button>
    `;
}

function renderVitrine(filtro = 'Todos') {
    const grid = document.getElementById('gradeProdutos');
    const termo = document.getElementById('buscaProduto')?.value.toLowerCase() || '';
    if (!grid) return;
    
    let prods = bdProdutos;
    if(termo !== '') {
        prods = prods.filter(p => p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo));
    } else if(filtro !== 'Todos') {
        prods = prods.filter(p => p.tipo === filtro);
    }
    
    grid.innerHTML = prods.map(p => {
        let corTag = 'bg-slate-100 text-slate-500';
        if(p.tipo === 'grafico') corTag = 'bg-amber-100 text-amber-700';
        if(p.tipo === 'visual') corTag = 'bg-blue-100 text-blue-700';
        if(p.tipo === 'outros') corTag = 'bg-emerald-100 text-emerald-700';

        let precoExibicao = p.preco || 0;
        if(p.regraPreco === 'pacote' && p.pacotes && p.pacotes.length > 0) precoExibicao = p.pacotes[0].preco;

        return `
        <div onclick="abrirConfigurador('${p.id}')" class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl cursor-pointer transition-all group relative">
            <span class="absolute top-4 right-4 ${corTag} px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">${p.categoria}</span>
            <div class="h-44 bg-slate-50 rounded-xl mb-5 bg-contain bg-no-repeat bg-center transition group-hover:scale-105" style="background-image:url('${p.foto || 'https://via.placeholder.com/200'}')"></div>
            <h4 class="font-bold text-slate-800 text-sm mb-1 truncate">${p.nome}</h4>
            <p class="text-xs font-bold text-slate-400">A partir de</p>
            <p class="text-xl font-black text-indigo-600">R$ ${precoExibicao.toFixed(2)}</p>
        </div>
    `}).join('');
}

function abrirConfigurador(id) {
    const p = bdProdutos.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('modalNomeProd').innerText = p.nome;
    document.getElementById('modalProdId').value = p.id;
    document.getElementById('modalProdPrecoBase').value = p.preco || 0;
    document.getElementById('modalProdRegra').value = p.regraPreco;
    
    // Lógica do Mockup 2D
    if(p.mockupBg && p.mockupBg.trim() !== '') {
        document.getElementById('mockupArea').classList.remove('hidden');
        document.getElementById('mockupControls').classList.remove('hidden');
        document.getElementById('mockupBgImg').src = p.mockupBg;
        document.getElementById('modalHeaderImg').style.backgroundImage = 'none';
        document.getElementById('mockupOverlay').classList.add('hidden'); // Esconde a arte até subir
    } else {
        document.getElementById('mockupArea').classList.add('hidden');
        document.getElementById('mockupControls').classList.add('hidden');
        document.getElementById('modalHeaderImg').style.backgroundImage = `url('${p.foto || 'https://via.placeholder.com/400'}')`;
    }
    
    const divObs = document.getElementById('modalObs');
    if (p.obs && p.obs.trim() !== '') {
        divObs.innerHTML = `<strong>Aviso:</strong> ${p.obs}`;
        divObs.classList.remove('hidden');
    } else {
        divObs.classList.add('hidden');
    }

    const divMedidas = document.getElementById('modalCorpoMedidas');
    const regra = p.regraPreco;

    if (regra === 'm2') {
        divMedidas.innerHTML = `
            <div class="space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">Largura (m)</label><input type="number" id="w2pLargura" value="0.01" step="0.01" min="0.01" oninput="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"></div>
            <div class="space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">Altura (m)</label><input type="number" id="w2pAltura" value="0.01" step="0.01" min="0.01" oninput="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"></div>
            <div class="space-y-1 col-span-2"><label class="text-[10px] font-bold text-slate-400 uppercase">Quantidade</label><input type="number" id="w2pQtd" value="1" min="1" oninput="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"></div>
        `;
    } else if (regra === 'pacote') {
        let opts = (p.pacotes || []).map(pct => `<option value="${pct.qtd}" data-preco="${pct.preco}">${pct.qtd} - R$ ${pct.preco.toFixed(2)}</option>`).join('');
        divMedidas.innerHTML = `<div class="col-span-2 space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">Escolha o Pacote</label><select id="w2pPacote" onchange="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500">${opts}</select></div>`;
    } else {
        divMedidas.innerHTML = `<div class="col-span-2 space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">Quantidade</label><input type="number" id="w2pQtd" value="1" min="1" oninput="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"></div>`;
    }

    const divVariacoes = document.getElementById('modalCorpoVariacoes');
    const tituloVariacoes = document.getElementById('tituloVariacoes');
    if (p.atributos && p.atributos.length > 0) {
        tituloVariacoes.classList.remove('hidden');
        divVariacoes.innerHTML = p.atributos.map(a => `
            <div class="space-y-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase">${a.nome}</label>
                <select class="sel-var w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" onchange="calcularPrecoAoVivo()">
                    ${a.opcoes.map(o => `<option value="${o.preco}" data-fixo="${o.fixo}">${o.nome} ${o.preco > 0 ? '(+ R$ '+o.preco.toFixed(2)+')' : '(Grátis)'}</option>`).join('')}
                </select>
            </div>
        `).join('');
    } else {
        tituloVariacoes.classList.add('hidden');
        divVariacoes.innerHTML = '';
    }

    const divAcabamentos = document.getElementById('modalCorpoAcabamentos');
    const tituloAcabamentos = document.getElementById('tituloAcabamentos');
    const acabPermitidos = p.acabamentos || [];
    
    if (acabPermitidos.length > 0) {
        tituloAcabamentos.classList.remove('hidden');
        
        let gruposAcab = {};
        acabPermitidos.forEach(obj => {
            const a = bdAcabamentos.find(x => x.id === (obj.id || obj));
            if(a) {
                const g = a.grupo || 'Geral';
                if(!gruposAcab[g]) gruposAcab[g] = [];
                gruposAcab[g].push({...a, padrao: obj.padrao});
            }
        });

        let htmlAcab = '';
        for(let g in gruposAcab) {
            htmlAcab += `<div class="w-full mb-2"><label class="text-[9px] font-bold text-slate-400 uppercase">${g}</label><div class="flex flex-col gap-1 mt-1">`;
            htmlAcab += `<label class="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white p-2 border rounded cursor-pointer hover:bg-slate-50"><input type="radio" name="acab_${g.replace(/\s/g,'')}" value="0" data-preco="0" onchange="calcularPrecoAoVivo()" checked> Nenhum / Padrão</label>`;
            gruposAcab[g].forEach(a => {
                const chk = a.padrao ? 'checked' : '';
                htmlAcab += `<label class="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white p-2 border rounded cursor-pointer hover:bg-slate-50"><input type="radio" name="acab_${g.replace(/\s/g,'')}" value="${a.id}" data-preco="${a.venda}" data-regra="${a.regra}" onchange="calcularPrecoAoVivo()" ${chk}> ${a.nome} (+ R$ ${a.venda.toFixed(2)})</label>`;
            });
            htmlAcab += `</div></div>`;
        }
        divAcabamentos.innerHTML = htmlAcab;
    } else {
        tituloAcabamentos.classList.add('hidden');
        divAcabamentos.innerHTML = '';
    }

    document.getElementById('modalW2P').classList.remove('hidden');
    document.getElementById('btnAdicionarW2P').disabled = false;
    document.getElementById('btnAdicionarW2P').classList.remove('opacity-50', 'cursor-not-allowed');
    calcularPrecoAoVivo();
}

// --- LÓGICA DO MOCKUP 2D (ARRASTAR) ---
const overlay = document.getElementById('mockupOverlay');
let isDragging = false, startX, startY, initialX, initialY;

overlay.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    initialX = overlay.offsetLeft; initialY = overlay.offsetTop;
});

document.addEventListener('mousemove', e => {
    if(isDragging) {
        overlay.style.left = (initialX + e.clientX - startX) + 'px';
        overlay.style.top = (initialY + e.clientY - startY) + 'px';
    }
});

document.addEventListener('mouseup', () => isDragging = false);

function carregarArteMockup(event) {
    const file = event.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('mockupClientArt').src = e.target.result;
            document.getElementById('mockupOverlay').classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
}

async function baixarMockup() {
    const area = document.getElementById('mockupArea');
    const overlay = document.getElementById('mockupOverlay');
    
    // Esconde a borda tracejada para a foto ficar limpa
    overlay.classList.add('hide-border');
    
    const canvas = await html2canvas(area, {useCORS: true, backgroundColor: null});
    
    // Volta a borda
    overlay.classList.remove('hide-border');
    
    const link = document.createElement('a');
    link.download = 'mockup-gva.png';
    link.href = canvas.toDataURL();
    link.click();
}

function calcularPrecoAoVivo() {
    const idProd = document.getElementById('modalProdId').value;
    const p = bdProdutos.find(x => x.id === idProd);
    const regra = document.getElementById('modalProdRegra').value;
    const base = parseFloat(document.getElementById('modalProdPrecoBase').value) || 0;
    
    let qtd = 1; 
    let totalBase = 0; 
    let m2 = 1;
    const btnAdd = document.getElementById('btnAdicionarW2P');

    if (regra === 'm2') {
        const l = parseFloat(document.getElementById('w2pLargura')?.value) || 0;
        const a = parseFloat(document.getElementById('w2pAltura')?.value) || 0;
        qtd = parseInt(document.getElementById('w2pQtd')?.value) || 1;
        
        const menorLado = Math.min(l, a);
        const aviso = document.getElementById('avisoBobina');
        
        if (p && p.larguraBobina > 0 && menorLado > p.larguraBobina) {
            aviso.classList.remove('hidden');
            aviso.querySelector('span').innerText = `Erro: O menor lado (${menorLado}m) excede a bobina (${p.larguraBobina}m). Venda bloqueada.`;
            aviso.classList.replace('bg-amber-50', 'bg-red-50');
            aviso.classList.replace('text-amber-700', 'text-red-700');
            btnAdd.disabled = true;
            btnAdd.classList.add('opacity-50', 'cursor-not-allowed');
        } else if (aviso) {
            aviso.classList.add('hidden');
            btnAdd.disabled = false;
            btnAdd.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        
        m2 = l * a; 
        if(m2 < 0.5) m2 = 0.5; 
        totalBase = base * m2 * qtd;
    } else if (regra === 'pacote') {
        const sel = document.getElementById('w2pPacote');
        qtd = 1; 
        totalBase = parseFloat(sel?.options[sel?.selectedIndex]?.dataset.preco) || 0;
    } else if (regra === 'progressivo') {
        qtd = parseInt(document.getElementById('w2pQtd')?.value) || 1;
        let precoUnit = base;
        if (p && p.progressivo) {
            let faixas = [...p.progressivo].sort((a,b) => b.q - a.q);
            let faixa = faixas.find(f => qtd >= f.q);
            if (faixa) precoUnit = faixa.p;
        }
        totalBase = precoUnit * qtd;
    } else {
        qtd = parseInt(document.getElementById('w2pQtd')?.value) || 1;
        totalBase = base * qtd;
    }

    let extraVar = 0;
    document.querySelectorAll('.sel-var').forEach(s => {
        const opt = s.options[s.selectedIndex];
        const val = parseFloat(opt.value) || 0;
        const isFixo = opt.dataset.fixo === 'true';
        if(isFixo) extraVar += val;
        else extraVar += (val * qtd);
    });

    let totalAcab = 0;
    document.querySelectorAll('#modalCorpoAcabamentos input[type="radio"]:checked').forEach(radio => {
        const pA = parseFloat(radio.dataset.preco) || 0; 
        const rA = radio.dataset.regra;
        if (rA === 'm2') totalAcab += pA * m2 * qtd; 
        else if (rA === 'lote') totalAcab += pA; 
        else totalAcab += pA * qtd;
    });

    document.getElementById('modalSubtotal').innerText = "R$ " + (totalBase + extraVar + totalAcab).toFixed(2);
}

function confirmarAdicaoCarrinho() {
    const nomeArquivo = document.getElementById('w2pNomeArquivo')?.value.trim();
    if (!nomeArquivo) return alert("Por favor, preencha a Identificação / Nome do Arquivo. É obrigatório para a produção.");

    const p = bdProdutos.find(x => x.id === document.getElementById('modalProdId').value);
    const totalItem = parseFloat(document.getElementById('modalSubtotal').innerText.replace("R$ ",""));
    
    let qtdModal = 1;
    if(p.regraPreco === 'pacote') {
        const sel = document.getElementById('w2pPacote');
        qtdModal = sel.options[sel.selectedIndex].text.split(" -")[0];
    } else {
        qtdModal = document.getElementById('w2pQtd')?.value || 1;
    }
    
    let varsEscolhidas = [];
    document.querySelectorAll('.sel-var').forEach(s => {
        varsEscolhidas.push(s.options[s.selectedIndex].text.split(" (+")[0].split(" (G")[0]);
    });

    document.querySelectorAll('#modalCorpoAcabamentos input[type="radio"]:checked').forEach(r => {
        if(r.value !== "0") varsEscolhidas.push(r.parentElement.innerText.split(" (+")[0].trim());
    });
    
    let nomeFinal = p.nome; 
    if (nomeArquivo) nomeFinal += ` (${nomeArquivo})`;

    carrinho.push({ 
        nome: nomeFinal, 
        valorModal: totalItem, 
        qtdModal: qtdModal,
        qtdCarrinho: 1,
        desc: varsEscolhidas.join(' | '),
        prazo: p.prazo || 0
    });
    
    fecharModal(); 
    renderCarrinho();
}

// --- CARRINHO E CHECKOUT ---
function renderCarrinho() {
    const div = document.getElementById('listaCarrinho');
    if (!div) return;
    
    let sub = 0;
    div.innerHTML = carrinho.map((item, i) => {
        const totalLinha = item.valorModal * item.qtdCarrinho;
        sub += totalLinha;
        return `
            <div class="flex justify-between items-center bg-slate-50 p-4 rounded border border-slate-100">
                <div class="w-[60%]">
                    <p class="font-bold text-slate-800 text-xs">${item.nome}</p>
                    <p class="text-[9px] font-medium text-slate-400 mt-1">${item.qtdModal} un. | ${item.desc}</p>
                </div>
                <div class="flex items-center gap-3">
                    <input type="number" value="${item.qtdCarrinho}" min="1" onchange="atualizarQtdCarrinho(${i}, this.value)" class="w-12 p-1 text-xs border border-slate-200 rounded outline-none text-center font-bold">
                    <div class="text-right">
                        <p class="font-black text-indigo-600 text-sm">R$ ${totalLinha.toFixed(2)}</p>
                        <button type="button" onclick="carrinho.splice(${i},1);renderCarrinho()" class="text-[9px] font-bold text-red-400 uppercase mt-1 hover:text-red-600 transition">Remover</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('subtotalCart').innerText = "R$ " + sub.toFixed(2);
    atualizarDataEntregaAutomatica();
    atualizarTotalFinal();
}

function atualizarDataEntregaAutomatica() {
    if(carrinho.length === 0) return;
    let maxPrazo = 0;
    carrinho.forEach(item => { if(item.prazo > maxPrazo) maxPrazo = item.prazo; });
    
    const data = new Date();
    data.setDate(data.getDate() + maxPrazo);
    document.getElementById('cartDataEntrega').valueAsDate = data;
}

function atualizarQtdCarrinho(index, novaQtd) {
    carrinho[index].qtdCarrinho = parseInt(novaQtd) || 1;
    renderCarrinho();
}

function atualizarTotalFinal() {
    const sub = parseFloat(document.getElementById('subtotalCart').innerText.replace("R$ ","")) || 0;
    const frete = parseFloat(document.getElementById('cartFreteValor').value) || 0;
    const desc = parseFloat(document.getElementById('cartDesconto').value) || 0;
    const pago = parseFloat(document.getElementById('cartValorPago').value) || 0;
    const formaPagto = document.getElementById('cartPagamento').value;
    
    let taxaPagto = 0;
    if (formaPagto === 'Pix' || formaPagto === 'Dinheiro') {
        taxaPagto = sub * -0.05; // Desconto de 5%
    } else if (formaPagto === 'Credito_Vista' || formaPagto === 'Credito_Parcelado') {
        taxaPagto = sub * 0.05; // Acréscimo de 5%
    }

    const elTaxa = document.getElementById('cartTaxaPagto');
    if(elTaxa) {
        elTaxa.innerText = "R$ " + taxaPagto.toFixed(2);
        if(taxaPagto < 0) elTaxa.className = "text-emerald-500 font-bold";
        else if(taxaPagto > 0) elTaxa.className = "text-red-500 font-bold";
        else elTaxa.className = "text-slate-400 font-bold";
    }
    
    const totalPedido = (sub + taxaPagto + frete) - desc;
    const saldo = totalPedido - pago;
    
    document.getElementById('totalCarrinho').innerText = "R$ " + totalPedido.toFixed(2);
    document.getElementById('cartSaldoDevedor').innerText = "R$ " + saldo.toFixed(2);
}

function renderCliSelectCart() { 
    const datalist = document.getElementById('listaClientesDatalist'); 
    if(datalist) {
        datalist.innerHTML = bdClientes.map(c => `<option value="${c.nome}"></option>`).join(''); 
    }
}

function atualizarInfoCreditoCarrinho() { 
    const nomeCli = document.getElementById('cartClienteInput').value; 
    const label = document.getElementById('labelCreditoCli'); 
    const c = bdClientes.find(x => x.nome === nomeCli);

    if(!c) { 
        label.innerText = "Saldo: R$ 0.00"; 
        label.className = "text-emerald-500 font-bold"; 
        return; 
    } 
    const credito = c.credito || 0; 
    label.innerText = `Saldo: R$ ${credito.toFixed(2)}`; 
    label.className = credito >= 0 ? "text-emerald-500 font-bold" : "text-red-500 font-bold"; 
}

function toggleOpcoesPagamento() { 
    document.getElementById('divParcelas').style.display = (document.getElementById('cartPagamento').value === 'Credito_Parcelado') ? 'block' : 'none'; 
}

function toggleOpcoesEntrega() { 
    const v = document.getElementById('cartEntrega').value; 
    document.getElementById('divFrete').style.display = (v === 'Retirada') ? 'none' : 'block'; 
    atualizarTotalFinal(); 
}

async function enviarPedido(imprimir = false, isOrcamento = false) {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    
    const nomeCli = document.getElementById('cartClienteInput').value;
    const clienteObj = bdClientes.find(c => c.nome === nomeCli);
    const idCli = clienteObj ? clienteObj.id : null;

    const total = parseFloat(document.getElementById('totalCarrinho').innerText.replace("R$ ",""));
    let pago = parseFloat(document.getElementById('cartValorPago').value) || 0;
    const desc = parseFloat(document.getElementById('cartDesconto').value) || 0;
    const frete = parseFloat(document.getElementById('cartFreteValor').value) || 0;
    const taxaPagto = parseFloat(document.getElementById('cartTaxaPagto').innerText.replace("R$ ","")) || 0;
    
    if(isOrcamento) pago = 0; 
    
    const saldo = total - pago;
    
    let statusInicial = "Em produção";
    if (isOrcamento) {
        statusInicial = "Orçamento";
    } else if (saldo > 0) {
        statusInicial = "Aguardando pagamento";
    }

    const pedido = {
        clienteId: idCli || "Consumidor Final",
        clienteNome: nomeCli || "Consumidor Final",
        itens: carrinho,
        total: total,
        desconto: desc,
        frete: frete,
        taxaPagto: taxaPagto,
        valorPago: pago,
        saldoDevedor: saldo,
        data: new Date(),
        status: statusInicial,
        arquivado: false
    };
    
    const docRef = await db.collection("pedidos").add(pedido);
    
    if (!isOrcamento && idCli && document.getElementById('cartPagamento').value === "Saldo_Cliente") {
        await db.collection("clientes").doc(idCli).update({ credito: (clienteObj.credito || 0) - pago });
    }
    
    carrinho = []; 
    document.getElementById('cartValorPago').value = 0; 
    document.getElementById('cartDesconto').value = 0; 
    document.getElementById('cartFreteValor').value = 0;
    document.getElementById('cartClienteInput').value = '';
    renderCarrinho();
    
    if(isOrcamento) {
        alert("ORÇAMENTO GERADO COM SUCESSO!");
        imprimirOrcamento(docRef.id, pedido);
    } else {
        alert("PEDIDO SALVO!");
        if(imprimir) imprimirReciboDireto(docRef.id, pedido);
    }
}

// --- KANBAN DE PRODUÇÃO ---
function renderKanbanProducao() {
    const container = document.getElementById('kanbanContainer');
    if(!container) return;

    let html = '';
    const pedidosAtivos = bdPedidos.filter(p => !p.arquivado);

    STATUSES.forEach(status => {
        if(status === 'Orçamento') return; 
        
        const pedidosDoStatus = pedidosAtivos.filter(p => p.status === status);
        const isVazio = pedidosDoStatus.length === 0;
        
        const minClass = isVazio ? 'minimized items-center' : '';
        const headerClass = isVazio ? 'flex-col-reverse justify-center' : 'justify-between items-center';
        const titleClass = isVazio ? 'vertical-text mt-6' : '';
        const badgeClass = isVazio ? 'mb-4' : '';

        html += `
            <div onclick="if(this.classList.contains('minimized')) { this.classList.remove('minimized', 'items-center'); this.querySelector('.k-header').classList.remove('flex-col-reverse', 'justify-center'); this.querySelector('.k-header').classList.add('justify-between', 'items-center'); this.querySelector('h3').classList.remove('vertical-text', 'mt-6'); this.querySelector('.k-badge').classList.remove('mb-4'); }" class="bg-slate-100 rounded-xl p-4 w-80 flex-shrink-0 flex flex-col kanban-col border border-slate-200 ${minClass}">
                <div class="k-header flex ${headerClass} w-full mb-4 shrink-0 transition-all">
                    <h3 class="font-bold text-slate-700 uppercase text-[10px] tracking-widest ${titleClass}">${status}</h3>
                    <span class="k-badge bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-1 rounded-full ${badgeClass}">${pedidosDoStatus.length}</span>
                </div>
                <div class="kanban-cards flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    ${pedidosDoStatus.map(p => gerarCardPedido(p)).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function gerarCardPedido(p) {
    const dataObj = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data);
    const dataF = dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    let options = STATUSES.filter(s => s !== 'Orçamento').map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('');

    let corBorda = 'border-l-slate-400';
    if(p.status === 'Aguardando pagamento') corBorda = 'border-l-amber-400';
    if(p.status === 'Em produção') corBorda = 'border-l-blue-500';
    if(p.status === 'Acabamento') corBorda = 'border-l-indigo-500';
    if(p.status === 'Pronto para Retirada') corBorda = 'border-l-emerald-400';
    if(p.status === 'Entregue') corBorda = 'border-l-emerald-600';
    if(p.status === 'Cancelado / Estorno') corBorda = 'border-l-red-500';

    let btnArquivar = (p.status === 'Entregue' || p.status === 'Cancelado / Estorno') ? `<button type="button" onclick="arquivarPedido('${p.id}')" class="bg-slate-200 text-slate-600 px-3 rounded hover:bg-slate-300 transition" title="Arquivar Pedido"><i class="fa fa-archive"></i></button>` : '';
    let btnZAP = `<button type="button" onclick="enviarWhatsApp('${p.id}', '${p.status === 'Pronto para Retirada' ? 'retirada' : 'recibo'}')" class="bg-green-500 text-white px-3 rounded hover:bg-green-600 transition" title="Enviar WhatsApp"><i class="fab fa-whatsapp"></i></button>`;

    const itensHtml = (p.itens || []).map(i => `<p>• ${i.qtdCarrinho || 1}x (${i.qtdModal || 1} un.) ${i.nome} <span class="opacity-70">(${i.desc})</span></p>`).join('');

    return `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 border-l-4 ${corBorda}">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[9px] font-bold text-slate-400">${dataF}</span>
                <span class="text-[10px] font-black text-indigo-600">R$ ${(p.total || 0).toFixed(2)}</span>
            </div>
            <h4 class="font-bold text-slate-800 text-xs mb-2">${p.clienteNome}</h4>
            <div class="text-[9px] text-slate-500 mb-3 space-y-1">${itensHtml}</div>
            <div class="mt-3 pt-3 border-t border-slate-100 flex gap-2 flex-wrap">
                <select onchange="mudarStatusPedido('${p.id}', this.value)" class="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 min-w-[100px]">
                    ${options}
                </select>
                ${btnArquivar}
                ${btnZAP}
                <button type="button" onclick="imprimirRecibo('${p.id}')" class="bg-slate-200 text-slate-600 px-3 rounded hover:bg-slate-300 transition" title="Imprimir Recibo Térmico"><i class="fa fa-print"></i></button>
                <button type="button" onclick="imprimirOSA4('${p.id}')" class="bg-slate-800 text-white px-3 rounded hover:bg-slate-700 transition" title="Imprimir OS (A4)"><i class="fa fa-file-pdf"></i></button>
            </div>
        </div>
    `;
}

async function mudarStatusPedido(id, novoStatus) {
    try { 
        await db.collection("pedidos").doc(id).update({ status: novoStatus }); 
    } catch(e) { 
        console.error(e); 
        alert("Erro ao atualizar status."); 
    }
}

async function arquivarPedido(id) { 
    if(confirm("Deseja remover este pedido do painel de produção? Ele continuará salvo no histórico e financeiro.")) { 
        try { await db.collection("pedidos").doc(id).update({ arquivado: true }); } 
        catch(e) { alert("Erro ao arquivar pedido."); } 
    } 
}

// --- HISTÓRICO GERAL ---
function abrirHistoricoGeral() { 
    document.getElementById('buscaHistoricoGeral').value = ''; 
    renderHistoricoGeral(); 
    document.getElementById('modalHistoricoGeral').classList.remove('hidden'); 
}

function renderHistoricoGeral() {
    const termo = document.getElementById('buscaHistoricoGeral').value.toLowerCase(); 
    const tbody = document.getElementById('listaHistoricoGeral');
    if(!tbody) return;
    
    let filtrados = bdPedidos; 
    if (termo) filtrados = bdPedidos.filter(p => p.clienteNome.toLowerCase().includes(termo) || p.status.toLowerCase().includes(termo) || p.id.toLowerCase().includes(termo));
    
    tbody.innerHTML = filtrados.length === 0 ? `<tr><td colspan="5" class="p-6 text-center text-slate-400">Nenhum pedido encontrado.</td></tr>` : filtrados.map(p => {
        const dataFormatada = p.data.toDate ? p.data.toDate().toLocaleDateString('pt-BR') : new Date(p.data).toLocaleDateString('pt-BR');
        const isArquivado = p.arquivado ? `<span class="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[9px] uppercase ml-2">Arquivado</span>` : '';
        let btnDesarquivar = p.arquivado ? `<button type="button" onclick="desarquivarPedido('${p.id}')" class="text-amber-500 hover:text-amber-700 mx-1" title="Voltar para Produção"><i class="fa fa-box-open"></i></button>` : '';
        let btnExcluir = (usuarioAtual && usuarioAtual.role === 'admin') ? `<button type="button" onclick="excluirPedido('${p.id}')" class="text-red-400 hover:text-red-600 mx-1" title="Excluir Pedido Permanentemente"><i class="fa fa-trash"></i></button>` : '';
        
        return `<tr class="border-b border-slate-50 hover:bg-slate-50"><td class="p-3 text-slate-500 font-medium">${dataFormatada} <br/><span class="text-[9px] text-slate-400 uppercase">${p.id.substring(0,6)}</span></td><td class="p-3 font-bold text-slate-700">${p.clienteNome} ${isArquivado}</td><td class="p-3"><span class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[9px] font-black uppercase">${p.status}</span></td><td class="p-3 text-right font-black text-slate-800">R$ ${p.total.toFixed(2)}</td><td class="p-3 text-center">${btnDesarquivar}<button type="button" onclick="${p.status === 'Orçamento' ? `imprimirOrcamento('${p.id}')` : `imprimirRecibo('${p.id}')`}" class="text-slate-400 hover:text-slate-600 mx-1" title="Imprimir Recibo/PDF"><i class="fa fa-print"></i></button>${btnExcluir}</td></tr>`;
    }).join('');
}

async function desarquivarPedido(id) { 
    if(confirm("Deseja voltar este pedido para o painel de Produção?")) { 
        try { await db.collection("pedidos").doc(id).update({ arquivado: false }); renderHistoricoGeral(); } 
        catch(e) { alert("Erro ao desarquivar pedido."); } 
    } 
}

async function excluirPedido(id) { 
    if(usuarioAtual.role !== 'admin') return alert("Sem permissão."); 
    if(confirm("ATENÇÃO: Tem certeza que deseja EXCLUIR PERMANENTEMENTE este pedido? Esta ação não pode ser desfeita.")) { 
        try { await db.collection("pedidos").doc(id).delete(); renderHistoricoGeral(); } 
        catch(e) { alert("Erro ao excluir pedido."); } 
    } 
}

// --- A RECEBER (FATURADOS) ---
function renderAReceber() {
    const tab = document.getElementById('listaAReceberTab');
    if(!tab) return;
    
    const devedores = bdPedidos.filter(p => p.saldoDevedor > 0 && p.status !== 'Cancelado / Estorno');
    let html = '';
    
    const clientesDev = {};
    devedores.forEach(p => {
        if(!clientesDev[p.clienteId]) clientesDev[p.clienteId] = { nome: p.clienteNome, pedidos: [], total: 0 };
        clientesDev[p.clienteId].pedidos.push(p);
        clientesDev[p.clienteId].total += p.saldoDevedor;
    });
    
    if(Object.keys(clientesDev).length === 0) {
        tab.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum cliente com saldo devedor.</td></tr>`;
        return;
    }
    
    for(let cliId in clientesDev) {
        const c = clientesDev[cliId];
        html += `
            <tr class="border-b border-slate-50 bg-slate-50/50">
                <td class="p-4 font-bold text-slate-700">${c.nome}</td>
                <td class="p-4 text-center text-slate-500">${c.pedidos.length} pedido(s)</td>
                <td class="p-4 text-right font-black text-red-500">R$ ${c.total.toFixed(2)}</td>
                <td class="p-4 text-center">
                    <button type="button" onclick="document.getElementById('dev-${cliId}').classList.toggle('hidden')" class="text-indigo-500 font-bold text-[10px] uppercase hover:underline">Ver Pedidos</button>
                </td>
            </tr>
            <tr id="dev-${cliId}" class="hidden">
                <td colspan="4" class="p-4 bg-white border-b border-slate-200">
                    <table class="w-full text-xs">
        `;
        c.pedidos.forEach(p => {
            const dataObj = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data);
            html += `
                <tr class="border-b border-slate-50">
                    <td class="py-2 text-slate-500">${dataObj.toLocaleDateString('pt-BR')} <br><span class="text-[9px] uppercase">ID: ${p.id.substring(0,6)}</span></td>
                    <td class="py-2 text-right font-bold text-red-400">Falta: R$ ${p.saldoDevedor.toFixed(2)}</td>
                    <td class="py-2 text-right">
                        <button type="button" onclick="abrirModalReceber('${p.id}', ${p.saldoDevedor})" class="bg-emerald-500 text-white px-3 py-1.5 rounded text-[9px] font-bold uppercase hover:bg-emerald-600 shadow-sm">Receber</button>
                        <button type="button" onclick="cobrarWhatsApp('${p.id}', ${p.saldoDevedor})" class="bg-green-500 text-white px-3 py-1.5 rounded text-[9px] font-bold uppercase hover:bg-green-600 shadow-sm ml-1"><i class="fab fa-whatsapp"></i> Cobrar</button>
                    </td>
                </tr>
            `;
        });
        html += `</table></td></tr>`;
    }
    tab.innerHTML = html;
}

function abrirModalReceber(idPedido, saldo) {
    document.getElementById('recSaldoIdPedido').value = idPedido;
    document.getElementById('recSaldoValor').value = saldo.toFixed(2);
    document.getElementById('modalReceberSaldo').classList.remove('hidden');
}

async function confirmarRecebimentoSaldo() {
    const idPedido = document.getElementById('recSaldoIdPedido').value;
    const valorRecebido = parseFloat(document.getElementById('recSaldoValor').value);
    const formaPagto = document.getElementById('recSaldoForma').value;
    
    if(!valorRecebido || valorRecebido <= 0) return alert("Informe um valor válido.");
    
    const p = bdPedidos.find(x => x.id === idPedido);
    if(!p) return;
    
    const novoValorPago = (p.valorPago || 0) + valorRecebido;
    const novoSaldo = p.total - p.desconto - novoValorPago;
    
    try {
        await db.collection("pedidos").doc(idPedido).update({
            valorPago: novoValorPago,
            saldoDevedor: novoSaldo < 0 ? 0 : novoSaldo,
            status: (novoSaldo <= 0 && p.status === 'Aguardando pagamento') ? 'Em produção' : p.status
        });
        
        await db.collection("transacoes").add({
            tipo: 'entrada',
            descricao: `Recebimento Faturado - Pedido ${idPedido.substring(0,6).toUpperCase()} (${p.clienteNome})`,
            valor: valorRecebido,
            formaPagamento: formaPagto,
            data: new Date()
        });
        
        alert("Pagamento recebido com sucesso!");
        document.getElementById('modalReceberSaldo').classList.add('hidden');
        renderAReceber();
    } catch(e) {
        alert("Erro ao processar recebimento.");
    }
}

function cobrarWhatsApp(idPedido, saldo) {
    const p = bdPedidos.find(x => x.id === idPedido);
    if (!p) return;
    let telefone = ""; 
    if (p.clienteId && p.clienteId !== "Consumidor Final") { 
        const cli = bdClientes.find(c => c.id === p.clienteId); 
        if (cli && cli.telefone) telefone = cli.telefone.replace(/\D/g, ''); 
    }
    
    const texto = `Olá *${p.clienteNome}*! Tudo bem?\n\nConsta em nosso sistema um saldo pendente no valor de *R$ ${saldo.toFixed(2)}* referente ao pedido *${idPedido.substring(0,6).toUpperCase()}*.\n\nPodemos confirmar a previsão de pagamento? Qualquer dúvida, estamos à disposição!`;
    
    if (!telefone || telefone.length < 10) return alert("Cliente sem telefone cadastrado. Atualize o cadastro primeiro.");
    if (telefone.length === 10 || telefone.length === 11) telefone = "55" + telefone;
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`, '_blank'); 
}

// --- WHATSAPP (GENÉRICO) ---
function enviarWhatsApp(idPedido, tipo, objPedido = null) {
    const p = objPedido || bdPedidos.find(x => x.id === idPedido); if (!p) return;
    let telefone = ""; 
    if (p.clienteId && p.clienteId !== "Consumidor Final") { 
        const cli = bdClientes.find(c => c.id === p.clienteId); 
        if (cli && cli.telefone) telefone = cli.telefone.replace(/\D/g, ''); 
    }
    
    const itensTexto = p.itens.map(i => `▫️ ${i.qtdCarrinho || 1}x ${i.nome} - R$ ${((i.valorModal || 0) * (i.qtdCarrinho || 1)).toFixed(2)}`).join('\n'); 
    const totalStr = p.total.toFixed(2);
    let texto = "";
    
    if (tipo === 'orcamento') texto = `Olá *${p.clienteNome}*! Tudo bem?\n\nSegue o seu orçamento da *GVA Gráfica*:\n\n${itensTexto}\n\n*Total: R$ ${totalStr}*\n\nQualquer dúvida, estamos à disposição! Para aprovar, é só responder esta mensagem.`;
    else if (tipo === 'retirada') texto = `Olá *${p.clienteNome}*!\n\nSó passando para avisar que o seu pedido (Ref: ${idPedido.substring(0,6).toUpperCase()}) já está *PRONTO PARA RETIRADA* aqui na GVA Gráfica! 🚀\n\nTotal do pedido: R$ ${totalStr}\n${p.saldoDevedor > 0 ? `Saldo a pagar na retirada: *R$ ${p.saldoDevedor.toFixed(2)}*\n` : ''}Te esperamos!`;
    else if (tipo === 'recibo') texto = `Olá *${p.clienteNome}*!\n\nSeu pedido foi registrado com sucesso na *GVA Gráfica*! (Ref: ${idPedido.substring(0,6).toUpperCase()})\n\n*Resumo:*\n${itensTexto}\n\n*Total: R$ ${totalStr}*\nValor Pago: R$ ${(p.valorPago || 0).toFixed(2)}\n${p.saldoDevedor > 0 ? `Saldo a pagar: R$ ${p.saldoDevedor.toFixed(2)}\n` : ''}Acompanharemos a produção e avisaremos quando estiver pronto!`;
    
    document.getElementById('zapTelefone').value = telefone; 
    document.getElementById('zapMensagem').value = texto; 
    document.getElementById('modalWhatsApp').classList.remove('hidden');
}

function confirmarEnvioWhatsApp() {
    let telefone = document.getElementById('zapTelefone').value.replace(/\D/g, ''); 
    let texto = document.getElementById('zapMensagem').value;
    if (!telefone || telefone.length < 10) return alert("Por favor, insira um número de telefone válido com DDD.");
    if (telefone.length === 10 || telefone.length === 11) telefone = "55" + telefone;
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`, '_blank'); 
    document.getElementById('modalWhatsApp').classList.add('hidden');
}

// --- IMPRESSÃO DE RECIBO (TÉRMICA 80MM) ---
function imprimirReciboDireto(idPedido, objPedido) {
    const p = objPedido || bdPedidos.find(x => x.id === idPedido);
    if(!p) return;
    
    const janela = window.open('', '', 'width=350,height=800');
    const dataObj = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data);
    const dataStr = dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.toLocaleTimeString('pt-BR');
    
    let dadosEmpresaHtml = `CNPJ: 17.184.159/0001-06<br/> WhatsApp: 21 99993-0190`;
    if(bdEmpresa.pix) dadosEmpresaHtml += `<br/><br/><b>PIX:</b> ${bdEmpresa.pix}`;
    if(bdEmpresa.banco) dadosEmpresaHtml += `<br/><b>Banco:</b> ${bdEmpresa.banco} | <b>Ag:</b> ${bdEmpresa.agencia} | <b>CC:</b> ${bdEmpresa.conta}`;

    let html = `
        <html><head><style>
            body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; color: #000; font-size: 12px; }
            .center { text-align: center; } .bold { font-weight: bold; } .linha { border-bottom: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; font-size: 12px; border-collapse: collapse; } th, td { text-align: left; padding: 2px 0; vertical-align: top; } .right { text-align: right; }
            img.logo { max-width: 150px; margin: 0 auto 10px auto; display: block; filter: grayscale(100%); }
            @media print { .page-break { page-break-before: always; } }
            .prod-item { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
            .prod-desc { font-size: 12px; margin-bottom: 10px; padding-left: 10px; }
        </style></head><body>

        <!-- VIA DO CLIENTE -->
        <img src="https://i.postimg.cc/1RCc58qN/gva-br-1-ERP-26.png" class="logo" alt="GVA Gráfica" />
        <div class="center bold" style="font-size: 14px;">Gráfica Venom Arts LTDA</div>
        <div class="center" style="font-size: 10px; margin-bottom: 10px;">
            ${dadosEmpresaHtml}
        </div>
        <div class="linha"></div>
        <div class="center bold" style="font-size: 14px;">Pedido: ${idPedido.substring(0,6).toUpperCase()}</div>
        <div class="center">Data: ${dataStr}</div>
        <div class="linha"></div>
        <div>Cliente: ${p.clienteNome}</div>
        <div class="linha"></div>
        <table>
            <tr><th>Qtd/Item</th><th class="right">Valor</th></tr>
            ${(p.itens || []).map(i => `<tr><td>${i.qtdCarrinho || 1}x (${i.qtdModal || 1} un.) ${i.nome}<br><small>${i.desc}</small></td><td class="right">R$ ${((i.valorModal || 0) * (i.qtdCarrinho || 1)).toFixed(2)}</td></tr>`).join('')}
        </table>
        <div class="linha"></div>
        <div class="right bold">Subtotal: R$ ${((p.total || 0) - (p.taxaPagto || 0) - (p.frete || 0) + (p.desconto || 0)).toFixed(2)}</div>
        ${p.taxaPagto ? `<div class="right">Taxa/Desc. Pgto: ${p.taxaPagto > 0 ? '+' : ''} R$ ${p.taxaPagto.toFixed(2)}</div>` : ''}
        ${p.frete > 0 ? `<div class="right">Frete: + R$ ${p.frete.toFixed(2)}</div>` : ''}
        ${p.desconto > 0 ? `<div class="right">Desconto Manual: - R$ ${p.desconto.toFixed(2)}</div>` : ''}
        <div class="right bold">Total: R$ ${(p.total || 0).toFixed(2)}</div>
        <div class="right">Valor Pago: R$ ${(p.valorPago || 0).toFixed(2)}</div>
        <div class="right bold">Saldo: R$ ${(p.saldoDevedor || 0).toFixed(2)}</div>
        <div class="linha"></div>
        <div class="center">Obrigado pela preferência!</div>

        <div class="page-break"></div>

        <!-- VIA DA PRODUÇÃO -->
        <div class="center bold" style="font-size: 16px; margin-bottom: 10px;">VIA DA PRODUÇÃO</div>
        <div class="center bold" style="font-size: 14px;">Pedido: ${idPedido.substring(0,6).toUpperCase()}</div>
        <div class="center">Data: ${dataStr}</div>
        <div class="linha"></div>
        <div class="bold" style="font-size: 14px;">Cliente: ${p.clienteNome}</div>
        <div class="linha"></div>
        ${(p.itens || []).map(i => `
            <div class="prod-item">[ ] ${i.qtdCarrinho || 1}x (${i.qtdModal || 1} un.) ${i.nome}</div>
            <div class="prod-desc">${i.desc.replace(/\|/g, '<br>')}</div>
        `).join('')}
        <div class="linha"></div>
        <div class="center">Fim da Ordem de Serviço</div>

        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body></html>
    `;
    janela.document.write(html);
    janela.document.close();
}

function imprimirRecibo(idPedido) { 
    imprimirReciboDireto(idPedido, null); 
}

// --- IMPRESSÃO DE ORDEM DE SERVIÇO (A4) ---
function imprimirOSA4(idPedido) {
    const p = bdPedidos.find(x => x.id === idPedido);
    if(!p) return;
    
    const janela = window.open('', '', 'width=800,height=900');
    const dataObj = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data);
    const dataStr = dataObj.toLocaleDateString('pt-BR') + ' às ' + dataObj.toLocaleTimeString('pt-BR');

    let html = `
        <html><head><style>
            @page { size: A4; margin: 15mm; } body { font-family: Arial, sans-serif; color: #333; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { max-height: 50px; filter: grayscale(100%); } .title { font-size: 24px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
            .info-box { border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 20px; background: #f9fafb; }
            .item-box { border: 2px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 15px; page-break-inside: avoid; }
            .item-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; }
            .item-desc { font-size: 14px; margin-bottom: 10px; } .check-box { display: inline-block; width: 15px; height: 15px; border: 1px solid #000; margin-right: 5px; vertical-align: middle; }
            .task-list { margin-top: 10px; font-size: 14px; } .task-item { margin-bottom: 8px; }
        </style></head><body>
        <div class="header">
            <img src="https://i.postimg.cc/1RCc58qN/gva-br-1-ERP-26.png" class="logo" alt="GVA Gráfica" />
            <div style="text-align: right;">
                <div class="title">ORDEM DE SERVIÇO</div>
                <div style="font-size: 18px; font-weight: bold;">#${p.id.substring(0,6).toUpperCase()}</div>
            </div>
        </div>
        <div class="info-box">
            <strong>Cliente:</strong> ${p.clienteNome}<br>
            <strong>Data do Pedido:</strong> ${dataStr}<br>
            <strong>Status Atual:</strong> ${p.status}
        </div>
        <h3 style="text-transform: uppercase; color: #64748b;">Itens para Produção</h3>
        ${(p.itens || []).map((i, index) => `
            <div class="item-box">
                <div class="item-title">Item ${index + 1}: ${i.qtdCarrinho || 1}x (${i.qtdModal || 1} un.) ${i.nome}</div>
                <div class="item-desc">${i.desc.replace(/\|/g, '<br>')}</div>
                <div class="task-list">
                    <div class="task-item"><span class="check-box"></span> Arte Aprovada / RIP</div>
                    <div class="task-item"><span class="check-box"></span> Impressão Concluída</div>
                    <div class="task-item"><span class="check-box"></span> Acabamento Finalizado</div>
                    <div class="task-item"><span class="check-box"></span> Conferência e Embalagem</div>
                </div>
            </div>
        `).join('')}
        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body></html>
    `;
    janela.document.write(html);
    janela.document.close();
}

function imprimirOrcamento(idPedido) {
    const p = bdPedidos.find(x => x.id === idPedido); 
    if(!p) return;
    
    const janela = window.open('', '', 'width=800,height=900');
    const dataPedido = p.data.toDate ? p.data.toDate() : new Date(p.data);
    const dataValidade = new Date(dataPedido); 
    dataValidade.setDate(dataValidade.getDate() + 7);
    
    let dadosEmpresaHtml = `CNPJ: 17.184.159/0001-06<br/>WhatsApp: (21) 99993-0190`;
    if(bdEmpresa.pix) dadosEmpresaHtml += `<br/>PIX: ${bdEmpresa.pix}`;
    if(bdEmpresa.banco) dadosEmpresaHtml += `<br/>Banco: ${bdEmpresa.banco} | Ag: ${bdEmpresa.agencia} | CC: ${bdEmpresa.conta}`;

    const subtotal = p.itens.reduce((acc, i) => acc + ((i.valorModal || 0) * (i.qtdCarrinho || 1)), 0);
    const valPix = subtotal * 0.95;
    const valCredito = subtotal * 1.05;

    janela.document.write(`
        <html><head><title>Orçamento - ${idPedido.substring(0,6).toUpperCase()}</title><style>body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #334155; } .header { background-color: #3E4095; color: #ffffff; padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; } .logo { max-width: 180px; filter: brightness(0) invert(1); } .company-info { text-align: right; font-size: 13px; line-height: 1.6; } .company-info strong { font-size: 16px; letter-spacing: 1px; } .content { padding: 40px; } .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; } .info-block { flex: 1; } .info-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; } .info-value { font-size: 16px; font-weight: bold; color: #0f172a; margin: 0; } table { width: 100%; border-collapse: collapse; margin-bottom: 30px; } th { background: #3E4095; color: #ffffff; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; } td { padding: 15px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; vertical-align: top; } .text-right { text-align: right; } .totals { width: 320px; margin-left: auto; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; } .total-line { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #475569; } .total-line.grand-total { font-size: 22px; font-weight: 900; color: #3E4095; border-top: 2px solid #cbd5e1; padding-top: 15px; margin-top: 15px; } .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; } .validade { display: inline-block; background: #eff6ff; color: #3E4095; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 13px; margin-top: 20px; border: 1px solid #bfdbfe; } .payment-options { display: flex; gap: 15px; margin-top: 30px; justify-content: center; } .pay-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center; flex: 1; background: #fff; } .pay-card h4 { margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; } .pay-card p { margin: 0; font-size: 18px; font-weight: bold; color: #0f172a; } @media print { body { padding: 0; } .validade { border: 1px solid #000; color: #000; background: transparent; } .header { background-color: #3E4095 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } th { background-color: #3E4095 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style></head><body>
        <div class="header"><div><img src="https://i.postimg.cc/1RCc58qN/gva-br-1-ERP-26.png" class="logo" alt="GVA Gráfica" /></div><div class="company-info"><strong>GRÁFICA VENOM ARTS LTDA</strong><br/>${dadosEmpresaHtml}</div></div>
        <div class="content">
            <div class="info-section">
                <div class="info-block"><div class="info-label">Orçamento preparado para:</div><div class="info-value">${p.clienteNome}</div></div>
                <div class="info-block text-right"><div class="info-label">Nº do Orçamento</div><div class="info-value" style="color: #3E4095;">#${idPedido.substring(0,6).toUpperCase()}</div><div class="info-label" style="margin-top: 15px;">Data de Emissão</div><div class="info-value" style="font-size: 14px;">${dataPedido.toLocaleDateString('pt-BR')}</div></div>
            </div>
            <table>
                <thead><tr><th>Item / Descrição</th><th class="text-right" style="width: 80px;">Qtd</th><th class="text-right" style="width: 120px;">Total</th></tr></thead>
                <tbody>${p.itens.map(i => `<tr><td><strong style="color: #0f172a;">${i.nome}</strong><br/><span style="color: #64748b; font-size: 12px; line-height: 1.4; display: inline-block; margin-top: 4px;">${i.desc.replace(/\|/g, '<br/>')}</span><br/><span style="color: #10b981; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 4px;"><i class="fa fa-clock"></i> Prazo de Produção: ${i.prazo || 0} dias úteis</span></td><td class="text-right font-bold">${i.qtdCarrinho}</td><td class="text-right font-bold">R$ ${((i.valorModal || 0) * (i.qtdCarrinho || 1)).toFixed(2)}</td></tr>`).join('')}</tbody>
            </table>
            
            <div class="payment-options">
                <div class="pay-card" style="border-color: #10b981; background: #f0fdf4;">
                    <h4 style="color: #059669;">Pix / Dinheiro (-5%)</h4>
                    <p style="color: #047857;">R$ ${valPix.toFixed(2)}</p>
                </div>
                <div class="pay-card">
                    <h4>Débito (Normal)</h4>
                    <p>R$ ${subtotal.toFixed(2)}</p>
                </div>
                <div class="pay-card" style="border-color: #f43f5e; background: #fff1f2;">
                    <h4 style="color: #e11d48;">Crédito (+5%)</h4>
                    <p style="color: #be123c;">R$ ${valCredito.toFixed(2)}</p>
                </div>
            </div>

            <div style="text-align: center;"><div class="validade"><i class="fa fa-clock"></i> Este orçamento é válido até ${dataValidade.toLocaleDateString('pt-BR')} (7 dias).</div></div>
            <div class="footer">Agradecemos a oportunidade de apresentar nossa proposta.<br/>Para aprovar este orçamento, por favor entre em contato conosco via WhatsApp.</div>
        </div>
        <script>setTimeout(() => { window.print(); window.close(); }, 800);</script></body></html>
    `);
    janela.document.close();
}
