// CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBcyn6czVVa_vgtvKvS9c27gUGBbSKNibM",
    authDomain: "gva-sistema.firebaseapp.com",
    projectId: "gva-sistema",
    storageBucket: "gva-sistema.firebasestorage.app", // Onde as fotos moram
    messagingSenderId: "400970884558",
    appId: "1:400970884558:web:add97c5812d0965976b79f"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

const EMAIL_ADMIN = "contato@graficava.com.br"; 

let bancoDeDados = [];
let pedidosGVA = [];
let carrinho = [];

// ==========================================
// LOGIN E ACESSO
// ==========================================
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
    auth.signInWithEmailAndPassword(e, s).catch(err => mostrarAlerta("Usuário/Senha inválidos."));
}

function fazerLogout() { auth.signOut().then(() => window.location.reload()); }

// ==========================================
// SINCRONIZAÇÃO
// ==========================================
function iniciarSincronizacao() {
    db.collection("catalogo").onSnapshot(snap => {
        bancoDeDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        carregarProdutos();
        carregarTabelaAdmin();
    });
    db.collection("pedidos").onSnapshot(snap => {
        pedidosGVA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Adicionar função de atualizar lista de produção aqui se desejar
    });
}

// ==========================================
// CATALOGO (ZAP STYLE)
// ==========================================
function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    lista.sort((a,b) => (b.vendas || 0) - (a.vendas || 0)).forEach(p => {
        grade.innerHTML += `
            <div class="zap-card">
                <img src="${p.img || 'https://placehold.co/400x300?text=GVA'}" class="zap-img">
                <div class="zap-info">
                    <small>${p.categoria}</small>
                    <h4>${p.nome}</h4>
                    <p class="zap-price">R$ ${p.preco.toFixed(2)}</p>
                    <button class="wp-btn-blue" onclick="abrirConfigurador('${p.id}')">Configurar</button>
                </div>
            </div>`;
    });
}

function filtrarProdutos() {
    const busca = document.getElementById('buscaProduto').value.toLowerCase();
    const filtrados = bancoDeDados.filter(p => p.nome.toLowerCase().includes(busca));
    carregarProdutos(filtrados);
}

// ==========================================
// ADMIN: CADASTRAR, UPLOAD E EDITAR
// ==========================================
async function salvarNovoProduto() {
    const btn = document.getElementById('btnSalvarProduto');
    const id = document.getElementById('editId').value;
    const nome = document.getElementById('adminNome').value;
    const preco = parseFloat(document.getElementById('adminPreco').value);
    const file = document.getElementById('adminFile').files[0];
    const tipo = document.getElementById('adminTipo').value;
    const cat = document.getElementById('adminCategoria').value;

    if(!nome || isNaN(preco)) return mostrarAlerta("Preencha Nome e Preço!");

    btn.innerText = "⏳ Processando...";
    btn.disabled = true;

    try {
        let urlFinal = "";
        
        // Se o usuário selecionou uma foto nova, faz upload
        if (file) {
            const ref = storage.ref(`produtos/${Date.now()}_${file.name}`);
            await ref.put(file);
            urlFinal = await ref.getDownloadURL();
        } else if (id) {
            // Se for edição e não mudou a foto, mantém a antiga
            const prodAntigo = bancoDeDados.find(p => p.id === id);
            urlFinal = prodAntigo.img || "";
        }

        const dados = {
            nome: nome,
            preco: preco,
            img: urlFinal,
            tipo: tipo,
            categoria: cat,
            vendas: id ? (bancoDeDados.find(p => p.id === id).vendas || 0) : 0
        };

        if (id) {
            await db.collection("catalogo").doc(id).update(dados);
            mostrarAlerta("✅ Produto atualizado!");
        } else {
            await db.collection("catalogo").add(dados);
            mostrarAlerta("✅ Produto cadastrado!");
        }

        limparFormAdmin();
    } catch (e) {
        mostrarAlerta("Erro ao salvar produto.");
        console.error(e);
    } finally {
        btn.innerText = id ? "Atualizar Produto" : "Cadastrar Produto";
        btn.disabled = false;
    }
}

function carregarTabelaAdmin() {
    const tbody = document.getElementById('tabelaProdutosAdmin');
    tbody.innerHTML = bancoDeDados.map(p => `
        <tr>
            <td><img src="${p.img}" class="img-thumb"></td>
            <td><b>${p.nome}</b></td>
            <td>R$ ${p.preco.toFixed(2)}</td>
            <td>
                <button class="wp-button" onclick="prepararEdicao('${p.id}')">Editar</button>
                <button class="wp-button" style="color:red; border-color:red;" onclick="excluirProduto('${p.id}')">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function prepararEdicao(id) {
    const p = bancoDeDados.find(item => item.id === id);
    document.getElementById('editId').value = p.id;
    document.getElementById('adminNome').value = p.nome;
    document.getElementById('adminPreco').value = p.preco;
    document.getElementById('adminTipo').value = p.tipo;
    document.getElementById('adminCategoria').value = p.categoria;
    document.getElementById('btnSalvarProduto').innerText = "Atualizar Produto";
    toggleAdminSub('novo');
}

async function excluirProduto(id) {
    if(confirm("Deseja realmente excluir este produto?")) {
        await db.collection("catalogo").doc(id).delete();
        mostrarAlerta("Produto removido.");
    }
}

function limparFormAdmin() {
    document.getElementById('editId').value = "";
    document.getElementById('adminNome').value = "";
    document.getElementById('adminPreco').value = "";
    document.getElementById('adminFile').value = "";
    document.getElementById('btnSalvarProduto').innerText = "Cadastrar Produto";
}

// ==========================================
// UTILITÁRIOS DE INTERFACE
// ==========================================
function mudarAba(aba) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.wp-menu button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    const titulos = { 'cliente': 'Produtos', 'carrinho': 'Novo Orçamento', 'loja': 'Produção', 'caixa': 'Financeiro', 'admin': 'Configurações' };
    document.getElementById('tituloPagina').innerText = titulos[aba] || 'Painel GVA';
}

function toggleAdminSub(sub) {
    document.getElementById('subAdminNovo').style.display = sub === 'novo' ? 'block' : 'none';
    document.getElementById('subAdminLista').style.display = sub === 'lista' ? 'block' : 'none';
    const btns = document.querySelectorAll('.wp-sub-nav button');
    btns[0].classList.toggle('sub-active', sub === 'novo');
    btns[1].classList.toggle('sub-active', sub === 'lista');
}

function abrirConfigurador(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let html = `<div class="wp-box-title">Configurar: ${p.nome}</div><div class="wp-box-content wp-form">`;
    if(p.tipo === 'm2') html += `<label>Largura:</label><input type="number" id="cfgL" value="1"><label>Altura:</label><input type="number" id="cfgA" value="1">`;
    else html += `<label>Quantidade:</label><input type="number" id="cfgQ" value="1">`;
    html += `<button class="wp-btn-blue full" onclick="adicionarAoCarrinho('${p.id}')">Adicionar</button></div>`;
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function adicionarAoCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let total = 0;
    if(p.tipo === 'm2') { total = parseFloat(document.getElementById('cfgL').value) * parseFloat(document.getElementById('cfgA').value) * p.preco; }
    else { total = parseInt(document.getElementById('cfgQ').value) * p.preco; }
    carrinho.push({ nome: p.nome, total: total });
    fecharModal(); atualizarCarrinho();
}

function atualizarCarrinho() {
    const t = carrinho.reduce((acc, i) => acc + i.total, 0);
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (t - sinal).toFixed(2);
    document.getElementById('listaCarrinho').innerHTML = carrinho.map(i => `<div>${i.nome} - R$ ${i.total.toFixed(2)}</div>`).join('');
}

function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function mostrarAlerta(m) { document.getElementById('alertaTexto').innerText = m; document.getElementById('alertaFundo').style.display = 'flex'; }
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
