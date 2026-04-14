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
// SINCRONIZAÇÃO E PRÉ-CADASTRO
// ==========================================
function iniciarSincronizacao() {
    db.collection("catalogo").onSnapshot(snap => {
        if (snap.empty) {
            preCadastrarProdutos(); // Se o banco estiver vazio, cadastra o básico
        } else {
            bancoDeDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            carregarProdutos();
            renderizarListaAdmin();
        }
    });
    db.collection("pedidos").orderBy("dataCriacao", "desc").onSnapshot(snap => {
        pedidosGVA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarProducao();
    });
}

async function preCadastrarProdutos() {
    const iniciais = [
        { nome: "Cartão de Visita", preco: 95.00, img: "", tipo: "unidade", categoria: "Papelaria", vendas: 50 },
        { nome: "Panfleto 10x15", preco: 180.00, img: "", tipo: "unidade", categoria: "Papelaria", vendas: 40 },
        { nome: "Banner em Lona", preco: 65.00, img: "", tipo: "m2", categoria: "Comunicação Visual", vendas: 30 },
        { nome: "Apostila / Encadernação", preco: 0.15, img: "", tipo: "folha", categoria: "Serviços", vendas: 20 }
    ];
    for (let p of iniciais) {
        await db.collection("catalogo").add(p);
    }
}

// ==========================================
// CATALOGO (ZAP STYLE)
// ==========================================
function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
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
                    <p class="zap-price">R$ ${p.preco.toFixed(2)} <span style="font-size:10px; font-weight:normal;">${p.tipo === 'm2' ? '/ m²' : (p.tipo === 'folha' ? '/ pág' : '/ un')}</span></p>
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
// ADMIN: CADASTRO CORRIGIDO
// ==========================================
function salvarNovoProduto() {
    const btn = document.getElementById('btnSalvarProduto');
    const id = document.getElementById('editId').value;
    const nome = document.getElementById('adminNome').value;
    const preco = parseFloat(document.getElementById('adminPreco').value);
    const imgLink = document.getElementById('adminImg').value;
    const tipo = document.getElementById('adminTipo').value;
    const cat = document.getElementById('adminCategoria').value;

    if(!nome || isNaN(preco)) return mostrarAlerta("Preencha o nome e o preço do produto.");

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
        mostrarAlerta("Erro ao salvar no banco de dados.");
        console.error(err);
    }).finally(() => {
        btn.innerText = "Cadastrar Produto";
        btn.disabled = false;
    });
}

function renderizarListaAdmin() {
    const container = document.getElementById('listaGerenciarAdmin');
    container.innerHTML = `<table style="width:100%; border-collapse: collapse; background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <thead style="background:#eee; text-align:left;">
            <tr><th style="padding:15px;">Produto</th><th style="padding:15px;">Preço</th><th style="padding:15px;">Ações</th></tr>
        </thead>
        <tbody>
            ${bancoDeDados.map(p => `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:15px; font-weight:bold;">${p.nome}</td>
                    <td style="padding:15px;">R$ ${p.preco.toFixed(2)}</td>
                    <td style="padding:15px;">
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
    let html = `<div class="card-header">Configurar: ${p.nome}</div><div class="card-body gva-form-spacious">`;
    if(p.tipo === 'm2') {
        html += `<label>Largura (m):</label><input type="number" id="cfgL" value="1.00" step="0.01">
                 <label>Altura (m):</label><input type="number" id="cfgA" value="1.00" step="0.01">`;
    } else if(p.tipo === 'folha') {
        html += `<label>Quantidade de Páginas:</label><input type="number" id="cfgF" value="10">`;
    } else {
        html += `<label>Quantidade de Unidades:</label><input type="number" id="cfgQ" value="1">`;
    }
    html += `<button class="btn-gva" style="width:100%" onclick="confirmarCarrinho('${p.id}')">Adicionar ao Orçamento</button></div>`;
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let total = 0; let det = "";
    if(p.tipo === 'm2') {
        const l = parseFloat(document.getElementById('cfgL').value);
        const a = parseFloat(document.getElementById('cfgA').value);
        total = (l * a) * p.preco; det = `${l}x${a}m (m²)`;
    } else if(p.tipo === 'folha') {
        const f = parseInt(document.getElementById('cfgF').value);
        total = f * p.preco; det = `${f} páginas`;
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
    div.innerHTML = carrinho.map((i, index) => {
        totalGeral += i.total;
        return `<div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; background:#f9f9f9; padding:10px; border-radius:6px;">
                    <span><b>${i.nome}</b> (${i.detalhes})</span>
                    <b>R$ ${i.total.toFixed(2)} <i class="fa fa-trash" style="color:red; cursor:pointer; margin-left:10px;" onclick="removerItem(${index})"></i></b>
                </div>`;
    }).join('') || "Selecione produtos no catálogo.";
    
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    document.getElementById('totalCarrinho').innerText = totalGeral.toFixed(2).replace('.', ',');
    document.getElementById('restanteCarrinho').innerText = (totalGeral - sinal).toFixed(2).replace('.', ',');
}

function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
}

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    const tel = document.getElementById('telCliente').value;
    if(carrinho.length === 0 || !nome) return mostrarAlerta("O carrinho está vazio ou o nome do cliente não foi preenchido.");

    const total = parseFloat(document.getElementById('totalCarrinho').innerText.replace(',', '.'));
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;

    const pedido = {
        cliente: nome,
        telefone: tel,
        documento: document.getElementById('docCliente').value,
        obs: document.getElementById('obsPedido').value,
        previsao: document.getElementById('dataEntrega').value || "A definir",
        itens: [...carrinho],
        total: total,
        sinal: sinal,
        restante: total - sinal,
        status: "Novo Pedido 📂",
        dataCriacao: new Date().toLocaleDateString('pt-BR')
    };

    db.collection("pedidos").add(pedido).then(() => {
        carrinho = []; document.getElementById('nomeCliente').value = ""; document.getElementById('docCliente').value = ""; document.getElementById('obsPedido').value = "";
        atualizarCarrinho(); mostrarAlerta("Orçamento salvo na Produção!"); mudarAba('loja');
    });
}

function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, index) => `
        <div class="gva-card">
            <div class="card-header" style="display:flex; justify-content:space-between;">
                <span>👤 ${p.cliente}</span>
                <span style="font-size:11px; background:var(--gva-azul); color:white; padding:4px 10px; border-radius:20px;">${p.status}</span>
            </div>
            <div class="card-body">
                <p style="font-size:13px; margin:0; line-height:1.4;">${p.itens.map(i => `<b>${i.nome}</b>`).join(', ')}</p>
                <div style="margin-top:15px; display:flex; gap:10px;">
                    <button class="btn-gva" style="padding:8px 20px; font-size:12px;" onclick="imprimirCupom(${index})"><i class="fa fa-print"></i> Cupom</button>
                    <button class="btn-gva" style="background:#00a859; padding:8px 20px; font-size:12px;" onclick="concluirPedido('${p.id}')">Concluir ✅</button>
                </div>
            </div>
        </div>
    `).join('') || "Sem pedidos em produção.";
}

function concluirPedido(id) {
    const p = pedidosGVA.find(item => item.id === id);
    db.collection("pedidos_concluidos").add({ ...p, status: "Concluído ✅", dataFinal: new Date().toLocaleDateString('pt-BR'), mes: new Date().getMonth() + 1 })
    .then(() => db.collection("pedidos").doc(id).delete());
}

// ==========================================
// IMPRESSÃO DE CUPOM (DADOS GVA OFICIAIS)
// ==========================================
function imprimirCupom(index) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[index];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 160] });

    try { const logo = document.getElementById('logoGVA_Preto'); doc.addImage(logo, 'PNG', 20, 5, 40, 12); } catch(e) {}

    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("GVA • GRÁFICA VENOM ARTS LTDA", 40, 22, null, null, "center");
    doc.setFontSize(6); doc.setFont("helvetica", "normal");
    doc.text("CNPJ: 17.184.159/0001-06", 40, 25, null, null, "center");
    doc.text("Rua Lopes Trovão, nº 474 - Lojas 201/202", 40, 28, null, null, "center");
    doc.text("Icaraí - Niterói - RJ | CEP: 24220-071", 40, 31, null, null, "center");
    doc.text("Tel/Zap: 21 99993-0190", 40, 34, null, null, "center");
    
    doc.line(5, 36, 75, 36);
    doc.text(`CLIENTE: ${p.cliente.toUpperCase()}`, 5, 40);
    doc.text(`DOC: ${p.documento || 'N/A'}`, 5, 43);
    doc.text(`DATA: ${p.dataCriacao} | PREV: ${p.previsao}`, 5, 46);
    doc.line(5, 48, 75, 48);

    let y = 52;
    p.itens.forEach(item => {
        doc.text(`- ${item.nome} (${item.detalhes})`, 5, y);
        doc.text(`R$ ${item.total.toFixed(2)}`, 75, y, null, null, "right");
        y += 4;
    });

    y += 5; doc.line(5, y, 75, y); y += 5;
    doc.setFontSize(7);
    doc.text("TOTAL DO PEDIDO:", 5, y); doc.text(`R$ ${p.total.toFixed(2)}`, 75, y, null, null, "right");
    y += 4;
    doc.text("SINAL PAGO:", 5, y); doc.text(`R$ ${p.sinal.toFixed(2)}`, 75, y, null, null, "right");
    y += 5; doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("RESTA PAGAR:", 5, y); doc.text(`R$ ${p.restante.toFixed(2)}`, 75, y, null, null, "right");

    doc.save(`GVA_Cupom_${p.cliente.replace(/ /g, '_')}.pdf`);
}

// ==========================================
// INTERFACE
// ==========================================
function mudarAba(aba) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    const titulos = { 'cliente': 'Produtos', 'carrinho': 'Novo Orçamento', 'loja': 'Produção', 'caixa': 'Financeiro', 'admin': 'Configurações' };
    document.getElementById('tituloPagina').innerText = titulos[aba] || 'Painel GVA';
}

function toggleAdminSub(sub) {
    document.getElementById('subAdminNovo').style.display = sub === 'novo' ? 'block' : 'none';
    document.getElementById('subAdminLista').style.display = sub === 'lista' ? 'block' : 'none';
    document.getElementById('subBtnNovo').classList.toggle('sub-active', sub === 'novo');
    document.getElementById('subBtnLista').classList.toggle('sub-active', sub === 'lista');
}

function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
function mostrarAlerta(m) { document.getElementById('alertaTexto').innerText = m; document.getElementById('alertaFundo').style.display = 'flex'; }
