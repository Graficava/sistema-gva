// CONFIGURAÇÃO DO SEU FIREBASE (Sincronizado!)
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

// Variáveis Globais (Alimentadas pelo Banco de Dados)
let pedidosGVA = [];
let bancoDeDados = [];
let fluxoCaixa = [];
let pedidosConcluidosGVA = [];
let carrinho = [];
let produtoSendoConfigurado = null;

// ==========================================
// SINCRONIZAÇÃO EM TEMPO REAL (MÁGICA!)
// ==========================================

// 1. Escuta o Catálogo
db.collection("catalogo").onSnapshot((snapshot) => {
    bancoDeDados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    carregarProdutos();
});

// 2. Escuta Pedidos em Aberto
db.collection("pedidos").onSnapshot((snapshot) => {
    pedidosGVA = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    atualizarProducao();
});

// 3. Escuta Caixa e Concluídos para o Dashboard
db.collection("fluxoCaixa").onSnapshot(() => atualizarDashboard());
db.collection("pedidosConcluidos").onSnapshot(() => atualizarDashboard());

// ==========================================
// FUNÇÕES DE AÇÃO (GRAVANDO NAS NUVENS)
// ==========================================

function salvarNovoProduto() {
    const p = {
        nome: document.getElementById('adminNome').value,
        descricao: document.getElementById('adminDesc').value,
        categoria: document.getElementById('adminCategoria').value,
        preco: parseFloat(document.getElementById('adminPreco').value),
        tipo: "unidade", // Padrão
        vendas: 0
    };
    db.collection("catalogo").add(p).then(() => mostrarAlerta("Produto Salvo no Google!"));
}

function enviarPedido() {
    const nome = document.getElementById('nomeDoCliente').value;
    if (!nome) return mostrarAlerta("Nome do cliente é obrigatório!");

    const pedido = {
        cliente: nome,
        itens: [...carrinho],
        total: parseFloat(document.getElementById('totalCarrinho').innerText.replace(',', '.')),
        sinal: parseFloat(document.getElementById('valorSinal').value),
        restante: parseFloat(document.getElementById('restanteCarrinho').innerText.replace(',', '.')),
        status: "Novo Pedido 📂",
        data: new Date().toLocaleDateString('pt-BR'),
        mes: obterMesAtual()
    };

    db.collection("pedidos").add(pedido).then(() => {
        carrinho = [];
        atualizarCarrinho();
        mudarAba('loja');
    });
}

function concluirVenda(id) {
    const p = pedidosGVA.find(item => item.id === id);
    p.status = "Concluído ✅";
    p.dataConclusao = new Date().toLocaleDateString('pt-BR');
    
    db.collection("pedidosConcluidos").add(p).then(() => {
        db.collection("pedidos").doc(id).delete();
    });
}

// ==========================================
// UTILITÁRIOS E INTERFACE
// ==========================================

function mudarAba(aba) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}

function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    lista.sort((a,b) => b.vendas - a.vendas).forEach(p => {
        grade.innerHTML += `
            <div class="card">
                <div class="card-body">
                    <small>${p.categoria}</small>
                    <h4>${p.nome}</h4>
                    <p class="preco">R$ ${p.preco}</p>
                    <button class="acao" onclick="adicionarAoCarrinhoRapido('${p.id}')">Adicionar</button>
                </div>
            </div>`;
    });
}

function adicionarAoCarrinhoRapido(id) {
    const p = bancoDeDados.find(i => i.id === id);
    carrinho.push({ nome: p.nome, total: p.preco });
    atualizarCarrinho();
    mostrarAlerta("Adicionado!");
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let total = 0;
    div.innerHTML = carrinho.map(i => {
        total += i.total;
        return `<div>${i.nome} - R$ ${i.total}</div>`;
    }).join('') || "Vazio.";
    
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    document.getElementById('restanteCarrinho').innerText = (total - sinal).toFixed(2);
}

function obterMesAtual() { 
    let d = new Date(); 
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; 
}

function atualizarDashboard() {
    const m = obterMesAtual();
    document.getElementById('mesAtualTexto').innerText = m;
    // O faturamento agora virá somando os concluídos do Firebase (Lógica simplificada aqui)
    document.getElementById('faturamentoValor').innerText = "Sincronizado";
}

function mostrarAlerta(m) { 
    document.getElementById('alertaTexto').innerText = m; 
    document.getElementById('alertaFundo').style.display = 'flex'; 
}
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
