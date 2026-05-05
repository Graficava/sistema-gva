// ==========================================
// PARTE 1 - CONFIGURAÇÃO, LOGIN, NAVEGAÇÃO E DASHBOARD
// ==========================================
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
let produtoAtualModal = null;

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
            else { 
                usuarioAtual = { nome: user.email.split('@')[0], email: user.email, role: "admin" }; 
                await db.collection("usuarios").doc(user.email).set(usuarioAtual); 
            }
        } catch (error) { 
            usuarioAtual = { nome: user.email.split('@')[0], email: user.email, role: "admin" }; 
        }
        
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
    else if (role === 'vendedor') {[...btnLoja, ...btnProducao, ...btnFinanceiro, ...btnConfig].forEach(b => b.classList.remove('hidden'));
        if(btnSubCli) btnSubCli.classList.remove('hidden');
        if(btnSubAReceber) btnSubAReceber.classList.remove('hidden');
        mudarAba('loja'); mudarSubAba('sub-cli');
    }
    else if (role === 'producao') {
        [...btnProducao].forEach(b => b.classList.remove('hidden')); mudarAba('producao');
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
                let qtdNum = parseInt(item.qtdCarrinho) || 1; let valNum = parseFloat(item.valor) || 0;
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
    
    document.getElementById('dashFaturamento').innerText = `R$ ${faturamento.toFixed(2)}`; 
    document.getElementById('dashDespesas').innerText = `R$ ${despesas.toFixed(2)}`; 
    document.getElementById('dashLucro').innerText = `R$ ${(faturamento - despesas).toFixed(2)}`;
    
    const arrayProdutos = Object.keys(produtosVendidos).map(nome => ({ nome: nome, qtd: produtosVendidos[nome].qtd, valor: produtosVendidos[nome].valor })).sort((a, b) => b.valor - a.valor).slice(0, 5);
    document.getElementById('listaTopProdutosTab').innerHTML = arrayProdutos.length === 0 ? `<tr><td colspan="3" class="p-4 text-center text-slate-400 text-xs">Nenhuma venda no período.</td></tr>` : arrayProdutos.map(p => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${p.nome}</td><td class="p-3 text-center text-slate-500">${p.qtd}</td><td class="p-3 text-right text-emerald-600 font-black">R$ ${p.valor.toFixed(2)}</td></tr>`).join('');
    
    const arrayClientes = Object.keys(clientesCompras).map(nome => ({ nome: nome, valor: clientesCompras[nome] })).sort((a, b) => b.valor - a.valor).slice(0, 5);
    document.getElementById('listaTopClientesTab').innerHTML = arrayClientes.length === 0 ? `<tr><td colspan="2" class="p-4 text-center text-slate-400 text-xs">Nenhuma venda no período.</td></tr>` : arrayClientes.map(c => `<tr class="border-b border-slate-50"><td class="p-3 text-slate-700 font-bold">${c.nome}</td><td class="p-3 text-right text-emerald-600 font-black">R$ ${c.valor.toFixed(2)}</td></tr>`).join('');
}
// ==========================================
// PARTE 2 - ORÇAMENTOS, KANBAN DE PRODUÇÃO E LOJA
// ==========================================

function renderOrcamentos() {
    const tbody = document.getElementById('listaOrcamentosTab');
    if(!tbody) return;
    const orcamentos = bdPedidos.filter(p => p.status === 'Orçamento' && !p.arquivado).sort((a,b) => b.data.toDate() - a.data.toDate());
    tbody.innerHTML = orcamentos.length === 0 ? `<tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum orçamento pendente.</td></tr>` : orcamentos.map(p => {
        const dataObj = p.data.toDate ? p.data.toDate() : new Date(p.data);
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        const dias = Math.floor((new Date() - dataObj) / (1000 * 60 * 60 * 24));
        let badgeDias = dias > 2 ? `<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] uppercase ml-2 font-black">${dias} dias pendente</span>` : `<span class="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[9px] uppercase ml-2 font-black">Novo</span>`;
        return `<tr class="border-b border-slate-50 hover:bg-slate-50"> 
            <td class="p-3 text-slate-500 font-medium">${dataFormatada} ${badgeDias}</td>
            <td class="p-3 text-slate-700 font-bold">${p.clienteNome}</td>
            <td class="p-3 text-emerald-600 font-black">R$ ${p.total.toFixed(2)}</td>
            <td class="p-3 text-right">
                <button onclick="mudarStatusPedido('${p.id}', 'Aguardando pagamento')" class="bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 transition text-[10px] font-bold uppercase tracking-widest">Aprovar</button>
            </td>
        </tr>`;
    }).join('');
}

function renderKanbanProducao() {
    const container = document.getElementById('kanbanContainer'); if(!container) return;
    const pedidosAtivos = bdPedidos.filter(p => !p.arquivado); let html = '';
    STATUSES.forEach(status => {
        const pedidosDoStatus = pedidosAtivos.filter(p => p.status === status);
        if (pedidosDoStatus.length === 0) {
            html += `<div class="bg-slate-100 rounded-xl p-2 w-12 flex-shrink-0 flex flex-col items-center border border-slate-200 opacity-50 hover:opacity-100 transition cursor-default h-full"><span class="bg-slate-200 text-slate-500 text-[10px] font-black px-2 py-1 rounded-full mb-4">0</span><h3 class="font-bold text-slate-400 uppercase text-[10px] tracking-widest vertical-text whitespace-nowrap">${status}</h3></div>`; 
        } else { 
            html += `<div class="bg-slate-100 rounded-xl p-3 w-80 flex-shrink-0 flex flex-col h-full border border-slate-200"><div class="flex justify-between items-center mb-4"><h3 class="font-bold text-slate-700 uppercase text-[11px] tracking-widest">${status}</h3><span class="bg-white text-slate-600 text-[10px] font-black px-2 py-1 rounded-full shadow-sm">${pedidosDoStatus.length}</span></div><div class="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">${pedidosDoStatus.map(p => gerarCardPedido(p)).join('')}</div></div>`;
        }
    });
    container.innerHTML = html;
}

function gerarCardPedido(p) {
    const dataFormatada = p.data.toDate().toLocaleDateString('pt-BR') + ' ' + p.data.toDate().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    let options = STATUSES.map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('');
    let corBorda = 'border-l-slate-400';
    if(p.status === 'Orçamento') corBorda = 'border-l-blue-400'; else if(p.status === 'Aguardando pagamento') corBorda = 'border-l-amber-400'; else if(p.status === 'Em produção') corBorda = 'border-l-blue-500'; else if(p.status === 'Acabamento') corBorda = 'border-l-indigo-500'; else if(p.status === 'Pronto para Retirada') corBorda = 'border-l-emerald-400'; else if(p.status === 'Entregue') corBorda = 'border-l-emerald-600'; else if(p.status === 'Cancelado / Estorno') corBorda = 'border-l-red-500';
    
    let btnArquivar = (p.status === 'Entregue' || p.status === 'Cancelado / Estorno') ? `<button type="button" onclick="arquivarPedido('${p.id}')" class="bg-slate-200 text-slate-600 px-3 py-1 rounded hover:bg-slate-300 transition text-xs" title="Arquivar Pedido"><i class="fa fa-archive"></i></button>` : ''; 
    let visualizaPrecos = (!usuarioAtual || usuarioAtual.role !== 'producao'); 
    
    let etiquetaFalta = (p.saldoDevedor > 0 && visualizaPrecos) ? `<div class="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded shadow-sm">FALTA R$ ${p.saldoDevedor.toFixed(2)}</div>` : '';
    
    let infoExtra = '';
    if(p.dataEntrega) {
        const dt = new Date(p.dataEntrega).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
        infoExtra += `<p class="text-amber-600 font-bold mt-1 text-[10px]"><i class="fa fa-clock"></i> Prometido: ${dt}</p>`; 
    } 
    if(p.linkArte) { 
        infoExtra += `<a href="${p.linkArte}" target="_blank" class="text-blue-500 hover:underline text-[10px] mt-1 inline-block"><i class="fa fa-external-link-alt"></i> Abrir Arte</a>`;
    }

    return `<div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 border-l-4 ${corBorda} relative mt-2">${etiquetaFalta}
        <div class="flex justify-between items-start mb-2"><span class="text-[9px] font-bold text-slate-400">${dataFormatada}</span><span class="text-[10px] font-black text-emerald-600">${visualizaPrecos ? 'R$ ' + p.total.toFixed(2) : ''}</span></div>
        <h4 class="font-bold text-slate-700 text-sm mb-1">${p.clienteNome}</h4>
        <div class="text-[10px] text-slate-500 mb-3 space-y-1">${p.itens.map(i => `<p>• ${i.qtdCarrinho}x ${i.nome}</p>`).join('')}${infoExtra}</div>
        <div class="flex items-center space-x-2 mt-3 pt-3 border-t border-slate-100">
            <select onchange="mudarStatusPedido('${p.id}', this.value)" class="flex-1 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] rounded p-1 font-bold uppercase tracking-wider outline-none focus:border-blue-400">${options}</select>
            ${btnArquivar}
        </div>
    </div>`;
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

async function arquivarPedido(id) { 
    if(confirm("Deseja remover este pedido do painel de produção? Ele continuará salvo no histórico e financeiro.")) { 
        try { await db.collection("pedidos").doc(id).update({ arquivado: true }); } catch(e) { alert("Erro ao arquivar pedido."); } 
    } 
}

function setFiltroSetor(setor) { filtroSetor = setor; renderVitrine(); }
function setFiltroCategoria(cat) { filtroCategoria = cat; renderVitrine(); }

function renderVitrine() {
    const container = document.getElementById('vitrineProdutos');
    if (!container) return;
    let filtrados = bdProdutos;
    if (filtroSetor !== 'Todos') filtrados = filtrados.filter(p => p.setor === filtroSetor);
    if (filtroCategoria !== 'Todas') filtrados = filtrados.filter(p => p.categoria === filtroCategoria);

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400">Nenhum produto encontrado.</div>`; return;
    }

    container.innerHTML = filtrados.map(p => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition flex flex-col">
            <h3 class="font-bold text-slate-700 text-lg mb-1">${p.nome}</h3>
            <p class="text-xs text-slate-400 mb-3 flex-grow">${p.descricao || 'Sem descrição'}</p>
            <div class="flex justify-between items-end mt-auto">
                <span class="text-emerald-600 font-black text-xl">R$ ${parseFloat(p.precoBase).toFixed(2)}</span>
                <button onclick="abrirModalProduto('${p.id}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-bold text-sm">+ Add</button>
            </div>
        </div>
    `).join('');
}

function abrirModalProduto(id) {
    produtoAtualModal = bdProdutos.find(p => p.id === id);
    if (!produtoAtualModal) return;
    document.getElementById('modalProdNome').innerText = produtoAtualModal.nome;
    document.getElementById('modalProdPreco').innerText = `Preço Base: R$ ${parseFloat(produtoAtualModal.precoBase).toFixed(2)}`;
    const inputQtd = document.getElementById('modalProdQtd'); if(inputQtd) inputQtd.value = 1;
    
    const divAcabamentos = document.getElementById('modalProdAcabamentos');
    if (divAcabamentos) {
        let htmlAcab = '';
        if (produtoAtualModal.acabamentos && produtoAtualModal.acabamentos.length > 0) {
            produtoAtualModal.acabamentos.forEach(acabId => {
                const acab = bdAcabamentos.find(a => a.id === acabId);
                if (acab) {
                    htmlAcab += `<label class="flex items-center space-x-2 text-sm text-slate-600 mb-2 cursor-pointer"><input type="checkbox" class="acabamento-checkbox form-checkbox text-blue-600 rounded" value="${acab.id}" data-preco="${acab.preco}"><span>${acab.nome} (+ R$ ${parseFloat(acab.preco).toFixed(2)})</span></label>`;
                }
            });
        } else { htmlAcab = '<p class="text-xs text-slate-400 italic">Nenhum acabamento extra disponível.</p>'; }
        divAcabamentos.innerHTML = htmlAcab;
    }
    const modal = document.getElementById('modalProduto'); if(modal) modal.classList.remove('hidden');
}

function fecharModalProduto() {
    const modal = document.getElementById('modalProduto'); if(modal) modal.classList.add('hidden');
    produtoAtualModal = null;
}

function addAoCarrinho() {
    if (!produtoAtualModal) return;
    const inputQtd = document.getElementById('modalProdQtd'); const qtd = inputQtd ? (parseInt(inputQtd.value) || 1) : 1;
    let precoTotalItem = parseFloat(produtoAtualModal.precoBase); let descAcabamentos =[];
    
    const checkboxes = document.querySelectorAll('.acabamento-checkbox:checked');
    checkboxes.forEach(cb => {
        precoTotalItem += parseFloat(cb.getAttribute('data-preco'));
        const acab = bdAcabamentos.find(a => a.id === cb.value); if(acab) descAcabamentos.push(acab.nome);
    });

    precoTotalItem = precoTotalItem * qtd;
    let descFinal = produtoAtualModal.nome; if (descAcabamentos.length > 0) descFinal += ` (${descAcabamentos.join(', ')})`;

    carrinho.push({ produtoId: produtoAtualModal.id, nome: descFinal, desc: descAcabamentos.join(', '), qtdCarrinho: qtd, valor: precoTotalItem });
    fecharModalProduto(); renderCarrinho();
}

function removerDoCarrinho(index) { carrinho.splice(index, 1); renderCarrinho(); }

function renderCarrinho() {
    const container = document.getElementById('listaCarrinho'); const totalEl = document.getElementById('totalCarrinho');
    if (!container || !totalEl) return;
    if (carrinho.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm text-center py-6">Seu carrinho está vazio.</p>'; totalEl.innerText = 'R$ 0.00'; return;
    }
    let total = 0;
    container.innerHTML = carrinho.map((item, index) => {
        total += item.valor;
        return `<div class="flex justify-between items-center border-b border-slate-100 py-3"><div><p class="text-sm font-bold text-slate-700">${item.qtdCarrinho}x ${item.nome}</p><p class="text-xs text-emerald-600 font-bold mt-1">R$ ${item.valor.toFixed(2)}</p></div><button onclick="removerDoCarrinho(${index})" class="text-red-400 hover:text-red-600 p-2 transition" title="Remover"><i class="fa fa-trash"></i></button></div>`;
    }).join('');
    totalEl.innerText = `R$ ${total.toFixed(2)}`;
}

function renderCliSelectCart() {
    const select = document.getElementById('cartCliente'); if (!select) return;
    select.innerHTML = '<option value="">Selecione o Cliente...</option>' + bdClientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}

async function finalizarPedido(isOrcamento = false) {
    if (carrinho.length === 0) { alert("O carrinho está vazio!"); return; }
    const clienteId = document.getElementById('cartCliente').value;
    if (!clienteId && !isOrcamento) { alert("Selecione um cliente para fechar o pedido."); return; }

    const clienteObj = bdClientes.find(c => c.id === clienteId) || { nome: "Consumidor Final", telefone: "" };
    const valorPagoInput = document.getElementById('cartValorPago'); const valorPago = valorPagoInput ? parseFloat(valorPagoInput.value) || 0 : 0;
    const dataEntregaInput = document.getElementById('cartDataEntrega'); const dataEntrega = dataEntregaInput && dataEntregaInput.value ? dataEntregaInput.value : null;
    const linkArteInput = document.getElementById('cartLinkArte'); const linkArte = linkArteInput ? linkArteInput.value : "";

    let totalPedido = carrinho.reduce((acc, item) => acc + item.valor, 0);
    let saldoDevedor = totalPedido - valorPago; if (saldoDevedor < 0) saldoDevedor = 0;
    let statusInicial = isOrcamento ? 'Orçamento' : (valorPago >= totalPedido ? 'Em produção' : 'Aguardando pagamento');

    const novoPedido = {
        clienteId: clienteId || "", clienteNome: clienteObj.nome, clienteTelefone: clienteObj.telefone || "",
        itens: carrinho, total: totalPedido, valorPago: valorPago, saldoDevedor: saldoDevedor,
        status: statusInicial, data: new Date(), dataEntrega: dataEntrega, linkArte: linkArte,
        arquivado: false, vendedor: usuarioAtual ? usuarioAtual.nome : 'Desconhecido'
    };

    try {
        document.body.style.cursor = 'wait';
        await db.collection("pedidos").add(novoPedido);
        alert(isOrcamento ? "Orçamento salvo!" : "Pedido finalizado!");
        
        carrinho =
    // A continuação do finalzinho da função de salvar pedido (Limpando o carrinho)[]; 
        renderCarrinho();
        if(document.getElementById('cartCliente')) document.getElementById('cartCliente').value = '';
        if(document.getElementById('cartValorPago')) document.getElementById('cartValorPago').value = '';
        if(document.getElementById('cartDataEntrega')) document.getElementById('cartDataEntrega').value = '';
        if(document.getElementById('cartLinkArte')) document.getElementById('cartLinkArte').value = '';
        
        document.body.style.cursor = 'default';
        if (!isOrcamento && usuarioAtual && usuarioAtual.role !== 'vendedor') mudarAba('producao');
    } catch (error) {
        document.body.style.cursor = 'default'; alert("Erro ao salvar o pedido.");
    }
}

// ==========================================
// PARTE 3 - CADASTROS E ESTOQUE
// ==========================================

async function salvarCliente(e) {
    e.preventDefault();
    const id = document.getElementById('cliId').value, nome = document.getElementById('cliNome').value, telefone = document.getElementById('cliTelefone').value;
    try {
        if (id) await db.collection("clientes").doc(id).update({ nome, telefone });
        else await db.collection("clientes").add({ nome, telefone });
        document.getElementById('formCliente').reset(); document.getElementById('cliId').value = ''; alert("Cliente salvo!");
    } catch(err) { alert("Erro ao salvar cliente."); }
}

function renderCliTable() {
    const tbody = document.getElementById('listaClientesTab'); if(!tbody) return;
    tbody.innerHTML = bdClientes.length === 0 ? '<tr><td colspan="3" class="p-4 text-center text-slate-400">Nenhum cliente cadastrado.</td></tr>' : bdClientes.map(c => `<tr class="border-b border-slate-50 hover:bg-slate-50"><td class="p-3 text-slate-600 font-medium">${c.nome}</td><td class="p-3 text-slate-500">${c.telefone || '-'}</td><td class="p-3 text-right"><button onclick="editarCliente('${c.id}')" class="text-blue-500 hover:text-blue-700 mr-3"><i class="fa fa-edit"></i></button><button onclick="excluirCliente('${c.id}')" class="text-red-400 hover:text-red-600"><i class="fa fa-trash"></i></button></td></tr>`).join('');
}

function editarCliente(id) {
    const c = bdClientes.find(x => x.id === id); if(!c) return;
    document.getElementById('cliId').value = c.id; document.getElementById('cliNome').value = c.nome; document.getElementById('cliTelefone').value = c.telefone || '';
}

async function excluirCliente(id) { if(confirm("Excluir cliente?")) await db.collection("clientes").doc(id).delete(); }

async function salvarProduto(e) {
    e.preventDefault();
    const id = document.getElementById('prodId').value, nome = document.getElementById('prodNome').value, descricao = document.getElementById('prodDesc').value, precoBase = parseFloat(document.getElementById('prodPreco').value) || 0, setor = document.getElementById('prodSetor').value, categoria = document.getElementById('prodCat').value;
    
    const selectAcab = document.getElementById('prodAcabamentos'); let acabamentos =[];
    if(selectAcab && selectAcab.options) {
        for(let i=0; i < selectAcab.options.length; i++) { if(selectAcab.options[i].selected) acabamentos.push(selectAcab.options[i].value); }
    }
    const doc = { nome, descricao, precoBase, setor, categoria, acabamentos };
    try {
        if (id) await db.collection("produtos").doc(id).update(doc); else await db.collection("produtos").add(doc);
        document.getElementById('formProduto').reset(); document.getElementById('prodId').value = ''; alert("Produto salvo!");
    } catch(err) { alert("Erro ao salvar produto."); }
}

function renderProdTable() {
    const tbody = document.getElementById('listaProdutosTab'); if(!tbody) return;
    tbody.innerHTML = bdProdutos.length === 0 ? '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>' : bdProdutos.map(p => `<tr class="border-b border-slate-50 hover:bg-slate-50"><td class="p-3 text-slate-600 font-medium">${p.nome}</td><td class="p-3 text-slate-500">${p.setor}</td><td class="p-3 text-slate-500">${p.categoria}</td><td class="p-3 text-emerald-600 font-bold">R$ ${parseFloat(p.precoBase).toFixed(2)}</td><td class="p-3 text-right"><button onclick="editarProduto('${p.id}')" class="text-blue-500 hover:text-blue-700 mr-3"><i class="fa fa-edit"></i></button><button onclick="excluirProduto('${p.id}')" class="text-red-400 hover:text-red-600"><i class="fa fa-trash"></i></button></td></tr>`).join('');
}

function editarProduto(id) {
    const p = bdProdutos.find(x => x.id === id); if(!p) return;
    document.getElementById('prodId').value = p.id; document.getElementById('prodNome').value = p.nome; document.getElementById('prodDesc').value = p.descricao || ''; document.getElementById('prodPreco').value = p.precoBase; document.getElementById('prodSetor').value = p.setor; document.getElementById('prodCat').value = p.categoria;
    const selectAcab = document.getElementById('prodAcabamentos');
    if(selectAcab && selectAcab.options) {
        for(let i=0; i < selectAcab.options.length; i++) { selectAcab.options[i].selected = p.acabamentos && p.acabamentos.includes(selectAcab.options[i].value); }
    }
}

async function excluirProduto(id) { if(confirm("Excluir produto?")) await db.collection("produtos").doc(id).delete(); }

async function salvarCategoria(e) {
    e.preventDefault(); const id = document.getElementById('catId').value, nome = document.getElementById('catNome').value;
    try {
        if (id) await db.collection("categorias").doc(id).update({ nome }); else await db.collection("categorias").add({ nome });
        document.getElementById('formCategoria').reset(); document.getElementById('catId').value = ''; alert("Categoria salva!");
    } catch(err) { alert("Erro ao salvar categoria."); }
}

function renderCat() {
    const tbody = document.getElementById('listaCategoriasTab'); if(tbody) {
        tbody.innerHTML = bdCategorias.length === 0 ? '<tr><td colspan="2" class="p-4 text-center text-slate-400">Nenhuma categoria.</td></tr>' : bdCategorias.map(c => `<tr class="border-b border-slate-50 hover:bg-slate-50"><td class="p-3 text-slate-600 font-medium">${c.nome}</td><td class="p-3 text-right"><button onclick="excluirCategoria('${c.id}')" class="text-red-400 hover:text-red-600"><i class="fa fa-trash"></i></button></td></tr>`).join('');
    }
    const selectCat = document.getElementById('prodCat'); if(selectCat) {
        selectCat.innerHTML = '<option value="">Selecione...</option>' + bdCategorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    }
}

async function excluirCategoria(id) { if(confirm("Excluir categoria?")) await db.collection("categorias").doc(id).delete(); }

async function salvarAcabamento(e) {
    e.preventDefault(); const id = document.getElementById('acabId').value, nome = document.getElementById('acabNome').value, preco = parseFloat(document.getElementById('acabPreco').value) || 0;
    try {
        if (id) await db.collection("acabamentos").doc(id).update({ nome, preco }); else await db.collection("acabamentos").add({ nome, preco });
        document.getElementById('formAcabamento').reset(); document.getElementById('acabId').value = ''; alert("Acabamento salvo!");
    } catch(err) { alert("Erro ao salvar acabamento."); }
}

function renderAcabTable() {
    const tbody = document.getElementById('listaAcabamentosTab'); if(!tbody) return;
    tbody.innerHTML = bdAcabamentos.length === 0 ? '<tr><td colspan="3" class="p-4 text-center text-slate-400">Nenhum acabamento.</td></tr>' : bdAcabamentos.map(a => `<tr class="border-b border-slate-50 hover:bg-slate-50"><td class="p-3 text-slate-600 font-medium">${a.nome}</td><td class="p-3 text-emerald-600 font-bold">R$ ${parseFloat(a.preco).toFixed(2)}</td><td class="p-3 text-right"><button onclick="excluirAcabamento('${a.id}')" class="text-red-400 hover:text-red-600"><i class="fa fa-trash"></i></button></td></tr>`).join('');
}

async function excluirAcabamento(id) { if(confirm("Excluir acabamento?")) await db.collection("acabamentos").doc(id).delete(); }

function atualizarListaAcabamentosProduto() {
    const select = document.getElementById('prodAcabamentos'); if(!select) return;
    select.innerHTML = bdAcabamentos.map(a => `<option value="${a.id}">${a.nome} (+ R$ ${parseFloat(a.preco).toFixed(2)})</option>`).join('');
}
// ==========================================
// PARTE 4 - FINANCEIRO, A RECEBER, USUÁRIOS E EMPRESA (FINAL)
// ==========================================

function renderFinanceiro() {
    const tbody = document.getElementById('listaFinanceiroTab'); 
    const dateInput = document.getElementById('finDataFiltro');
    if(!tbody || !dateInput) return;

    const dateStr = dateInput.value.slice(0, 7); // Mês/Ano: yyyy-mm
    let transacoes =[];
    let totalReceitas = 0, totalDespesas = 0;

    // Busca entradas (pedidos pagos no mês)
    bdPedidos.forEach(p => {
        if (!p.data) return;
        const dataStr = (p.data.toDate ? p.data.toDate() : new Date(p.data)).toISOString().slice(0, 7);
        if (dataStr === dateStr && p.status !== 'Orçamento' && p.status !== 'Cancelado / Estorno' && p.valorPago > 0) {
            totalReceitas += p.valorPago;
            transacoes.push({
                data: p.data, 
                descricao: `Recebimento Pedido: ${p.clienteNome}`,
                categoria: 'Venda',
                tipo: 'entrada',
                valor: p.valorPago
            });
        }
    });

    // Busca saídas (despesas avulsas do mês)
    bdDespesas.forEach(d => {
        if (!d.data) return;
        const dataStr = (d.data.toDate ? d.data.toDate() : new Date(d.data)).toISOString().slice(0, 7);
        if (dataStr === dateStr) {
            totalDespesas += d.valor;
            transacoes.push({
                id: d.id,
                data: d.data,
                descricao: d.descricao,
                categoria: d.categoria || 'Outros',
                tipo: 'saida',
                valor: d.valor
            });
        }
    });

    // Ordenar da mais recente para a mais antiga
    transacoes.sort((a,b) => {
        const da = a.data.toDate ? a.data.toDate() : new Date(a.data);
        const db = b.data.toDate ? b.data.toDate() : new Date(b.data);
        return db - da;
    });

    tbody.innerHTML = transacoes.length === 0 ? `<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhuma transação no período.</td></tr>` : transacoes.map(t => {
        const isEntrada = t.tipo === 'entrada';
        const valClass = isEntrada ? 'text-emerald-600' : 'text-red-500';
        const signal = isEntrada ? '+' : '-';
        const delBtn = !isEntrada ? `<button onclick="excluirDespesa('${t.id}')" class="ml-4 text-red-400 hover:text-red-600" title="Excluir Despesa"><i class="fa fa-trash"></i></button>` : '';
        const dateObj = t.data.toDate ? t.data.toDate() : new Date(t.data);
        return `<tr class="border-b border-slate-50 hover:bg-slate-50">
            <td class="p-3 text-slate-500 font-medium">${dateObj.toLocaleDateString('pt-BR')}</td>
            <td class="p-3 text-slate-700 font-bold">${t.descricao} <span class="text-[9px] font-medium text-slate-500 bg-slate-100 px-1 rounded ml-2 uppercase">${t.categoria}</span></td>
            <td class="p-3 text-right font-black ${valClass}">${signal} R$ ${parseFloat(t.valor).toFixed(2)} ${delBtn}</td>
        </tr>`;
    }).join('');

    const valBalanco = totalReceitas - totalDespesas;
    const colorBalanco = valBalanco >= 0 ? 'text-emerald-600' : 'text-red-600';
    
    const divResumo = document.getElementById('finResumo');
    if(divResumo) {
        divResumo.innerHTML = `
            <span class="text-sm font-bold text-slate-600 mr-4">Entradas: <span class="text-emerald-600">R$ ${totalReceitas.toFixed(2)}</span></span>
            <span class="text-sm font-bold text-slate-600 mr-4">Saídas: <span class="text-red-500">R$ ${totalDespesas.toFixed(2)}</span></span>
            <span class="text-sm font-bold text-slate-600 border-l border-slate-300 pl-4">Lucro Bruto: <span class="${colorBalanco} text-lg">R$ ${valBalanco.toFixed(2)}</span></span>
        `;
    }
}

async function salvarDespesa(e) {
    e.preventDefault();
    const descricao = document.getElementById('despDesc').value;
    const valor = parseFloat(document.getElementById('despValor').value) || 0;
    const categoria = document.getElementById('despCat').value;
    const dataFiltro = document.getElementById('despData').value;
    
    // Converte de yyyy-mm-dd (UTC time issue handle) para uma Data válida sem trocar de dia fuso horário:
    const dataStr = dataFiltro ? new Date(dataFiltro + 'T12:00:00') : new Date();
    
    try {
        await db.collection("despesas").add({ descricao, valor, categoria, data: dataStr });
        document.getElementById('formDespesa').reset();
        document.getElementById('despData').valueAsDate = new Date();
        alert("Despesa salva com sucesso no sistema!");
    } catch(err) { alert("Erro ao salvar despesa. Verifique sua conexão."); }
}

async function excluirDespesa(id) { 
    if(confirm("Atenção! Deseja excluir este registro de despesa do mês? O saldo será recalculado.")) {
        await db.collection("despesas").doc(id).delete(); 
    }
}

// --- TAB: A RECEBER (CRÉDITOS NA RUA) ---
function renderAReceber() {
    const tbody = document.getElementById('listaAReceberTab'); 
    if(!tbody) return;
    const pendentes = bdPedidos.filter(p => !p.arquivado && p.saldoDevedor > 0 && p.status !== 'Orçamento' && p.status !== 'Cancelado / Estorno');
    
    tbody.innerHTML = pendentes.length === 0 ? `<tr><td colspan="4" class="p-6 text-center text-slate-400">Todo mundo em dia! Nenhum valor a receber listado.</td></tr>` : pendentes.map(p => {
        const dataObj = p.data.toDate ? p.data.toDate() : new Date(p.data);
        return `<tr class="border-b border-slate-50 hover:bg-slate-50"> 
            <td class="p-3 text-slate-500 font-medium">${dataObj.toLocaleDateString('pt-BR')}</td>
            <td class="p-3 text-slate-700 font-bold">${p.clienteNome} <span class="block text-xs font-normal text-slate-400">Total Original: R$ ${p.total.toFixed(2)}</span></td>
            <td class="p-3 text-red-500 font-black"><i class="fa fa-exclamation-circle text-xs mr-1"></i> Falta: R$ ${p.saldoDevedor.toFixed(2)}</td>
            <td class="p-3 text-right">
                <button onclick="quitarPagamento('${p.id}', ${p.saldoDevedor})" class="bg-emerald-500 text-white px-3 py-1.5 rounded hover:bg-emerald-600 shadow transition text-[10px] font-bold uppercase tracking-widest"><i class="fa fa-handshake mr-1"></i> Receber Pagamento</button>
            </td>
        </tr>`;
    }).join('');
}

async function quitarPagamento(pedidoId, saldoAtual) {
    if(!confirm(`Confirma o recebimento total no valor de R$ ${saldoAtual.toFixed(2)} pelo cliente? O status atualizará o saldo para R$ 0.00`)) return;
    try {
        const pRef = db.collection('pedidos').doc(pedidoId);
        const doc = await pRef.get();
        if(!doc.exists) return;
        const p = doc.data();
        let nStatus = p.status === 'Aguardando pagamento' ? 'Em produção' : p.status;
        await pRef.update({ valorPago: p.total, saldoDevedor: 0, status: nStatus });
        alert('Oba! Pagamento recebido, o sistema e caixa foram atualizados!');
    } catch(e) { alert('Erro no fechamento do recebimento.'); }
}

// --- EMPRESA & DADOS BANCÁRIOS (PIX) ---
async function salvarEmpresa(e) {
    e.preventDefault();
    const nome = document.getElementById('empNome').value, doc = document.getElementById('empDoc').value, end = document.getElementById('empEnd').value, tel = document.getElementById('empTel').value, chPix = document.getElementById('empPix').value, cbPix = document.getElementById('empCbPix').value;
    try {
        await db.collection('empresa').doc('dados').set({ nome, documento: doc, endereco: end, telefone: tel, chavePix: chPix, recebedorPix: cbPix }, { merge: true });
        alert("Excelente! Dados da loja e Chave Pix salvos. Seus recibos puxarão estas infos.");
    } catch (error) { alert("Opa! Tivemos erro de escrita com os dados."); }
}

function editEmpresa() { // Chamado automaticamente em `iniciarLeitura()` quando pega os dados de empresa (Part 1)
    if(document.getElementById('empNome')) document.getElementById('empNome').value = bdEmpresa.nome || '';
    if(document.getElementById('empDoc')) document.getElementById('empDoc').value = bdEmpresa.documento || '';
    if(document.getElementById('empEnd')) document.getElementById('empEnd').value = bdEmpresa.endereco || '';
    if(document.getElementById('empTel')) document.getElementById('empTel').value = bdEmpresa.telefone || '';
    if(document.getElementById('empPix')) document.getElementById('empPix').value = bdEmpresa.chavePix || '';
    if(document.getElementById('empCbPix')) document.getElementById('empCbPix').value = bdEmpresa.recebedorPix || '';
}

// --- ADMIN E NÍVEIS DE USUÁRIO ---
async function salvarUsuario(e) {
    e.preventDefault();
    const email = document.getElementById('usuEmail').value, nome = document.getElementById('usuNome').value, role = document.getElementById('usuRole').value;
    try {
        await db.collection('usuarios').doc(email).set({ nome, email, role });
        document.getElementById('formUsuario').reset(); 
        alert(`O acesso com email ${email} e Permissão: ${role.toUpperCase()} foi salvo na plataforma! Ele já pode fazer login.`);
    } catch(err) { alert("Não autorizdo criar novo acesso. Reveja os logins."); }
}

function renderUsuariosTab() {
    const tbody = document.getElementById('listaUsuariosTab'); if(!tbody) return;
    tbody.innerHTML = bdUsuarios.length === 0 ? '<tr><td colspan="4" class="p-4 text-center">Somente o criador primário (Você).</td></tr>' : bdUsuarios.map(u => `
    <tr class="border-b border-slate-50 hover:bg-slate-50">
        <td class="p-3 text-slate-700 font-bold">${u.nome}</td>
        <td class="p-3 text-blue-500">${u.email}</td>
        <td class="p-3 uppercase text-[10px] font-black tracking-widest text-slate-400"><i class="fa fa-id-badge text-amber-500 mr-1"></i> ${u.role}</td>
        <td class="p-3 text-right">
            <button onclick="excluirUsuario('${u.id}')" class="bg-red-50 text-red-400 hover:text-white hover:bg-red-500 rounded p-1.5 transition duration-150" title="Apagar da GVA"><i class="fa fa-trash px-1"></i></button>
        </td>
    </tr>`).join('');
}

async function excluirUsuario(id) {
    if(id === usuarioAtual.email) { alert("Aviso: Bloqueio contra acidentes! O criador principal logado não pode ser removido, logue como vendedor caso precise formatar seu usuário principal."); return; }
    if(confirm("Encerrar o sistema pra este acesso imediatamente e revogar uso?")) {
        await db.collection("usuarios").doc(id).delete();
    }
}
