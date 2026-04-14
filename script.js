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

// ACESSO
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('telaLogin').style.display = 'none';
        if (user.email.toLowerCase() === EMAIL_ADMIN.toLowerCase()) {
            document.querySelectorAll('.aba-restrita').forEach(a => a.style.display = 'block');
        }
        iniciarSincronizacao();
    } else {
        document.getElementById('telaLogin').style.display = 'flex';
    }
});

function iniciarSincronizacao() {
    db.collection("categorias").onSnapshot(snap => {
        categorias = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarMenus();
        renderizarListaCategorias();
        const sel = document.getElementById('adminCatSelect');
        if(sel) sel.innerHTML = categorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    });
    db.collection("acabamentos").onSnapshot(snap => {
        acabamentos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarListaAcabamentos();
    });
    db.collection("catalogo").onSnapshot(snap => {
        bancoDeDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        carregarProdutos();
        renderizarListaAdmin();
    });
    db.collection("pedidos").orderBy("dataCriacao", "desc").onSnapshot(snap => {
        pedidosGVA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarProducao();
        calcularFinanceiro();
    });
    db.collection("financeiro_avulso").onSnapshot(() => calcularFinanceiro());
}

// CATÁLOGO
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
    if(!grade) return;
    grade.innerHTML = '';
    lista.forEach(p => {
        grade.innerHTML += `
            <div class="zap-card">
                <div class="zap-color-bg">SKU: ${p.sku || '---'}<br>${p.nome}</div>
                <div class="zap-info">
                    <small>${p.categoria}</small>
                    <p style="font-weight:bold; color:var(--gva-azul);">R$ ${p.preco.toFixed(2)}</p>
                    <button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Configurar</button>
                </div>
            </div>`;
    });
}

function filtrarProdutos() {
    const b = document.getElementById('buscaProduto').value.toLowerCase();
    carregarProdutos(bancoDeDados.filter(p => p.nome.toLowerCase().includes(b) || (p.sku && p.sku.toLowerCase().includes(b))));
}

// CONFIGURADOR
function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let html = `<div class="card-header">Configurar: ${p.nome}</div><div class="card-body gva-form-large">`;
    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        const maxL = p.tipo === 'm_linear' ? 1.50 : 3.10;
        html += `<label>Largura (Máx ${maxL}m):</label><input type="number" id="cfgL" value="1.00" step="0.01" onchange="validarMedida(this, ${maxL})">
                 <label>Altura (m):</label><input type="number" id="cfgA" value="1.00" step="0.01">`;
    } else { html += `<label>Quantidade:</label><input type="number" id="cfgQ" value="1">`; }

    html += `<label style="margin-top:15px; display:block;">Acabamentos:</label><div class="acabamento-seletor">`;
    acabamentos.forEach(a => { html += `<label><input type="checkbox" class="check-acab" data-preco="${a.preco}" value="${a.nome}"> ${a.nome}</label>`; });
    html += `</div><button class="btn-success" style="margin-top:20px;" onclick="confirmarCarrinho('${p.id}')">Adicionar</button>
             <button class="btn-gva" style="background:#666; width:100%; margin-top:10px;" onclick="fecharModal()">Cancelar</button></div>`;
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function validarMedida(el, max) { if(el.value > max) { alert(`A largura máxima é ${max}m`); el.value = max; } }

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let total = 0, det = "";
    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        let l = parseFloat(document.getElementById('cfgL').value), a = parseFloat(document.getElementById('cfgA').value);
        total = (l * a) * p.preco; det = `${l}x${a}m`;
    } else {
        let q = parseInt(document.getElementById('cfgQ').value);
        total = q * p.preco; det = `${q} un`;
    }
    let adicionais = 0, nomesAcab = [];
    document.querySelectorAll('.check-acab:checked').forEach(c => {
        adicionais += parseFloat(c.getAttribute('data-preco'));
        nomesAcab.push(c.value);
    });
    total += adicionais;
    if(nomesAcab.length > 0) det += ` | Acab: ${nomesAcab.join(', ')}`;
    carrinho.push({ nome: p.nome, total: total, detalhes: det, sku: p.sku });
    fecharModal(); atualizarCarrinho();
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let m = parseFloat(document.getElementById('valorMotoboy').value) || 0;
    let t = carrinho.reduce((acc, i) => acc + i.total, 0) + m;
    let s = parseFloat(document.getElementById('valorSinal').value) || 0;
    div.innerHTML = carrinho.map((i, idx) => `<div style="display:flex; justify-content:space-between; margin-bottom:10px; background:#f9f9f9; padding:12px; border-radius:10px; border:1px solid #eee;"><span><b>[${i.sku || 'GVA'}] ${i.nome}</b><br><small>${i.detalhes}</small></span><b>R$ ${i.total.toFixed(2)} <i class="fa fa-trash" style="color:red; cursor:pointer;" onclick="removerItem(${idx})"></i></b></div>`).join('') || "Carrinho Vazio.";
    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (t - s).toFixed(2);
}

function removerItem(idx) { carrinho.splice(idx, 1); atualizarCarrinho(); }

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    if(!nome || carrinho.length === 0) return alert("Dados incompletos!");
    const t = parseFloat(document.getElementById('totalCarrinho').innerText);
    const s = parseFloat(document.getElementById('valorSinal').value) || 0;
    const p = { cliente: nome, telefone: document.getElementById('telCliente').value, end: document.getElementById('endCliente').value, cep: document.getElementById('cepCliente').value, itens: [...carrinho], total: t, sinal: s, restante: t-s, status: "💰 Pagamento", dataCriacao: new Date().toLocaleDateString('pt-BR'), previsao: document.getElementById('dataEntrega').value, motoboy: parseFloat(document.getElementById('valorMotoboy').value) || 0 };
    db.collection("pedidos").add(p).then(() => { carrinho = []; document.getElementById('nomeCliente').value = ""; atualizarCarrinho(); mudarAba('loja'); });
}

// PRODUÇÃO
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
            <div class="card-body">
                <button class="btn-gva" style="font-size:11px;" onclick="imprimirCupom(${idx})">Nota Balcão</button>
                <button class="btn-gva" style="background:#25D366; font-size:11px;" onclick="enviarWA(${idx})"><i class="fab fa-whatsapp"></i></button>
            </div>
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
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[idx];
    const doc = new jsPDF({ format: [80, 280] });
    function via(y, tit) {
        doc.setFontSize(10); doc.text("GVA VENOM ARTS", 40, y, null, null, "center");
        doc.setFontSize(7); doc.text(tit, 40, y+5, null, null, "center");
        doc.line(5, y+7, 75, y+7);
        doc.text(`Cliente: ${p.cliente}`, 5, y+11);
        if(p.motoboy > 0) doc.text(`End: ${p.end || '---'} | CEP: ${p.cep || '---'}`, 5, y+15);
        let cy = y+20; p.itens.forEach(i => { doc.text(`- ${i.nome}: R$ ${i.total.toFixed(2)}`, 5, cy); cy += 4; });
        doc.text(`TOTAL: R$ ${p.total.toFixed(2)}`, 75, cy+2, null, null, "right");
        return cy + 15;
    }
    let prox = via(10, "VIA CLIENTE");
    doc.line(0, prox-5, 80, prox-5);
    via(prox+5, "VIA PRODUÇÃO");
    window.open(doc.output('bloburl'), '_blank');
}

// ADMIN GESTÃO
function renderizarListaAdmin() {
    const div = document.getElementById('listaGerenciarProdutos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>SKU</th><th>Nome</th><th>Ações</th></tr></thead><tbody>` + 
        bancoDeDados.map(p => `<tr><td>${p.sku}</td><td>${p.nome}</td><td><button onclick="editarProduto('${p.id}')">Editar</button><button onclick="excluirItem('catalogo', '${p.id}')" style="color:red">X</button></td></tr>`).join('') + `</tbody></table>`;
}

function editarProduto(id) {
    const p = bancoDeDados.find(i => i.id === id);
    document.getElementById('editId').value = p.id;
    document.getElementById('adminSku').value = p.sku || "";
    document.getElementById('adminNome').value = p.nome;
    document.getElementById('adminPreco').value = p.preco;
    document.getElementById('adminCatSelect').value = p.categoria;
    document.getElementById('adminTipo').value = p.tipo;
    document.getElementById('adminImg').value = p.img || "";
    document.getElementById('btnSalvarProd').innerText = "Atualizar Produto";
    window.scrollTo(0,0);
}

function renderizarListaCategorias() {
    const div = document.getElementById('listaGerenciarCategorias');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>Categoria</th><th>Ações</th></tr></thead><tbody>` + 
        categorias.map(c => `<tr><td>${c.nome}</td><td><button onclick="editarCategoria('${c.id}')">Editar</button><button onclick="excluirItem('categorias', '${c.id}')" style="color:red">X</button></td></tr>`).join('') + `</tbody></table>`;
}

function editarCategoria(id) {
    const c = categorias.find(i => i.id === id);
    document.getElementById('editCatId').value = c.id;
    document.getElementById('catNome').value = c.nome;
    document.getElementById('btnSalvarCat').innerText = "Atualizar";
}

function renderizarListaAcabamentos() {
    const div = document.getElementById('listaGerenciarAcabamentos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>Acabamento</th><th>Ações</th></tr></thead><tbody>` + 
        acabamentos.map(a => `<tr><td>${a.nome}</td><td><button onclick="editarAcabamento('${a.id}')">Editar</button><button onclick="excluirItem('acabamentos', '${a.id}')" style="color:red">X</button></td></tr>`).join('') + `</tbody></table>`;
}

function editarAcabamento(id) {
    const a = acabamentos.find(i => i.id === id);
    document.getElementById('editAcabId').value = a.id;
    document.getElementById('acabNome').value = a.nome;
    document.getElementById('acabPreco').value = a.preco;
    document.getElementById('btnSalvarAcab').innerText = "Atualizar";
}

// FINANCEIRO
async function calcularFinanceiro() {
    let faturamento = pedidosGVA.reduce((acc, p) => acc + (p.total || 0), 0);
    const snap = await db.collection("financeiro_avulso").get();
    let extras = 0, saidas = 0;
    snap.forEach(doc => { const d = doc.data(); if(d.tipo === 'entrada') extras += d.valor; else saidas += d.valor; });
    document.getElementById('finFaturamento').innerText = faturamento.toFixed(2);
    document.getElementById('finSaidas').innerText = saidas.toFixed(2);
    document.getElementById('finSaldo').innerText = (faturamento + extras - saidas).toFixed(2);
}

// AUXILIARES
function mudarAba(aba) {
    const titulos = { cliente: "Catálogo", carrinho: "Novo Orçamento", loja: "Produção", caixa: "Financeiro", admin: "Configurações" };
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

async function salvarNovoProduto() {
    const id = document.getElementById('editId').value;
    const d = { sku: document.getElementById('adminSku').value, nome: document.getElementById('adminNome').value, preco: parseFloat(document.getElementById('adminPreco').value), categoria: document.getElementById('adminCatSelect').value, tipo: document.getElementById('adminTipo').value, img: document.getElementById('adminImg').value };
    if(id) await db.collection("catalogo").doc(id).update(d); else await db.collection("catalogo").add(d);
    limparFormAdmin();
}

async function salvarCategoria() {
    const id = document.getElementById('editCatId').value;
    const nome = document.getElementById('catNome').value;
    if(id) await db.collection("categorias").doc(id).update({nome}); else await db.collection("categorias").add({nome});
    document.getElementById('catNome').value = ""; document.getElementById('editCatId').value = ""; document.getElementById('btnSalvarCat').innerText = "Salvar";
}

async function salvarAcabamento() {
    const id = document.getElementById('editAcabId').value;
    const d = { nome: document.getElementById('acabNome').value, preco: parseFloat(document.getElementById('acabPreco').value) };
    if(id) await db.collection("acabamentos").doc(id).update(d); else await db.collection("acabamentos").add(d);
    document.getElementById('acabNome').value = ""; document.getElementById('acabPreco').value = ""; document.getElementById('editAcabId').value = ""; document.getElementById('btnSalvarAcab').innerText = "Salvar";
}

function toggleCamposPagamento() { document.getElementById('divParcelas').style.display = document.getElementById('formaPagamento').value === 'CreditoParc' ? 'block' : 'none'; }
function toggleCamposEntrega() { document.getElementById('divMotoboy').style.display = document.getElementById('metodoEntrega').value === 'Motoboy' ? 'block' : 'none'; }
function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function excluirItem(coll, id) { if(confirm("Excluir?")) db.collection(coll).doc(id).delete(); }
function limparFormAdmin() { document.getElementById('editId').value = ""; document.getElementById('adminSku').value = ""; document.getElementById('adminNome').value = ""; document.getElementById('adminPreco').value = ""; document.getElementById('btnSalvarProd').innerText = "Salvar Produto"; }
function fazerLogin() { auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value, document.getElementById('loginSenha').value); }
function fazerLogout() { auth.signOut().then(() => window.location.reload()); }
function abrirLancamento(tipo) { const v = prompt(`Valor (R$):`); const d = prompt(`Descrição:`); if(v && d) db.collection("financeiro_avulso").add({ tipo, valor: parseFloat(v), desc: d, data: new Date().toLocaleDateString('pt-BR') }); }
function enviarWA(idx) { const p = pedidosGVA[idx]; const msg = window.encodeURIComponent(`Olá ${p.cliente}, o status do seu pedido na GVA mudou para: ${p.status}`); window.open(`https://wa.me/55${p.telefone.replace(/\D/g,'')}?text=${msg}`); }
