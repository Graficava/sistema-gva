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

// ==========================================
// 1. ACESSO E CABEÇALHO DINÂMICO
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

function mudarAba(aba) {
    const titulos = { cliente: "Catálogo", carrinho: "Novo Orçamento", loja: "Produção", caixa: "Controle Financeiro", admin: "Configurações" };
    document.getElementById('tituloPagina').innerText = titulos[aba];
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}

// ==========================================
// 2. SINCRONIZAÇÃO EM TEMPO REAL
// ==========================================
function iniciarSincronizacao() {
    db.collection("categorias").onSnapshot(snap => {
        categorias = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarMenus();
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
        calcularFinanceiro();
    });
    db.collection("financeiro_avulso").onSnapshot(() => calcularFinanceiro());
}

// ==========================================
// 3. CATALOGO E MEDIDAS
// ==========================================
function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    const cores = ['#3E3B9F', '#00a859', '#dc3545', '#17a2b8', '#ffc107'];
    lista.forEach((p, idx) => {
        let visual = p.img ? `<img src="${p.img}" class="zap-img" onerror="this.parentElement.innerHTML='<div class=\'zap-color-bg\' style=\'background:${cores[idx % 5]}\'>${p.nome}</div>'">` 
                           : `<div class="zap-color-bg" style="background:${cores[idx % 5]}">${p.nome}</div>`;
        grade.innerHTML += `<div class="zap-card">${visual}<div class="zap-info"><small>${p.categoria || 'Geral'}</small><h4>${p.nome}</h4><p class="zap-price">R$ ${p.preco.toFixed(2)}</p><button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Configurar</button></div></div>`;
    });
}

function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let html = `<div class="card-header">Configurar: ${p.nome}</div><div class="card-body gva-form-large">`;
    
    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        const maxL = p.tipo === 'm_linear' ? 1.50 : 3.10;
        html += `<label>Largura (Máx ${maxL}m):</label>
                 <input type="number" id="cfgL" value="1.00" step="0.01" onchange="validarMedida(this, ${maxL})">
                 <label>Comprimento (Máx 100m):</label>
                 <input type="number" id="cfgA" value="1.00" step="0.01" onchange="validarMedida(this, 100)">`;
    } else if(p.tipo === 'folha') {
        html += `<label>Total de Páginas:</label><input type="number" id="cfgF" value="10">`;
    } else {
        html += `<label>Quantidade:</label><input type="number" id="cfgQ" value="1">`;
    }

    html += `<label style="margin-top:15px; display:block;">Acabamentos Adicionais:</label><div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:15px;">`;
    acabamentos.forEach(a => {
        html += `<label style="font-size:11px; font-weight:normal;"><input type="checkbox" class="check-acab" data-preco="${a.preco}" value="${a.nome}"> ${a.nome} (+R$ ${a.preco})</label>`;
    });
    html += `</div><button class="btn-success" onclick="confirmarCarrinho('${p.id}')">Adicionar ao Orçamento</button>
             <button class="btn-gva" style="background:#666; width:100%; margin-top:10px;" onclick="fecharModal()">Cancelar</button></div>`;
    
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function validarMedida(el, max) { 
    if(parseFloat(el.value) > max) { 
        mostrarAlerta(`Atenção: A medida máxima permitida para este material é ${max}m.`); 
        el.value = max; 
    } 
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let totalItem = 0, det = "";

    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        let l = parseFloat(document.getElementById('cfgL').value);
        let a = parseFloat(document.getElementById('cfgA').value);
        totalItem = (l * a) * p.preco;
        det = `${l.toFixed(2)}x${a.toFixed(2)}m`;
    } else if(p.tipo === 'folha') {
        let f = parseInt(document.getElementById('cfgF').value);
        totalItem = f * p.preco;
        det = `${f} páginas`;
    } else {
        let q = parseInt(document.getElementById('cfgQ').value);
        totalItem = q * p.preco;
        det = `${q} un`;
    }

    // Soma acabamentos
    let adicionais = 0, nomesAcab = [];
    document.querySelectorAll('.check-acab:checked').forEach(c => {
        adicionais += parseFloat(c.getAttribute('data-preco'));
        nomesAcab.push(c.value);
    });
    totalItem += adicionais;
    if(nomesAcab.length > 0) det += ` | Acab: ${nomesAcab.join(', ')}`;

    carrinho.push({ nome: p.nome, total: totalItem, detalhes: det });
    fecharModal();
    atualizarCarrinho();
}

// ==========================================
// 4. ORÇAMENTO E FINANCEIRO
// ==========================================
function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let totalItens = carrinho.reduce((acc, i) => acc + i.total, 0);
    let taxaMotoboy = parseFloat(document.getElementById('valorMotoboy').value) || 0;
    let totalGeral = totalItens + taxaMotoboy;

    div.innerHTML = carrinho.map((i, idx) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:13px; background:#f9f9f9; padding:10px; border-radius:8px;">
            <span><b>${i.nome}</b><br><small>${i.detalhes}</small></span>
            <b>R$ ${i.total.toFixed(2)} <i class="fa fa-trash" style="color:red; cursor:pointer; margin-left:10px;" onclick="removerItem(${idx})"></i></b>
        </div>`).join('') || "Selecione produtos.";

    document.getElementById('totalCarrinho').innerText = totalGeral.toFixed(2);
    let sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    document.getElementById('restanteCarrinho').innerText = (totalGeral - sinal).toFixed(2);
}

function removerItem(idx) { carrinho.splice(idx, 1); atualizarCarrinho(); }

function toggleCamposPagamento() {
    const p = document.getElementById('formaPagamento').value;
    document.getElementById('divParcelas').style.display = (p === 'CreditoParc') ? 'block' : 'none';
}

function toggleCamposEntrega() {
    const e = document.getElementById('metodoEntrega').value;
    document.getElementById('divMotoboy').style.display = (e === 'Motoboy') ? 'block' : 'none';
}

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    if(!nome || carrinho.length === 0) return mostrarAlerta("Dados incompletos!");

    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    const motoboy = parseFloat(document.getElementById('valorMotoboy').value) || 0;
    const total = parseFloat(document.getElementById('totalCarrinho').innerText);

    const pedido = {
        cliente: nome, telefone: document.getElementById('telCliente').value,
        doc: document.getElementById('docCliente').value, end: document.getElementById('endCliente').value,
        itens: [...carrinho], total: total, sinal: sinal, motoboy: motoboy,
        forma: document.getElementById('formaPagamento').value,
        status: "💰 Pagamento", dataCriacao: new Date().toLocaleDateString('pt-BR'),
        previsao: document.getElementById('dataEntrega').value, mes: new Date().getMonth() + 1
    };

    db.collection("pedidos").add(pedido).then(() => {
        carrinho = []; document.getElementById('nomeCliente').value = "";
        atualizarCarrinho(); mudarAba('loja');
    });
}

// ==========================================
// 5. FINANCEIRO E ADMIN SUB-TABS
// ==========================================
async function calcularFinanceiro() {
    let faturamento = pedidosGVA.reduce((acc, p) => acc + (p.total || 0), 0);
    const snap = await db.collection("financeiro_avulso").get();
    let extras = 0, saidas = 0;
    snap.forEach(doc => {
        const d = doc.data();
        if(d.tipo === 'entrada') extras += d.valor;
        else saidas += d.valor;
    });

    document.getElementById('finFaturamento').innerText = faturamento.toFixed(2);
    document.getElementById('finEntradas').innerText = extras.toFixed(2);
    document.getElementById('finSaidas').innerText = saidas.toFixed(2);
    document.getElementById('finSaldo').innerText = (faturamento + extras - saidas).toFixed(2);
}

function abrirLancamento(tipo) {
    const valor = prompt(`Valor da ${tipo} (R$):`);
    const desc = prompt(`Descrição:`);
    if(valor && desc) {
        db.collection("financeiro_avulso").add({ tipo, valor: parseFloat(valor), desc, data: new Date().toLocaleDateString('pt-BR') });
    }
}

function toggleAdminSub(sub) {
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.sub-nav-gva button').forEach(b => b.classList.remove('sub-active'));
    
    document.getElementById('subAdmin' + sub.charAt(0).toUpperCase() + sub.slice(1)).style.display = 'block';
    document.getElementById('subBtn' + sub.charAt(0).toUpperCase() + sub.slice(1)).classList.add('sub-active');
}

// ==========================================
// 6. MENUS E ACABAMENTOS (ADMIN)
// ==========================================
function renderizarMenus() {
    const nav = document.getElementById('menuCategorias');
    const select = document.getElementById('adminCatSelect');
    nav.innerHTML = `<button class="active" onclick="filtrarCat('Todos')">Todos</button>` + 
        categorias.map(c => `<button onclick="filtrarCat('${c.nome}')">${c.nome}</button>`).join('');
    select.innerHTML = categorias.map(c => `<option>${c.nome}</option>`).join('');
}

function salvarCategoria() {
    const nome = document.getElementById('catNome').value;
    if(nome) db.collection("categorias").add({ nome }).then(() => document.getElementById('catNome').value = "");
}

function salvarAcabamento() {
    const nome = document.getElementById('acabNome').value;
    const preco = parseFloat(document.getElementById('acabPreco').value);
    if(nome) db.collection("acabamentos").add({ nome, preco }).then(() => {
        document.getElementById('acabNome').value = ""; document.getElementById('acabPreco').value = "";
    });
}

function salvarNovoProduto() {
    const id = document.getElementById('editId').value;
    const dados = {
        nome: document.getElementById('adminNome').value,
        preco: parseFloat(document.getElementById('adminPreco').value),
        img: document.getElementById('adminImg').value,
        tipo: document.getElementById('adminTipo').value,
        categoria: document.getElementById('adminCatSelect').value
    };
    if(id) db.collection("catalogo").doc(id).update(dados);
    else db.collection("catalogo").add(dados);
    mostrarAlerta("Produto Salvo!");
}

function renderizarListaAdmin() {
    const div = document.getElementById('listaGerenciarProdutos');
    div.innerHTML = `<table style="width:100%; font-size:12px; margin-top:15px; border-collapse:collapse;">
        <thead style="background:#eee; text-align:left;"><tr><th style="padding:10px;">Nome</th><th style="padding:10px;">Ações</th></tr></thead>
        <tbody>${bancoDeDados.map(p => `<tr><td style="padding:10px; border-bottom:1px solid #eee;">${p.nome}</td>
        <td style="padding:10px; border-bottom:1px solid #eee;"><button onclick="excluirItem('catalogo', '${p.id}')" style="color:red; background:none; border:none; cursor:pointer;">Excluir</button></td></tr>`).join('')}</tbody></table>`;
}

function renderizarListaAcabamentos() {
    const div = document.getElementById('listaGerenciarAcabamentos');
    div.innerHTML = acabamentos.map(a => `<div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;"><span>${a.nome} (+R$ ${a.preco})</span><button onclick="excluirItem('acabamentos', '${a.id}')" style="color:red; border:none; background:none; cursor:pointer;">X</button></div>`).join('');
}

function excluirItem(coll, id) { if(confirm("Deseja excluir permanentemente?")) db.collection(coll).doc(id).delete(); }

// AUXILIARES
function filtrarProdutos() {
    const b = document.getElementById('buscaProduto').value.toLowerCase();
    carregarProdutos(bancoDeDados.filter(p => p.nome.toLowerCase().includes(b)));
}
function filtrarCat(cat) {
    if(cat === 'Todos') carregarProdutos();
    else carregarProdutos(bancoDeDados.filter(p => p.categoria === cat));
    document.querySelectorAll('.cat-nav button').forEach(b => b.classList.toggle('active', b.innerText === cat));
}
function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, idx) => `
        <div class="gva-card">
            <div class="card-header" style="display:flex; justify-content:space-between;"><span>👤 ${p.cliente}</span><small>${p.status}</small></div>
            <div class="card-body"><p style="font-size:12px;">${p.itens.map(i => i.nome).join(', ')}</p>
            <button class="btn-gva" onclick="imprimirCupom(${idx})" style="font-size:11px; padding:5px 15px;">Imprimir Cupom</button>
            <button class="btn-gva" onclick="abrirWhatsAppStatus(${idx})" style="background:#25D366; font-size:11px; padding:5px 15px;">Status WhatsApp</button></div>
        </div>`).join('') || "Sem pedidos.";
}
function abrirWhatsAppStatus(idx) {
    const p = pedidosGVA[idx];
    const msg = window.encodeURIComponent(`Olá ${p.cliente}, o status do seu pedido na GVA Venom Arts mudou para: ${p.status}`);
    window.open(`https://wa.me/55${p.telefone.replace(/\D/g,'')}?text=${msg}`);
}
function imprimirCupom(idx) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[idx];
    const doc = new jsPDF({ format: [80, 150] });
    doc.text("GVA VENOM ARTS", 40, 20, null, null, "center");
    doc.text(`Cliente: ${p.cliente}`, 10, 30);
    p.itens.forEach((i, j) => doc.text(`- ${i.nome}: R$ ${i.total.toFixed(2)}`, 10, 40 + (j*10)));
    doc.text(`TOTAL: R$ ${p.total.toFixed(2)}`, 10, 100);
    window.open(doc.output('bloburl'), '_blank');
}
function fazerLogin() {
    const e = document.getElementById('loginEmail').value, s = document.getElementById('loginSenha').value;
    auth.signInWithEmailAndPassword(e, s).catch(() => alert("Erro no Login."));
}
function fazerLogout() { auth.signOut().then(() => window.location.reload()); }
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
function mostrarAlerta(m) { document.getElementById('alertaTexto').innerText = m; document.getElementById('alertaFundo').style.display = 'flex'; }
function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
