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
const EMAIL_ADMIN = "admin@admin.com.br";

let bancoDeDados = [], pedidosGVA = [], carrinho = [], categorias = [], acabamentos = [];

// ACESSO E CABEÇALHO
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
    const titulos = { cliente: "Catálogo", carrinho: "Novo Orçamento", loja: "Produção GVA", caixa: "Financeiro", admin: "Configurações" };
    document.getElementById('tituloPagina').innerText = titulos[aba];
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}

// SINCRONIZAÇÃO
function iniciarSincronizacao() {
    db.collection("categorias").onSnapshot(snap => {
        categorias = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarMenus();
        const sel = document.getElementById('adminCatSelect');
        if(sel) sel.innerHTML = categorias.map(c => `<option>${c.nome}</option>`).join('');
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
}

// CATALOGO E FILTROS (CATEGORIAS)
function renderizarMenus() {
    const nav = document.getElementById('menuCategorias');
    if(!nav) return;
    nav.innerHTML = `<button class="active" onclick="filtrarCat('Todos', this)">Todos</button>` + 
        categorias.map(c => `<button onclick="filtrarCat('${c.nome}', this)">${c.nome}</button>`).join('');
}

function filtrarCat(cat, btn) {
    document.querySelectorAll('.cat-nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if(cat === 'Todos') carregarProdutos();
    else carregarProdutos(bancoDeDados.filter(p => p.categoria === cat));
}

function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    if(!grade) return;
    grade.innerHTML = '';
    lista.forEach(p => {
        grade.innerHTML += `
            <div class="zap-card">
                <div class="zap-color-bg">SKU: ${p.sku || '---'}<br>${p.nome}</div>
                <div class="zap-info">
                    <small>${p.categoria}</small>
                    <p class="zap-price">R$ ${p.preco.toFixed(2)}</p>
                    <button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Configurar</button>
                </div>
            </div>`;
    });
}

// CONFIGURADOR (MODAL FIXO)
function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let html = `<div class="card-header">Configurar: ${p.nome}</div><div class="card-body gva-form-large">`;
    
    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        const maxL = p.tipo === 'm_linear' ? 1.50 : 3.10;
        html += `<label>Largura (Máx ${maxL}m):</label><input type="number" id="cfgL" value="1.00" step="0.01">
                 <label>Altura (m):</label><input type="number" id="cfgA" value="1.00" step="0.01">`;
    } else {
        html += `<label>Quantidade:</label><input type="number" id="cfgQ" value="1">`;
    }

    html += `<label style="margin-top:15px; display:block;">Acabamentos:</label><div class="acabamento-seletor">`;
    acabamentos.forEach(a => {
        html += `<label><input type="checkbox" class="check-acab" data-preco="${a.preco}" value="${a.nome}"> ${a.nome}</label>`;
    });
    html += `</div><button class="btn-success" style="margin-top:20px;" onclick="confirmarCarrinho('${p.id}')">Adicionar</button>
             <button class="btn-gva" style="background:#666; width:100%; margin-top:10px;" onclick="fecharModal()">Cancelar</button></div>`;
    
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let totalItem = 0, det = "";

    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        let l = parseFloat(document.getElementById('cfgL').value), a = parseFloat(document.getElementById('cfgA').value);
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
    fecharModal(); atualizarCarrinho();
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let taxaEntrega = parseFloat(document.getElementById('valorMotoboy').value) || 0;
    let t = carrinho.reduce((acc, i) => acc + i.total, 0) + taxaEntrega;
    let sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    
    div.innerHTML = carrinho.map((i, idx) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; background:#f9f9f9; padding:12px; border-radius:10px; border:1px solid #eee;">
            <span><b>[${i.sku || '---'}] ${i.nome}</b><br><small>${i.detalhes}</small></span>
            <b>R$ ${i.total.toFixed(2)} <i class="fa fa-trash" style="color:red; cursor:pointer;" onclick="removerItem(${idx})"></i></b>
        </div>`).join('') || "Carrinho vazio.";

    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (t - sinal).toFixed(2);
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

// PRODUÇÃO 7 ETAPAS + WHATSAPP
function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, idx) => `
        <div class="gva-card">
            <div class="card-header" style="display:flex; justify-content:space-between;">
                <span>👤 ${p.cliente}</span>
                <select onchange="mudarStatus('${p.id}', this.value)" style="font-size:11px;">
                    <option ${p.status === '💰 Pagamento' ? 'selected' : ''}>💰 Pagamento</option>
                    <option ${p.status === '📂 Verif. Arquivos' ? 'selected' : ''}>📂 Verif. Arquivos</option>
                    <option ${p.status === '🖨️ Impressão' ? 'selected' : ''}>🖨️ Impressão</option>
                    <option ${p.status === '✂️ Acabamento' ? 'selected' : ''}>✂️ Acabamento</option>
                    <option ${p.status === '🏠 Pronto Retirada' ? 'selected' : ''}>🏠 Pronto Retirada</option>
                    <option value="cancelar">❌ Pedido Cancelado</option>
                    <option value="entregar">📦 Pedido Entregue</option>
                </select>
            </div>
            <div class="card-body">
                <p style="font-size:12px;">${p.itens.map(i => i.nome).join(', ')}</p>
                <div style="display:flex; gap:10px;">
                    <button class="btn-gva" style="font-size:11px;" onclick="imprimirCupom(${idx})">Imprimir Nota</button>
                    <button class="btn-wa" onclick="enviarWA(${idx})"><i class="fab fa-whatsapp"></i> Status</button>
                </div>
            </div>
        </div>`).join('');
}

function enviarWA(idx) {
    const p = pedidosGVA[idx];
    const msg = window.encodeURIComponent(`Olá ${p.cliente}, o status do seu pedido na GVA Venom Arts mudou para: ${p.status}`);
    window.open(`https://wa.me/55${p.telefone.replace(/\D/g,'')}?text=${msg}`);
}

// NOTA DE BALCÃO (2 VIAS + ENDEREÇO)
function imprimirCupom(idx) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[idx];
    const doc = new jsPDF({ format: [80, 280] });

    function via(y, tit) {
        doc.setFontSize(10); doc.text("GVA VENOM ARTS", 40, y, null, null, "center");
        doc.setFontSize(7); doc.text(tit, 40, y+5, null, null, "center");
        doc.line(5, y+7, 75, y+7);
        doc.text(`Cliente: ${p.cliente}`, 5, y+11);
        if(p.motoboy > 0) doc.text(`Entrega: ${p.end || '---'} | CEP: ${p.cep || '---'}`, 5, y+15);
        let cy = y+20;
        p.itens.forEach(i => { doc.text(`- ${i.nome}: R$ ${i.total.toFixed(2)}`, 5, cy); cy += 4; });
        doc.text(`TOTAL: R$ ${p.total.toFixed(2)}`, 75, cy+2, null, null, "right");
        return cy + 10;
    }

    let prox = via(10, "VIA CLIENTE");
    doc.line(0, prox, 80, prox);
    via(prox+10, "VIA PRODUÇÃO");
    window.open(doc.output('bloburl'), '_blank');
}

// ADMIN GESTÃO (EDITAR/EXCLUIR)
function renderizarListaAdmin() {
    const div = document.getElementById('listaGerenciarProdutos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>SKU</th><th>Nome</th><th>Ações</th></tr></thead><tbody>` + 
        bancoDeDados.map(p => `<tr><td>${p.sku}</td><td>${p.nome}</td><td><button onclick="editarProduto('${p.id}')">Editar</button><button onclick="excluirItem('catalogo', '${p.id}')" style="color:red">X</button></td></tr>`).join('') + `</tbody></table>`;
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
    document.getElementById('btnSalvarProd').innerText = "Atualizar Produto";
    window.scrollTo(0,0);
}

// RESTANTE DAS FUNÇÕES (CATEGORIAS, FINANCEIRO, ETC)
async function salvarNovoProduto() {
    const id = document.getElementById('editId').value;
    const d = { sku: document.getElementById('adminSku').value, nome: document.getElementById('adminNome').value, preco: parseFloat(document.getElementById('adminPreco').value), categoria: document.getElementById('adminCatSelect').value, tipo: document.getElementById('adminTipo').value, img: document.getElementById('adminImg').value };
    if(id) await db.collection("catalogo").doc(id).update(d); else await db.collection("catalogo").add(d);
    limparFormAdmin();
}

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    if(!nome || carrinho.length === 0) return alert("Dados incompletos!");
    const t = parseFloat(document.getElementById('totalCarrinho').innerText);
    const s = parseFloat(document.getElementById('valorSinal').value) || 0;
    const m = parseFloat(document.getElementById('valorMotoboy').value) || 0;
    const p = { cliente: nome, telefone: document.getElementById('telCliente').value, end: document.getElementById('endCliente').value, cep: document.getElementById('cepCliente').value, itens: [...carrinho], total: t, sinal: s, restante: t-s, motoboy: m, status: "💰 Pagamento", dataCriacao: new Date().toLocaleDateString('pt-BR') };
    db.collection("pedidos").add(p).then(() => { carrinho = []; document.getElementById('nomeCliente').value = ""; atualizarCarrinho(); mudarAba('loja'); });
}

function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function excluirItem(coll, id) { if(confirm("Excluir?")) db.collection(coll).doc(id).delete(); }
function limparFormAdmin() { document.getElementById('editId').value = ""; document.getElementById('adminSku').value = ""; document.getElementById('adminNome').value = ""; document.getElementById('btnSalvarProd').innerText = "Salvar Produto"; }
function fazerLogin() { auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value, document.getElementById('loginSenha').value); }
function fazerLogout() { auth.signOut().then(() => window.location.reload()); }
