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
// CATALOGO (ZAP STYLE)
// ==========================================
function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    lista.forEach(p => {
        grade.innerHTML += `
            <div class="zap-card">
                <img src="${p.img || 'https://placehold.co/400x300?text=GVA'}" class="zap-img">
                <div class="zap-info">
                    <small style="color:var(--gva-azul); font-weight:bold;">${p.categoria || 'Geral'}</small>
                    <h4>${p.nome}</h4>
                    <p class="zap-price">R$ ${p.preco.toFixed(2)}</p>
                    <button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Adicionar</button>
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
// ADMIN: UPLOAD E CADASTRO
// ==========================================
async function salvarNovoProduto() {
    const btn = document.getElementById('btnSalvarProduto');
    const id = document.getElementById('editId').value;
    const nome = document.getElementById('adminNome').value;
    const preco = parseFloat(document.getElementById('adminPreco').value);
    const file = document.getElementById('adminFile').files[0];
    const tipo = document.getElementById('adminTipo').value;
    const cat = document.getElementById('adminCategoria').value;

    if(!nome || isNaN(preco)) {
        mostrarAlerta("Por favor, preencha o nome e o preço.");
        return;
    }

    // FEEDBACK VISUAL
    btn.innerText = "⏳ Processando...";
    btn.disabled = true;

    try {
        let urlFoto = "";
        
        // Se escolheu arquivo novo
        if (file) {
            const ref = storage.ref(`produtos/${Date.now()}_${file.name}`);
            const task = await ref.put(file);
            urlFoto = await task.ref.getDownloadURL();
        } else if (id) {
            const antigo = bancoDeDados.find(p => p.id === id);
            urlFoto = antigo.img || "";
        }

        const dadosProd = {
            nome: nome,
            preco: preco,
            img: urlFoto,
            tipo: tipo,
            categoria: cat,
            vendas: id ? (bancoDeDados.find(p => p.id === id).vendas || 0) : 0
        };

        if (id) {
            await db.collection("catalogo").doc(id).update(dadosProd);
            mostrarAlerta("Produto atualizado com sucesso!");
        } else {
            await db.collection("catalogo").add(dadosProd);
            mostrarAlerta("Produto cadastrado com sucesso!");
        }

        // LIMPAR CAMPOS
        document.getElementById('editId').value = "";
        document.getElementById('adminNome').value = "";
        document.getElementById('adminPreco').value = "";
        document.getElementById('adminFile').value = "";
        btn.innerText = "Cadastrar Produto";
        btn.disabled = false;
        
    } catch (err) {
        console.error(err);
        mostrarAlerta("Erro ao salvar no banco de dados.");
        btn.innerText = "Cadastrar Produto";
        btn.disabled = false;
    }
}

function renderizarListaAdmin() {
    const container = document.getElementById('listaGerenciarAdmin');
    container.innerHTML = `<table style="width:100%; border-collapse: collapse; background:white; border-radius:10px; overflow:hidden;">
        <thead style="background:#eee; text-align:left;">
            <tr><th style="padding:10px;">Produto</th><th style="padding:10px;">Preço</th><th style="padding:10px;">Ações</th></tr>
        </thead>
        <tbody>
            ${bancoDeDados.map(p => `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;">${p.nome}</td>
                    <td style="padding:10px;">R$ ${p.preco.toFixed(2)}</td>
                    <td style="padding:10px;">
                        <button onclick="editarProduto('${p.id}')" style="cursor:pointer; border:none; background:none; color:blue;">Editar</button>
                        <button onclick="excluirProduto('${p.id}')" style="cursor:pointer; border:none; background:none; color:red; margin-left:10px;">Excluir</button>
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
    document.getElementById('adminTipo').value = p.tipo;
    document.getElementById('adminCategoria').value = p.categoria;
    document.getElementById('btnSalvarProduto').innerText = "Atualizar Produto";
    toggleAdminSub('novo');
}

async function excluirProduto(id) {
    if(confirm("Tem certeza que deseja remover este produto?")) {
        await db.collection("catalogo").doc(id).delete();
        mostrarAlerta("Produto removido.");
    }
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
    html += `<button class="btn-gva" style="width:100%" onclick="confirmarCarrinho('${p.id}')">Adicionar ao Carrinho</button></div>`;
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let total = 0;
    let det = "";
    if(p.tipo === 'm2') {
        const l = parseFloat(document.getElementById('cfgL').value);
        const a = parseFloat(document.getElementById('cfgA').value);
        total = (l * a) * p.preco;
        det = `${l}x${a}m (Área)`;
    } else {
        const q = parseInt(document.getElementById('cfgQ').value);
        total = q * p.preco;
        det = `${q} unidades`;
    }
    carrinho.push({ nome: p.nome, total: total, detalhes: det });
    document.getElementById('modalFundo').style.display = 'none';
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let totalGeral = 0;
    div.innerHTML = carrinho.map((i, index) => {
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
    const tel = document.getElementById('telCliente').value;
    if(carrinho.length === 0 || !nome) return mostrarAlerta("Carrinho vazio ou cliente sem nome!");

    const total = parseFloat(document.getElementById('totalCarrinho').innerText);
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;

    const pedido = {
        cliente: nome,
        telefone: tel,
        itens: [...carrinho],
        total: total,
        sinal: sinal,
        restante: total - sinal,
        status: "Novo Pedido 📂",
        dataCriacao: new Date().toLocaleDateString('pt-BR')
    };

    db.collection("pedidos").add(pedido).then(() => {
        carrinho = [];
        document.getElementById('nomeCliente').value = "";
        atualizarCarrinho();
        mudarAba('loja');
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

// ==========================================
// RECIBO PDF (DADOS FIXOS GVA)
// ==========================================
function imprimirCupom(index) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[index];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });

    try {
        const logo = document.getElementById('logoGVA_Preto');
        doc.addImage(logo, 'PNG', 20, 5, 40, 12);
    } catch(e) {}

    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("GVA • GRÁFICA VENOM ARTS LTDA", 40, 22, null, null, "center");
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("CNPJ: 17.184.159/0001-06", 40, 26, null, null, "center");
    doc.text("Rua Lopes Trovão, 474 - Lojas 201/202 - Icaraí", 40, 30, null, null, "center");
    doc.text("Niterói - RJ | Tel/Zap: 21 99993-0190", 40, 34, null, null, "center");
    
    doc.line(5, 36, 75, 36);
    doc.text(`CLIENTE: ${p.cliente.toUpperCase()}`, 5, 40);
    doc.text(`DATA: ${p.dataCriacao}`, 5, 44);
    doc.line(5, 46, 75, 46);

    let y = 50;
    p.itens.forEach(item => {
        doc.text(`- ${item.nome}`, 5, y);
        doc.text(`R$ ${item.total.toFixed(2)}`, 75, y, null, null, "right");
        y += 4;
    });

    y += 5; doc.line(5, y, 75, y); y += 5;
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 5, y); doc.text(`R$ ${p.total.toFixed(2)}`, 75, y, null, null, "right");
    y += 4;
    doc.text("SINAL PAGO:", 5, y); doc.text(`R$ ${p.sinal.toFixed(2)}`, 75, y, null, null, "right");
    y += 5;
    doc.setFontSize(10);
    doc.text("RESTA PAGAR:", 5, y); doc.text(`R$ ${p.restante.toFixed(2)}`, 75, y, null, null, "right");

    doc.save(`GVA_Cupom_${p.cliente}.pdf`);
}

// ==========================================
// INTERFACE
// ==========================================
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
