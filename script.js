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
let bdEmpresa = {}; // NOVO: Guarda os dados do PIX/Banco
let usuarioAtual=null, filtroSetor='Todos', filtroCategoria='Todas', filtroSubcategoria='Todas';
const STATUSES=["Orçamento","Aguardando pagamento","Em produção","Acabamento","Pronto para Retirada","Entregue","Cancelado / Estorno"];
auth.onAuthStateChanged(async user => {
const telaLogin = document.getElementById('telaLogin'), appInterface = document.getElementById('appInterface'), btnEntrar = document.getElementById('btnEntrar');
if (user) {
const hoje = new Date().toDateString();
const ultimoAcesso = localStorage.getItem('dataUltimoAcesso');
if (ultimoAcesso && ultimoAcesso !== hoje) {
auth.signOut(); localStorage.removeItem('dataUltimoAcesso'); return;
}
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
}
else if (role === 'vendedor') {
[...btnLoja, ...btnProducao, ...btnFinanceiro, ...btnConfig].forEach(b => b.classList.remove('hidden'));
if(btnSubCli) btnSubCli.classList.remove('hidden');
if(btnSubAReceber) btnSubAReceber.classList.remove('hidden');
mudarAba('loja'); mudarSubAba('sub-cli');
}
else if (role === 'producao') {[...btnProducao].forEach(b => b.classList.remove('hidden')); mudarAba('producao');
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
// --- DASHBOARD ---
function renderDashboard() {
const dashMesInput = document.getElementById('dashMesFiltro'); if (!dashMesInput || !dashMesInput.value) return;
const mesSelecionado = dashMesInput.value; let faturamento = 0, despesas = 0, produtosVendidos = {}, clientesCompras = {}, despesasCat = {};
bdPedidos.forEach(p => {
if (!p.data) return; const dataStr = (p.data.toDate ? p.data.toDate() : new Date(p.data)).toISOString().slice(0, 7);
if (dataStr === mesSelecionado && p.status !== 'Cancelado / Estorno' && p.status !== 'Orçamento') {
faturamento += p.total; const cliNome = p.clienteNome || "Consumidor Final";
if (!clientesCompras[cliNome]) clientesCompras[cliNome] = 0; clientesCompras[cliNome] += p.total;
p.itens.forEach(item => {
const nomeProd = item.nome.split(' (')[0]; if (!produtosVendidos[nomeProd]) produtosVendidos[nomeProd] = { qtd: 0, valor: 0 };
let qtdNum = parseInt(item.qtdCarrinho); if (isNaN(qtdNum)) qtdNum = 1; let valNum = parseFloat(item.valor); if (isNaN(valNum)) valNum = 0;
produtosVendidos[nomeProd].qtd += qtdNum; produtosVendidos[nomeProd].valor += valNum;
});
}
});
bdDespesas.forEach(d => {
if (!d.data) return; const dataStr = (d.data.toDate ? d.data.toDate() : new Date(d.data)).toISOString().slice(0, 7);
if (dataStr === mesSelecionado) {
despesas += d.valor;
let cat = d.categoria || 'Outros';
if(!despesasCat[cat]) despesasCat[cat] = 0;
despesasCat[cat] += d.valor;
}
});
document.getElementById('dashFaturamento').innerText = R$${faturamento.toFixed(2)}; document.getElementById('dashDespesas').innerText = R$${despesas.toFixed(2)}; document.getElementById('dashLucro').innerText = R$${(faturamento - despesas).toFixed(2)};
const arrayProdutos = Object.keys(produtosVendidos).map(nome => ({ nome: nome, qtd: produtosVendidos[nome].qtd, valor: produtosVendidos[nome].valor })).sort((a, b) => b.valor - a.valor).slice(0, 5);
document.getElementById('listaTopProdutosTab').innerHTML = arrayProdutos.length === 0 ? <tr><td colspan="3" class="p-4 text-center text-slate-400 text-xs">Nenhuma venda no período.</td></tr> : arrayProdutos.map(p => <tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${p.nome}${p.qtd}</td><td class="p-3 text-right text-emerald-600 font-black">R$${p.valor.toFixed(2)}</td></tr>).join('');
const arrayClientes = Object.keys(clientesCompras).map(nome => ({ nome: nome, valor: clientesCompras[nome] })).sort((a, b) => b.valor - a.valor).slice(0, 5);
document.getElementById('listaTopClientesTab').innerHTML = arrayClientes.length === 0 ? <tr><td colspan="2" class="p-4 text-center text-slate-400 text-xs">Nenhuma venda no período.</td></tr> : arrayClientes.map(c => <tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${c.nome}R$ ${c.valor.toFixed(2)}`).join('');
const arrayDespCat = Object.keys(despesasCat).map(c => ({ cat: c, val: despesasCat[c] })).sort((a,b) => b.val - a.val);
const tabDespCat = document.getElementById('listaDespesasCatTab');
if(tabDespCat) {
tabDespCat.innerHTML = arrayDespCat.length === 0 ? <tr><td colspan="2" class="p-4 text-center text-slate-400 text-xs">Nenhuma despesa no período.</td></tr> :
arrayDespCat.map(d => <tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${d.cat}R{d.val.toFixed(2)}`).join('');
}
}
// --- ORÇAMENTOS (FOLLOW-UP) ---
function renderOrcamentos() {
const tbody = document.getElementById('listaOrcamentosTab');
if(!tbody) return;
const orcamentos = bdPedidos.filter(p => p.status === 'Orçamento' && !p.arquivado).sort((a,b) => b.data.toDate() - a.data.toDate());
tbody.innerHTML = orcamentos.length === 0 ? <tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum orçamento pendente.</td></tr> : orcamentos.map(p => {
const dataObj = p.data.toDate ? p.data.toDate() : new Date(p.data);
const dataFormatada = dataObj.toLocaleDateString('pt-BR');
const dias = Math.floor((new Date() - dataObj) / (1000 * 60 * 60 * 24));
let badgeDias = dias > 2 ? <span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] uppercase ml-2 font-black">${dias} dias pendente:Novo`;
return <tr class="border-b border-slate-50 hover:bg-slate-50"> <td class="p-3 text-slate-500 font-medium">${dataFormatada} 
 {p.clienteNome}   {p.id}', 'orcamento')" class="bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 transition text-[10px] font-bold uppercase tracking-widest"> Cobrar



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
html += <div class="bg-slate-100 rounded-xl p-2 w-12 flex-shrink-0 flex flex-col items-center border border-slate-200 opacity-50 hover:opacity-100 transition cursor-default h-full"><span class="bg-slate-200 text-slate-500 text-[10px] font-black px-2 py-1 rounded-full mb-4">0</span><h3 class="font-bold text-slate-400 uppercase text-[10px] tracking-widest vertical-text whitespace-nowrap">${status}; } else { html +=
 {pedidosDoStatus.length}
${pedidosDoStatus.map(p => gerarCardPedido(p)).join('')}</div></div>;
}
});
container.innerHTML = html;
}
function gerarCardPedido(p) {
const dataFormatada = p.data.toDate().toLocaleDateString('pt-BR') + ' ' + p.data.toDate().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
let options = STATUSES.map(s => <option value="${s}"  {s}`).join('');
let corBorda = 'border-l-slate-400';
if(p.status === 'Orçamento') corBorda = 'border-l-blue-400'; else if(p.status === 'Aguardando pagamento') corBorda = 'border-l-amber-400'; else if(p.status === 'Em produção') corBorda = 'border-l-blue-500'; else if(p.status === 'Acabamento') corBorda = 'border-l-indigo-500'; else if(p.status === 'Pronto para Retirada') corBorda = 'border-l-emerald-400'; else if(p.status === 'Entregue') corBorda = 'border-l-emerald-600'; else if(p.status === 'Cancelado / Estorno') corBorda = 'border-l-red-500';
let btnArquivar = (p.status === 'Entregue' || p.status === 'Cancelado / Estorno') ? <button type="button" onclick="arquivarPedido('${p.id}')" class="bg-slate-200 text-slate-600 px-3 rounded hover:bg-slate-300 transition" title="Arquivar Pedido">: ''; let visualizaPrecos = (!usuarioAtual || usuarioAtual.role !== 'producao'); let btnReceber = (visualizaPrecos && p.saldoDevedor > 0) ?: ''; let btnZAP = !visualizaPrecos ? '' :; let btnImprimir = !visualizaPrecos ? '' :; let btnEtiqueta =; let etiquetaFalta = (p.saldoDevedor > 0 && visualizaPrecos) ?
FALTA R{p.saldoDevedor.toFixed(2)}
` : '';
// NOVO: Info Extra (Data Prometida e Link da Arte)
let infoExtra = '';
if(p.dataEntrega) {
const dt = new Date(p.dataEntrega).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
infoExtra += <p class="text-amber-600 font-bold mt-1 text-[10px]"><i class="fa fa-clock"></i> Prometido: ${dt}
; } if(p.linkArte) { infoExtra += Abrir Arte
`;
}
return <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 border-l-4 ${corBorda} relative mt-2">${etiquetaFalta}<div class="flex justify-between items-start mb-2"><span class="text-[9px] font-bold text-slate-400">${dataFormatada}${visualizaPrecos ? 'R$ ' + p.total.toFixed(2) : ''}
${p.clienteNome}</h4><div class="text-[9px] text-slate-500 mb-3 space-y-1">${p.itens.map(i => <p>•${i.qtdCarrinho}x  {i.desc})
).join('')}${infoExtra}
{options}</select>{btnReceber}{btnEtiqueta}{btnArquivar}{btnZAP}{btnImprimir}`;}async function mudarStatusPedido(id, novoStatus) {try {const pedidoRef = db.collection("pedidos").doc(id); const doc = await pedidoRef.get(); if (!doc.exists) return; const p = doc.data();await pedidoRef.update({ status: novoStatus });if (novoStatus === 'Cancelado / Estorno' && p.valorPago > 0) {await db.collection("despesas").add({ descricao: ESTORNO - Pedido: ${p.clienteNome}, valor: p.valorPago, categoria: 'Outros', data: new Date() }); alert(Pedido cancelado! Um estorno de R$ ${p.valorPago.toFixed(2)} foi registrado nas Saídas do Financeiro.);}} catch(e) { alert("Erro ao atualizar status."); }}async function arquivarPedido(id) { if(confirm("Deseja remover este pedido do painel de produção? Ele continuará salvo no histórico e financeiro.")) { try { await db.collection("pedidos").doc(id).update({ arquivado: true }); } catch(e) { alert("Erro ao arquivar pedido."); } } }
// ==========================================
// PARTE 2.1 - NAVEGAÇÃO E VITRINE DA LOJA
// ==========================================

// --- NAVEGAÇÃO DE ABAS ---
function mudarAba(abaId) {
    const abas =['tela-loja', 'tela-producao', 'tela-financeiro', 'tela-config', 'tela-dashboard'];
    abas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const abaAtiva = document.getElementById('tela-' + abaId);
    if (abaAtiva) abaAtiva.classList.remove('hidden');
}

function mudarSubAba(subAbaId) {
    const subAbas =['sub-cli', 'sub-areceber', 'sub-prod', 'sub-cat', 'sub-acab', 'sub-usuarios', 'sub-empresa'];
    subAbas.forEach(id => {
        const el = document.getElementById('tela-' + id);
        if (el) el.classList.add('hidden');
        
        const btn = document.getElementById('btn-' + id);
        if (btn) {
            btn.classList.remove('bg-slate-800', 'text-white');
            btn.classList.add('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
        }
    });
    
    const telaAtiva = document.getElementById('tela-' + subAbaId);
    if (telaAtiva) telaAtiva.classList.remove('hidden');
    
    const btnAtivo = document.getElementById('btn-' + subAbaId);
    if (btnAtivo) {
        btnAtivo.classList.remove('text-slate-400', 'hover:bg-slate-800');
        btnAtivo.classList.add('bg-slate-800', 'text-white');
    }
}

// --- VITRINE DE PRODUTOS (LOJA) ---
function setFiltroSetor(setor) { 
    filtroSetor = setor; 
    renderVitrine(); 
}

function setFiltroCategoria(cat) { 
    filtroCategoria = cat; 
    renderVitrine(); 
}

function renderVitrine() {
    const container = document.getElementById('vitrineProdutos');
    if (!container) return;
    
    let filtrados = bdProdutos;
    
    if (filtroSetor !== 'Todos') {
        filtrados = filtrados.filter(p => p.setor === filtroSetor);
    }
    if (filtroCategoria !== 'Todas') {
        filtrados = filtrados.filter(p => p.categoria === filtroCategoria);
    }

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400">Nenhum produto encontrado para este filtro.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(p => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition flex flex-col">
            <h3 class="font-bold text-slate-700 text-lg mb-1">${p.nome}</h3>
            <p class="text-xs text-slate-400 mb-3 flex-grow">${p.descricao || 'Sem descrição'}</p>
            <div class="flex justify-between items-end mt-auto">
                <span class="text-emerald-600 font-black text-xl">R$ ${parseFloat(p.precoBase).toFixed(2)}</span>
                <button onclick="abrirModalProduto('${p.id}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-bold text-sm">
                    + Add
                </button>
            </div>
        </div>
    `).join('');
}
// ==========================================
// PARTE 2.2 - CARRINHO E CHECKOUT
// ==========================================

let produtoAtualModal = null;

function abrirModalProduto(id) {
    produtoAtualModal = bdProdutos.find(p => p.id === id);
    if (!produtoAtualModal) return;

    document.getElementById('modalProdNome').innerText = produtoAtualModal.nome;
    document.getElementById('modalProdPreco').innerText = `Preço Base: R$ ${parseFloat(produtoAtualModal.precoBase).toFixed(2)}`;
    
    const inputQtd = document.getElementById('modalProdQtd');
    if(inputQtd) inputQtd.value = 1;
    
    // Renderizar acabamentos vinculados a este produto
    const divAcabamentos = document.getElementById('modalProdAcabamentos');
    if (divAcabamentos) {
        let htmlAcab = '';
        if (produtoAtualModal.acabamentos && produtoAtualModal.acabamentos.length > 0) {
            produtoAtualModal.acabamentos.forEach(acabId => {
                const acab = bdAcabamentos.find(a => a.id === acabId);
                if (acab) {
                    htmlAcab += `
                        <label class="flex items-center space-x-2 text-sm text-slate-600 mb-2 cursor-pointer">
                            <input type="checkbox" class="acabamento-checkbox form-checkbox text-blue-600 rounded" value="${acab.id}" data-preco="${acab.preco}">
                            <span>${acab.nome} (+ R$ ${parseFloat(acab.preco).toFixed(2)})</span>
                        </label>
                    `;
                }
            });
        } else {
            htmlAcab = '<p class="text-xs text-slate-400 italic">Nenhum acabamento extra disponível.</p>';
        }
        divAcabamentos.innerHTML = htmlAcab;
    }

    const modal = document.getElementById('modalProduto');
    if(modal) modal.classList.remove('hidden');
}

function fecharModalProduto() {
    const modal = document.getElementById('modalProduto');
    if(modal) modal.classList.add('hidden');
    produtoAtualModal = null;
}

function addAoCarrinho() {
    if (!produtoAtualModal) return;
    
    const inputQtd = document.getElementById('modalProdQtd');
    const qtd = inputQtd ? (parseInt(inputQtd.value) || 1) : 1;
    
    let precoTotalItem = parseFloat(produtoAtualModal.precoBase);
    let descAcabamentos =[];

    // Somar acabamentos selecionados
    const checkboxes = document.querySelectorAll('.acabamento-checkbox:checked');
    checkboxes.forEach(cb => {
        precoTotalItem += parseFloat(cb.getAttribute('data-preco'));
        const acab = bdAcabamentos.find(a => a.id === cb.value);
        if(acab) descAcabamentos.push(acab.nome);
    });

    precoTotalItem = precoTotalItem * qtd;

    let descFinal = produtoAtualModal.nome;
    if (descAcabamentos.length > 0) {
        descFinal += ` (${descAcabamentos.join(', ')})`;
    }

    carrinho.push({
        produtoId: produtoAtualModal.id,
        nome: descFinal,
        desc: descAcabamentos.join(', '),
        qtdCarrinho: qtd,
        valor: precoTotalItem
    });

    fecharModalProduto();
    renderCarrinho();
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    renderCarrinho();
}

function renderCarrinho() {
    const container = document.getElementById('listaCarrinho');
    const totalEl = document.getElementById('totalCarrinho');
    if (!container || !totalEl) return;

    if (carrinho.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm text-center py-6">Seu carrinho está vazio.</p>';
        totalEl.innerText = 'R$ 0.00';
        return;
    }

    let total = 0;
    container.innerHTML = carrinho.map((item, index) => {
        total += item.valor;
        return `
            <div class="flex justify-between items-center border-b border-slate-100 py-3">
                <div>
                    <p class="text-sm font-bold text-slate-700">${item.qtdCarrinho}x ${item.nome}</p>
                    <p class="text-xs text-emerald-600 font-bold mt-1">R$ ${item.valor.toFixed(2)}</p>
                </div>
                <button onclick="removerDoCarrinho(${index})" class="text-red-400 hover:text-red-600 p-2 transition" title="Remover">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');

    totalEl.innerText = `R$ ${total.toFixed(2)}`;
}

function renderCliSelectCart() {
    const select = document.getElementById('cartCliente');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione o Cliente...</option>' + 
        bdClientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}

async function finalizarPedido(isOrcamento = false) {
    if (carrinho.length === 0) {
        alert("O carrinho está vazio! Adicione produtos primeiro.");
        return;
    }

    const clienteId = document.getElementById('cartCliente').value;
    if (!clienteId && !isOrcamento) {
        alert("Por favor, selecione um cliente para fechar o pedido.");
        return;
    }

    const clienteObj = bdClientes.find(c => c.id === clienteId) || { nome: "Consumidor Final", telefone: "" };
    
    const valorPagoInput = document.getElementById('cartValorPago');
    const valorPago = valorPagoInput ? parseFloat(valorPagoInput.value) || 0 : 0;
    
    const dataEntregaInput = document.getElementById('cartDataEntrega');
    const dataEntrega = dataEntregaInput && dataEntregaInput.value ? dataEntregaInput.value : null;

    const linkArteInput = document.getElementById('cartLinkArte');
    const linkArte = linkArteInput ? linkArteInput.value : "";

    let totalPedido = carrinho.reduce((acc, item) => acc + item.valor, 0);
    let saldoDevedor = totalPedido - valorPago;
    if (saldoDevedor < 0) saldoDevedor = 0;

    // Define o status inicial baseado no pagamento
    let statusInicial = isOrcamento ? 'Orçamento' : (valorPago >= totalPedido ? 'Em produção' : 'Aguardando pagamento');

    const novoPedido = {
        clienteId: clienteId || "",
        clienteNome: clienteObj.nome,
        clienteTelefone: clienteObj.telefone || "",
        itens: carrinho,
        total: totalPedido,
        valorPago: valorPago,
        saldoDevedor: saldoDevedor,
        status: statusInicial,
        data: new Date(),
        dataEntrega: dataEntrega,
        linkArte: linkArte,
        arquivado: false,
        vendedor: usuarioAtual ? usuarioAtual.nome : 'Desconhecido'
    };

    try {
        // Mostra um aviso de carregamento no botão (opcional, mas bom para UX)
        document.body.style.cursor = 'wait';
        
        await db.collection("pedidos").add(novoPedido);
        
        alert(isOrcamento ? "Orçamento salvo com sucesso!" : "Pedido finalizado com sucesso!");
        
        // Limpar carrinho e formulário
        carrinho =
