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

// ACESSO
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
        renderizarListaCategorias();
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

// MUDAR ABA E TÍTULO
function mudarAba(aba) {
    const titulos = { cliente: "Catálogo", carrinho: "Novo Orçamento", loja: "Produção GVA", caixa: "Financeiro", admin: "Configurações" };
    document.getElementById('tituloPagina').innerText = titulos[aba];
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}

// CATALOGO E FILTRO SKU
function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    lista.forEach(p => {
        grade.innerHTML += `
            <div class="zap-card">
                <div class="zap-color-bg">${p.sku || 'PROD'}</div>
                <div class="zap-info">
                    <small>${p.categoria}</small>
                    <h4>${p.nome}</h4>
                    <p class="zap-price">R$ ${p.preco.toFixed(2)}</p>
                    <button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Configurar</button>
                </div>
            </div>`;
    });
}

function filtrarProdutos() {
    const b = document.getElementById('buscaProduto').value.toLowerCase();
    const f = bancoDeDados.filter(p => p.nome.toLowerCase().includes(b) || (p.sku && p.sku.toLowerCase().includes(b)));
    carregarProdutos(f);
}

// CONFIGURADOR COM ACABAMENTOS BONITOS
function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let html = `<div class="card-header">Configurar Pedido: ${p.nome}</div><div class="card-body gva-form-large">`;
    
    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        const maxL = p.tipo === 'm_linear' ? 1.50 : 3.10;
        html += `<label>Largura (Máx ${maxL}m):</label><input type="number" id="cfgL" value="1.00" step="0.01">
                 <label>Altura (m):</label><input type="number" id="cfgA" value="1.00" step="0.01">`;
    } else {
        html += `<label>Quantidade:</label><input type="number" id="cfgQ" value="1">`;
    }

    html += `<label style="margin-top:15px; display:block;">Selecione os Acabamentos:</label><div class="acabamento-seletor">`;
    acabamentos.forEach(a => {
        html += `<label><input type="checkbox" class="check-acab" data-preco="${a.preco}" value="${a.nome}"> <i class="fa fa-plus-circle"></i> ${a.nome} (+R$ ${a.preco})</label>`;
    });
    html += `</div><button class="btn-success" style="margin-top:20px;" onclick="confirmarCarrinho('${p.id}')">Adicionar ao Carrinho</button>
             <button class="btn-gva" style="background:#666; margin-top:10px;" onclick="fecharModal()">Cancelar</button></div>`;
    
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let totalItem = 0, det = "";

    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        let l = parseFloat(document.getElementById('cfgL').value);
        let a = parseFloat(document.getElementById('cfgA').value);
        totalItem = (l * a) * p.preco; det = `${l}x${a}m`;
    } else {
        let q = parseInt(document.getElementById('cfgQ').value);
        totalItem = q * p.preco; det = `${q} un`;
    }

    let adicionais = 0, nomesAcab = [];
    document.querySelectorAll('.check-acab:checked').forEach(c => {
        adicionais += parseFloat(c.getAttribute('data-preco'));
        nomesAcab.push(c.value);
    });
    totalItem += adicionais;
    if(nomesAcab.length > 0) det += ` | Acab: ${nomesAcab.join(', ')}`;

    carrinho.push({ nome: p.nome, total: totalItem, detalhes: det, sku: p.sku });
    fecharModal();
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let t = carrinho.reduce((acc, i) => acc + i.total, 0) + (parseFloat(document.getElementById('valorMotoboy').value) || 0);
    let sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    
    div.innerHTML = carrinho.map((i, idx) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:13px; background:#f9f9f9; padding:10px; border-radius:8px; border:1px solid #eee;">
            <span><b>[${i.sku || 'GVA'}] ${i.nome}</b><br><small>${i.detalhes}</small></span>
            <b>R$ ${i.total.toFixed(2)} <i class="fa fa-trash" style="color:red; cursor:pointer; margin-left:10px;" onclick="removerItem(${idx})"></i></b>
        </div>`).join('') || "Carrinho vazio.";

    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (t - sinal).toFixed(2);
}

function removerItem(idx) { carrinho.splice(idx, 1); atualizarCarrinho(); }

// PRODUÇÃO 7 ETAPAS
function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, idx) => `
        <div class="gva-card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span>👤 ${p.cliente}</span>
                <select onchange="mudarStatus('${p.id}', this.value)" style="width:auto; margin:0; font-size:11px;">
                    <option ${p.status === '💰 Pagamento' ? 'selected' : ''}>💰 Pagamento</option>
                    <option ${p.status === '📂 Verif. Arquivos' ? 'selected' : ''}>📂 Verif. Arquivos</option>
                    <option ${p.status === '🖨️ Impressão' ? 'selected' : ''}>🖨️ Impressão</option>
                    <option ${p.status === '✂️ Acabamento' ? 'selected' : ''}>✂️ Acabamento</option>
                    <option ${p.status === '🏠 Pronto Retirada' ? 'selected' : ''}>🏠 Pronto Retirada</option>
                    <option style="color:red;">❌ Pedido Cancelado</option>
                    <option style="color:green;">📦 Pedido Entregue</option>
                </select>
            </div>
            <div class="card-body">
                <p style="font-size:12px; margin:0;">${p.itens.map(i => `• ${i.nome}`).join('<br>')}</p>
                <div style="display:flex; gap:10px;">
                    <button class="btn-gva" style="font-size:11px; padding:5px 15px; margin-top:10px;" onclick="imprimirCupom(${idx})"><i class="fa fa-print"></i> Nota Balcão</button>
                    <button class="status-wa" onclick="enviarWhatsApp(${idx})"><i class="fab fa-whatsapp"></i> Notificar Cliente</button>
                </div>
            </div>
        </div>`).join('') || "Fila de produção vazia.";
}

function mudarStatus(id, novoStatus) {
    if(novoStatus === '❌ Pedido Cancelado') {
        if(confirm("Cancelar pedido e remover do financeiro?")) db.collection("pedidos").doc(id).delete();
    } else if(novoStatus === '📦 Pedido Entregue') {
        const p = pedidosGVA.find(item => item.id === id);
        db.collection("pedidos_arquivados").add({ ...p, status: '📦 Entregue', dataEntrega: new Date().toLocaleDateString('pt-BR') })
        .then(() => db.collection("pedidos").doc(id).delete());
    } else {
        db.collection("pedidos").doc(id).update({ status: novoStatus });
    }
}

// NOTA DE BALCÃO GVA (REFEITA DO ZERO)
function imprimirCupom(index) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[index];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });

    // Cabeçalho Profissional
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("GVA • VENOM ARTS", 40, 10, null, null, "center");
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("CNPJ: 17.184.159/0001-06", 40, 14, null, null, "center");
    doc.text("Rua Lopes Trovão, 474 - Icaraí - Niterói", 40, 17, null, null, "center");
    doc.text("Zap: (21) 99993-0190", 40, 20, null, null, "center");
    
    doc.setLineWidth(0.2); doc.line(5, 22, 75, 22);
    
    doc.setFont("helvetica", "bold"); doc.text("CLIENTE:", 5, 26);
    doc.setFont("helvetica", "normal"); doc.text(p.cliente.toUpperCase(), 18, 26);
    doc.text("DATA:", 5, 29); doc.text(p.dataCriacao, 15, 29);
    doc.text("PREVISÃO:", 5, 32); doc.text(p.previsao || '---', 20, 32);
    
    doc.line(5, 34, 75, 34);

    // Corpo do Pedido
    let y = 38;
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("ITEM / DESCRIÇÃO", 5, y); doc.text("VALOR", 75, y, null, null, "right");
    
    y += 4;
    p.itens.forEach(item => {
        doc.setFont("helvetica", "bold");
        doc.text(item.nome.substring(0, 30), 5, y);
        doc.text(item.total.toFixed(2), 75, y, null, null, "right");
        y += 3.5;
        doc.setFontSize(6); doc.setFont("helvetica", "italic");
        doc.text("Det: " + item.detalhes, 5, y);
        y += 4;
        doc.setFontSize(8);
    });

    if(p.motoboy > 0) {
        doc.text("TAXA ENTREGA:", 5, y); doc.text(p.motoboy.toFixed(2), 75, y, null, null, "right");
        y += 4;
    }

    doc.line(5, y, 75, y); y += 5;

    // Totais
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("TOTAL DO PEDIDO:", 5, y); doc.text("R$ " + p.total.toFixed(2), 75, y, null, null, "right");
    y += 4.5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("SINAL PAGO:", 5, y); doc.text("R$ " + p.sinal.toFixed(2), 75, y, null, null, "right");
    y += 5;
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("RESTANTE:", 5, y); doc.text("R$ " + p.restante.toFixed(2), 75, y, null, null, "right");

    y += 8;
    doc.setFontSize(6); doc.setFont("helvetica", "normal");
    doc.text("Este documento não é nota fiscal.", 40, y, null, null, "center");
    y += 3;
    doc.text("Obrigado pela preferência!", 40, y, null, null, "center");

    window.open(doc.output('bloburl'), '_blank');
}

// GESTÃO ADMIN (EDITAR E EXCLUIR TUDO)
function renderizarListaAdmin() {
    const div = document.getElementById('listaGerenciarProdutos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>SKU</th><th>Nome</th><th>Ações</th></tr></thead><tbody>` + 
        bancoDeDados.map(p => `<tr><td>${p.sku || '--'}</td><td>${p.nome}</td><td>
        <button class="btn-edit" onclick="editarProduto('${p.id}')">Editar</button>
        <button class="btn-del" onclick="excluirItem('catalogo', '${p.id}')">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

function renderizarListaCategorias() {
    const div = document.getElementById('listaGerenciarCategorias');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>Categoria</th><th>Ações</th></tr></thead><tbody>` + 
        categorias.map(c => `<tr><td>${c.nome}</td><td>
        <button class="btn-edit" onclick="editarCategoria('${c.id}')">Editar</button>
        <button class="btn-del" onclick="excluirItem('categorias', '${c.id}')">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

function renderizarListaAcabamentos() {
    const div = document.getElementById('listaGerenciarAcabamentos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>Acabamento</th><th>Preço</th><th>Ações</th></tr></thead><tbody>` + 
        acabamentos.map(a => `<tr><td>${a.nome}</td><td>R$ ${a.preco.toFixed(2)}</td><td>
        <button class="btn-edit" onclick="editarAcabamento('${a.id}')">Editar</button>
        <button class="btn-del" onclick="excluirItem('acabamentos', '${a.id}')">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

// Funções de salvar com verificação de EDIT
async function salvarNovoProduto() {
    const id = document.getElementById('editId').value;
    const dados = {
        sku: document.getElementById('adminSku').value,
        nome: document.getElementById('adminNome').value,
        preco: parseFloat(document.getElementById('adminPreco').value),
        categoria: document.getElementById('adminCatSelect').value,
        tipo: document.getElementById('adminTipo').value,
        img: document.getElementById('adminImg').value
    };
    if(id) await db.collection("catalogo").doc(id).update(dados);
    else await db.collection("catalogo").add(dados);
    limparFormAdmin(); alert("Salvo!");
}

function editarProduto(id) {
    const p = bancoDeDados.find(i => i.id === id);
    document.getElementById('editId').value = p.id;
    document.getElementById('adminSku').value = p.sku || "";
    document.getElementById('adminNome').value = p.nome;
    document.getElementById('adminPreco').value = p.preco;
    document.getElementById('adminCatSelect').value = p.categoria;
    document.getElementById('adminTipo').value = p.tipo;
    document.getElementById('adminImg').value = p.img || "";
}

function excluirItem(coll, id) { if(confirm("Deseja excluir?")) db.collection(coll).doc(id).delete(); }

// WhatsApp Status
function enviarWhatsApp(idx) {
    const p = pedidosGVA[idx];
    const msg = window.encodeURIComponent(`Olá ${p.cliente}, o status do seu pedido na GVA Venom Arts mudou para: ${p.status}`);
    window.open(`https://wa.me/55${p.telefone.replace(/\D/g,'')}?text=${msg}`);
}

// Utilitários de Navegação
function mudarStatus(id, novoStatus) { /* Lógica de arquivamento já inclusa na função anterior */ }
function toggleAdminSub(sub) { 
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.sub-nav-gva button').forEach(b => b.classList.remove('sub-active'));
    document.getElementById('subAdmin' + sub.charAt(0).toUpperCase() + sub.slice(1)).style.display = 'block';
    document.getElementById('subBtn' + sub.charAt(0).toUpperCase() + sub.slice(1)).classList.add('sub-active');
}
function renderizarMenus() { /* Categorias botões */ }
function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function mostrarAlerta(m) { alert(m); }
function fecharAlerta() { }
function toggleCamposPagamento() { 
    document.getElementById('divParcelas').style.display = document.getElementById('formaPagamento').value === 'CreditoParc' ? 'block' : 'none'; 
}
function toggleCamposEntrega() { 
    document.getElementById('divMotoboy').style.display = document.getElementById('metodoEntrega').value === 'Motoboy' ? 'block' : 'none'; 
}
function limparFormAdmin() { document.getElementById('editId').value = ""; /* limpar outros campos */ }
