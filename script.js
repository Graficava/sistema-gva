// CONFIGURAÇÃO DO FIREBASE (Sincronizado)
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

// Variáveis de Controle
let bancoDeDados = [];
let pedidosGVA = [];
let carrinho = [];

// 1. Monitorar Usuário
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('telaLogin').style.display = 'none';
        if (user.email === 'contato@graficavenomarts.com.br') {
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
    auth.signInWithEmailAndPassword(e, s).catch(err => mostrarAlerta("Erro de Acesso: " + err.message));
}

function fazerLogout() { auth.signOut(); }

// 2. Sincronizar com Banco de Dados
function iniciarSincronizacao() {
    db.collection("catalogo").onSnapshot(snap => {
        bancoDeDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        carregarProdutos();
    });
    db.collection("pedidos").onSnapshot(snap => {
        pedidosGVA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Aqui você chamaria a função de atualizar a lista de produção
    });
}

function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    
    // Organiza por mais vendidos
    lista.sort((a,b) => (b.vendas || 0) - (a.vendas || 0)).forEach(p => {
        grade.innerHTML += `
            <div class="card">
                <img src="${p.img || 'https://placehold.co/400x300?text=GVA'}" class="card-img">
                <div class="card-info">
                    <small style="color: #888;">${p.categoria}</small>
                    <h4>${p.nome}</h4>
                    <p class="preco">R$ ${p.preco.toFixed(2)} <small style="font-size:10px;">${p.tipo === 'm2' ? '/ m²' : (p.tipo === 'folha' ? '/ pág' : '/ un')}</small></p>
                    <button class="acao" onclick="abrirConfigurador('${p.id}')">Configurar</button>
                </div>
            </div>`;
    });
}

function salvarNovoProduto() {
    const p = {
        nome: document.getElementById('adminNome').value,
        preco: parseFloat(document.getElementById('adminPreco').value),
        tipo: document.getElementById('adminTipo').value,
        categoria: document.getElementById('adminCategoria').value,
        img: document.getElementById('adminImg').value,
        vendas: 0
    };
    db.collection("catalogo").add(p).then(() => {
        mostrarAlerta("Produto cadastrado com sucesso nas nuvens!");
        document.getElementById('adminNome').value = "";
        document.getElementById('adminPreco').value = "";
    });
}

// 3. Lógica de Orçamento Complexo
function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let html = `<h3>Configurar: ${p.nome}</h3>`;
    
    if(p.tipo === 'm2') {
        html += `<label>Largura (m):</label><input type="number" id="cfgLarg" step="0.01" value="1.00">
                 <label>Altura (m):</label><input type="number" id="cfgAlt" step="0.01" value="1.00">`;
    } else if(p.tipo === 'folha') {
        html += `<label>Total de Páginas:</label><input type="number" id="cfgPag" value="10">`;
    } else {
        html += `<label>Quantidade:</label><input type="number" id="cfgQtd" value="1">`;
    }
    
    html += `<button class="acao" onclick="adicionarAoCarrinho('${p.id}')">Adicionar ao Orçamento</button>`;
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function adicionarAoCarrinho(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let totalItem = 0;
    let descItem = "";

    if(p.tipo === 'm2') {
        const l = parseFloat(document.getElementById('cfgLarg').value);
        const a = parseFloat(document.getElementById('cfgAlt').value);
        totalItem = (l * a) * p.preco;
        descItem = `${l}x${a}m ($m^2$)`;
    } else if(p.tipo === 'folha') {
        const pag = parseInt(document.getElementById('cfgPag').value);
        totalItem = pag * p.preco;
        descItem = `${pag} páginas`;
    } else {
        const q = parseInt(document.getElementById('cfgQtd').value);
        totalItem = q * p.preco;
        descItem = `${q} unidades`;
    }

    carrinho.push({ nome: p.nome, detalhes: descItem, total: totalItem });
    document.getElementById('modalFundo').style.display = 'none';
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let totalGeral = 0;
    
    div.innerHTML = carrinho.map(item => {
        totalGeral += item.total;
        return `<div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span><b>${item.nome}</b> (${item.detalhes})</span>
                    <span>R$ ${item.total.toFixed(2)}</span>
                </div>`;
    }).join('') || "Nenhum item.";

    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    const restante = totalGeral - sinal;
    
    document.getElementById('totalCarrinho').innerText = totalGeral.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (restante < 0 ? 0 : restante).toFixed(2);
}

function mostrarAlerta(m) { 
    document.getElementById('alertaTexto').innerText = m; 
    document.getElementById('alertaFundo').style.display = 'flex'; 
}
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }

function mudarAba(aba) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}
