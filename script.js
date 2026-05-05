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

let bdCategorias=[], bdProdutos=[], bdClientes=[], bdPedidos=[], bdDespesas=[], bdAcabamentos=[], bdUsuarios=[], carrinho=[];
let bdEmpresa = {}; 
let usuarioAtual=null, filtroSetor='Todos', filtroCategoria='Todas', filtroSubcategoria='Todas';
const STATUSES=["Orçamento","Aguardando pagamento","Em produção","Acabamento","Pronto para Retirada","Entregue","Cancelado / Estorno"];

auth.onAuthStateChanged(async user => {
    const telaLogin = document.getElementById('telaLogin'), appInterface = document.getElementById('appInterface'), btnEntrar = document.getElementById('btnEntrar');
    if (user) {
        const hoje = new Date().toDateString();
        const ultimoAcesso = localStorage.getItem('dataUltimoAcesso');
        if (ultimoAcesso && ultimoAcesso !== hoje) { auth.signOut(); localStorage.removeItem('dataUltimoAcesso'); return; }
        localStorage.setItem('dataUltimoAcesso', hoje);

        telaLogin.classList.add('hidden'); appInterface.classList.remove('hidden');
        if (btnEntrar) { btnEntrar.innerText = "Entrar no Sistema"; btnEntrar.disabled = false; }
        try {
            const doc = await db.collection("usuarios").doc(user.email).get();
            if (doc.exists) usuarioAtual = doc.data();
            else { usuarioAtual = { nome: user.email.split('@')[0], email: user.email, role: "admin" }; await db.collection("usuarios").doc(user.email).set(usuarioAtual); }
        } catch (error) { usuarioAtual = { nome: user.email.split('@')[0], email: user.email, role: "admin" }; }
        
        aplicarPermissoes();
        const dataFiltro = document.getElementById('finDataFiltro'); if(dataFiltro && !dataFiltro.value) dataFiltro.valueAsDate = new Date();
        const dashMes = document.getElementById('dashMesFiltro'); if(dashMes && !dashMes.value) dashMes.value = new Date().toISOString().slice(0,7);
        iniciarLeitura();
    } else {
        telaLogin.classList.remove('hidden'); appInterface.classList.add('hidden'); usuarioAtual = null;
        if (btnEntrar) { btnEntrar.innerText = "Entrar no Sistema"; btnEntrar.disabled = false; }
    }
});

function entrar() {
    const e = document.getElementById('email').value, s = document.getElementById('senha').value, msgErro = document.getElementById('msgErro'), btnEntrar = document.getElementById('btnEntrar');
    if (!e || !s) { msgErro.innerText = "Preencha os dados."; msgErro.classList.remove('hidden'); return; }
    msgErro.classList.add('hidden'); btnEntrar.innerText = "Verificando..."; btnEntrar.disabled = true;
    auth.signInWithEmailAndPassword(e, s).catch(() => { msgErro.innerText = "Acesso negado. Verifique e-mail e senha."; msgErro.classList.remove('hidden'); btnEntrar.innerText = "Entrar no Sistema"; btnEntrar.disabled = false; });
}

function sair() { localStorage.removeItem('dataUltimoAcesso'); auth.signOut(); }

function aplicarPermissoes() {
    const role = usuarioAtual.role || 'vendedor';
    document.getElementById('nomeUsuarioLogado').innerText = usuarioAtual.nome || usuarioAtual.email.split('@')[0];
    document.getElementById('roleUsuarioLogado').innerText = role;
    const btnLoja = document.querySelectorAll('.btn-menu-loja'), btnProducao = document.querySelectorAll('.btn-menu-producao'), btnFinanceiro = document.querySelectorAll('.btn-menu-financeiro'), btnConfig = document.querySelectorAll('.btn-menu-config'), btnDashboard = document.querySelectorAll('.btn-menu-dashboard');
    const btnSubCli = document.getElementById('btn-sub-cli'), btnSubAReceber = document.getElementById('btn-sub-areceber'), btnSubProd = document.getElementById('btn-sub-prod'), btnSubCat = document.getElementById('btn-sub-cat'), btnSubAcab = document.getElementById('btn-sub-acab'), btnSubUsuarios = document.getElementById('btn-sub-usuarios'), btnSubEmpresa = document.getElementById('btn-sub-empresa');[...btnLoja, ...btnProducao, ...btnFinanceiro, ...btnConfig, ...btnDashboard].forEach(b => b.classList.add('hidden'));[btnSubCli, btnSubAReceber, btnSubProd, btnSubCat, btnSubAcab, btnSubUsuarios, btnSubEmpresa].forEach(b => { if(b) b.classList.add('hidden'); });

    if (role === 'admin') {[...btnLoja, ...btnProducao, ...btnFinanceiro, ...btnConfig, ...btnDashboard].forEach(b => b.classList.remove('hidden'));[btnSubCli, btnSubAReceber, btnSubProd, btnSubCat, btnSubAcab, btnSubUsuarios, btnSubEmpresa].forEach(b => { if(b) b.classList.remove('hidden'); }); 
        mudarAba('dashboard'); 
    } else if (role === 'vendedor') {[...btnLoja, ...btnProducao, ...btnFinanceiro, ...btnConfig].forEach(b => b.classList.remove('hidden')); 
        if(btnSubCli) btnSubCli.classList.remove('hidden'); 
        if(btnSubAReceber) btnSubAReceber.classList.remove('hidden'); 
        mudarAba('loja'); mudarSubAba('sub-cli'); 
    } else if (role === 'producao') {[...btnProducao].forEach(b => b.classList.remove('hidden')); mudarAba('producao'); 
    }
}

function iniciarLeitura() {
    db.collection("categorias").onSnapshot(s => { bdCategorias = s.docs.map(d => ({id: d.id, ...d.data()})); renderCat(); });
    db.collection("produtos").onSnapshot(s => { bdProdutos = s.docs.map(d => ({id: d.id, ...d.data()})); renderVitrine(); renderProdTable(); });
    db.collection("clientes").orderBy("nome").onSnapshot(s => { bdClientes = s.docs.map(d => ({id: d.id, ...d.data()})); renderCliTable(); renderCliSelectCart(); renderDashboard(); });
    db.collection("acabamentos").onSnapshot(s => { bdAcabamentos = s.docs.map(d => ({id: d.id, ...d.data()})); renderAcabTable(); atualizarListaAcabamentosProduto(); });
    db.collection("pedidos").orderBy("data", "desc").limit(500).onSnapshot(s => { bdPedidos = s.docs.map(d => ({id: d.id, ...d.data()})); renderFinanceiro(); renderKanbanProducao(); renderDashboard(); renderAReceber(); renderOrcamentos(); });
    db.collection("despesas").orderBy("data", "desc").limit(500).onSnapshot(s => { bdDespesas = s.docs.map(d => ({id: d.id, ...d.data()})); renderFinanceiro(); renderDashboard(); });
    db.collection("usuarios").onSnapshot(s => { bdUsuarios = s.docs.map(d => ({id: d.id, ...d.data()})); renderUsuariosTab(); });
    db.collection("empresa").doc("dados").onSnapshot(s => { if(s.exists) bdEmpresa = s.data(); else bdEmpresa = {}; if(typeof editEmpresa === 'function') editEmpresa(); });
}

// --- NAVEGAÇÃO DE ABAS ---
function mudarAba(abaId) {
    document.querySelectorAll('.aba-content').forEach(el => el.classList.add('hidden'));
    const container = document.getElementById('aba-' + abaId);
    if(container) container.classList.remove('hidden');
    
    document.querySelectorAll('.aba-btn').forEach(btn => btn.classList.remove('active-aba', 'text-indigo-600', 'bg-indigo-50'));
    document.querySelectorAll(`.btn-menu-${abaId === 'cadastros' ? 'config' : abaId}`).forEach(btn => btn.classList.add('active-aba', 'text-indigo-600', 'bg-indigo-50'));
    
    if(abaId === 'loja') setTimeout(() => { const b = document.getElementById('buscaProduto'); if(b) b.focus(); }, 100);
}

function mudarSubAba(subId) {
    document.querySelectorAll('.sub-aba-content').forEach(el => el.classList.add('hidden'));
    const container = document.getElementById(subId);
    if(container) container.classList.remove('hidden');
    
    document.querySelectorAll('.sub-aba-btn').forEach(btn => btn.classList.remove('active-sub'));
    const btn = document.getElementById('btn-' + subId);
    if(btn) btn.classList.add('active-sub');
}

// --- DASHBOARD ---
function renderDashboard() {
    const dashMesInput = document.getElementById('dashMesFiltro'); if (!dashMesInput || !dashMesInput.value) return;
    const mesSelecionado = dashMesInput.value; let faturamento = 0, despesas = 0, produtosVendidos = {}, clientesCompras = {}, despesasCat = {};
    
    bdPedidos.forEach(p => {
        if (!p.data) return; 
        const dataObj = p.data.toDate ? p.data.toDate() : new Date(p.data);
        const dataStr = dataObj.toISOString().slice(0, 7);
        
        if (dataStr === mesSelecionado && p.status !== 'Cancelado / Estorno' && p.status !== 'Orçamento') {
            faturamento += p.total || 0; 
            const cliNome = p.clienteNome || "Consumidor Final";
            if (!clientesCompras[cliNome]) clientesCompras[cliNome] = 0; clientesCompras[cliNome] += p.total || 0;
            
            if(p.itens) {
                p.itens.forEach(item => {
                    const nomeProd = item.nome ? item.nome.split(' (')[0] : 'Produto'; 
                    if (!produtosVendidos[nomeProd]) produtosVendidos[nomeProd] = { qtd: 0, valor: 0 };
                    let qtdNum = parseInt(item.qtdCarrinho || item.qtd); if (isNaN(qtdNum)) qtdNum = 1; 
                    let valNum = parseFloat(item.valor); if (isNaN(valNum)) valNum = 0;
                    produtosVendidos[nomeProd].qtd += qtdNum; produtosVendidos[nomeProd].valor += valNum;
                });
            }
        }
    });
    
    bdDespesas.forEach(d => { 
        if (!d.data) return; 
        const dataObj = d.data.toDate ? d.data.toDate() : new Date(d.data);
        const dataStr = dataObj.toISOString().slice(0, 7); 
        if (dataStr === mesSelecionado) {
            despesas += d.valor || 0;
            let cat = d.categoria || 'Outros';
            if(!despesasCat[cat]) despesasCat[cat] = 0;
            despesasCat[cat] += d.valor || 0;
        } 
    });
    
    document.getElementById('dashFaturamento').innerText = `R$ ${faturamento.toFixed(2)}`; document.getElementById('dashDespesas').innerText = `R$ ${despesas.toFixed(2)}`; document.getElementById('dashLucro').innerText = `R$ ${(faturamento - despesas).toFixed(2)}`;
    
    const arrayProdutos = Object.keys(produtosVendidos).map(nome => ({ nome: nome, qtd: produtosVendidos[nome].qtd, valor: produtosVendidos[nome].valor })).sort((a, b) => b.valor - a.valor).slice(0, 5);
    document.getElementById('listaTopProdutosTab').innerHTML = arrayProdutos.length === 0 ? `<tr><td colspan="3" class="p-4 text-center text-slate-400 text-xs">Nenhuma venda no período.</td></tr>` : arrayProdutos.map(p => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${p.nome}</td><td class="p-3 text-center text-slate-500">${p.qtd}</td><td class="p-3 text-right text-emerald-600 font-black">R$ ${p.valor.toFixed(2)}</td></tr>`).join('');
    
    const arrayClientes = Object.keys(clientesCompras).map(nome => ({ nome: nome, valor: clientesCompras[nome] })).sort((a, b) => b.valor - a.valor).slice(0, 5);
    document.getElementById('listaTopClientesTab').innerHTML = arrayClientes.length === 0 ? `<tr><td colspan="2" class="p-4 text-center text-slate-400 text-xs">Nenhuma venda no período.</td></tr>` : arrayClientes.map(c => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${c.nome}</td><td class="p-3 text-right text-indigo-600 font-black">R$ ${c.valor.toFixed(2)}</td></tr>`).join('');

    const arrayDespCat = Object.keys(despesasCat).map(c => ({ cat: c, val: despesasCat[c] })).sort((a,b) => b.val - a.val);
    const tabDespCat = document.getElementById('listaDespesasCatTab');
    if(tabDespCat) {
        tabDespCat.innerHTML = arrayDespCat.length === 0 ? `<tr><td colspan="2" class="p-4 text-center text-slate-400 text-xs">Nenhuma despesa no período.</td></tr>` : arrayDespCat.map(d => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${d.cat}</td><td class="p-3 text-right text-red-500 font-black">R$ ${d.val.toFixed(2)}</td></tr>`).join('');
    }
}

// --- ORÇAMENTOS (FOLLOW-UP) ---
function renderOrcamentos() {
    const tbody = document.getElementById('listaOrcamentosTab'); if(!tbody) return;
    const orcamentos = bdPedidos.filter(p => p.status === 'Orçamento' && !p.arquivado).sort((a,b) => {
        const dataA = a.data && a.data.toDate ? a.data.toDate() : new Date(a.data || 0);
        const dataB = b.data && b.data.toDate ? b.data.toDate() : new Date(b.data || 0);
        return dataB - dataA;
    });
    
    tbody.innerHTML = orcamentos.length === 0 ? `<tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum orçamento pendente.</td></tr>` : orcamentos.map(p => {
        const dataObj = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data);
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        const dias = Math.floor((new Date() - dataObj) / (1000 * 60 * 60 * 24));
        let badgeDias = dias > 2 ? `<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] uppercase ml-2 font-black">${dias} dias pendente</span>` : `<span class="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[9px] uppercase ml-2 font-black">Novo</span>`;
        
        return `
        <tr class="border-b border-slate-50 hover:bg-slate-50">
            <td class="p-3 text-slate-500 font-medium">${dataFormatada} <br/><span class="text-[9px] text-slate-400 uppercase">${p.id.substring(0,6)}</span></td>
            <td class="p-3 font-bold text-slate-700">${p.clienteNome || 'Cliente'} ${badgeDias}</td>
            <td class="p-3 text-right font-black text-slate-800">R$ ${(p.total || 0).toFixed(2)}</td>
            <td class="p-3 text-center">
                <button type="button" onclick="enviarWhatsApp('${p.id}', 'orcamento')" class="bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 transition text-[10px] font-bold uppercase tracking-widest"><i class="fab fa-whatsapp"></i> Cobrar</button>
                <button type="button" onclick="abrirDetalhesPedido('${p.id}')" class="text-indigo-400 hover:text-indigo-600 mx-2" title="Ver Detalhes"><i class="fa fa-eye"></i></button>
            </td>
        </tr>
        `;
    }).join('');
}

// --- KANBAN DE PRODUÇÃO ---
function renderKanbanProducao() {
    const container = document.getElementById('kanbanContainer'); if(!container) return;
    const pedidosAtivos = bdPedidos.filter(p => !p.arquivado); let html = '';
    STATUSES.forEach(status => {
        const pedidosDoStatus = pedidosAtivos.filter(p => p.status === status);
        if (pedidosDoStatus.length === 0) {
            html += `<div class="bg-slate-100 rounded-xl p-2 w-12 flex-shrink-0 flex flex-col items-center border border-slate-200 opacity-50 hover:opacity-100 transition cursor-default h-full"><span class="bg-slate-200 text-slate-500 text-[10px] font-black px-2 py-1 rounded-full mb-4">0</span><h3 class="font-bold text-slate-400 uppercase text-[10px] tracking-widest vertical-text whitespace-nowrap">${status}</h3></div>`;
        } else {
            html += `<div class="bg-slate-100 rounded-xl p-4 w-80 flex-shrink-0 flex flex-col h-full border border-slate-200"><div class="flex justify-between items-center mb-4 shrink-0"><h3 class="font-bold text-slate-700 uppercase text-[10px] tracking-widest">${status}</h3><span class="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-1 rounded-full">${pedidosDoStatus.length}</span></div><div class="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">${pedidosDoStatus.map(p => gerarCardPedido(p)).join('')}</div></div>`;
        }
    });
    container.innerHTML = html;
}

function gerarCardPedido(p) {
    const dataObj = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data || new Date());
    const dataFormatada = dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    
    let options = STATUSES.map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('');
    let corBorda = 'border-l-slate-400';
    if(p.status === 'Orçamento') corBorda = 'border-l-blue-400'; else if(p.status === 'Aguardando pagamento') corBorda = 'border-l-amber-400'; else if(p.status === 'Em produção') corBorda = 'border-l-blue-500'; else if(p.status === 'Acabamento') corBorda = 'border-l-indigo-500'; else if(p.status === 'Pronto para Retirada') corBorda = 'border-l-emerald-400'; else if(p.status === 'Entregue') corBorda = 'border-l-emerald-600'; else if(p.status === 'Cancelado / Estorno') corBorda = 'border-l-red-500';

    let btnArquivar = (p.status === 'Entregue' || p.status === 'Cancelado / Estorno') ? `<button type="button" onclick="arquivarPedido('${p.id}')" class="bg-slate-200 text-slate-600 px-3 rounded hover:bg-slate-300 transition" title="Arquivar Pedido"><i class="fa fa-archive"></i></button>` : '';
    let visualizaPrecos = (!usuarioAtual || usuarioAtual.role !== 'producao');
    let btnReceber = (visualizaPrecos && p.saldoDevedor > 0) ? `<button type="button" onclick="receberSaldo('${p.id}')" class="bg-emerald-500 text-white px-3 rounded hover:bg-emerald-600 transition" title="Receber Saldo (Falta R$ ${p.saldoDevedor.toFixed(2)})"><i class="fa fa-hand-holding-usd"></i></button>` : '';
    let btnZAP = !visualizaPrecos ? '' : `<button type="button" onclick="enviarWhatsApp('${p.id}', '${p.status === 'Pronto para Retirada' ? 'retirada' : (p.status === 'Orçamento' ? 'orcamento' : 'recibo')}')" class="bg-green-500 text-white px-3 rounded hover:bg-green-600 transition" title="Enviar WhatsApp"><i class="fab fa-whatsapp"></i></button>`;
    let btnImprimir = !visualizaPrecos ? '' : `<button type="button" onclick="${p.status === 'Orçamento' ? `imprimirOrcamento('${p.id}')` : `imprimirRecibo('${p.id}')`}" class="bg-slate-800 text-white px-3 rounded hover:bg-slate-700 transition" title="${p.status === 'Orçamento' ? 'Gerar PDF' : 'Imprimir Recibo'}"><i class="${p.status === 'Orçamento' ? 'fa fa-file-pdf' : 'fa fa-print'}"></i></button>`;
    let btnEtiqueta = `<button type="button" onclick="imprimirEtiqueta('${p.id}', '6x4')" class="bg-purple-500 text-white px-3 rounded hover:bg-purple-600 transition" title="Imprimir Etiqueta 6x4"><i class="fa fa-tag"></i></button>`;
    let etiquetaFalta = (p.saldoDevedor > 0 && visualizaPrecos) ? `<div class="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md z-10">FALTA R$ ${p.saldoDevedor.toFixed(2)}</div>` : '';

    let infoExtra = '';
    if(p.dataEntrega) {
        const dt = new Date(p.dataEntrega).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
        infoExtra += `<p class="text-amber-600 font-bold mt-1 text-[10px]"><i class="fa fa-clock"></i> Prometido: ${dt}</p>`;
    }
    if(p.linkArte) infoExtra += `<p class="mt-1 text-[10px]"><a href="${p.linkArte}" target="_blank" class="text-blue-500 hover:underline font-bold"><i class="fa fa-external-link-alt"></i> Abrir Arte</a></p>`;

    let htmlItens = p.itens ? p.itens.map(i => `<p>• ${i.qtdCarrinho || i.qtd || 1}x ${i.nome} <span class="opacity-70">(${i.desc || ''})</span></p>`).join('') : '';

    return `<div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 border-l-4 ${corBorda} relative mt-2">${etiquetaFalta}<div class="flex justify-between items-start mb-2"><span class="text-[9px] font-bold text-slate-400">${dataFormatada}</span><span class="text-[10px] font-black text-indigo-600">${visualizaPrecos ? 'R$ ' + (p.total || 0).toFixed(2) : ''}</span></div><h4 class="font-bold text-slate-800 text-xs mb-2">${p.clienteNome || 'Cliente'}</h4><div class="text-[9px] text-slate-500 mb-3 space-y-1">${htmlItens}${infoExtra}</div><div class="mt-3 pt-3 border-t border-slate-100 flex gap-2 flex-wrap"><select onchange="mudarStatusPedido('${p.id}', this.value)" class="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 min-w-[100px]">${options}</select>${btnReceber}${btnEtiqueta}${btnArquivar}${btnZAP}${btnImprimir}</div></div>`;
}

async function mudarStatusPedido(id, novoStatus) {
    try {
        const pedidoRef = db.collection("pedidos").doc(id); const doc = await pedidoRef.get(); if (!doc.exists) return; const p = doc.data();
        await pedidoRef.update({ status: novoStatus });
        if (novoStatus === 'Cancelado / Estorno' && p.valorPago > 0) {
            await db.collection("despesas").add({ descricao: `ESTORNO - Pedido: ${p.clienteNome}`, valor: p.valorPago, categoria: 'Outros', data: new Date() });
            alert(`Pedido cancelado! Um estorno de R$ ${p.valorPago.toFixed(2)} foi registrado nas Saídas do Financeiro.`);
        }
    } catch(e) { alert("Erro ao atualizar status."); }
}

async function arquivarPedido(id) { if(confirm("Deseja remover este pedido do painel de produção? Ele continuará salvo no histórico e financeiro.")) { try { await db.collection("pedidos").doc(id).update({ arquivado: true }); } catch(e) { alert("Erro ao arquivar pedido."); } } }

// --- CONTROLE DE MODAIS ---
function fecharModal() {
    document.getElementById('modalW2P').classList.add('hidden');
    document.getElementById('modalCorpoMedidas').innerHTML = '';
    document.getElementById('modalCorpoVariacoes').innerHTML = '';
    document.getElementById('modalCorpoAcabamentos').innerHTML = '';
}
function fecharModalFora(event) { if (event.target.id === 'modalW2P') fecharModal(); }

// --- EMPRESA E PIX ---
function editEmpresa() {
    if(!bdEmpresa) return;
    document.getElementById('empresaPix').value = bdEmpresa.pix || '';
    document.getElementById('empresaBanco').value = bdEmpresa.banco || '';
    document.getElementById('empresaAgencia').value = bdEmpresa.agencia || '';
    document.getElementById('empresaConta').value = bdEmpresa.conta || '';
}

async function salvarDadosEmpresa() {
    const dados = { pix: document.getElementById('empresaPix').value.trim(), banco: document.getElementById('empresaBanco').value.trim(), agencia: document.getElementById('empresaAgencia').value.trim(), conta: document.getElementById('empresaConta').value.trim() };
    try { await db.collection("empresa").doc("dados").set(dados); alert("Dados Bancários/PIX salvos com sucesso!"); } catch(e) { alert("Erro ao salvar dados da empresa."); }
}

// --- WHATSAPP UTILS ---
function enviarWhatsApp(idPedido, acao) {
    const pedido = bdPedidos.find(p => p.id === idPedido); if(!pedido) return;
    const zapModal = document.getElementById('modalWhatsApp');
    let telCli = pedido.clienteTel ? pedido.clienteTel.replace(/\D/g, '') : '';
    if(telCli.length === 10 || telCli.length === 11) telCli = "55" + telCli;
    document.getElementById('zapTelefone').value = telCli;

    let msg = "";
    if(acao === 'orcamento') msg = `Olá, ${pedido.clienteNome || 'Cliente'}! Tudo bem?\n\nAqui é da GVA Gráfica. Estou entrando em contato referente ao orçamento que fizemos. Ficou alguma dúvida ou podemos dar andamento na produção?`;
    else if(acao === 'retirada') msg = `Olá, ${pedido.clienteNome || 'Cliente'}!\n\nÓtima notícia: seu pedido (Ref: ${idPedido.substring(0,6)}) da GVA Gráfica já está PRONTO para retirada!\n\nTe aguardamos!`;
    else if(acao === 'recibo') {
        msg = `Olá, ${pedido.clienteNome || 'Cliente'}!\n\nAqui está a confirmação do seu pedido na GVA Gráfica.\nValor Total: R$ ${(pedido.total||0).toFixed(2)}`;
        if(pedido.saldoDevedor > 0) msg += `\nFalta Pagar: R$ ${pedido.saldoDevedor.toFixed(2)}\n\nNossa chave PIX: ${bdEmpresa.pix || 'Solicite a chave'}`;
    }
    document.getElementById('zapMensagem').value = msg; zapModal.classList.remove('hidden');
}

function confirmarEnvioWhatsApp() {
    const tel = document.getElementById('zapTelefone').value.replace(/\D/g, '');
    const msg = encodeURIComponent(document.getElementById('zapMensagem').value);
    if(tel.length < 10) { alert("Informe um número de telefone válido com DDD."); return; }
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
    document.getElementById('modalWhatsApp').classList.add('hidden');
}

// --- CLIENTES, USUÁRIOS, CATEGORIAS, ACABAMENTOS ---
function renderCliTable() {
    const busca = document.getElementById('buscaClienteTab').value.toLowerCase();
    const tbody = document.getElementById('listaClientesTab'); if(!tbody) return;
    const filtrados = bdClientes.filter(c => c.nome.toLowerCase().includes(busca) || (c.doc && c.doc.includes(busca)));
    tbody.innerHTML = filtrados.length === 0 ? `<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhum cliente encontrado.</td></tr>` : filtrados.map(c => `<tr class="border-b border-slate-50 hover:bg-slate-50"><td class="p-3 text-slate-700 font-bold">${c.nome}<br><span class="text-[9px] text-slate-400 font-normal">${c.doc || ''}</span></td><td class="p-3 text-slate-500">${c.tel || '-'}</td><td class="p-3 font-black ${c.credito > 0 ? 'text-emerald-600' : 'text-slate-400'}">R$ ${(c.credito || 0).toFixed(2)}</td><td class="p-3 text-center"><button type="button" onclick="editCliente('${c.id}')" class="bg-slate-200 text-slate-600 px-3 py-1 rounded hover:bg-slate-300 transition text-[10px] font-bold uppercase"><i class="fa fa-edit"></i> Editar</button></td></tr>`).join('');
}
function renderCliSelectCart() { const datalist = document.getElementById('listaClientesDatalist'); if(datalist) datalist.innerHTML = bdClientes.map(c => `<option value="${c.nome} | CPF/CNPJ: ${c.doc || 'N/A'}">`).join(''); }
function limparFormCli() { document.getElementById('cliId').value = ''; document.getElementById('cliNome').value = ''; document.getElementById('cliResponsavel').value = ''; document.getElementById('cliDoc').value = ''; document.getElementById('cliTel').value = ''; document.getElementById('cliEmail').value = ''; document.getElementById('cliCep').value = ''; document.getElementById('cliEnd').value = ''; document.getElementById('cliComplemento').value = ''; document.getElementById('cliCredito').value = '0'; document.getElementById('tituloCliForm').innerText = 'NOVO CLIENTE'; }
function editCliente(id) { const c = bdClientes.find(x => x.id === id); if(!c) return; document.getElementById('cliId').value = c.id; document.getElementById('cliNome').value = c.nome; document.getElementById('cliResponsavel').value = c.responsavel || ''; document.getElementById('cliDoc').value = c.doc || ''; document.getElementById('cliTel').value = c.tel || ''; document.getElementById('cliEmail').value = c.email || ''; document.getElementById('cliCep').value = c.cep || ''; document.getElementById('cliEnd').value = c.end || ''; document.getElementById('cliComplemento').value = c.complemento || ''; document.getElementById('cliCredito').value = c.credito || 0; document.getElementById('tituloCliForm').innerText = 'EDITAR CLIENTE'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
async function salvarCliente() { const id = document.getElementById('cliId').value; const nome = document.getElementById('cliNome').value.trim(); if(!nome) { alert("Nome é obrigatório!"); return; } const btn = document.getElementById('btnSalvarCli'); btn.innerText = 'Salvando...'; btn.disabled = true; const dados = { nome, responsavel: document.getElementById('cliResponsavel').value.trim(), doc: document.getElementById('cliDoc').value.trim(), tel: document.getElementById('cliTel').value.trim(), email: document.getElementById('cliEmail').value.trim(), cep: document.getElementById('cliCep').value.trim(), end: document.getElementById('cliEnd').value.trim(), complemento: document.getElementById('cliComplemento').value.trim(), credito: parseFloat(document.getElementById('cliCredito').value) || 0, dataCadastro: new Date() }; try { if(id) await db.collection("clientes").doc(id).update(dados); else await db.collection("clientes").add(dados); limparFormCli(); alert("Cliente salvo com sucesso!"); } catch(e) { alert("Erro ao salvar cliente."); } btn.innerText = 'Salvar Cliente'; btn.disabled = false; }

function renderUsuariosTab() { const tbody = document.getElementById('listaUsuariosTab'); if(!tbody) return; tbody.innerHTML = bdUsuarios.length === 0 ? `<tr><td colspan="3" class="p-4 text-center">Nenhum usuário.</td></tr>` : bdUsuarios.map(u => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${u.nome || '-'}<br><span class="text-[10px] text-slate-400 font-normal">${u.email}</span></td><td class="p-3"><span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[9px] uppercase font-black tracking-widest">${u.role}</span></td><td class="p-3 text-right"><button type="button" onclick="editUsuario('${u.email}')" class="bg-slate-200 text-slate-600 px-3 py-1 rounded hover:bg-slate-300 transition text-[10px] font-bold uppercase"><i class="fa fa-edit"></i> Editar Permissão</button></td></tr>`).join(''); }
function editUsuario(email) { const u = bdUsuarios.find(x => x.email === email); if(!u) return; document.getElementById('userEmail').value = u.email; document.getElementById('userEmail').disabled = true; document.getElementById('userNome').value = u.nome || ''; document.getElementById('userRole').value = u.role || 'vendedor'; document.getElementById('userSenha').value = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); }
async function salvarUsuario() { const email = document.getElementById('userEmail').value.trim(); const nome = document.getElementById('userNome').value.trim(); const role = document.getElementById('userRole').value; if(!email || !nome) { alert("E-mail e Nome são obrigatórios."); return; } try { await db.collection("usuarios").doc(email).set({ email, nome, role }, { merge: true }); alert("Permissões do usuário atualizadas com sucesso!"); document.getElementById('userEmail').value = ''; document.getElementById('userEmail').disabled = false; document.getElementById('userNome').value = ''; document.getElementById('userSenha').value = ''; } catch(e) { alert("Erro ao salvar usuário."); } }

function renderCat() { const menuCat = document.getElementById('menuFiltroCat'); const tbody = document.getElementById('listaCategoriasTab'); const selectProdCat = document.getElementById('prodCategoria'); const selectAcabCat = document.getElementById('acabCategoria'); let opts = '<option value="">Selecione...</option>' + bdCategorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join(''); if(selectProdCat) selectProdCat.innerHTML = opts; if(selectAcabCat) selectAcabCat.innerHTML = '<option value="Todas">Para Todos os Produtos</option>' + opts; if(tbody) { tbody.innerHTML = bdCategorias.map(c => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${c.nome}</td><td class="p-3 text-right"><button type="button" onclick="editCategoria('${c.id}')" class="bg-slate-200 text-slate-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-slate-300">Editar</button> <button type="button" onclick="delCategoria('${c.id}')" class="bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-200 ml-1"><i class="fa fa-trash"></i></button></td></tr>`).join(''); } }
async function salvarCategoria() { const id = document.getElementById('catId').value; const nome = document.getElementById('catNome').value.trim(); if(!nome) return; if(id) await db.collection("categorias").doc(id).update({ nome }); else await db.collection("categorias").add({ nome }); document.getElementById('catId').value = ''; document.getElementById('catNome').value = ''; }
function editCategoria(id) { const c = bdCategorias.find(x => x.id === id); if(c) { document.getElementById('catId').value = c.id; document.getElementById('catNome').value = c.nome; } }
async function delCategoria(id) { if(confirm("Apagar categoria?")) await db.collection("categorias").doc(id).delete(); }

function renderAcabTable() { const tbody = document.getElementById('listaAcabamentosTab'); if(!tbody) return; tbody.innerHTML = bdAcabamentos.map(a => `<tr class="border-b border-slate-50"><td class="p-3"><p class="text-slate-700 font-bold">${a.nome} <span class="text-[9px] text-slate-400 font-normal bg-slate-100 px-1 rounded ml-1">${a.grupo || ''}</span></p><p class="text-[9px] text-emerald-600 font-bold uppercase">R$ ${a.preco.toFixed(2)} (${a.regra})</p></td><td class="p-3 text-center"><button type="button" onclick="editAcabamento('${a.id}')" class="bg-slate-200 text-slate-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-slate-300">Editar</button> <button type="button" onclick="delAcabamento('${a.id}')" class="bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-200 ml-1"><i class="fa fa-trash"></i></button></td></tr>`).join(''); }
function limparFormAcab() { document.getElementById('acabId').value = ''; document.getElementById('acabNome').value = ''; document.getElementById('acabGrupo').value = ''; document.getElementById('acabCategoria').value = 'Todas'; document.getElementById('acabRegra').value = 'unidade'; document.getElementById('acabPrecoVenda').value = ''; document.getElementById('acabCusto').value = ''; document.getElementById('tituloAcabForm').innerText = 'NOVO ACABAMENTO'; }
async function salvarAcabamento() { const id = document.getElementById('acabId').value, nome = document.getElementById('acabNome').value.trim(); if(!nome) { alert("Nome obrigatório"); return; } const dados = { nome, grupo: document.getElementById('acabGrupo').value.trim(), categoria: document.getElementById('acabCategoria').value, regra: document.getElementById('acabRegra').value, preco: parseFloat(document.getElementById('acabPrecoVenda').value) || 0, custo: parseFloat(document.getElementById('acabCusto').value) || 0 }; if(id) await db.collection("acabamentos").doc(id).update(dados); else await db.collection("acabamentos").add(dados); limparFormAcab(); }
function editAcabamento(id) { const a = bdAcabamentos.find(x => x.id === id); if(!a) return; document.getElementById('acabId').value = a.id; document.getElementById('acabNome').value = a.nome; document.getElementById('acabGrupo').value = a.grupo || ''; document.getElementById('acabCategoria').value = a.categoria; document.getElementById('acabRegra').value = a.regra; document.getElementById('acabPrecoVenda').value = a.preco; document.getElementById('acabCusto').value = a.custo || 0; document.getElementById('tituloAcabForm').innerText = 'EDITAR ACABAMENTO'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
async function delAcabamento(id) { if(confirm("Apagar acabamento?")) await db.collection("acabamentos").doc(id).delete(); }

// --- PRODUTOS, VITRINE E W2P ---
function ajustarCamposProduto() {
    const regra = document.getElementById('prodRegraPreco').value;
    document.getElementById('boxMedidas').style.display = regra === 'm2' ? 'grid' : 'none';
    document.getElementById('boxPacotes').style.display = regra === 'pacote' ? 'block' : 'none';
    document.getElementById('boxProgressivo').style.display = regra === 'progressivo' ? 'block' : 'none';
    document.getElementById('boxCombinacoes').style.display = regra === 'combinacao' ? 'block' : 'none';
    document.getElementById('boxPrecoBase').style.display = (regra === 'unidade' || regra === 'm2') ? 'block' : 'none';
}

function atualizarListaAcabamentosProduto() {
    const div = document.getElementById('listaCheckAcabamentos'); if(!div) return;
    const catProd = document.getElementById('prodCategoria').value;
    const acabamentosFiltrados = bdAcabamentos.filter(a => a.categoria === 'Todas' || a.categoria === catProd);
    div.innerHTML = acabamentosFiltrados.length === 0 ? '<p class="text-[10px] text-slate-400">Nenhum acabamento para esta categoria.</p>' : acabamentosFiltrados.map(a => `<label class="flex items-center gap-2 text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition"><input type="checkbox" class="check-acab-prod accent-indigo-500" value="${a.id}" /> ${a.nome} <span class="text-[9px] font-bold text-emerald-600 ml-auto">+ R$ ${a.preco.toFixed(2)}</span></label>`).join('');
}

function addLinhaPacote() { const div = document.createElement('div'); div.className = 'flex gap-2 items-center'; div.innerHTML = `<input type="number" placeholder="Qtd" class="p-2 border border-amber-200 rounded text-xs w-20 outline-none" /><input type="number" placeholder="Preço do Pacote R$" class="p-2 border border-amber-200 rounded text-xs flex-1 outline-none" /><button type="button" onclick="this.parentElement.remove()" class="text-red-500 font-bold px-2">X</button>`; document.getElementById('listaGradePacotes').appendChild(div); }
function addLinhaProgressivo() { const div = document.createElement('div'); div.className = 'flex gap-2 items-center'; div.innerHTML = `<input type="number" placeholder="A partir de Qtd" class="p-2 border border-emerald-200 rounded text-xs w-28 outline-none" /><input type="number" placeholder="Preço Unitário R$" class="p-2 border border-emerald-200 rounded text-xs flex-1 outline-none" /><button type="button" onclick="this.parentElement.remove()" class="text-red-500 font-bold px-2">X</button>`; document.getElementById('listaGradeProgressivo').appendChild(div); }
function gerarGradeCombinacoes() {
    const val1 = document.getElementById('combValores1').value.split(',').map(s=>s.trim()).filter(s=>s);
    const val2 = document.getElementById('combValores2').value.split(',').map(s=>s.trim()).filter(s=>s);
    if(!val1.length || !val2.length) { alert("Preencha os valores!"); return; }
    let html = '';
    val1.forEach(v1 => { val2.forEach(v2 => { html += `<div class="flex justify-between items-center bg-white p-2 rounded border border-purple-100 text-[10px] font-bold"><span class="text-purple-700">${v1} + ${v2}</span><div class="flex gap-2 items-center">R$ <input type="number" data-v1="${v1}" data-v2="${v2}" class="p-1 border border-purple-200 rounded text-xs w-24 outline-none comb-price" placeholder="Preço Fixo" /></div></div>`; }); });
    document.getElementById('listaGradeCombinacoes').innerHTML = html;
}

function limparFormProd() {
    document.getElementById('prodId').value = ''; document.getElementById('prodNome').value = ''; document.getElementById('prodSubcategoria').value = ''; document.getElementById('prodRef').value = ''; document.getElementById('prodMaterial').value = ''; document.getElementById('prodGramatura').value = ''; document.getElementById('prodPrazo').value = ''; document.getElementById('prodPreco').value = ''; document.getElementById('prodFoto').value = ''; document.getElementById('prodObs').value = ''; document.getElementById('prodRegraPreco').value = 'unidade'; document.getElementById('prodAcabObrigatorio').checked = false; document.getElementById('listaGradePacotes').innerHTML = ''; document.getElementById('listaGradeProgressivo').innerHTML = ''; document.getElementById('listaGradeCombinacoes').innerHTML = ''; document.querySelectorAll('.check-acab-prod').forEach(c => c.checked = false); ajustarCamposProduto();
}

async function salvarProduto() {
    const id = document.getElementById('prodId').value, nome = document.getElementById('prodNome').value.trim();
    if(!nome) { alert("Nome é obrigatório!"); return; }
    const regra = document.getElementById('prodRegraPreco').value;
    let precos = { base: parseFloat(document.getElementById('prodPreco').value) || 0, pacotes: [], progressivo:[], combinacoes: { attr1: document.getElementById('combNome1').value, attr2: document.getElementById('combNome2').value, valores:[] } };
    
    if(regra === 'pacote') { document.getElementById('listaGradePacotes').querySelectorAll('div').forEach(div => { const inputs = div.querySelectorAll('input'); precos.pacotes.push({ qtd: parseInt(inputs[0].value), preco: parseFloat(inputs[1].value) }); }); }
    if(regra === 'progressivo') { document.getElementById('listaGradeProgressivo').querySelectorAll('div').forEach(div => { const inputs = div.querySelectorAll('input'); precos.progressivo.push({ minQtd: parseInt(inputs[0].value), precoUnit: parseFloat(inputs[1].value) }); }); }
    if(regra === 'combinacao') { document.querySelectorAll('.comb-price').forEach(inp => { precos.combinacoes.valores.push({ v1: inp.getAttribute('data-v1'), v2: inp.getAttribute('data-v2'), preco: parseFloat(inp.value) || 0 }); }); }

    let acabamentosSelecionados =[]; document.querySelectorAll('.check-acab-prod:checked').forEach(c => acabamentosSelecionados.push(c.value));

    const p = { nome, setor: document.getElementById('prodSetor').value, categoria: document.getElementById('prodCategoria').value, subcategoria: document.getElementById('prodSubcategoria').value.trim(), referencia: document.getElementById('prodRef').value.trim(), material: document.getElementById('prodMaterial').value.trim(), gramatura: document.getElementById('prodGramatura').value.trim(), prazo: document.getElementById('prodPrazo').value, foto: document.getElementById('prodFoto').value.trim(), obs: document.getElementById('prodObs').value.trim(), regraPreco: regra, precos, medidas: { largBobina: document.getElementById('prodLargBobina').value, largMax: document.getElementById('prodLargMax').value, compMax: document.getElementById('prodCompMax').value }, acabamentos: acabamentosSelecionados, acabObrigatorio: document.getElementById('prodAcabObrigatorio').checked };

    try { if(id) await db.collection("produtos").doc(id).update(p); else await db.collection("produtos").add(p); limparFormProd(); alert("Produto salvo!"); } catch(e) { alert("Erro ao salvar produto."); }
}

function renderProdTable() { const tbody = document.getElementById('listaProdutosTab'); if(!tbody) return; tbody.innerHTML = bdProdutos.map(p => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${p.nome} <br><span class="text-[9px] text-slate-400 font-normal">${p.categoria} - ${p.subcategoria || ''}</span></td><td class="p-3 text-[10px] uppercase font-bold text-slate-500">${p.setor}</td><td class="p-3 text-center"><button type="button" onclick="editProduto('${p.id}')" class="bg-slate-200 text-slate-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-slate-300">Editar</button> <button type="button" onclick="delProduto('${p.id}')" class="bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-200 ml-1"><i class="fa fa-trash"></i></button></td></tr>`).join(''); }
async function delProduto(id) { if(confirm("Apagar produto permanentemente?")) await db.collection("produtos").doc(id).delete(); }
function editProduto(id) { alert("Para editar, implementaremos o carregamento de todos os arrays complexos na próxima atualização. Você pode editar preços diretamente no firebase ou excluir e recriar."); }

function setFiltroSetor(setor) { filtroSetor = setor; filtroCategoria = 'Todas'; filtroSubcategoria = 'Todas'; document.querySelectorAll('.btn-setor').forEach(b => b.classList.remove('ring-2', 'ring-offset-2', 'ring-indigo-500')); document.querySelector(`.data-setor-${setor.replace(/\s/g,'')}`).classList.add('ring-2', 'ring-offset-2', 'ring-indigo-500'); renderFiltrosCatSub(); renderVitrine(); }
function renderFiltrosCatSub() {
    const pSetor = filtroSetor === 'Todos' ? bdProdutos : bdProdutos.filter(p => p.setor === filtroSetor);
    const categorias =[...new Set(pSetor.map(p => p.categoria).filter(c=>c))];
    const menuCat = document.getElementById('menuFiltroCat'); const menuSub = document.getElementById('menuFiltroSubCat');
    if(categorias.length > 0) { menuCat.classList.remove('hidden'); menuCat.innerHTML = `<button type="button" onclick="filtroCategoria='Todas'; renderFiltrosCatSub(); renderVitrine()" class="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition ${filtroCategoria==='Todas'?'bg-indigo-600 text-white':'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}">Todas Cats</button>` + categorias.map(c => `<button type="button" onclick="filtroCategoria='${c}'; filtroSubcategoria='Todas'; renderFiltrosCatSub(); renderVitrine()" class="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition ${filtroCategoria===c?'bg-indigo-600 text-white':'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}">${c}</button>`).join(''); } else { menuCat.classList.add('hidden'); }
    const pCat = filtroCategoria === 'Todas' ? pSetor : pSetor.filter(p => p.categoria === filtroCategoria);
    const subs =[...new Set(pCat.map(p => p.subcategoria).filter(s=>s))];
    if(subs.length > 0 && filtroCategoria !== 'Todas') { menuSub.classList.remove('hidden'); menuSub.innerHTML = `<button type="button" onclick="filtroSubcategoria='Todas'; renderVitrine()" class="px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition ${filtroSubcategoria==='Todas'?'bg-slate-800 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}">Todas Subs</button>` + subs.map(s => `<button type="button" onclick="filtroSubcategoria='${s}'; renderVitrine()" class="px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition ${filtroSubcategoria===s?'bg-slate-800 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}">${s}</button>`).join(''); } else { menuSub.classList.add('hidden'); }
}

function renderVitrine() {
    const busca = document.getElementById('buscaProduto').value.toLowerCase();
    const grade = document.getElementById('gradeProdutos'); if(!grade) return;
    let filtrados = bdProdutos.filter(p => p.nome.toLowerCase().includes(busca));
    if (filtroSetor !== 'Todos') filtrados = filtrados.filter(p => p.setor === filtroSetor);
    if (filtroCategoria !== 'Todas') filtrados = filtrados.filter(p => p.categoria === filtroCategoria);
    if (filtroSubcategoria !== 'Todas') filtrados = filtrados.filter(p => p.subcategoria === filtroSubcategoria);

    grade.innerHTML = filtrados.length === 0 ? `<p class="col-span-full text-center text-slate-400 py-10">Nenhum produto encontrado.</p>` : filtrados.map(p => `
        <div onclick="abrirModalW2P('${p.id}')" class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all group flex flex-col h-full">
            <div class="h-40 bg-slate-100 relative flex items-center justify-center p-4">
                ${p.foto ? `<img src="${p.foto}" class="max-h-full object-contain group-hover:scale-105 transition-transform" />` : `<i class="fa fa-image text-4xl text-slate-300"></i>`}
                <span class="absolute top-2 right-2 bg-white/90 backdrop-blur text-indigo-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm">${p.regraPreco || 'unidade'}</span>
            </div>
            <div class="p-4 flex flex-col flex-1">
                <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">${p.categoria} ${p.subcategoria ? '> ' + p.subcategoria : ''}</p>
                <h3 class="font-bold text-slate-800 text-sm leading-tight flex-1">${p.nome}</h3>
                <div class="mt-3 flex justify-between items-end border-t border-slate-100 pt-3">
                    <span class="text-[10px] text-slate-500 font-medium">${p.prazo ? p.prazo + ' dias' : 'Consulte'}</span>
                    <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Configurar <i class="fa fa-arrow-right ml-1"></i></span>
                </div>
            </div>
        </div>
    `).join('');
}

let prodAtualW2P = null;
function abrirModalW2P(id) {
    prodAtualW2P = bdProdutos.find(p => p.id === id); if(!prodAtualW2P) return;
    
    // PATCH PARA PRODUTOS ANTIGOS
    if(!prodAtualW2P.precos) prodAtualW2P.precos = { base: prodAtualW2P.preco || 0, pacotes: [], progressivo:[], combinacoes: { valores:[] } };
    if(!prodAtualW2P.regraPreco) prodAtualW2P.regraPreco = 'unidade';

    document.getElementById('modalProdId').value = prodAtualW2P.id;
    document.getElementById('modalProdPrecoBase').value = prodAtualW2P.precos.base || 0;
    document.getElementById('modalProdRegra').value = prodAtualW2P.regraPreco;
    document.getElementById('modalProdAcabObrigatorio').value = prodAtualW2P.acabObrigatorio ? 'sim' : 'nao';
    document.getElementById('modalNomeProd').innerText = prodAtualW2P.nome;
    
    const img = document.getElementById('modalHeaderImg');
    if(prodAtualW2P.foto) { img.style.backgroundImage = `url('${prodAtualW2P.foto}')`; img.classList.remove('hidden'); } else { img.classList.add('hidden'); }
    
    const obs = document.getElementById('modalObs');
    if(prodAtualW2P.obs) { obs.innerHTML = `<strong>Aviso:</strong> ${prodAtualW2P.obs}`; obs.classList.remove('hidden'); } else { obs.classList.add('hidden'); }
    
    document.getElementById('w2pNomeArquivo').value = '';
    document.getElementById('avisoBobina').classList.add('hidden'); document.getElementById('erroMedidaMax').classList.add('hidden');

    let htmlMedidas = '';
    if(prodAtualW2P.regraPreco === 'm2') {
        htmlMedidas = `<div class="space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">Largura (m)</label><input type="number" id="w2pLargura" value="1.00" step="0.01" oninput="calcularPrecoW2P()" class="w-full p-3 border border-slate-200 bg-white rounded text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" /></div><div class="space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">Altura (m)</label><input type="number" id="w2pAltura" value="1.00" step="0.01" oninput="calcularPrecoW2P()" class="w-full p-3 border border-slate-200 bg-white rounded text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" /></div><div class="space-y-1 col-span-2"><label class="text-[10px] font-bold text-slate-400 uppercase">Quantidade de Lonas/Adesivos</label><input type="number" id="w2pQtd" value="1" min="1" oninput="calcularPrecoW2P()" class="w-full p-3 border border-slate-200 bg-white rounded text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" /></div>`;
    } else if(prodAtualW2P.regraPreco === 'pacote') {
        let opts = (prodAtualW2P.precos.pacotes||[]).map(p => `<option value="${p.qtd}" data-preco="${p.preco}">${p.qtd} un. - R$ ${p.preco.toFixed(2)}</option>`).join('');
        htmlMedidas = `<div class="space-y-1 col-span-2"><label class="text-[10px] font-bold text-slate-400 uppercase">Selecione o Pacote</label><select id="w2pPacote" onchange="calcularPrecoW2P()" class="w-full p-3 border border-slate-200 bg-white rounded text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"><option value="">Selecione...</option>${opts}</select></div><input type="hidden" id="w2pQtd" value="1" />`;
    } else if(prodAtualW2P.regraPreco === 'combinacao') {
        let opts1 =[...new Set((prodAtualW2P.precos.combinacoes.valores||[]).map(v => v.v1))].map(v => `<option value="${v}">${v}</option>`).join('');
        let opts2 =[...new Set((prodAtualW2P.precos.combinacoes.valores||[]).map(v => v.v2))].map(v => `<option value="${v}">${v}</option>`).join('');
        htmlMedidas = `<div class="space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">${prodAtualW2P.precos.combinacoes.attr1 || 'Opção 1'}</label><select id="w2pComb1" onchange="calcularPrecoW2P()" class="w-full p-3 border border-slate-200 bg-white rounded text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"><option value="">Selecione...</option>${opts1}</select></div><div class="space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">${prodAtualW2P.precos.combinacoes.attr2 || 'Opção 2'}</label><select id="w2pComb2" onchange="calcularPrecoW2P()" class="w-full p-3 border border-slate-200 bg-white rounded text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"><option value="">Selecione...</option>${opts2}</select></div><input type="hidden" id="w2pQtd" value="1" />`;
    } else {
        htmlMedidas = `<div class="space-y-1 col-span-2"><label class="text-[10px] font-bold text-slate-400 uppercase">Quantidade Unitária</label><input type="number" id="w2pQtd" value="1" min="1" oninput="calcularPrecoW2P()" class="w-full p-3 border border-slate-200 bg-white rounded text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" /></div>`;
    }
    document.getElementById('modalCorpoMedidas').innerHTML = htmlMedidas;

    const divAcab = document.getElementById('modalCorpoAcabamentos'); const titAcab = document.getElementById('tituloAcabamentos');
    if(prodAtualW2P.acabamentos && prodAtualW2P.acabamentos.length > 0) {
        titAcab.classList.remove('hidden');
        let selAcab = prodAtualW2P.acabamentos.map(idA => {
            const a = bdAcabamentos.find(x => x.id === idA); if(!a) return '';
            return `<label class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded cursor-pointer hover:bg-slate-50 mb-2"><div class="flex items-center gap-3"><input type="checkbox" name="w2pCheckAcab" value="${a.id}" data-regra="${a.regra}" data-preco="${a.preco}" onchange="calcularPrecoW2P()" class="w-4 h-4 accent-indigo-600" /> <span class="font-bold text-xs text-slate-700">${a.nome}</span></div><span class="text-[10px] font-black text-emerald-600">+ R$ ${a.preco.toFixed(2)} (${a.regra})</span></label>`;
        }).join('');
        divAcab.innerHTML = selAcab;
    } else { titAcab.classList.add('hidden'); divAcab.innerHTML = ''; }

    document.getElementById('modalW2P').classList.remove('hidden'); calcularPrecoW2P();
}

function calcularPrecoW2P() {
    if(!prodAtualW2P) return;
    let total = 0; const regra = prodAtualW2P.regraPreco;
    let qtd = 1, largura = 0, altura = 0;

    document.getElementById('avisoBobina').classList.add('hidden');
    document.getElementById('erroMedidaMax').classList.add('hidden');
    document.getElementById('btnAdicionarCarrinho').disabled = false;
    document.getElementById('btnAdicionarCarrinho').classList.remove('opacity-50', 'cursor-not-allowed');

    if(regra === 'm2') {
        largura = parseFloat(document.getElementById('w2pLargura').value) || 0; altura = parseFloat(document.getElementById('w2pAltura').value) || 0;
        qtd = parseInt(document.getElementById('w2pQtd').value) || 1;
        let m2 = largura * altura; if(m2 < 1) m2 = 1; 
        total = m2 * qtd * prodAtualW2P.precos.base;

        if(prodAtualW2P.medidas) {
            const lMax = parseFloat(prodAtualW2P.medidas.largMax); const cMax = parseFloat(prodAtualW2P.medidas.compMax); const lBob = parseFloat(prodAtualW2P.medidas.largBobina);
            let menorLado = Math.min(largura, altura); let maiorLado = Math.max(largura, altura);
            if(lMax > 0 && cMax > 0 && (menorLado > lMax || maiorLado > cMax)) {
                document.getElementById('textoErroMedidaMax').innerText = `Medida excede o limite máximo da máquina (${lMax}m x ${cMax}m).`;
                document.getElementById('erroMedidaMax').classList.remove('hidden');
                document.getElementById('btnAdicionarCarrinho').disabled = true; document.getElementById('btnAdicionarCarrinho').classList.add('opacity-50', 'cursor-not-allowed');
            } else if(lBob > 0 && menorLado > lBob) { document.getElementById('avisoBobina').classList.remove('hidden'); }
        }
    } else if(regra === 'pacote') {
        const sel = document.getElementById('w2pPacote'); if(sel && sel.selectedIndex > 0) { const opt = sel.options[sel.selectedIndex]; qtd = parseInt(opt.value); total = parseFloat(opt.getAttribute('data-preco')); }
    } else if(regra === 'progressivo') {
        qtd = parseInt(document.getElementById('w2pQtd').value) || 1; let pUnit = prodAtualW2P.precos.base;
        if(prodAtualW2P.precos.progressivo) { const faixas =[...prodAtualW2P.precos.progressivo].sort((a,b) => b.minQtd - a.minQtd); for(let f of faixas) { if(qtd >= f.minQtd) { pUnit = f.precoUnit; break; } } }
        total = qtd * pUnit;
    } else if(regra === 'combinacao') {
        const v1 = document.getElementById('w2pComb1') ? document.getElementById('w2pComb1').value : ''; const v2 = document.getElementById('w2pComb2') ? document.getElementById('w2pComb2').value : '';
        qtd = parseInt(v2) || 1; 
        if(v1 && v2 && prodAtualW2P.precos.combinacoes) { const match = prodAtualW2P.precos.combinacoes.valores.find(x => x.v1 === v1 && x.v2 === v2); if(match) total = match.preco; }
    } else {
        qtd = parseInt(document.getElementById('w2pQtd').value) || 1; total = qtd * prodAtualW2P.precos.base;
    }

    document.querySelectorAll('input[name="w2pCheckAcab"]:checked').forEach(chk => {
        const pAcab = parseFloat(chk.getAttribute('data-preco')), rAcab = chk.getAttribute('data-regra');
        if(rAcab === 'm2' && regra === 'm2') total += (largura * altura * qtd * pAcab);
        else if(rAcab === 'unidade') total += (qtd * pAcab);
        else if(rAcab === 'lote') total += pAcab;
    });

    document.getElementById('modalSubtotal').innerText = `R$ ${total.toFixed(2)}`; document.getElementById('modalSubtotal').setAttribute('data-valor', total);
}

function confirmarAdicaoCarrinho() {
    if(!prodAtualW2P) return;
    const nomeArq = document.getElementById('w2pNomeArquivo').value.trim();
    if(!nomeArq) { alert("A identificação/nome do arquivo é obrigatória."); return; }
    if(document.getElementById('modalProdAcabObrigatorio').value === 'sim' && document.querySelectorAll('input[name="w2pCheckAcab"]:checked').length === 0) { alert("Este produto exige que você selecione pelo menos um acabamento."); return; }

    const valorTotal = parseFloat(document.getElementById('modalSubtotal').getAttribute('data-valor')) || 0;
    if(valorTotal <= 0 && prodAtualW2P.precos.base > 0) { alert("Selecione corretamente as opções para gerar o preço."); return; }

    let qtdFinal = 1; let descExtra = "";
    if(prodAtualW2P.regraPreco === 'm2') { const l = document.getElementById('w2pLargura').value; const a = document.getElementById('w2pAltura').value; qtdFinal = document.getElementById('w2pQtd').value; descExtra = `${l}m x ${a}m`; }
    else if(prodAtualW2P.regraPreco === 'pacote') { const sel = document.getElementById('w2pPacote'); if(sel.selectedIndex === 0) return; qtdFinal = sel.value; descExtra = `Pacote c/ ${qtdFinal}`; }
    else if(prodAtualW2P.regraPreco === 'combinacao') { const v1 = document.getElementById('w2pComb1').value; const v2 = document.getElementById('w2pComb2').value; if(!v1 || !v2) return; qtdFinal = v2; descExtra = `${v1} | ${v2}`; }
    else { qtdFinal = document.getElementById('w2pQtd').value; }

    let acabExtras = []; document.querySelectorAll('input[name="w2pCheckAcab"]:checked').forEach(chk => { const a = bdAcabamentos.find(x => x.id === chk.value); if(a) acabExtras.push(a.nome); });
    if(acabExtras.length > 0) descExtra += ` | Acab: ${acabExtras.join(', ')}`;

    carrinho.push({ idProduto: prodAtualW2P.id, nome: `${prodAtualW2P.nome} (${nomeArq})`, desc: descExtra, qtdCarrinho: qtdFinal, valor: valorTotal, setor: prodAtualW2P.setor });
    renderCarrinho(); fecharModal();
}

function renderCarrinho() {
    document.getElementById('listaCarrinho').innerHTML = carrinho.length === 0 ? '<p class="text-xs text-slate-400 text-center py-4">Carrinho vazio.</p>' : carrinho.map((item, index) => `<div class="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100"><div class="flex-1"><p class="text-[10px] font-bold text-slate-700 leading-tight">${item.nome}</p><p class="text-[9px] text-slate-500">${item.desc} ${item.regraPreco!=='pacote'&&item.regraPreco!=='combinacao' ? `(Qtd: ${item.qtdCarrinho})` : ''}</p></div><div class="text-right ml-2"><p class="text-xs font-black text-indigo-600">R$ ${item.valor.toFixed(2)}</p><button type="button" onclick="removerDoCarrinho(${index})" class="text-[9px] text-red-500 hover:underline font-bold mt-1">Remover</button></div></div>`).join('');
    atualizarTotalFinal();
}

function removerDoCarrinho(index) { carrinho.splice(index, 1); renderCarrinho(); }

function atualizarTotalFinal() {
    let subtotal = carrinho.reduce((acc, item) => acc + item.valor, 0); document.getElementById('subtotalCart').innerText = `R$ ${subtotal.toFixed(2)}`;
    let frete = parseFloat(document.getElementById('cartFreteValor').value) || 0; let desconto = parseFloat(document.getElementById('cartDesconto').value) || 0; let pgto = document.getElementById('cartPagamento').value;
    let taxaPgto = 0; if(pgto === 'Pix' || pgto === 'Dinheiro') taxaPgto = -(subtotal * 0.05); else if(pgto === 'Credito_Vista') taxaPgto = (subtotal * 0.05);
    
    let lblTaxa = document.getElementById('cartTaxaPagto'); lblTaxa.innerText = `R$ ${taxaPgto.toFixed(2)}`; lblTaxa.className = taxaPgto < 0 ? 'text-emerald-500 font-black' : (taxaPgto > 0 ? 'text-red-500 font-black' : 'text-slate-400 font-bold');
    let total = subtotal + frete + taxaPgto - desconto; if(total < 0) total = 0;
    document.getElementById('totalCarrinho').innerText = `R$ ${total.toFixed(2)}`; document.getElementById('totalCarrinho').setAttribute('data-valor', total);
    let valorPago = parseFloat(document.getElementById('cartValorPago').value) || 0; let devedor = total - valorPago; if(devedor < 0) devedor = 0;
    document.getElementById('cartSaldoDevedor').innerText = `R$ ${devedor.toFixed(2)}`; document.getElementById('cartSaldoDevedor').setAttribute('data-valor', devedor);
}

function toggleOpcoesPagamento() {
    const p = document.getElementById('cartPagamento').value; document.getElementById('divParcelas').style.display = p === 'Credito_Parcelado' ? 'block' : 'none';
    if(p === 'Saldo_Cliente' || p === 'Faturado') { document.getElementById('cartValorPago').value = 0; document.getElementById('cartValorPago').disabled = true; } else { document.getElementById('cartValorPago').disabled = false; }
    atualizarTotalFinal();
}
function toggleOpcoesEntrega() { document.getElementById('divFrete').style.display = document.getElementById('cartEntrega').value === 'Motoboy' ? 'block' : 'none'; atualizarTotalFinal(); }
function atualizarInfoCreditoCarrinho() {
    const inputStr = document.getElementById('cartClienteInput').value; const nomeLimpo = inputStr.split(' | ')[0].trim(); const cli = bdClientes.find(c => c.nome === nomeLimpo); const label = document.getElementById('labelCreditoCli');
    if(cli) { document.getElementById('cartClienteId').value = cli.id; label.innerText = `Crédito: R$ ${(cli.credito || 0).toFixed(2)}`; label.className = cli.credito > 0 ? "text-emerald-600 font-black" : "text-slate-400 font-bold"; } else { document.getElementById('cartClienteId').value = ''; label.innerText = "Saldo: R$ 0.00"; label.className = "text-slate-400 font-bold"; }
}

// --- FECHAMENTO E FINANCEIRO ---
async function enviarPedido(isImprimir, isOrcamento) {
    if (carrinho.length === 0) { alert("O carrinho está vazio!"); return; }
    const clienteInput = document.getElementById('cartClienteInput').value.trim(); if (!clienteInput && !isOrcamento) { alert("Informe o cliente para concluir a venda."); return; }
    const total = parseFloat(document.getElementById('totalCarrinho').getAttribute('data-valor')) || 0;
    const valorPago = isOrcamento ? 0 : (parseFloat(document.getElementById('cartValorPago').value) || 0);
    const saldoDevedor = isOrcamento ? total : (parseFloat(document.getElementById('cartSaldoDevedor').getAttribute('data-valor')) || 0);
    const formaPagto = document.getElementById('cartPagamento').value;
    
    let idCli = document.getElementById('cartClienteId').value;
    if (formaPagto === 'Saldo_Cliente' && idCli && !isOrcamento) {
        const cli = bdClientes.find(c => c.id === idCli);
        if (cli && cli.credito >= total) await db.collection("clientes").doc(idCli).update({ credito: cli.credito - total });
        else { alert("O cliente não possui saldo de crédito suficiente para esta compra."); return; }
    }

    const pedido = {
        clienteNome: clienteInput.split(' | ')[0] || 'Consumidor Final', clienteId: idCli || '', itens: carrinho,
        subtotal: parseFloat(document.getElementById('subtotalCart').innerText.replace('R$ ', '')), frete: parseFloat(document.getElementById('cartFreteValor').value) || 0, desconto: parseFloat(document.getElementById('cartDesconto').value) || 0, total: total, valorPago: valorPago, saldoDevedor: saldoDevedor, formaPagamento: formaPagto, parcelas: formaPagto === 'Credito_Parcelado' ? document.getElementById('cartParcelas').value : 1, entrega: document.getElementById('cartEntrega').value, dataEntrega: document.getElementById('cartDataEntrega').value || null, linkArte: document.getElementById('cartLinkArte').value.trim() || null, status: isOrcamento ? 'Orçamento' : (saldoDevedor > 0 ? 'Aguardando pagamento' : 'Em produção'), data: new Date(), arquivado: false, vendedor: usuarioAtual ? usuarioAtual.nome : 'Sistema', historicoPagamentos: valorPago > 0 && !isOrcamento ?[{ data: new Date().toISOString(), valor: valorPago, forma: formaPagto }] :[]
    };

    try {
        const docRef = await db.collection("pedidos").add(pedido); alert(isOrcamento ? "Orçamento gerado com sucesso!" : "Pedido salvo com sucesso!");
        if(isOrcamento || isImprimir) { if(isOrcamento) imprimirOrcamento(docRef.id, pedido); else imprimirRecibo(docRef.id, pedido); }
        carrinho =[]; renderCarrinho(); document.getElementById('cartClienteInput').value = ''; document.getElementById('cartClienteId').value = ''; document.getElementById('cartDataEntrega').value = ''; document.getElementById('cartLinkArte').value = ''; document.getElementById('cartFreteValor').value = 0; document.getElementById('cartDesconto').value = 0; document.getElementById('cartValorPago').value = 0; atualizarInfoCreditoCarrinho();
    } catch (e) { alert("Erro ao salvar pedido no banco de dados."); }
}

function renderFinanceiro() {
    const dataFiltroInput = document.getElementById('finDataFiltro'); if(!dataFiltroInput || !dataFiltroInput.value) return;
    const dataEscolhida = dataFiltroInput.value; let totalEntradas = 0, totalSaidas = 0; let pagamentosPorForma = {}; let listaMovimentos =[];

    bdPedidos.forEach(p => {
        if(p.historicoPagamentos && p.historicoPagamentos.length > 0) {
            p.historicoPagamentos.forEach(pg => {
                if(pg.data.substring(0, 10) === dataEscolhida) {
                    totalEntradas += pg.valor; if(!pagamentosPorForma[pg.forma]) pagamentosPorForma[pg.forma] = 0; pagamentosPorForma[pg.forma] += pg.valor;
                    listaMovimentos.push({ tipo: 'entrada', dataObj: new Date(pg.data), hora: new Date(pg.data).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), desc: `Recebimento - Pedido ${p.id.substring(0,6)} (${p.clienteNome || 'Cliente'})`, valor: pg.valor, forma: pg.forma });
                }
            });
        }
    });

    bdDespesas.forEach(d => {
        if(!d.data) return; const dObj = d.data.toDate ? d.data.toDate() : new Date(d.data);
        if(dObj.toISOString().substring(0, 10) === dataEscolhida) {
            totalSaidas += d.valor || 0; listaMovimentos.push({ tipo: 'saida', dataObj: dObj, hora: dObj.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), desc: `${d.descricao} (${d.categoria})`, valor: d.valor || 0 });
        }
    });

    document.getElementById('finEntradas').innerText = `R$ ${totalEntradas.toFixed(2)}`; document.getElementById('finSaidas').innerText = `R$ ${totalSaidas.toFixed(2)}`; document.getElementById('finSaldo').innerText = `R$ ${(totalEntradas - totalSaidas).toFixed(2)}`;
    
    const divResumo = document.getElementById('resumoPagamentos');
    if(divResumo) { const arrFormas = Object.keys(pagamentosPorForma).map(f => `<div class="bg-slate-50 p-3 rounded border border-slate-100 flex-1 min-w-[120px]"><p class="text-[9px] text-slate-400 uppercase mb-1">${f.replace('_', ' ')}</p><p class="text-sm font-black text-slate-700">R$ ${pagamentosPorForma[f].toFixed(2)}</p></div>`); divResumo.innerHTML = arrFormas.length > 0 ? arrFormas.join('') : '<p class="text-[10px] text-slate-400">Nenhuma entrada registrada neste dia.</p>'; }

    listaMovimentos.sort((a, b) => b.dataObj - a.dataObj); const tbody = document.getElementById('listaFinanceiroTab');
    if(tbody) { tbody.innerHTML = listaMovimentos.length === 0 ? `<tr><td colspan="3" class="p-4 text-center text-slate-400">Sem movimentações.</td></tr>` : listaMovimentos.map(m => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-500">${m.hora}</td><td class="p-3 text-slate-700 font-bold">${m.desc} ${m.forma ? `<span class="bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded text-[8px] uppercase ml-2">${m.forma.replace('_',' ')}</span>` : ''}</td><td class="p-3 text-right font-black ${m.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}">${m.tipo === 'entrada' ? '+' : '-'} R$ ${m.valor.toFixed(2)}</td></tr>`).join(''); }
}

async function salvarDespesa() { const desc = document.getElementById('finDesc').value.trim(); const cat = document.getElementById('finCategoria').value; const valor = parseFloat(document.getElementById('finValor').value); if(!desc || !valor || valor <= 0) { alert("Preencha a descrição e um valor válido!"); return; } try { await db.collection("despesas").add({ descricao: desc, categoria: cat, valor: valor, data: new Date(), usuario: usuarioAtual ? usuarioAtual.nome : 'Admin' }); document.getElementById('finDesc').value = ''; document.getElementById('finValor').value = ''; alert("Saída registrada com sucesso!"); } catch(e) { alert("Erro ao salvar despesa."); } }

function renderAReceber() {
    const tbody = document.getElementById('listaAReceberTab'); if(!tbody) return;
    const pendentes = bdPedidos.filter(p => p.saldoDevedor > 0 && p.status !== 'Orçamento' && p.status !== 'Cancelado / Estorno');
    let clientesDevedores = {};
    pendentes.forEach(p => { const cli = p.clienteNome || 'Cliente'; if(!clientesDevedores[cli]) clientesDevedores[cli] = { ids:[], totalDevido: 0 }; clientesDevedores[cli].ids.push(p.id); clientesDevedores[cli].totalDevido += p.saldoDevedor; });
    const arrCli = Object.keys(clientesDevedores).map(nome => ({ nome, dados: clientesDevedores[nome] })).sort((a,b) => b.dados.totalDevido - a.dados.totalDevido);
    tbody.innerHTML = arrCli.length === 0 ? `<tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum cliente com saldo devedor.</td></tr>` : arrCli.map(c => `<tr class="border-b border-slate-50"><td class="p-4 text-slate-700 font-bold">${c.nome}</td><td class="p-4 text-center text-slate-500 font-bold"><span class="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">${c.dados.ids.length} pedido(s)</span></td><td class="p-4 text-right font-black text-red-600">R$ ${c.dados.totalDevido.toFixed(2)}</td><td class="p-4 text-center"><button type="button" onclick="abrirHistoricoCliente('${c.nome}')" class="bg-slate-200 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-300 transition text-[10px] font-bold uppercase tracking-widest"><i class="fa fa-search"></i> Ver Pedidos</button></td></tr>`).join('');
}

function receberSaldo(idPedido) { const p = bdPedidos.find(x => x.id === idPedido); if(!p) return; document.getElementById('recSaldoIdPedido').value = p.id; document.getElementById('recSaldoValor').value = p.saldoDevedor.toFixed(2); document.getElementById('modalReceberSaldo').classList.remove('hidden'); }
async function confirmarRecebimentoSaldo() {
    const id = document.getElementById('recSaldoIdPedido').value; const valorDigitado = parseFloat(document.getElementById('recSaldoValor').value) || 0; const forma = document.getElementById('recSaldoForma').value;
    const p = bdPedidos.find(x => x.id === id); if(!p) return; if(valorDigitado <= 0 || valorDigitado > p.saldoDevedor) { alert("Valor inválido."); return; }
    const novoSaldo = p.saldoDevedor - valorDigitado; const novoValorPago = p.valorPago + valorDigitado;
    let hist = p.historicoPagamentos ||[]; hist.push({ data: new Date().toISOString(), valor: valorDigitado, forma: forma });
    let novoStatus = p.status; if(novoSaldo <= 0 && p.status === 'Aguardando pagamento') novoStatus = 'Em produção';
    try { await db.collection("pedidos").doc(id).update({ saldoDevedor: novoSaldo, valorPago: novoValorPago, historicoPagamentos: hist, status: novoStatus }); document.getElementById('modalReceberSaldo').classList.add('hidden'); alert("Pagamento recebido e registrado no caixa!"); } catch(e) { alert("Erro ao receber saldo."); }
}

function abrirHistoricoGeral() { document.getElementById('modalHistoricoGeral').classList.remove('hidden'); renderHistoricoGeral(); }
function renderHistoricoGeral() {
    const busca = document.getElementById('buscaHistoricoGeral').value.toLowerCase(); const tbody = document.getElementById('listaHistoricoGeral');
    let filtrados = bdPedidos.filter(p => (p.clienteNome||'').toLowerCase().includes(busca) || p.id.toLowerCase().includes(busca) || p.status.toLowerCase().includes(busca));
    tbody.innerHTML = filtrados.slice(0, 100).map(p => { const dObj = p.data && p.data.toDate ? p.data.toDate() : new Date(p.data||0); return `<tr class="border-b border-slate-50 hover:bg-slate-50"><td class="p-3 text-slate-500 text-[10px] uppercase font-bold">${dObj.toLocaleDateString('pt-BR')} <br/><span class="text-indigo-400">${p.id.substring(0,6)}</span></td><td class="p-3 text-slate-700 font-bold">${p.clienteNome || 'Cliente'}</td><td class="p-3"><span class="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[9px] uppercase font-black">${p.status}</span></td><td class="p-3 text-right font-black text-slate-800">R$ ${(p.total||0).toFixed(2)}</td><td class="p-3 text-center"><button type="button" onclick="abrirDetalhesPedido('${p.id}')" class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-[10px] uppercase font-bold hover:bg-indigo-200">Detalhes</button></td></tr>`; }).join('');
}

function abrirHistoricoCliente(nomeCli) { document.getElementById('histNomeCli').innerText = `Histórico: ${nomeCli}`; const peds = bdPedidos.filter(p => p.clienteNome === nomeCli).sort((a,b) => (b.data.toDate?b.data.toDate():new Date(b.data)) - (a.data.toDate?a.data.toDate():new Date(a.data))); document.getElementById('corpoHistoricoCli').innerHTML = peds.map(p => gerarCardPedido(p)).join(''); document.getElementById('modalHistoricoCli').classList.remove('hidden'); }

function abrirDetalhesPedido(id) {
    const p = bdPedidos.find(x => x.id === id); if(!p) return;
    const div = document.getElementById('corpoDetalhesPedido');
    let histHtml = (p.historicoPagamentos && p.historicoPagamentos.length > 0) ? p.historicoPagamentos.map(h => `<li class="flex justify-between border-b border-slate-100 py-1"><span>${new Date(h.data).toLocaleDateString('pt-BR')} - ${h.forma.replace('_',' ')}</span> <span class="font-bold text-emerald-600">R$ ${h.valor.toFixed(2)}</span></li>`).join('') : '<li class="text-slate-400 italic">Nenhum pagamento registrado.</li>';
    let itensHtml = p.itens ? p.itens.map(i => `<div class="bg-white p-3 rounded border border-slate-200 shadow-sm"><div class="flex justify-between items-start"><p class="font-bold text-sm text-slate-800">${i.qtdCarrinho || i.qtd || 1}x ${i.nome}</p><p class="font-black text-indigo-600">R$ ${(i.valor||0).toFixed(2)}</p></div><p class="text-xs text-slate-500">${i.desc || ''}</p></div>`).join('') : '<p>Sem itens</p>';

    div.innerHTML = `<div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-100 mb-4"><div><p class="text-[10px] text-slate-400 uppercase font-bold">Cliente</p><p class="font-black text-slate-800 text-lg">${p.clienteNome || 'Cliente'}</p></div><div class="text-right"><p class="text-[10px] text-slate-400 uppercase font-bold">ID / Status</p><p class="font-black text-indigo-600">${p.id.substring(0,8)} - ${p.status}</p></div></div><h4 class="font-bold text-slate-700 uppercase tracking-widest text-[10px] mb-2 border-b pb-1">Itens do Pedido</h4><div class="space-y-2 mb-4">${itensHtml}</div><div class="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-4"><div><h4 class="font-bold text-slate-700 uppercase tracking-widest text-[10px] mb-2 border-b pb-1">Histórico de Pagamentos</h4><ul class="text-xs text-slate-600">${histHtml}</ul>${p.linkArte ? `<div class="mt-4"><a href="${p.linkArte}" target="_blank" class="bg-blue-100 text-blue-700 px-4 py-2 rounded font-bold text-xs uppercase hover:bg-blue-200 transition inline-block"><i class="fa fa-link"></i> Abrir Arte Anexada</a></div>` : ''}</div><div class="bg-slate-800 text-white p-4 rounded shadow-md text-sm space-y-1"><div class="flex justify-between"><span class="text-slate-300">Subtotal</span> <span>R$ ${(p.subtotal||0).toFixed(2)}</span></div><div class="flex justify-between"><span class="text-slate-300">Frete / Taxas</span> <span>R$ ${(p.frete || 0) + (p.taxaPgto || 0)}</span></div><div class="flex justify-between"><span class="text-slate-300">Desconto</span> <span class="text-red-400">- R$ ${(p.desconto || 0).toFixed(2)}</span></div><div class="flex justify-between border-t border-slate-600 pt-2 mt-2 font-black text-lg"><span class="text-emerald-400">Total</span> <span class="text-emerald-400">R$ ${(p.total||0).toFixed(2)}</span></div><div class="flex justify-between font-black"><span class="text-red-400">Falta Pagar</span> <span class="text-red-400">R$ ${(p.saldoDevedor||0).toFixed(2)}</span></div></div></div><div class="mt-4 flex gap-2 justify-end">${p.saldoDevedor > 0 ? `<button type="button" onclick="receberSaldo('${p.id}')" class="bg-emerald-600 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-emerald-700">Receber Saldo</button>` : ''}<button type="button" onclick="${p.status==='Orçamento' ? `imprimirOrcamento('${p.id}')` : `imprimirRecibo('${p.id}')`}" class="bg-slate-200 text-slate-700 px-4 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-300"><i class="fa fa-print"></i> Re-imprimir PDF</button></div>`;
    document.getElementById('modalDetalhesPedido').classList.remove('hidden');
}

function gerarPixPayload(chave, valor, nome = "GVA Grafica", cidade = "Brasil") {
    if(!chave) return "";
    let payloadFormat = "000201"; let merchantAccount = "0014BR.GOV.BCB.PIX" + `01${chave.length.toString().padStart(2, '0')}${chave}`;
    let merchantAccLen = merchantAccount.length.toString().padStart(2, '0');
    let p1 = `${payloadFormat}26${merchantAccLen}${merchantAccount}520400005303986`;
    if (valor > 0) p1 += `54${valor.toFixed(2).length.toString().padStart(2, '0')}${valor.toFixed(2)}`;
    p1 += `5802BR59${nome.length.toString().padStart(2, '0')}${nome}60${cidade.length.toString().padStart(2, '0')}${cidade}62070503***6304`;
    let crc = 0xFFFF; for (let c = 0; c < p1.length; c++) { crc ^= p1.charCodeAt(c) << 8; for (let i = 0; i < 8; i++) { if (crc & 0x8000) crc = (crc << 1) ^ 0x1021; else crc = crc << 1; } }
    return p1 + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function gerarCorpoPDF(p, tipoDoc) {
    const dataFormatada = p.data && p.data.toDate ? p.data.toDate().toLocaleString('pt-BR') : new Date(p.data||0).toLocaleString('pt-BR');
    let htmlEmpresa = `<div class="mb-4 p-4 border border-slate-300 bg-slate-50 text-xs"><strong>GVA Gráfica (Venom Arts)</strong><br/>Telefone/WhatsApp: (Seu Contato Aqui)</div>`;
    let itensHtml = p.itens ? p.itens.map(i => `<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px;"><strong>${i.qtdCarrinho || i.qtd || 1}x</strong></td><td style="padding: 8px;"><strong>${i.nome}</strong><br/><span style="font-size: 10px; color: #64748b;">${i.desc || ''}</span></td><td style="padding: 8px; text-align: right; font-weight: bold;">R$ ${(i.valor||0).toFixed(2)}</td></tr>`).join('') : '';

    let htmlPix = "";
    if (bdEmpresa.pix && (tipoDoc === 'Orçamento' || p.saldoDevedor > 0)) {
        const valorPix = tipoDoc === 'Orçamento' ? p.total : p.saldoDevedor;
        const payload = gerarPixPayload(bdEmpresa.pix, valorPix, "GVA Grafica", "BR");
        const qrCodeUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(payload)}`;
        htmlPix = `<div style="margin-top: 20px; padding: 15px; border: 2px dashed #cbd5e1; text-align: center; border-radius: 8px;"><p style="font-weight: bold; margin-bottom: 10px; text-transform: uppercase; font-size: 12px;">Pague via PIX (QR Code)</p><img src="${qrCodeUrl}" alt="QR Code PIX" style="width: 120px; height: 120px; margin-bottom: 10px;" /><p style="font-size: 11px;">Chave PIX: <strong>${bdEmpresa.pix}</strong></p><p style="font-size: 11px;">Banco: ${bdEmpresa.banco || '-'} | Ag: ${bdEmpresa.agencia || '-'} | CC: ${bdEmpresa.conta || '-'}</p><p style="font-size: 14px; font-weight: 900; margin-top: 5px; color: #dc2626;">Valor a pagar: R$ ${(valorPix||0).toFixed(2)}</p></div>`;
    }

    return `<html><head><title>${tipoDoc} - ${p.id.substring(0,8)}</title><style>body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 800px; margin: auto; } h1 { text-transform: uppercase; font-size: 24px; margin-bottom: 5px; color: #0f172a; } .header-flex { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; } .text-right { text-align: right; } table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; } th { background-color: #f1f5f9; padding: 10px; text-align: left; text-transform: uppercase; font-size: 10px; color: #64748b; } .totals-box { width: 300px; float: right; background: #f8fafc; padding: 15px; border-radius: 5px; font-size: 12px; } .flex-row { display: flex; justify-content: space-between; margin-bottom: 5px; } .clear { clear: both; }</style></head><body onload="setTimeout(() => { window.print(); window.close(); }, 500)"><div class="header-flex"><div><h1>${tipoDoc}</h1><p style="margin: 0; font-size: 12px; font-weight: bold;">ID: ${p.id}</p><p style="margin: 0; font-size: 12px;">Data: ${dataFormatada}</p>${p.dataEntrega ? `<p style="margin: 0; font-size: 12px; color: #d97706; font-weight: bold; margin-top: 5px;">Data Prometida: ${new Date(p.dataEntrega).toLocaleString('pt-BR')}</p>` : ''}</div><div class="text-right" style="font-size: 12px;"><p style="margin: 0;"><strong>Cliente:</strong> ${p.clienteNome || 'Cliente'}</p><p style="margin: 0;"><strong>Vendedor:</strong> ${p.vendedor || 'Sistema'}</p></div></div>${htmlEmpresa}<table><thead><tr><th>Qtd</th><th>Descrição do Serviço</th><th style="text-align: right;">Total Item</th></tr></thead><tbody>${itensHtml}</tbody></table><div class="totals-box"><div class="flex-row"><span>Subtotal:</span> <span>R$ ${(p.subtotal||0).toFixed(2)}</span></div><div class="flex-row"><span>Descontos:</span> <span style="color:red">- R$ ${(p.desconto || 0).toFixed(2)}</span></div><div class="flex-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-weight: 900; font-size: 16px;"><span>TOTAL:</span> <span>R$ ${(p.total||0).toFixed(2)}</span></div>${tipoDoc === 'Recibo' ? `<div class="flex-row" style="margin-top: 10px; color: #16a34a; font-weight: bold;"><span>Valor Pago:</span> <span>R$ ${(p.valorPago||0).toFixed(2)}</span></div><div class="flex-row" style="color: #dc2626; font-weight: bold;"><span>Saldo Devedor:</span> <span>R$ ${(p.saldoDevedor||0).toFixed(2)}</span></div>` : ''}</div><div class="clear"></div>${htmlPix}<div style="margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px;">Gerado por GVAsist ERP - Sistema Gráfico</div></body></html>`;
}

function imprimirOrcamento(id, pedidoDireto = null) { const p = pedidoDireto || bdPedidos.find(x => x.id === id); if(!p) return; const win = window.open('', '_blank'); win.document.write(gerarCorpoPDF(p, 'Orçamento')); win.document.close(); }
function imprimirRecibo(id, pedidoDireto = null) { const p = pedidoDireto || bdPedidos.find(x => x.id === id); if(!p) return; const win = window.open('', '_blank'); win.document.write(gerarCorpoPDF(p, 'Recibo')); win.document.close(); }
function imprimirEtiqueta(id, tamanho) { const p = bdPedidos.find(x => x.id === id); if(!p) return; const win = window.open('', '_blank', 'width=400,height=300'); win.document.write(`<html><head><style>@page { margin: 0; } body { margin: 0; padding: 10px; font-family: Arial, sans-serif; width: 10cm; height: 6cm; display: flex; flex-direction: column; justify-content: center; text-align: center; border: 1px solid #ccc; box-sizing: border-box; } h2 { margin: 0; font-size: 16px; text-transform: uppercase; } h1 { margin: 5px 0; font-size: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } p { margin: 3px 0; font-size: 12px; } .id-code { font-size: 10px; letter-spacing: 2px; }</style></head><body onload="window.print(); window.close();"><h2>GVA Gráfica</h2><h1>${p.clienteNome || 'Cliente'}</h1><p><strong>Total:</strong> R$ ${(p.total||0).toFixed(2)} | <strong>Falta:</strong> R$ ${(p.saldoDevedor||0).toFixed(2)}</p>${p.dataEntrega ? `<p><strong>Entregar:</strong> ${new Date(p.dataEntrega).toLocaleString('pt-BR')}</p>` : ''}<p class="id-code">PED: ${p.id.substring(0,8).toUpperCase()}</p></body></html>`); win.document.close(); }
