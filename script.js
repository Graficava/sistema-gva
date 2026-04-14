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
    } else {
        document.getElementById('telaLogin').style.display = 'flex';
    }
});

function iniciarSincronizacao() {
    db.collection("categorias").onSnapshot(snap => {
        categorias = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarMenus();
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
    });
}

// MUDAR ABA E TÍTULO (ITEM 2)
function mudarAba(aba) {
    const titulos = { cliente: "Catálogo", carrinho: "Orçamento", loja: "Produção", caixa: "Financeiro", admin: "Configurações" };
    document.getElementById('tituloPagina').innerText = titulos[aba];
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}

// CONFIGURADOR COM LIMITES DE MEDIDA (ITEM 5)
function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let html = `<div class="card-header">Configurar: ${p.nome}</div><div class="card-body gva-form-large">`;
    
    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        const maxL = p.tipo === 'm_linear' ? 1.50 : 3.10;
        html += `<label>Largura Máx: ${maxL}m</label>
                 <input type="number" id="cfgL" value="1.00" step="0.01" onchange="validarMedida(this, ${maxL})">
                 <label>Comprimento Máx: 100m</label>
                 <input type="number" id="cfgA" value="1.00" step="0.01" onchange="validarMedida(this, 100)">`;
    } else {
        html += `<label>Quantidade:</label><input type="number" id="cfgQ" value="1">`;
    }

    html += `<label>Acabamentos:</label><div style="display:grid; grid-template-columns:1fr 1fr; gap:5px;">`;
    acabamentos.forEach(a => {
        html += `<label style="font-size:11px;"><input type="checkbox" class="check-acab" data-preco="${a.preco}" value="${a.nome}"> ${a.nome}</label>`;
    });
    html += `</div><button class="btn-success" onclick="confirmarCarrinho('${p.id}')">Adicionar</button>
             <button class="btn-gva" style="background:#666; margin-top:10px;" onclick="fecharModal()">Voltar</button></div>`;
    
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function validarMedida(el, max) { if(el.value > max) { alert(`Limite excedido: máx ${max}m`); el.value = max; } }

function enviarWhatsApp(index) {
    const p = pedidosGVA[index];
    const msg = window.encodeURIComponent(`Olá ${p.cliente}, o status do seu pedido na GVA mudou para: ${p.status}`);
    window.open(`https://wa.me/55${p.telefone.replace(/\D/g,'')}?text=${msg}`);
}

// GERENCIAMENTO ADMIN (ITENS 1, 7, 8)
function renderizarListaAdmin() {
    const div = document.getElementById('listaGerenciarProdutos');
    div.innerHTML = `<table class="wp-table"><tr><th>Nome</th><th>Preço</th><th>Ações</th></tr>` + 
        bancoDeDados.map(p => `<tr><td>${p.nome}</td><td>R$ ${p.preco}</td><td>
        <button onclick="excluirItem('catalogo', '${p.id}')" style="color:red;">Excluir</button></td></tr>`).join('') + `</table>`;
}

function renderizarMenus() {
    const nav = document.getElementById('menuCategorias');
    const select = document.getElementById('adminCatSelect');
    nav.innerHTML = `<button class="active" onclick="filtrarCat('Todos')">Todos</button>` + 
        categorias.map(c => `<button onclick="filtrarCat('${c.nome}')">${c.nome}</button>`).join('');
    select.innerHTML = categorias.map(c => `<option>${c.nome}</option>`).join('');
}

function salvarCategoria() { 
    const nome = document.getElementById('catNome').value;
    if(nome) db.collection("categorias").add({ nome }).then(() => document.getElementById('catNome').value = "");
}

function salvarAcabamento() {
    const nome = document.getElementById('acabNome').value;
    const preco = parseFloat(document.getElementById('acabPreco').value);
    if(nome) db.collection("acabamentos").add({ nome, preco }).then(() => document.getElementById('acabNome').value = "");
}

function excluirItem(coll, id) { if(confirm("Excluir?")) db.collection(coll).doc(id).delete(); }

function toggleAdminSub(sub) {
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.getElementById('subAdmin' + sub.charAt(0).toUpperCase() + sub.slice(1)).style.display = 'block';
}

// Funções de login, orçamento, modal e outras permanecem as mesmas (com pequenos ajustes de campos)
function fazerLogin() {
    const e = document.getElementById('loginEmail').value;
    const s = document.getElementById('loginSenha').value;
    auth.signInWithEmailAndPassword(e, s).catch(err => alert("Erro: " + err.message));
}

function fazerLogout() { auth.signOut().then(() => window.location.reload()); }

function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
function mostrarAlerta(m) { document.getElementById('alertaTexto').innerText = m; document.getElementById('alertaFundo').style.display = 'flex'; }
function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function toggleParcelas() { document.getElementById('divParcelas').style.display = document.getElementById('formaPagamento').value === 'CreditoParc' ? 'block' : 'none'; }
function toggleMotoboy() { document.getElementById('divMotoboy').style.display = document.getElementById('metodoEntrega').value === 'Motoboy' ? 'block' : 'none'; }

function atualizarCarrinho() {
    const t = carrinho.reduce((acc, i) => acc + i.total, 0) + (parseFloat(document.getElementById('valorMotoboy').value) || 0);
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (t - sinal).toFixed(2);
}

function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, idx) => `
        <div class="gva-card">
            <div class="card-header">👤 ${p.cliente} | ${p.status}</div>
            <div class="card-body">
                <button class="status-btn" onclick="enviarWhatsApp(${idx})"><i class="fab fa-whatsapp"></i> Status</button>
            </div>
        </div>`).join('');
}
