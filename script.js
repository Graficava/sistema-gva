// CONFIGURAÇÃO DO FIREBASE (Chaves que você mandou)
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

let bancoDeDados = [];
let pedidosGVA = [];
let carrinho = [];

// ==========================================
// CONTROLE DE ACESSO (LOGIN)
// ==========================================

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('telaLogin').style.display = 'none';
        // Define o nível de acesso baseado no e-mail (Exemplo simplificado)
        if (user.email === 'contato@graficavenomarts.com.br') { // TROQUE PELO SEU E-MAIL
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
    auth.signInWithEmailAndPassword(e, s).catch(err => mostrarAlerta("Erro: " + err.message));
}

function fazerLogout() { auth.signOut(); }

// ==========================================
// SINCRONIZAÇÃO COM O FIREBASE
// ==========================================

function iniciarSincronizacao() {
    // Sincroniza Catálogo
    db.collection("catalogo").onSnapshot(snap => {
        bancoDeDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        carregarProdutos();
    });

    // Sincroniza Pedidos
    db.collection("pedidos").onSnapshot(snap => {
        pedidosGVA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarProducao();
    });
}

function carregarProdutos() {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    bancoDeDados.forEach(p => {
        grade.innerHTML += `
            <div class="card">
                <small>${p.categoria}</small>
                <h4>${p.nome}</h4>
                <p class="preco">R$ ${p.preco.toFixed(2)}</p>
                <button class="acao" onclick="adicionarAoCarrinho('${p.id}')">Adicionar</button>
            </div>`;
    });
}

function salvarNovoProduto() {
    const p = {
        nome: document.getElementById('adminNome').value,
        preco: parseFloat(document.getElementById('adminPreco').value),
        categoria: document.getElementById('adminCategoria').value,
        vendas: 0
    };
    db.collection("catalogo").add(p).then(() => mostrarAlerta("Produto cadastrado!"));
}

// ==========================================
// LOGICA DE ORÇAMENTO E RECIBO
// ==========================================

function adicionarAoCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    carrinho.push({ nome: p.nome, total: p.preco });
    atualizarCarrinho();
    mostrarAlerta("Item adicionado!");
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let total = 0;
    div.innerHTML = carrinho.map(i => {
        total += i.total;
        return `<div>• ${i.nome}</div>`;
    }).join('') || "Nenhum item.";

    let desc = parseFloat(document.getElementById('valorDesconto').value) || 0;
    let sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    let final = total - desc;
    
    document.getElementById('totalCarrinho').innerText = final.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (final - sinal).toFixed(2);
}

function gerarReciboPDF(index) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[index];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });

    // USA O LOGO BLACK PARA O RECIBO
    try {
        const img = document.getElementById('logoGVA_Preto');
        doc.addImage(img, 'PNG', 20, 5, 40, 15);
    } catch(e) {}

    doc.setFontSize(10);
    doc.text("GVA VENOM ARTS", 40, 25, null, null, "center");
    doc.text("--------------------------------", 40, 30, null, null, "center");
    doc.text("Cliente: " + p.cliente, 5, 35);
    doc.text("Total: R$ " + p.total.toFixed(2), 5, 45);
    doc.text("Sinal: R$ " + p.sinal.toFixed(2), 5, 50);
    doc.text("Falta: R$ " + p.restante.toFixed(2), 5, 55);
    
    doc.save(`Recibo_${p.cliente}.pdf`);
}

// Funções de aba e alertas permanecem as mesmas (mudarAba, mostrarAlerta, etc)
function mudarAba(aba) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}

function mostrarAlerta(m) { document.getElementById('alertaTexto').innerText = m; document.getElementById('alertaFundo').style.display = 'flex'; }
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
