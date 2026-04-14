const firebaseConfig = {
    apiKey: "AIzaSyBcyn6czVVa_vgtvKvS9c27gUGBbSKNibM",
    authDomain: "gva-sistema.firebaseapp.com",
    projectId: "gva-sistema",
    storageBucket: "gva-sistema.firebasestorage.app",
    messagingSenderId: "400970884558",
    appId: "1:400970884558:web:add97c5812d0965976b79f"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const EMAIL_ADMIN = "contato@graficava.com.br";

let bancoDeDados = [], pedidosGVA = [], carrinho = [], categorias = [], acabamentos = [];

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('telaLogin').style.display = 'none';
        if (user.email.toLowerCase() === EMAIL_ADMIN.toLowerCase()) {
            document.querySelectorAll('.aba-restrita').forEach(a => a.style.display = 'block');
        }
        iniciarSincronizacao();
    } else { document.getElementById('telaLogin').style.display = 'flex'; }
});

function iniciarSincronizacao() {
    db.collection("categorias").onSnapshot(snap => {
        categorias = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarMenus(); renderizarListaCategorias();
        const selAdmin = document.getElementById('adminCatSelect');
        const selAcab = document.getElementById('acabCatVinculo');
        const options = categorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        if(selAdmin) selAdmin.innerHTML = options;
        if(selAcab) selAcab.innerHTML = `<option value="Geral">Todas</option>` + options;
    });
    db.collection("acabamentos").onSnapshot(snap => {
        acabamentos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarListaAcabamentos();
    });
    db.collection("catalogo").onSnapshot(snap => {
        bancoDeDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        carregarProdutos(); renderizarListaAdmin();
    });
    db.collection("pedidos").orderBy("dataCriacao", "desc").onSnapshot(snap => {
        pedidosGVA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarProducao(); calcularFinanceiro();
    });
    db.collection("financeiro_avulso").onSnapshot(() => calcularFinanceiro());
}

function renderizarMenus() {
    const nav = document.getElementById('menuCategorias');
    if(!nav) return;
    nav.innerHTML = `<button class="active" onclick="filtrarCat('Todos', this)">Todos</button>` + 
        categorias.map(c => `<button onclick="filtrarCat('${c.nome}', this)">${c.nome}</button>`).join('');
}

function filtrarCat(cat, btn) {
    document.querySelectorAll('.cat-nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if(cat === 'Todos') carregarProdutos();
    else carregarProdutos(bancoDeDados.filter(p => p.categoria === cat));
}

function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    if(!grade) return; grade.innerHTML = '';
    lista.forEach(p => {
        grade.innerHTML += `<div class="zap-card"><div class="zap-color-bg">SKU: ${p.sku || '---'}<br>${p.nome}</div>
            <div class="zap-info"><small>${p.categoria}</small><p>R$ ${p.preco.toFixed(2)}</p>
            <button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Configurar</button></div></div>`;
    });
}

function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let html = `<div class="card-header">Configurar: ${p.nome}</div><div class="card-body gva-form-large">`;
    if(p.qtdsFixas) {
        html += `<label>Quantidade:</label><div class="qty-btns">`;
        p.qtdsFixas.split(',').forEach(q => {
            html += `<button class="btn-qty" onclick="selecionarQtd(this, ${q.trim()})">${q.trim()}</button>`;
        });
        html += `</div><input type="hidden" id="cfgQ" value="0">`;
    } else if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        const maxL = p.tipo === 'm_linear' ? 1.50 : 3.10;
        html += `<label>Largura (Máx ${maxL}m):</label><input type="number" id="cfgL" value="1.00" step="0.01">
                 <label>Altura (m):</label><input type="number" id="cfgA" value="1.00" step="0.01">`;
    } else { html += `<label>Quantidade:</label><input type="number" id="cfgQ" value="1">`; }

    html += `<label style="margin-top:10px; display:block;">Acabamentos:</label><div class="acabamento-seletor">`;
    const acabFiltrados = acabamentos.filter(a => a.vinculo === p.categoria || a.vinculo === 'Geral');
    acabFiltrados.forEach(a => {
        html += `<label><input type="checkbox" class="check-acab" data-preco="${a.preco}" value="${a.nome}"> ${a.nome}</label>`;
    });
    html += `</div><button class="btn-success" style="margin-top:15px;" onclick="confirmarCarrinho('${p.id}')">Adicionar</button>
             <button class="btn-gva" style="background:#666; width:100%; margin-top:10px;" onclick="fecharModal()">Voltar</button></div>`;
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function selecionarQtd(btn, valor) {
    document.querySelectorAll('.btn-qty').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); document.getElementById('cfgQ').value = valor;
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let total = 0, det = "", qtd = parseFloat(document.getElementById('cfgQ')?.value || 0);
    let precoBase = p.preco;
    if(p.escalonado && qtd > 0) {
        const faixas = p.escalonado.split(',').map(f => {
            const [q, v] = f.split(':'); return { qtd: parseInt(q), valor: parseFloat(v) };
        }).sort((a,b) => b.qtd - a.qtd);
        const faixaEncontrada = faixas.find(f => qtd >= f.qtd);
        if(faixaEncontrada) precoBase = faixaEncontrada.valor;
    }
    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        let l = parseFloat(document.getElementById('cfgL').value), a = parseFloat(document.getElementById('cfgA').value);
        total = (l * a) * precoBase; det = `${l}x${a}m`;
    } else {
        if(qtd <= 0) return alert("Selecione a quantidade!");
        total = qtd * precoBase; det = `${qtd} un`;
    }
    let adicionais = 0; document.querySelectorAll('.check-acab:checked').forEach(c => { adicionais += parseFloat(c.getAttribute('data-preco')); });
    total += adicionais; carrinho.push({ nome: p.nome, total: total, detalhes: det, sku: p.sku });
    fecharModal(); atualizarCarrinho();
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let m = parseFloat(document.getElementById('valorMotoboy').value) || 0;
    let t = carrinho.reduce((acc, i) => acc + i.total, 0) + m;
    let s = parseFloat(document.getElementById('valorSinal').value) || 0;
    div.innerHTML = carrinho.map((i, idx) => `<div style="display:flex; justify-content:space-between; margin-bottom:10px; padding:12px; background:#f9f9f9; border-radius:10px;"><span><b>[${i.sku}] ${i.nome}</b><br><small>${i.detalhes}</small></span><b>R$ ${i.total.toFixed(2)} <i class="fa fa-trash" style="color:red; cursor:pointer;" onclick="removerItem(${idx})"></i></b></div>`).join('') || "Vazio.";
    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (t - s).toFixed(2);
}

function removerItem(idx) { carrinho.splice(idx, 1); atualizarCarrinho(); }
function toggleCamposPagamento() { document.getElementById('divParcelas').style.display = document.getElementById('formaPagamento').value === 'CreditoParc' ? 'block' : 'none'; }
function toggleCamposEntrega() { document.getElementById('divMotoboy').style.display = document.getElementById('metodoEntrega').value === 'Motoboy' ? 'block' : 'none'; }

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    if(!nome || carrinho.length === 0) return alert("Dados incompletos!");
    const t = parseFloat(document.getElementById('totalCarrinho').innerText);
    const s = parseFloat(document.getElementById('valorSinal').value) || 0;
    const p = { cliente: nome, telefone: document.getElementById('telCliente').value, end: document.getElementById('endCliente').value, cep: document.getElementById('cepCliente').value, itens: [...carrinho], total: t, sinal: s, restante: t-s, status: "💰 Pagamento", dataCriacao: new Date().toLocaleDateString('pt-BR'), motoboy: parseFloat(document.getElementById('valorMotoboy').value) || 0 };
    db.collection("pedidos").add(p).then(() => { carrinho = []; document.getElementById('nomeCliente').value = ""; atualizarCarrinho(); mudarAba('loja'); });
}

function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, idx) => `
        <div class="gva-card">
            <div class="card-header" style="display:flex; justify-content:space-between;"><span>👤 ${p.cliente}</span>
            <select onchange="mudarStatus('${p.id}', this.value)" style="font-size:11px;">
                <option ${p.status === '💰 Pagamento' ? 'selected' : ''}>💰 Pagamento</option>
                <option ${p.status === '📂 Verif. Arquivos' ? 'selected' : ''}>📂 Verif. Arquivos</option>
                <option ${p.status === '🖨️ Impressão' ? 'selected' : ''}>🖨️ Impressão</option>
                <option ${p.status === '✂️ Acabamento' ? 'selected' : ''}>✂️ Acabamento</option>
                <option ${p.status === '🏠 Pronto' ? 'selected' : ''}>🏠 Pronto</option>
                <option value="cancelar">❌ Cancelar</option><option value="entregar">📦 Entregue</option>
            </select></div>
            <div class="card-body"><button class="btn-gva" style="font-size:11px;" onclick="imprimirCupom(${idx})">Nota Balcão</button>
            <button class="btn-gva" style="background:#25D366; font-size:11px;" onclick="enviarWA(${idx})"><i class="fab fa-whatsapp"></i></button></div>
        </div>`).join('');
}

function mudarStatus(id, v) {
    if(v === 'cancelar') { if(confirm("Cancelar?")) db.collection("pedidos").doc(id).delete(); }
    else if(v === 'entregar') { 
        const p = pedidosGVA.find(i => i.id === id);
        db.collection("pedidos_arquivados").add({...p, status: 'Entregue'}).then(() => db.collection("pedidos").doc(id).delete());
    } else { db.collection("pedidos").doc(id).update({status: v}); }
}

function imprimirCupom(idx) {
    const { jsPDF } = window.jspdf; const p = pedidosGVA[idx]; const doc = new jsPDF({ format: [80, 280] });
    function via(y, tit) {
        doc.setFontSize(10); doc.text("GVA VENOM ARTS", 40, y, null, null, "center");
        doc.setFontSize(7); doc.text(tit, 40, y+5, null, null, "center");
        doc.line(5, y+7, 75, y+7); doc.text(`Cliente: ${p.cliente}`, 5, y+11);
        if(p.motoboy > 0) doc.text(`Entrega: ${p.end || '---'}`, 5, y+15);
        let cy = y+20; p.itens.forEach(i => { doc.text(`- ${i.nome}: R$ ${i.total.toFixed(2)}`, 5, cy); cy += 4; });
        doc.text(`TOTAL: R$ ${p.total.toFixed(2)}`, 75, cy+2, null, null, "right"); return cy + 15;
    }
    let prox = via(10, "VIA CLIENTE"); doc.line(0, prox-5, 80, prox-5); via(prox+5, "VIA PRODUÇÃO");
    window.open(doc.output('bloburl'), '_blank');
}

async function calcularFinanceiro() {
    let fat = pedidosGVA.reduce((acc, p) => acc + (p.total || 0), 0);
    const snap = await db.collection("financeiro_avulso").get();
    let extras = 0, saidas = 0;
    snap.forEach(doc => { const d = doc.data(); if(d.tipo === 'entrada') extras += d.valor; else saidas += d.valor; });
    document.getElementById('finFaturamento').innerText = fat.toFixed(2);
    document.getElementById('finEntradas').innerText = extras.toFixed(2);
    document.getElementById('finSaidas').innerText = saidas.toFixed(2);
    document.getElementById('finSaldo').innerText = (fat + extras - saidas).toFixed(2);
}

function abrirLancamento(tipo) {
    const v = prompt("Valor (R$):"); const d = prompt("Descrição:");
    if(v && d) db.collection("financeiro_avulso").add({ tipo, valor: parseFloat(v), desc: d, data: new Date().toLocaleDateString('pt-BR') });
}

function renderizarListaAdmin() {
    const div = document.getElementById('listaGerenciarProdutos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>SKU</th><th>Nome</th><th>Ação</th></tr></thead><tbody>` + 
        bancoDeDados.map(p => `<tr><td>${p.sku}</td><td>${p.nome}</td><td><button class="btn-mini" onclick="editarProduto('${p.id}')" style="background:#ddd">Edit</button><button class="btn-mini" onclick="excluirItem('catalogo', '${p.id}')" style="background:#fcc">X</button></td></tr>`).join('') + `</tbody></table>`;
}

function editarProduto(id) {
    const p = bancoDeDados.find(i => i.id === id);
    document.getElementById('editId').value = p.id;
    document.getElementById('adminSku').value = p.sku || "";
    document.getElementById('adminNome').value = p.nome;
    document.getElementById('adminPreco').value = p.preco;
    document.getElementById('adminCatSelect').value = p.categoria;
    document.getElementById('adminQtdsFixas').value = p.qtdsFixas || "";
    document.getElementById('adminEscalonado').value = p.escalonado || "";
    document.getElementById('adminTipo').value = p.tipo;
    document.getElementById('btnSalvarProd').innerText = "Atualizar"; window.scrollTo(0,0);
}

function renderizarListaCategorias() {
    const div = document.getElementById('listaGerenciarCategorias');
    div.innerHTML = `<table class="wp-table"><tbody>` + categorias.map(c => `<tr><td>${c.nome}</td><td style="text-align:right"><button onclick="excluirItem('categorias', '${c.id}')">X</button></td></tr>`).join('') + `</tbody></table>`;
}

function renderizarListaAcabamentos() {
    const div = document.getElementById('listaGerenciarAcabamentos');
    div.innerHTML = `<table class="wp-table"><tbody>` + acabamentos.map(a => `<tr><td>${a.nome} (${a.vinculo})</td><td style="text-align:right"><button onclick="excluirItem('acabamentos', '${a.id}')">X</button></td></tr>`).join('') + `</tbody></table>`;
}

async function salvarNovoProduto() {
    const id = document.getElementById('editId').value;
    const d = { sku: document.getElementById('adminSku').value, nome: document.getElementById('adminNome').value, preco: parseFloat(document.getElementById('adminPreco').value), categoria: document.getElementById('adminCatSelect').value, tipo: document.getElementById('adminTipo').value, qtdsFixas: document.getElementById('adminQtdsFixas').value, escalonado: document.getElementById('adminEscalonado').value };
    if(id) await db.collection("catalogo").doc(id).update(d); else await db.collection("catalogo").add(d);
    limparFormAdmin();
}

async function salvarCategoria() { const nome = document.getElementById('catNome').value; if(nome) await db.collection("categorias").add({nome}); document.getElementById('catNome').value = ""; }
async function salvarAcabamento() {
    const d = { nome: document.getElementById('acabNome').value, preco: parseFloat(document.getElementById('acabPreco').value), vinculo: document.getElementById('acabCatVinculo').value };
    await db.collection("acabamentos").add(d); document.getElementById('acabNome').value = ""; document.getElementById('acabPreco').value = "";
}

function mudarAba(aba) {
    const titulos = { cliente: "Catálogo", carrinho: "Orçamento", loja: "Produção", caixa: "Financeiro", admin: "Configurações" };
    document.getElementById('tituloPagina').innerText = titulos[aba];
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}
function toggleAdminSub(s) { 
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.sub-nav-gva button').forEach(b => b.classList.remove('sub-active'));
    document.getElementById('subAdmin' + s.charAt(0).toUpperCase() + s.slice(1)).style.display = 'block';
    document.getElementById('subBtn' + s.charAt(0).toUpperCase() + s.slice(1)).classList.add('sub-active');
}
function filtrarProdutos() {
    const b = document.getElementById('buscaProduto').value.toLowerCase();
    carregarProdutos(bancoDeDados.filter(p => p.nome.toLowerCase().includes(b) || (p.sku && p.sku.toLowerCase().includes(b))));
}
function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
function excluirItem(coll, id) { if(confirm("Excluir?")) db.collection(coll).doc(id).delete(); }
function limparFormAdmin() { document.getElementById('editId').value = ""; document.getElementById('adminSku').value = ""; document.getElementById('adminNome').value = ""; document.getElementById('btnSalvarProd').innerText = "Salvar Produto"; }
function fazerLogin() { auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value, document.getElementById('loginSenha').value); }
function fazerLogout() { auth.signOut().then(() => window.location.reload()); }
function enviarWA(idx) { const p = pedidosGVA[idx]; const msg = window.encodeURIComponent(`Olá ${p.cliente}, o status do seu pedido na GVA mudou para: ${p.status}`); window.open(`https://wa.me/55${p.telefone.replace(/\D/g,'')}?text=${msg}`); }
