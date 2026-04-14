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

// === COLOQUE SEU E-MAIL DE ADMIN AQUI ===
const EMAIL_ADMIN = "seu-email-aqui@exemplo.com"; 
// ========================================

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('telaLogin').style.display = 'none';
        // Se o e-mail logado for igual ao definido acima, mostra as abas extras
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
    auth.signInWithEmailAndPassword(e, s).catch(err => alert("Erro: " + err.message));
}

function fazerLogout() { auth.signOut(); }

function iniciarSincronizacao() {
    db.collection("catalogo").onSnapshot(snap => {
        const produtos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        carregarProdutos(produtos);
    });
    db.collection("pedidos").onSnapshot(snap => {
        const pedidos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        exibirProducao(pedidos);
    });
}

function carregarProdutos(lista) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    lista.forEach(p => {
        grade.innerHTML += `
            <div class="card">
                <img src="${p.img || 'https://placehold.co/400x300?text=GVA'}" class="card-img">
                <div class="card-info">
                    <h4>${p.nome}</h4>
                    <p class="preco">R$ ${p.preco.toFixed(2)}</p>
                    <button class="acao" onclick="abrirConfigurador('${p.id}')">Configurar</button>
                </div>
            </div>`;
    });
}

function exibirProducao(lista) {
    const div = document.getElementById('listaProducao');
    div.innerHTML = '';
    lista.forEach(p => {
        div.innerHTML += `
            <div class="lista-producao-item">
                <div style="display:flex; justify-content:space-between;">
                    <b>👤 ${p.cliente}</b>
                    <span style="color:var(--gva-azul)">${p.status}</span>
                </div>
                <p style="font-size:13px; color:#666;">Data: ${p.data} | Entrega: ${p.previsao}</p>
                <button class="acao" style="margin: 10px 0 0 0;" onclick="gerarReciboPDF('${p.id}')">Imprimir Cupom</button>
            </div>`;
    });
}

function mudarAba(aba) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}

// Funções de salvamento e orçamento continuam as mesmas...
