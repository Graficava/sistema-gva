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

function fazerLogin() {
    const e = document.getElementById('loginEmail').value;
    const s = document.getElementById('loginSenha').value;
    auth.signInWithEmailAndPassword(e, s).catch(err => alert("Dados incorretos."));
}

function fazerLogout() { auth.signOut().then(() => window.location.reload()); }

// SINCRONIZAÇÃO
function iniciarSincronizacao() {
    db.collection("catalogo").onSnapshot(snap => {
        bancoDeDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        carregarProdutos();
    });
    // Sincroniza apenas pedidos ativos (não arquivados)
    db.collection("pedidos").orderBy("dataCriacao", "desc").onSnapshot(snap => {
        pedidosGVA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarProducao();
    });
}

// CATALOGO
function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    const cores = ['#3E3B9F', '#00a859', '#dc3545', '#17a2b8', '#ffc107'];
    lista.sort((a,b) => (b.vendas || 0) - (a.vendas || 0)).forEach((p, idx) => {
        let visual = p.img ? `<img src="${p.img}" class="zap-img" onerror="this.parentElement.innerHTML='<div class=\'zap-color-bg\' style=\'background:${cores[idx % cores.length]}\'>${p.nome}</div>'">` 
                           : `<div class="zap-color-bg" style="background:${cores[idx % cores.length]}">${p.nome}</div>`;
        grade.innerHTML += `<div class="zap-card">${visual}<div class="zap-info"><h4>${p.nome}</h4><p class="zap-price">R$ ${p.preco.toFixed(2)}</p><button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Configurar</button></div></div>`;
    });
}

// CONFIGURADOR DE PRODUTO (Refinado com Acabamentos)
function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let html = `<div class="card-header">Configurar: ${p.nome}</div><div class="card-body gva-form-large">`;
    
    // Parte de Quantidade/Medidas
    if(p.tipo === 'm2') {
        html += `<label>Largura (m):</label><input type="number" id="cfgL" value="1.00" step="0.01">
                 <label>Altura (m):</label><input type="number" id="cfgA" value="1.00" step="0.01">`;
    } else if(p.tipo === 'folha') {
        html += `<label>Páginas:</label><input type="number" id="cfgF" value="10">`;
    } else {
        html += `<label>Quantidade:</label><input type="number" id="cfgQ" value="1">`;
    }

    // Parte de Acabamentos (Se existirem)
    if(p.acabamentos) {
        html += `<label style="margin-top:15px; display:block;">Acabamentos:</label><div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:15px;">`;
        p.acabamentos.split(',').forEach(acab => {
            const label = acab.trim();
            html += `<label style="font-size:12px; font-weight:normal;"><input type="checkbox" class="check-acab" value="${label}"> ${label}</label>`;
        });
        html += `</div>`;
    }
    
    html += `<button class="btn-success" onclick="confirmarCarrinho('${p.id}')">Adicionar ao Carrinho</button>
             <button class="btn-gva" style="background:#666; width:100%; margin-top:10px;" onclick="fecharModal()">Voltar</button></div>`;
    
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(item => item.id === id);
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

    // Pega acabamentos selecionados
    let selecionados = [];
    document.querySelectorAll('.check-acab:checked').forEach(c => selecionados.push(c.value));
    if(selecionados.length > 0) det += ` | Acab: ${selecionados.join(', ')}`;

    carrinho.push({ nome: p.nome, total: total, detalhes: det });
    fecharModal();
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let t = carrinho.reduce((acc, i) => acc + i.total, 0);
    div.innerHTML = carrinho.map((i, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; margin-bottom:8px; background:#f9f9f9; padding:10px; border-radius:8px; border:1px solid #eee;">
            <span><b>${i.nome}</b><br><small>${i.detalhes}</small></span>
            <span>R$ ${i.total.toFixed(2)} <i class="fa fa-trash" style="color:red; cursor:pointer; margin-left:10px;" onclick="removerItem(${idx})"></i></span>
        </div>`).join('') || "Carrinho Vazio.";
    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
    let sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    document.getElementById('restanteCarrinho').innerText = (t - sinal).toFixed(2);
}

function removerItem(idx) { carrinho.splice(idx, 1); atualizarCarrinho(); }

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    if(!nome || carrinho.length === 0) return mostrarAlerta("Preencha o nome e adicione itens!");
    const total = parseFloat(document.getElementById('totalCarrinho').innerText);
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    const pedido = {
        cliente: nome, telefone: document.getElementById('telCliente').value, obs: document.getElementById('obsPedido').value,
        itens: [...carrinho], total: total, sinal: sinal, restante: total - sinal,
        status: "💰 Pagamento", dataCriacao: new Date().toLocaleDateString('pt-BR'), previsao: document.getElementById('dataEntrega').value
    };
    db.collection("pedidos").add(pedido).then(() => {
        carrinho = []; document.getElementById('nomeCliente').value = ""; document.getElementById('obsPedido').value = "";
        atualizarCarrinho(); mudarAba('loja');
    });
}

// PAINEL DE PRODUÇÃO COM AS 7 ETAPAS
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
                    <option ${p.status === '🏠 Pronto' ? 'selected' : ''}>🏠 Pronto</option>
                    <option style="color:red;">❌ Cancelado</option>
                    <option style="color:green;">📦 Entregue</option>
                </select>
            </div>
            <div class="card-body">
                <p style="font-size:12px; margin:0;">${p.itens.map(i => `• ${i.nome} (${i.detalhes})`).join('<br>')}</p>
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <button class="btn-gva" style="font-size:11px; padding:5px 15px;" onclick="imprimirCupom(${idx})">Cupom</button>
                </div>
            </div>
        </div>`).join('') || "Sem pedidos em produção.";
}

function mudarStatus(id, novoStatus) {
    if(novoStatus === '❌ Cancelado') {
        if(confirm("Deseja cancelar e excluir do financeiro?")) {
            db.collection("pedidos").doc(id).delete();
        }
    } else if(novoStatus === '📦 Entregue') {
        const p = pedidosGVA.find(item => item.id === id);
        db.collection("pedidos_arquivados").add({ ...p, status: '📦 Entregue', dataEntrega: new Date().toLocaleDateString('pt-BR') })
        .then(() => db.collection("pedidos").doc(id).delete());
    } else {
        db.collection("pedidos").doc(id).update({ status: novoStatus });
    }
}

// ADMIN
async function salvarNovoProduto() {
    const btn = document.getElementById('btnSalvarProduto');
    const id = document.getElementById('editId').value;
    btn.innerText = "⏳ Gravando..."; btn.disabled = true;

    const dados = {
        nome: document.getElementById('adminNome').value,
        preco: parseFloat(document.getElementById('adminPreco').value),
        img: document.getElementById('adminImg').value,
        acabamentos: document.getElementById('adminAcabamentos').value, // Salva os acabamentos
        tipo: document.getElementById('adminTipo').value,
        categoria: document.getElementById('adminCategoria').value,
        vendas: id ? (bancoDeDados.find(p => p.id === id).vendas || 0) : 0
    };

    try {
        if (id) { await db.collection("catalogo").doc(id).update(dados); }
        else { await db.collection("catalogo").add(dados); }
        mostrarAlerta("Produto Salvo!"); limparFormAdmin();
    } catch (e) { console.error(e); }
    finally { btn.innerText = "Cadastrar Produto"; btn.disabled = false; }
}

// IMPRESSÃO TÉRMICA 80MM
function imprimirCupom(index) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[index];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });
    try { const logo = document.getElementById('logoGVA_Preto'); doc.addImage(logo, 'PNG', 20, 5, 40, 12); } catch(e) {}
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("GVA • GRÁFICA VENOM ARTS", 40, 22, null, null, "center");
    doc.setFontSize(6); doc.setFont("helvetica", "normal");
    doc.text("CNPJ: 17.184.159/0001-06 | Icaraí - Niterói", 40, 25, null, null, "center");
    doc.line(5, 27, 75, 27);
    doc.text(`CLIENTE: ${p.cliente.toUpperCase()}`, 5, 31);
    doc.text(`DATA: ${p.dataCriacao} | PREV: ${p.previsao || 'N/A'}`, 5, 34);
    doc.line(5, 36, 75, 36);
    let y = 40;
    p.itens.forEach(item => {
        doc.text(`- ${item.nome}`, 5, y);
        doc.text(`R$ ${item.total.toFixed(2)}`, 75, y, null, null, "right");
        y += 4;
        doc.setFontSize(5); doc.text(`  (${item.detalhes})`, 5, y); doc.setFontSize(6);
        y += 4;
    });
    doc.line(5, y, 75, y); y += 4;
    doc.text("TOTAL: R$ " + p.total.toFixed(2), 75, y, null, null, "right");
    y += 4; doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("RESTA: R$ " + p.restante.toFixed(2), 75, y, null, null, "right");
    window.open(doc.output('bloburl'), '_blank');
}

// AUXILIARES
function mudarAba(aba) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}
function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function mostrarAlerta(m) { document.getElementById('alertaTexto').innerText = m; document.getElementById('alertaFundo').style.display = 'flex'; }
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
function toggleAdminSub(sub) { 
    document.getElementById('subAdminNovo').style.display = sub === 'novo' ? 'block' : 'none'; 
    document.getElementById('subAdminLista').style.display = sub === 'lista' ? 'block' : 'none';
}
function renderizarListaAdmin() {
    const container = document.getElementById('listaGerenciarAdmin');
    container.innerHTML = `<table style="width:100%; font-size:12px;"><thead><tr><th>Produto</th><th>Ações</th></tr></thead><tbody>${bancoDeDados.map(p => `<tr><td>${p.nome}</td><td><button onclick="editarProduto('${p.id}')">Editar</button></td></tr>`).join('')}</tbody></table>`;
}
function editarProduto(id) {
    const p = bancoDeDados.find(i => i.id === id);
    document.getElementById('editId').value = p.id;
    document.getElementById('adminNome').value = p.nome;
    document.getElementById('adminPreco').value = p.preco;
    document.getElementById('adminImg').value = p.img || "";
    document.getElementById('adminAcabamentos').value = p.acabamentos || "";
    toggleAdminSub('novo');
}
function limparFormAdmin() {
    document.getElementById('editId').value = ""; document.getElementById('adminNome').value = ""; 
    document.getElementById('adminPreco').value = ""; document.getElementById('adminImg').value = "";
    document.getElementById('adminAcabamentos').value = "";
}
