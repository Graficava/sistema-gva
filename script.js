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

let bancoDeDados = [];
let pedidosGVA = [];
let carrinho = [];

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

function fazerLogin() {
    const e = document.getElementById('loginEmail').value;
    const s = document.getElementById('loginSenha').value;
    auth.signInWithEmailAndPassword(e, s).catch(err => alert("Acesso negado."));
}

function fazerLogout() { auth.signOut().then(() => window.location.reload()); }

function iniciarSincronizacao() {
    db.collection("catalogo").onSnapshot(snap => {
        bancoDeDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        carregarProdutos();
        renderizarListaAdmin();
    }, err => console.error("Erro no Banco:", err));

    db.collection("pedidos").orderBy("dataCriacao", "desc").onSnapshot(snap => {
        pedidosGVA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarProducao();
    });
}

function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    const cores = ['#3E3B9F', '#00a859', '#dc3545', '#17a2b8', '#ffc107'];
    
    lista.sort((a,b) => (b.vendas || 0) - (a.vendas || 0)).forEach((p, idx) => {
        let visual = p.img ? `<img src="${p.img}" class="zap-img" onerror="this.style.display='none'; this.nextSibling.style.display='flex'">` : '';
        let fallback = `<div class="zap-color-bg" style="background:${cores[idx % cores.length]}; display:${p.img ? 'none' : 'flex'}">${p.nome}</div>`;

        grade.innerHTML += `<div class="zap-card">${visual}${fallback}
            <div class="zap-info"><small>${p.categoria || 'Geral'}</small><h4>${p.nome}</h4>
            <p class="zap-price">R$ ${p.preco.toFixed(2)}</p>
            <button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Configurar</button></div></div>`;
    });
}

async function salvarNovoProduto() {
    const btn = document.getElementById('btnSalvarProduto');
    const id = document.getElementById('editId').value;
    const nome = document.getElementById('adminNome').value;
    const preco = parseFloat(document.getElementById('adminPreco').value);
    
    if(!nome || isNaN(preco)) return alert("Preencha nome e preço!");

    btn.innerText = "⏳ Gravando...";
    btn.disabled = true;

    const dados = {
        nome: nome,
        preco: preco,
        img: document.getElementById('adminImg').value,
        tipo: document.getElementById('adminTipo').value,
        categoria: document.getElementById('adminCategoria').value,
        vendas: id ? (bancoDeDados.find(p => p.id === id).vendas || 0) : 0
    };

    try {
        if (id) { await db.collection("catalogo").doc(id).update(dados); } 
        else { await db.collection("catalogo").add(dados); }
        alert("Sucesso!");
        limparFormAdmin();
    } catch (err) {
        alert("Erro ao gravar. Verifique as Regras do Firebase.");
        console.error(err);
    } finally {
        btn.innerText = "Cadastrar Produto";
        btn.disabled = false;
    }
}

function renderizarListaAdmin() {
    const container = document.getElementById('listaGerenciarAdmin');
    container.innerHTML = `<table style="width:100%; background:white; border-radius:10px; border-collapse:collapse; overflow:hidden;">
        <thead style="background:#eee; text-align:left;"><tr><th style="padding:15px;">Produto</th><th style="padding:15px;">Preço</th><th style="padding:15px;">Ações</th></tr></thead>
        <tbody>${bancoDeDados.map(p => `
            <tr style="border-bottom:1px solid #eee;"><td style="padding:15px;">${p.nome}</td><td style="padding:15px;">R$ ${p.preco.toFixed(2)}</td>
            <td style="padding:15px;"><button onclick="editarProduto('${p.id}')" style="color:blue; background:none; border:none; cursor:pointer;">Editar</button>
            <button onclick="excluirProduto('${p.id}')" style="color:red; background:none; border:none; cursor:pointer; margin-left:10px;">Excluir</button></td></tr>`).join('')}</tbody></table>`;
}

function editarProduto(id) {
    const p = bancoDeDados.find(i => i.id === id);
    document.getElementById('editId').value = p.id;
    document.getElementById('adminNome').value = p.nome;
    document.getElementById('adminPreco').value = p.preco;
    document.getElementById('adminImg').value = p.img || "";
    document.getElementById('adminTipo').value = p.tipo;
    document.getElementById('adminCategoria').value = p.categoria;
    document.getElementById('btnSalvarProduto').innerText = "Atualizar Produto";
    toggleAdminSub('novo');
}

function excluirProduto(id) { if(confirm("Remover?")) db.collection("catalogo").doc(id).delete(); }
function limparFormAdmin() { document.getElementById('editId').value = ""; document.getElementById('adminNome').value = ""; document.getElementById('adminPreco').value = ""; document.getElementById('adminImg').value = ""; document.getElementById('btnSalvarProduto').innerText = "Cadastrar Produto"; }

// LOGICA DE CARRINHO E PRODUÇÃO (RESUMIDA)
function abrirConfigurador(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let html = `<div class="card-header">Configurar: ${p.nome}</div><div class="card-body gva-form-spacious">`;
    if(p.tipo === 'm2') html += `<label>Largura (m):</label><input type="number" id="cfgL" value="1.00"><label>Altura (m):</label><input type="number" id="cfgA" value="1.00">`;
    else if(p.tipo === 'folha') html += `<label>Páginas:</label><input type="number" id="cfgF" value="10">`;
    else html += `<label>Qtd:</label><input type="number" id="cfgQ" value="1">`;
    html += `<button class="btn-success" onclick="confirmarCarrinho('${p.id}')">Adicionar</button></div>`;
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let total = 0, det = "";
    if(p.tipo === 'm2') { 
        let l = parseFloat(document.getElementById('cfgL').value), a = parseFloat(document.getElementById('cfgA').value);
        total = (l * a) * p.preco; det = `${l}x${a}m`;
    } else if(p.tipo === 'folha') {
        let f = parseInt(document.getElementById('cfgF').value);
        total = f * p.preco; det = `${f} pág`;
    } else {
        let q = parseInt(document.getElementById('cfgQ').value);
        total = q * p.preco; det = `${q} un`;
    }
    carrinho.push({ nome: p.nome, total: total, detalhes: det });
    document.getElementById('modalFundo').style.display = 'none';
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let t = carrinho.reduce((acc, i) => acc + i.total, 0);
    div.innerHTML = carrinho.map(i => `<div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px;"><span>${i.nome}</span><b>R$ ${i.total.toFixed(2)}</b></div>`).join('') || "Vazio.";
    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
    let sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    document.getElementById('restanteCarrinho').innerText = (t - sinal).toFixed(2);
}

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    if(!nome || carrinho.length === 0) return alert("Preencha o nome!");
    const total = parseFloat(document.getElementById('totalCarrinho').innerText);
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    const pedido = {
        cliente: nome, itens: [...carrinho], total: total, sinal: sinal, restante: total - sinal,
        status: "Novo Pedido 📂", dataCriacao: new Date().toLocaleDateString('pt-BR')
    };
    db.collection("pedidos").add(pedido).then(() => {
        carrinho = []; document.getElementById('nomeCliente').value = ""; atualizarCarrinho(); mudarAba('loja');
    });
}

function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, idx) => `
        <div class="gva-card">
            <div class="card-header" style="display:flex; justify-content:space-between;"><span>👤 ${p.cliente}</span><small>${p.status}</small></div>
            <div class="card-body">
                <p style="font-size:12px;">${p.itens.map(i => i.nome).join(', ')}</p>
                <button class="btn-gva" style="font-size:11px; padding:5px 15px;" onclick="imprimirCupom(${idx})">Cupom</button>
            </div>
        </div>`).join('') || "Fila vazia.";
}

function filtrarProdutos() {
    const b = document.getElementById('buscaProduto').value.toLowerCase();
    carregarProdutos(bancoDeDados.filter(p => p.nome.toLowerCase().includes(b)));
}

function mudarAba(aba) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}

function toggleAdminSub(sub) {
    document.getElementById('subAdminNovo').style.display = sub === 'novo' ? 'block' : 'none';
    document.getElementById('subAdminLista').style.display = sub === 'lista' ? 'block' : 'none';
    document.getElementById('subBtnNovo').classList.toggle('sub-active', sub === 'novo');
    document.getElementById('subBtnLista').classList.toggle('sub-active', sub === 'lista');
}

function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
function mostrarAlerta(m) { document.getElementById('alertaTexto').innerText = m; document.getElementById('alertaFundo').style.display = 'flex'; }
