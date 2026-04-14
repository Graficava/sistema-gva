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
    } else { document.getElementById('telaLogin').style.display = 'flex'; }
});

function iniciarSincronizacao() {
    db.collection("categorias").onSnapshot(snap => {
        categorias = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarMenus();
        const selAdmin = document.getElementById('adminCatSelect');
        const selAcab = document.getElementById('acabCatVinculo');
        const options = categorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        if(selAdmin) selAdmin.innerHTML = options;
        if(selAcab) selAcab.innerHTML = `<option value="Geral">Todas Categorias</option>` + options;
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

// CATALOGO E FILTRO
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
    if(!grade) return; grade.innerHTML = '';
    lista.forEach(p => {
        grade.innerHTML += `<div class="zap-card">
            <div class="zap-color-bg">SKU: ${p.sku || '---'}</div>
            <div class="zap-info"><h4>${p.nome}</h4><p>A partir de R$ ${p.preco.toFixed(2)}</p>
            <button class="btn-gva" onclick="abrirConfigurador('${p.id}')">Configurar</button></div></div>`;
    });
}

// CONFIGURADOR INTELIGENTE (PONTO CHAVE)
function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let html = `<div class="card-header">Configurar: ${p.nome}</div><div class="card-body gva-form-large">`;
    
    // 1. Quantidades Fixas
    if(p.qtdsFixas) {
        html += `<label>Escolha a Quantidade:</label><div class="qty-btns">`;
        p.qtdsFixas.split(',').forEach(q => {
            html += `<button class="btn-qty" onclick="selecionarQtd(this, ${q.trim()})">${q.trim()}</button>`;
        });
        html += `</div><input type="hidden" id="cfgQ" value="0">`;
    } else if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        const maxL = p.tipo === 'm_linear' ? 1.50 : 3.10;
        html += `<label>Largura (Máx ${maxL}m):</label><input type="number" id="cfgL" value="1.00" step="0.01">
                 <label>Altura (m):</label><input type="number" id="cfgA" value="1.00" step="0.01">`;
    } else {
        html += `<label>Quantidade:</label><input type="number" id="cfgQ" value="1" oninput="calcularPrecoEscalonado('${p.id}', this.value)">`;
    }

    // 2. Acabamentos Filtrados por Categoria
    html += `<label style="margin-top:10px; display:block;">Acabamentos:</label><div class="acabamento-seletor">`;
    const acabFiltrados = acabamentos.filter(a => a.vinculo === p.categoria || a.vinculo === 'Geral');
    acabFiltrados.forEach(a => {
        html += `<label><input type="checkbox" class="check-acab" data-preco="${a.preco}" value="${a.nome}"> ${a.nome}</label>`;
    });
    
    html += `</div><div id="previewPreco" style="margin-top:15px; font-weight:bold; color:var(--gva-azul);">Preço Base: R$ ${p.preco.toFixed(2)}</div>
             <button class="btn-success" style="margin-top:15px;" onclick="confirmarCarrinho('${p.id}')">Adicionar</button>
             <button class="btn-gva" style="background:#666; width:100%; margin-top:10px;" onclick="fecharModal()">Voltar</button></div>`;
    
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function selecionarQtd(btn, valor) {
    document.querySelectorAll('.btn-qty').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('cfgQ').value = valor;
}

// LOGICA DE PREÇO ESCALONADO
function calcularPrecoEscalonado(id, qtd) {
    const p = bancoDeDados.find(item => item.id === id);
    if(!p.escalonado) return;
    let precoUnitario = p.preco;
    const faixas = p.escalonado.split(',').map(f => {
        const [q, v] = f.split(':');
        return { qtd: parseInt(q), valor: parseFloat(v) };
    }).sort((a,b) => b.qtd - a.qtd);

    const faixaEncontrada = faixas.find(f => qtd >= f.qtd);
    if(faixaEncontrada) precoUnitario = faixaEncontrada.valor;
    
    document.getElementById('previewPreco').innerText = `Preço Unitário: R$ ${precoUnitario.toFixed(2)}`;
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    let total = 0, det = "", qtd = parseFloat(document.getElementById('cfgQ')?.value || 0);

    // Lógica de Preço Escalonado no Fechamento
    let precoBase = p.preco;
    if(p.escalonado && qtd > 0) {
        const faixas = p.escalonado.split(',').map(f => {
            const [q, v] = f.split(':');
            return { qtd: parseInt(q), valor: parseFloat(v) };
        }).sort((a,b) => b.qtd - a.qtd);
        const faixaEncontrada = faixas.find(f => qtd >= f.qtd);
        if(faixaEncontrada) precoBase = faixaEncontrada.valor;
    }

    if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        let l = parseFloat(document.getElementById('cfgL').value), a = parseFloat(document.getElementById('cfgA').value);
        total = (l * a) * precoBase; det = `${l}x${a}m`;
    } else {
        if(qtd <= 0) return alert("Selecione a quantidade!");
        total = qtd * precoBase; det = `${qtd} un`;
    }

    let adicionais = 0; 
    document.querySelectorAll('.check-acab:checked').forEach(c => { adicionais += parseFloat(c.getAttribute('data-preco')); });
    total += adicionais;

    carrinho.push({ nome: p.nome, total: total, detalhes: det, sku: p.sku });
    fecharModal(); atualizarCarrinho();
}

// RESTANTE DO MOTOR (ESTÁVEL)
function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let motoboy = parseFloat(document.getElementById('valorMotoboy').value) || 0;
    let t = carrinho.reduce((acc, i) => acc + i.total, 0) + motoboy;
    let s = parseFloat(document.getElementById('valorSinal').value) || 0;
    div.innerHTML = carrinho.map((i, idx) => `<div style="display:flex; justify-content:space-between; margin-bottom:10px; padding:10px; background:#f9f9f9; border-radius:10px;"><span><b>[${i.sku}] ${i.nome}</b><br><small>${i.detalhes}</small></span><b>R$ ${i.total.toFixed(2)} <i class="fa fa-trash" style="color:red; cursor:pointer;" onclick="removerItem(${idx})"></i></b></div>`).join('') || "Vazio.";
    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (t - s).toFixed(2);
}

async function salvarNovoProduto() {
    const id = document.getElementById('editId').value;
    const d = { 
        sku: document.getElementById('adminSku').value, 
        nome: document.getElementById('adminNome').value, 
        preco: parseFloat(document.getElementById('adminPreco').value), 
        categoria: document.getElementById('adminCatSelect').value, 
        tipo: document.getElementById('adminTipo').value,
        qtdsFixas: document.getElementById('adminQtdsFixas').value,
        escalonado: document.getElementById('adminEscalonado').value
    };
    if(id) await db.collection("catalogo").doc(id).update(d); else await db.collection("catalogo").add(d);
    limparFormAdmin();
}

async function salvarAcabamento() {
    const id = document.getElementById('editAcabId').value;
    const d = { 
        nome: document.getElementById('acabNome').value, 
        preco: parseFloat(document.getElementById('acabPreco').value),
        vinculo: document.getElementById('acabCatVinculo').value
    };
    if(id) await db.collection("acabamentos").doc(id).update(d); else await db.collection("acabamentos").add(d);
    document.getElementById('acabNome').value = ""; document.getElementById('editAcabId').value = "";
}

// FINANCEIRO, WA, MODAL, ETC (BLINDADOS)
function removerItem(idx) { carrinho.splice(idx, 1); atualizarCarrinho(); }
function toggleCamposPagamento() { document.getElementById('divParcelas').style.display = document.getElementById('formaPagamento').value === 'CreditoParc' ? 'block' : 'none'; }
function toggleCamposEntrega() { document.getElementById('divMotoboy').style.display = document.getElementById('metodoEntrega').value === 'Motoboy' ? 'block' : 'none'; }
function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function mudarAba(aba) {
    const titulos = { cliente: "Catálogo", carrinho: "Orçamento", loja: "Produção", caixa: "Financeiro", admin: "Configurações" };
    document.getElementById('tituloPagina').innerText = titulos[aba];
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}
function toggleAdminSub(s) { 
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.sub-nav-gva button').forEach(b => b.classList.remove('sub-active'));
    document.getElementById('subAdmin' + s.charAt(0).toUpperCase() + s.slice(1)).style.display = 'block';
    document.getElementById('subBtn' + s.charAt(0).toUpperCase() + s.slice(1)).classList.add('sub-active');
}
function abrirLancamento(tipo) {
    const v = prompt(`Valor (R$):`); const d = prompt(`Descrição:`);
    if(v && d) db.collection("financeiro_avulso").add({ tipo, valor: parseFloat(v), desc: d, data: new Date().toLocaleDateString('pt-BR') });
}
function fazerLogin() { auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value, document.getElementById('loginSenha').value); }
function fazerLogout() { auth.signOut().then(() => window.location.reload()); }
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
function renderizarListaAdmin() { /* Tabela igual anterior */ }
function renderizarListaAcabamentos() { /* Tabela igual anterior */ }
function renderizarListaCategorias() { /* Tabela igual anterior */ }
function atualizarProducao() { /* Cards igual anterior */ }
function enviarPedido() { /* Gravação Firestore igual anterior */ }
