// ==========================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO FIREBASE
// ==========================================
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

// DEFINA SEU E-MAIL DE ADMINISTRADOR AQUI
const EMAIL_ADMIN = "contato@graficava.com.br"; 

// Variáveis Globais de Controle
let bancoDeDados = [];
let pedidosGVA = [];
let carrinho = [];
let produtoSendoConfigurado = null;

// ==========================================
// 2. CONTROLE DE ACESSO E LOGIN
// ==========================================

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('telaLogin').style.display = 'none';
        
        // Verifica se é admin para liberar o menu completo
        if (user.email.toLowerCase() === EMAIL_ADMIN.toLowerCase()) {
            document.querySelectorAll('.aba-restrita').forEach(a => a.style.display = 'block');
        } else {
            document.querySelectorAll('.aba-restrita').forEach(a => a.style.display = 'none');
        }
        
        iniciarSincronizacao();
    } else {
        document.getElementById('telaLogin').style.display = 'flex';
    }
});

function fazerLogin() {
    const e = document.getElementById('loginEmail').value;
    const s = document.getElementById('loginSenha').value;
    if(!e || !s) return mostrarAlerta("Preencha e-mail e senha.");
    
    auth.signInWithEmailAndPassword(e, s).catch(err => {
        mostrarAlerta("Erro de acesso: Usuário ou senha inválidos.");
    });
}

function fazerLogout() { 
    auth.signOut().then(() => {
        window.location.reload();
    });
}

// ==========================================
// 3. SINCRONIZAÇÃO EM TEMPO REAL (CLOUD)
// ==========================================

function iniciarSincronizacao() {
    // Sincroniza Catálogo de Produtos
    db.collection("catalogo").onSnapshot(snap => {
        bancoDeDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        carregarProdutos();
    });

    // Sincroniza Pedidos em Produção
    db.collection("pedidos").onSnapshot(snap => {
        pedidosGVA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarProducao();
    });
}

// ==========================================
// 4. GESTÃO DO CATÁLOGO (ZAP STYLE)
// ==========================================

function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente');
    grade.innerHTML = '';
    
    if(lista.length === 0) {
        grade.innerHTML = "<p style='padding:20px; color:#666;'>Nenhum produto cadastrado ainda.</p>";
        return;
    }

    // Ordenar por mais vendidos (vendas)
    lista.sort((a, b) => (b.vendas || 0) - (a.vendas || 0)).forEach(p => {
        grade.innerHTML += `
            <div class="zap-card">
                <img src="${p.img || 'https://placehold.co/400x300?text=GVA+Venom+Arts'}" class="zap-img">
                <div class="zap-info">
                    <small style="color: #2271b1; font-weight: bold;">${p.categoria || 'Geral'}</small>
                    <h4>${p.nome}</h4>
                    <p class="zap-price">R$ ${p.preco.toFixed(2)} <span style="font-size:10px; font-weight:normal;">${p.tipo === 'm2' ? '/ m²' : (p.tipo === 'folha' ? '/ pág' : '/ un')}</span></p>
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
// 5. CONFIGURAÇÃO DE ITENS E CARRINHO
// ==========================================

function abrirConfigurador(id) {
    produtoSendoConfigurado = bancoDeDados.find(item => item.id === id);
    const modal = document.getElementById('modalConteudo');
    
    let html = `<div class="wp-box-title">Configurar: ${produtoSendoConfigurado.nome}</div>
                <div class="wp-box-content wp-form">`;
    
    if(produtoSendoConfigurado.tipo === 'm2') {
        html += `<label>Largura (m):</label><input type="number" id="cfgLarg" step="0.01" value="1.00">
                 <label>Altura (m):</label><input type="number" id="cfgAlt" step="0.01" value="1.00">`;
    } else if(produtoSendoConfigurado.tipo === 'folha') {
        html += `<label>Total de Páginas (Apostila):</label><input type="number" id="cfgPag" value="1">`;
    } else {
        html += `<label>Quantidade de Unidades:</label><input type="number" id="cfgQtd" value="1">`;
    }
    
    html += `<button class="wp-btn-blue full" style="margin-top:15px;" onclick="adicionarAoCarrinho()">Adicionar ao Orçamento</button>
             <button class="wp-button full" style="margin-top:5px; border:none;" onclick="fecharModal()">Cancelar</button>
             </div>`;
             
    modal.innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
}

function adicionarAoCarrinho() {
    let totalItem = 0;
    let descItem = "";

    if(produtoSendoConfigurado.tipo === 'm2') {
        const l = parseFloat(document.getElementById('cfgLarg').value);
        const a = parseFloat(document.getElementById('cfgAlt').value);
        totalItem = (l * a) * produtoSendoConfigurado.preco;
        descItem = `${l.toFixed(2)}x${a.toFixed(2)}m (Área)`;
    } else if(produtoSendoConfigurado.tipo === 'folha') {
        const pag = parseInt(document.getElementById('cfgPag').value);
        totalItem = pag * produtoSendoConfigurado.preco;
        descItem = `${pag} páginas`;
    } else {
        const q = parseInt(document.getElementById('cfgQtd').value);
        totalItem = q * produtoSendoConfigurado.preco;
        descItem = `${q} un`;
    }

    carrinho.push({ 
        nome: produtoSendoConfigurado.nome, 
        detalhes: descItem, 
        total: totalItem 
    });
    
    fecharModal();
    atualizarCarrinho();
    mostrarAlerta("Item adicionado ao carrinho!");
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let totalGeral = 0;
    
    if(carrinho.length === 0) {
        div.innerHTML = "Selecione produtos no catálogo.";
        document.getElementById('totalCarrinho').innerText = "0,00";
        document.getElementById('restanteCarrinho').innerText = "0,00";
        return;
    }

    div.innerHTML = carrinho.map((item, index) => {
        totalGeral += item.total;
        return `<div style="display:flex; justify-content:space-between; margin-bottom:8px; background:#f9f9f9; padding:8px; border-radius:4px; font-size:13px;">
                    <span><b>${item.nome}</b><br><small>${item.detalhes}</small></span>
                    <span>R$ ${item.total.toFixed(2)} <i class="fa fa-times" style="color:red; cursor:pointer; margin-left:10px;" onclick="removerItem(${index})"></i></span>
                </div>`;
    }).join('');

    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    const final = totalGeral;
    const resta = final - sinal;
    
    document.getElementById('totalCarrinho').innerText = final.toFixed(2).replace('.', ',');
    document.getElementById('restanteCarrinho').innerText = (resta < 0 ? 0 : resta).toFixed(2).replace('.', ',');
}

function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
}

// ==========================================
// 6. FINALIZAÇÃO DE PEDIDOS
// ==========================================

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    const tel = document.getElementById('telCliente').value;
    
    if(carrinho.length === 0) return mostrarAlerta("O carrinho está vazio!");
    if(!nome || !tel) return mostrarAlerta("Preencha o nome e o WhatsApp do cliente.");

    const total = parseFloat(document.getElementById('totalCarrinho').innerText.replace(',', '.'));
    const sinal = parseFloat(document.getElementById('valorSinal').value) || 0;
    const resta = parseFloat(document.getElementById('restanteCarrinho').innerText.replace(',', '.'));

    const novoPedido = {
        cliente: nome,
        documento: document.getElementById('docCliente').value,
        telefone: tel,
        tipo: document.getElementById('tipoCliente').value,
        obs: document.getElementById('obsPedido').value,
        previsao: document.getElementById('dataEntrega').value || "A definir",
        itens: [...carrinho],
        total: total,
        sinal: sinal,
        restante: resta,
        status: "Novo Pedido 📂",
        dataCriacao: new Date().toLocaleDateString('pt-BR'),
        vendedor: auth.currentUser.email
    };

    db.collection("pedidos").add(novoPedido).then(() => {
        // Limpa tudo após sucesso
        carrinho = [];
        document.getElementById('nomeCliente').value = "";
        document.getElementById('telCliente').value = "";
        document.getElementById('docCliente').value = "";
        document.getElementById('obsPedido').value = "";
        document.getElementById('valorSinal').value = "0";
        
        atualizarCarrinho();
        mostrarAlerta("Pedido enviado para a Produção!");
        mudarAba('loja');
    }).catch(err => mostrarAlerta("Erro ao salvar: " + err.message));
}

// ==========================================
// 7. PAINEL DE PRODUÇÃO E ADMIN
// ==========================================

function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = '';

    if(pedidosGVA.length === 0) {
        div.innerHTML = "<p>Nenhum pedido em produção.</p>";
        return;
    }

    pedidosGVA.forEach((p, index) => {
        div.innerHTML += `
            <div class="wp-box">
                <div class="wp-box-title" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>👤 ${p.cliente} (${p.dataCriacao})</span>
                    <span style="background:var(--gva-azul); color:white; padding:2px 8px; border-radius:4px; font-size:11px;">${p.status}</span>
                </div>
                <div class="wp-box-content" style="font-size:13px;">
                    <p><b>Entrega:</b> ${p.previsao}</p>
                    <p><b>Itens:</b> ${p.itens.map(i => i.nome).join(', ')}</p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="wp-btn-blue" onclick="gerarReciboPDF(${index})"><i class="fa fa-print"></i> Cupom</button>
                        <button class="wp-button" onclick="concluirPedido('${p.id}')">Concluir ✅</button>
                    </div>
                </div>
            </div>`;
    });
}

function salvarNovoProduto() {
    const nome = document.getElementById('adminNome').value;
    const preco = parseFloat(document.getElementById('adminPreco').value);
    
    if(!nome || isNaN(preco)) return mostrarAlerta("Preencha nome e preço corretamente.");

    const produto = {
        nome: nome,
        preco: preco,
        tipo: document.getElementById('adminTipo').value,
        img: document.getElementById('adminImg').value || "",
        categoria: "Geral",
        vendas: 0
    };

    db.collection("catalogo").add(produto).then(() => {
        mostrarAlerta("Produto cadastrado com sucesso!");
        document.getElementById('adminNome').value = "";
        document.getElementById('adminPreco').value = "";
        document.getElementById('adminImg').value = "";
    });
}

function concluirPedido(id) {
    const p = pedidosGVA.find(item => item.id === id);
    db.collection("pedidos_concluidos").add({ ...p, status: "Concluído ✅", dataFinal: new Date().toLocaleDateString('pt-BR') })
    .then(() => {
        db.collection("pedidos").doc(id).delete();
    });
}

// ==========================================
// 8. INTERFACE E UTILITÁRIOS
// ==========================================

function mudarAba(aba) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.wp-menu button').forEach(b => b.classList.remove('active'));
    
    const idAba = 'aba' + aba.charAt(0).toUpperCase() + aba.slice(1);
    const idBtn = 'btn' + aba.charAt(0).toUpperCase() + aba.slice(1);
    
    document.getElementById(idAba).classList.add('active');
    document.getElementById(idBtn).classList.add('active');

    const titulos = {
        'cliente': 'Produtos',
        'carrinho': 'Adicionar Novo Orçamento',
        'loja': 'Fila de Produção',
        'caixa': 'Financeiro',
        'admin': 'Configurações do Sistema'
    };
    document.getElementById('tituloPagina').innerText = titulos[aba] || 'Painel GVA';
}

function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function mostrarAlerta(m) { document.getElementById('alertaTexto').innerText = m; document.getElementById('alertaFundo').style.display = 'flex'; }
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }

function ajustarCamposCliente() { /* Função para mudar placeholders se necessário */ }

// ==========================================
// 9. RECIBO PDF (PADRÃO TÉRMICO)
// ==========================================

function gerarReciboPDF(index) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[index];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });

    try {
        const img = document.getElementById('logoGVA_Preto');
        doc.addImage(img, 'PNG', 20, 5, 40, 12);
    } catch(e) {}

    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("GVA VENOM ARTS", 40, 22, null, null, "center");
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("CUPOM DE PRODUÇÃO", 40, 26, null, null, "center");
    
    doc.line(5, 28, 75, 28);
    doc.text(`CLIENTE: ${p.cliente.toUpperCase()}`, 5, 32);
    doc.text(`DATA: ${p.dataCriacao}`, 5, 36);
    doc.text(`PREVISÃO: ${p.previsao}`, 5, 40);
    doc.line(5, 42, 75, 42);

    let y = 46;
    doc.setFont("helvetica", "bold");
    doc.text("ITEM", 5, y); doc.text("TOTAL", 75, y, null, null, "right");
    doc.setFont("helvetica", "normal");
    
    p.itens.forEach(item => {
        y += 4;
        doc.text(`- ${item.nome}`, 5, y);
        doc.text(`${item.total.toFixed(2)}`, 75, y, null, null, "right");
        y += 3;
        doc.setFontSize(6); doc.text(`  (${item.detalhes})`, 5, y); doc.setFontSize(7);
    });

    y += 5; doc.line(5, y, 75, y); y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL DO PEDIDO:", 5, y); doc.text(`R$ ${p.total.toFixed(2)}`, 75, y, null, null, "right");
    
    if(p.sinal > 0) {
        y += 4; doc.setFont("helvetica", "normal");
        doc.text("SINAL PAGO:", 5, y); doc.text(`R$ ${p.sinal.toFixed(2)}`, 75, y, null, null, "right");
        y += 5; doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.text("FALTA PAGAR:", 5, y); doc.text(`R$ ${p.restante.toFixed(2)}`, 75, y, null, null, "right");
    }

    doc.save(`GVA_Recibo_${p.cliente.replace(/ /g, '_')}.pdf`);
}
