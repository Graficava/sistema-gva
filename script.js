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

// CATALOGO E FILTROS
function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    lista.forEach(p => {
        const visual = p.img ? `<img src="${p.img}" class="zap-img">` : `<div class="zap-color-bg">${p.sku || 'GVA'}</div>`;
        grade.innerHTML += `<div class="zap-card">${visual}<div class="zap-info"><small>${p.categoria}</small><h4>${p.nome}</h4><p>R$ ${p.preco.toFixed(2)}</p><button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Configurar</button></div></div>`;
    });
}

// ADMIN GESTÃO (EDITAR/EXCLUIR)
function renderizarListaAdmin() {
    const div = document.getElementById('listaGerenciarProdutos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>SKU</th><th>Nome</th><th>Ações</th></tr></thead><tbody>` + 
        bancoDeDados.map(p => `<tr><td>${p.sku || '--'}</td><td>${p.nome}</td><td><button onclick="editarProduto('${p.id}')">Editar</button><button onclick="excluirItem('catalogo', '${p.id}')" style="color:red; margin-left:10px;">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
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
}

async function salvarNovoProduto() {
    const id = document.getElementById('editId').value;
    const d = { sku: document.getElementById('adminSku').value, nome: document.getElementById('adminNome').value, preco: parseFloat(document.getElementById('adminPreco').value), categoria: document.getElementById('adminCatSelect').value, tipo: document.getElementById('adminTipo').value, img: document.getElementById('adminImg').value };
    if(id) await db.collection("catalogo").doc(id).update(d); else await db.collection("catalogo").add(d);
    limparFormAdmin();
}

// CATEGORIAS E ACABAMENTOS (MESMA LÓGICA)
function renderizarListaCategorias() {
    const div = document.getElementById('listaGerenciarCategorias');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>Categoria</th><th>Ações</th></tr></thead><tbody>` + 
        categorias.map(c => `<tr><td>${c.nome}</td><td><button onclick="editarCategoria('${c.id}')">Editar</button><button onclick="excluirItem('categorias', '${c.id}')" style="color:red; margin-left:10px;">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

function editarCategoria(id) {
    const c = categorias.find(i => i.id === id);
    document.getElementById('editCatId').value = c.id;
    document.getElementById('catNome').value = c.nome;
}

async function salvarCategoria() {
    const id = document.getElementById('editCatId').value;
    const nome = document.getElementById('catNome').value;
    if(id) await db.collection("categorias").doc(id).update({nome}); else await db.collection("categorias").add({nome});
    document.getElementById('catNome').value = ""; document.getElementById('editCatId').value = "";
}

function renderizarListaAcabamentos() {
    const div = document.getElementById('listaGerenciarAcabamentos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>Acabamento</th><th>R$</th><th>Ações</th></tr></thead><tbody>` + 
        acabamentos.map(a => `<tr><td>${a.nome}</td><td>${a.preco.toFixed(2)}</td><td><button onclick="editarAcabamento('${a.id}')">Editar</button><button onclick="excluirItem('acabamentos', '${a.id}')" style="color:red; margin-left:10px;">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

function editarAcabamento(id) {
    const a = acabamentos.find(i => i.id === id);
    document.getElementById('editAcabId').value = a.id;
    document.getElementById('acabNome').value = a.nome;
    document.getElementById('acabPreco').value = a.preco;
}

async function salvarAcabamento() {
    const id = document.getElementById('editAcabId').value;
    const d = { nome: document.getElementById('acabNome').value, preco: parseFloat(document.getElementById('acabPreco').value) };
    if(id) await db.collection("acabamentos").doc(id).update(d); else await db.collection("acabamentos").add(d);
    document.getElementById('acabNome').value = ""; document.getElementById('acabPreco').value = ""; document.getElementById('editAcabId').value = "";
}

// PRODUÇÃO 7 ETAPAS
function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, idx) => `
        <div class="gva-card">
            <div class="card-header" style="display:flex; justify-content:space-between;"><span>👤 ${p.cliente}</span>
            <select onchange="mudarStatus('${p.id}', this.value)" style="font-size:10px;">
                <option ${p.status === '💰 Pagamento' ? 'selected' : ''}>💰 Pagamento</option>
                <option ${p.status === '📂 Verif. Arquivos' ? 'selected' : ''}>📂 Verif. Arquivos</option>
                <option ${p.status === '🖨️ Impressão' ? 'selected' : ''}>🖨️ Impressão</option>
                <option ${p.status === '✂️ Acabamento' ? 'selected' : ''}>✂️ Acabamento</option>
                <option ${p.status === '🏠 Pronto' ? 'selected' : ''}>🏠 Pronto</option>
                <option value="cancelar">❌ Cancelar</option><option value="entregar">📦 Entregue</option>
            </select></div>
            <div class="card-body"><p style="font-size:11px;">${p.itens.map(i => i.nome).join(', ')}</p>
            <button onclick="imprimirCupom(${idx})" style="font-size:10px;">Imprimir Nota</button></div>
        </div>`).join('');
}

function mudarStatus(id, v) {
    if(v === 'cancelar') { if(confirm("Cancelar?")) db.collection("pedidos").doc(id).delete(); }
    else if(v === 'entregar') { 
        const p = pedidosGVA.find(i => i.id === id);
        db.collection("pedidos_arquivados").add({...p, status: 'Entregue'}).then(() => db.collection("pedidos").doc(id).delete());
    } else { db.collection("pedidos").doc(id).update({status: v}); }
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

function excluirItem(coll, id) { if(confirm("Excluir permanentemente?")) db.collection(coll).doc(id).delete(); }
function limparFormAdmin() { document.getElementById('editId').value = ""; document.getElementById('adminSku').value = ""; document.getElementById('adminNome').value = ""; document.getElementById('adminPreco').value = ""; document.getElementById('btnSalvarProd').innerText = "Salvar Produto"; }
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
function renderizarMenus() {
    document.getElementById('menuCategorias').innerHTML = `<button class="active" onclick="filtrarCat('Todos')">Todos</button>` + categorias.map(c => `<button onclick="filtrarCat('${c.nome}')">${c.nome}</button>`).join('');
    document.getElementById('adminCatSelect').innerHTML = categorias.map(c => `<option>${c.nome}</option>`).join('');
}
