// CONFIGURAÇÃO FIREBASE GVA
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

const EMAIL_ADMIN = "contato@graficava.com.br"; // E-mail oficial do Bruno

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
    auth.signInWithEmailAndPassword(e, s).catch(err => mostrarAlerta("Dados de acesso inválidos."));
}

function fazerLogout() { auth.signOut().then(() => window.location.reload()); }

// ==========================================
// SINCRONIZAÇÃO
// ==========================================
function iniciarSincronizacao() {
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

// ==========================================
// CATALOGO (ZAP STYLE COM CORES FALLBACK)
// ==========================================
function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    
    // Cores para quando não houver imagem
    const cores = ['#3E3B9F', '#00a859', '#dc3545', '#17a2b8', '#ffc107', '#6f42c1'];

    lista.sort((a,b) => (b.vendas || 0) - (a.vendas || 0)).forEach((p, idx) => {
        let visual = p.img ? `<img src="${p.img}" class="zap-img" onerror="this.parentElement.innerHTML='<div class=\'zap-color-bg\' style=\'background:${cores[idx % cores.length]}\'>${p.nome}</div>'">` 
                           : `<div class="zap-color-bg" style="background:${cores[idx % cores.length]}">${p.nome}</div>`;

        grade.innerHTML += `
            <div class="zap-card">
                ${visual}
                <div class="zap-info">
                    <small style="color:var(--gva-azul); font-weight:bold;">${p.categoria || 'Geral'}</small>
                    <h4>${p.nome}</h4>
                    <p class="zap-price">R$ ${p.preco.toFixed(2)}</p>
                    <button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Configurar</button>
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
// ADMIN: CADASTRO VIA LINK (FIXED)
// ==========================================
function salvarNovoProduto() {
    const btn = document.getElementById('btnSalvarProduto');
    const id = document.getElementById('editId').value;
    const nome = document.getElementById('adminNome').value;
    const preco = parseFloat(document.getElementById('adminPreco').value);
    const imgLink = document.getElementById('adminImg').value;
    const tipo = document.getElementById('adminTipo').value;
    const cat = document.getElementById('adminCategoria').value;

    if(!nome || isNaN(preco)) return mostrarAlerta("Preencha o nome e o preço.");

    btn.innerText = "⏳ Gravando...";
    btn.disabled = true;

    const dados = {
        nome: nome,
        preco: preco,
        img: imgLink,
        tipo: tipo,
        categoria: cat,
        vendas: id ? (bancoDeDados.find(p => p.id === id).vendas || 0) : 0
    };

    const acao = id ? db.collection("catalogo").doc(id).update(dados) : db.collection("catalogo").add(dados);

    acao.then(() => {
        mostrarAlerta(id ? "Produto Atualizado!" : "Produto Cadastrado!");
        limparFormAdmin();
    }).catch(err => {
        mostrarAlerta("Erro ao salvar.");
        console.error(err);
    }).finally(() => {
        btn.innerText = "Cadastrar Produto";
        btn.disabled = false;
    });
}

function renderizarListaAdmin() {
    const container = document.getElementById('listaGerenciarAdmin');
    container.innerHTML = `<table style="width:100%; border-collapse: collapse; background:white; border-radius:10px; overflow:hidden;">
        <thead style="background:#eee; text-align:left;">
            <tr><th style="padding:12px;">Produto</th><th style="padding:12px;">Preço</th><th style="padding:12px;">Ações</th></tr>
        </thead>
        <tbody>
            ${bancoDeDados.map(p => `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px;">${p.nome}</td>
                    <td style="padding:12px;">R$ ${p.preco.toFixed(2)}</td>
                    <td style="padding:12px;">
                        <button onclick="editarProduto('${p.id}')" style="cursor:pointer; border:none; background:none; color:blue; font-weight:bold;">Editar</button>
                        <button onclick="excluirProduto('${p.id}')" style="cursor:pointer; border:none; background:none; color:red; margin-left:15px; font-weight:bold;">Excluir</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>`;
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

function excluirProduto(id) {
    if(confirm("Deseja remover este produto?")) db.collection("catalogo").doc(id).delete();
}

function limparFormAdmin() {
    document.getElementById('editId').value = "";
    document.getElementById('adminNome').value = "";
    document.getElementById('adminPreco').value = "";
    document.getElementById('adminImg').value = "";
    document.getElementById('btnSalvarProduto').innerText = "Cadastrar Produto";
}

// ==========================================
// ORÇAMENTO E PRODUÇÃO
// ==========================================
function abrirConfigurador(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let html = `<div class="card-header">Configurar: ${p.nome}</div><div class="card-body gva-form">`;
    if(p.tipo === 'm2') {
        html += `<label>Largura (m):</label><input type="number" id="cfgL" value="1.00" step="0.01">
                 <label>Altura (m):</label><input type="number" id="cfgA" value="1.00" step="0.01">`;
    } else {
        html += `<label>Quantidade:</label><input type="number" id="cfgQ" value="1">`;
    }
    html += `<button class="btn-gva" style="width:100%" onclick="confirmarCarrinho('${p.id}')">Adicionar</button></div>`;
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let total = 0; let det = "";
    if(p.tipo === 'm2') {
        const l = parseFloat(document.getElementById('cfgL').value);
        const a = parseFloat(document.getElementById('cfgA').value);
        total = (l * a) * p.preco; det = `${l}x${a}m (Área)`;
    } else {
        const q = parseInt(document.getElementById('cfgQ').value);
        total = q * p.preco; det = `${q} un`;
    }
    carrinho.push({ nome: p.nome, total: total, detalhes: det });
    document.getElementById('modalFundo').style.display = 'none';
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let totalGeral = 0;
    div.innerHTML = carrinho.map(i => {
        totalGeral += i.total;
        return `<div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:13px;">
                    <span>${i.nome} (${i.detalhes})</span>
                    <b>R$ ${i.total.toFixed(2)}</b>
                </div>`;
    }).join('') || "Selecione produtos.";
    
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    document.getElementById('totalCarrinho').innerText = totalGeral.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (totalGeral - sinal).toFixed(2);
}

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    if(carrinho.length === 0 || !nome) return mostrarAlerta("Carrinho vazio ou cliente sem nome!");
    const total = parseFloat(document.getElementById('totalCarrinho').innerText);
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;

    const pedido = {
        cliente: nome,
        itens: [...carrinho],
        total: total,
        sinal: sinal,
        restante: total - sinal,
        status: "Novo Pedido 📂",
        dataCriacao: new Date().toLocaleDateString('pt-BR')
    };

    db.collection("pedidos").add(pedido).then(() => {
        carrinho = []; document.getElementById('nomeCliente').value = "";
        atualizarCarrinho(); mudarAba('loja');
    });
}

function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, index) => `
        <div class="gva-card">
            <div class="card-header" style="display:flex; justify-content:space-between;">
                <span>👤 ${p.cliente}</span>
                <span style="font-size:10px; background:var(--gva-azul); color:white; padding:2px 6px; border-radius:4px;">${p.status}</span>
            </div>
            <div class="card-body">
                <p style="font-size:12px; margin:0;">${p.itens.map(i => i.nome).join(', ')}</p>
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <button class="btn-gva" style="padding:5px 15px; font-size:12px;" onclick="imprimirCupom(${index})">Cupom</button>
                    <button class="btn-gva" style="background:#00a859; padding:5px 15px; font-size:12px;" onclick="concluirPedido('${p.id}')">Concluir</button>
                </div>
            </div>
        </div>
    `).join('');
}

function concluirPedido(id) {
    const p = pedidosGVA.find(item => item.id === id);
    db.collection("pedidos_concluidos").add({ ...p, status: "Concluído ✅", dataFinal: new Date().toLocaleDateString('pt-BR') })
    .then(() => db.collection("pedidos").doc(id).delete());
}

function imprimirCupom(index) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[index];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });

    try {
        const logo = document.getElementById('logoGVA_Preto');
        doc.addImage(logo, 'PNG', 20, 5, 40, 12);
    } catch(e) {}

    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("GVA • GRÁFICA VENOM ARTS LTDA", 40, 22, null, null, "center");
    doc.setFontSize(6); doc.setFont("helvetica", "normal");
    doc.text("CNPJ: 17.184.159/0001-06", 40, 25, null, null, "center");
    doc.text("Rua Lopes Trovão, nº 474 - Icaraí - Niterói - RJ", 40, 28, null, null, "center");
    doc.text("Tel/Zap: 21 99993-0190", 40, 31, null, null, "center");
    
    doc.line(5, 33, 75, 33);
    doc.text(`CLIENTE: ${p.cliente.toUpperCase()}`, 5, 37);
    doc.text(`DATA: ${p.dataCriacao}`, 5, 41);
    doc.line(5, 43, 75, 43);

    let y = 47;
    p.itens.forEach(item => {
        doc.text(`- ${item.nome}`, 5, y);
        doc.text(`R$ ${item.total.toFixed(2)}`, 75, y, null, null, "right");
        y += 4;
    });

    y += 5; doc.line(5, y, 75, y); y += 5;
    doc.text("TOTAL: R$ " + p.total.toFixed(2), 75, y, null, null, "right");
    y += 4;
    doc.text("SINAL: R$ " + p.sinal.toFixed(2), 75, y, null, null, "right");
    y += 5;
    doc.setFontSize(8); doc.text("RESTA: R$ " + p.restante.toFixed(2), 75, y, null, null, "right");

    doc.save(`GVA_Cupom_${p.cliente}.pdf`);
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
