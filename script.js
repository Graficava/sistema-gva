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
        renderizarMenus(); renderizarListaCategorias();
        const selAdmin = document.getElementById('adminCatSelect');
        const selAcab = document.getElementById('acabCatVinculo');
        const options = categorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        if(selAdmin) selAdmin.innerHTML = options;
        if(selAcab) selAcab.innerHTML = `<option value="Geral (Aparece em todos)">Geral (Aparece em todos)</option>` + options;
    });
    db.collection("acabamentos").orderBy("grupo").onSnapshot(snap => {
        acabamentos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarListaAcabamentos();
    });
    db.collection("catalogo").onSnapshot(snap => {
        bancoDeDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        carregarProdutos(); renderizarListaAdmin();
    });
    db.collection("pedidos").orderBy("dataCriacao", "desc").onSnapshot(snap => {
        pedidosGVA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarProducao(); calcularFinanceiro();
    });
}

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
        let imgHtml = p.img ? `<img src="${p.img}">` : `<div style="color:#CBD5E0; font-size:40px;"><i class="fa fa-image"></i></div>`;
        grade.innerHTML += `
            <div class="zap-card" onclick="abrirConfigurador('${p.id}')">
                <div class="zap-color-bg">${imgHtml}</div>
                <div class="zap-info">
                    <h4>${p.nome}</h4>
                    <p style="color:var(--gva-azul); font-weight:600;">Personalizar e Comprar</p>
                    <button class="btn-gva" style="width:100%">Configurar Orçamento</button>
                </div>
            </div>`;
    });
}

// ---------------------------------------------------------
// REGRAS DE PREÇO E TABELAS DO ADMIN
// ---------------------------------------------------------
function adicionarFaixaPreco(containerId, qtd = 1, preco = 0) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'faixa-preco-row';
    div.innerHTML = `
        <div class="form-group"><label>A partir da Qtd/Medida:</label><input type="number" class="faixa-qtd" min="1" step="0.01" value="${qtd}"></div>
        <div class="form-group"><label>Valor Un. (R$):</label><input type="number" class="faixa-preco" step="0.001" value="${preco}"></div>
        <button type="button" class="btn-remover-faixa" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);
}

function extrairTabelaPrecos(containerId) {
    const linhas = document.getElementById(containerId).querySelectorAll('.faixa-preco-row');
    let precos = [];
    linhas.forEach(linha => {
        let q = parseFloat(linha.querySelector('.faixa-qtd').value);
        let p = parseFloat(linha.querySelector('.faixa-preco').value);
        if(!isNaN(q) && !isNaN(p)) precos.push({ qtd: q, valor: p });
    });
    return precos.sort((a,b) => a.qtd - b.qtd);
}

function preencherTabelaPrecos(containerId, arrayPrecos) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; 
    if(!arrayPrecos || arrayPrecos.length === 0) {
        adicionarFaixaPreco(containerId, 1, 0); 
    } else {
        arrayPrecos.forEach(f => adicionarFaixaPreco(containerId, f.qtd, f.valor));
    }
}

function getPrecoReal(arrayPrecos, qtdComparacao) {
    if(!arrayPrecos || arrayPrecos.length === 0) return 0;
    let valorEncontrado = arrayPrecos[0].valor; 
    for(let i = 0; i < arrayPrecos.length; i++) {
        if(qtdComparacao >= arrayPrecos[i].qtd) valorEncontrado = arrayPrecos[i].valor;
    }
    return valorEncontrado;
}

// ---------------------------------------------------------
// W2P CONFIGURADOR DA LOJA (COM LÓGICA DE PADRÃO / GRÁTIS)
// ---------------------------------------------------------
function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let imgSrc = p.img ? `<img src="${p.img}">` : `<div style="padding:100px; color:#CBD5E0; font-size:80px; text-align:center;"><i class="fa fa-file-alt"></i></div>`;
    
    let html = `
        <div class="w2p-header"><h2>${p.nome}</h2><button class="btn-close" onclick="fecharModal()"><i class="fa fa-times"></i></button></div>
        <div class="w2p-body"><div class="w2p-left">${imgSrc}<div id="infoFolhas" style="display:none; width:100%;"></div></div><div class="w2p-right gva-form-large">
    `;
    
    // CAMPOS BASEADOS NA MATRIZ (Folha, M2, Offset)
    if(p.tipo === 'folha') {
        html += `<div class="w2p-section-title">Dados da Impressão</div>
                 <div class="form-row">
                    <div class="form-group"><label>Páginas (do PDF):</label><input type="number" id="cfgPaginas" value="1" min="1" oninput="atualizarPrecoAoVivo('${p.id}')"></div>`;
        if(p.qtdsFixas) {
            html += `<div class="form-group"><label>Qtd de Cópias:</label><div class="qty-btns">`;
            p.qtdsFixas.split(',').forEach(q => { html += `<button class="btn-qty" onclick="selecionarQtd(this, ${q.trim()}, '${p.id}')">${q.trim()}</button>`; });
            html += `</div><input type="hidden" id="cfgQ" value="0"></div></div>`;
        } else {
            html += `<div class="form-group"><label>Qtd de Cópias:</label><input type="number" id="cfgQ" value="1" min="1" oninput="atualizarPrecoAoVivo('${p.id}')"></div></div>`;
        }
    } else if(p.tipo === 'm2' || p.tipo === 'm_linear') {
        html += `<div class="w2p-section-title">Dimensões da Mídia</div>
                 <div class="form-row">
                    <div class="form-group"><label>Largura (m):</label><input type="number" id="cfgL" value="1.00" step="0.01" oninput="atualizarPrecoAoVivo('${p.id}')"></div>
                    <div class="form-group"><label>Altura (m):</label><input type="number" id="cfgA" value="1.00" step="0.01" oninput="atualizarPrecoAoVivo('${p.id}')"></div>
                    <div class="form-group"><label>Qtd:</label><input type="number" id="cfgQ" value="1" min="1" oninput="atualizarPrecoAoVivo('${p.id}')"></div>
                 </div>`;
    } else if(p.tipo === 'cm2') {
        html += `<div class="w2p-section-title">Medidas (Recorte / Pequenos)</div>
                 <div class="form-row">
                    <div class="form-group"><label>Largura (cm):</label><input type="number" id="cfgL" value="10" step="0.1" oninput="atualizarPrecoAoVivo('${p.id}')"></div>
                    <div class="form-group"><label>Altura (cm):</label><input type="number" id="cfgA" value="10" step="0.1" oninput="atualizarPrecoAoVivo('${p.id}')"></div>
                    <div class="form-group"><label>Qtd:</label><input type="number" id="cfgQ" value="1" min="1" oninput="atualizarPrecoAoVivo('${p.id}')"></div>
                 </div>`;
    } else {
        html += `<div class="w2p-section-title">Definir Tiragem / Pacote</div>`;
        if(p.qtdsFixas) {
            html += `<div class="qty-btns">`;
            p.qtdsFixas.split(',').forEach(q => { html += `<button class="btn-qty" onclick="selecionarQtd(this, ${q.trim()}, '${p.id}')">${q.trim()}</button>`; });
            html += `</div><input type="hidden" id="cfgQ" value="0">`;
        } else {
            html += `<input type="number" id="cfgQ" value="1" min="1" oninput="atualizarPrecoAoVivo('${p.id}')">`;
        }
    }

    // CARREGA ACABAMENTOS DA GRADE
    const acabFiltrados = acabamentos.filter(a => a.vinculo === p.categoria || a.vinculo.includes('Geral'));
    const grupos = {}; const avulsos = [];
    
    acabFiltrados.forEach(a => {
        if(a.grupo && a.grupo.trim() !== '') {
            if(!grupos[a.grupo]) grupos[a.grupo] = []; grupos[a.grupo].push(a);
        } else { avulsos.push(a); }
    });

    if(Object.keys(grupos).length > 0 || avulsos.length > 0) {
        html += `<div class="w2p-section-title">Especificações e Acabamentos</div>`;
    }

    // GRUPOS OBRIGATÓRIOS (DROPDOWNS)
    for (const nomeGrupo in grupos) {
        html += `<label>${nomeGrupo}</label>
                 <select class="grupo-var-select check-grupo" onchange="atualizarPrecoAoVivo('${p.id}')">`;
        
        let opcoesGrupo = grupos[nomeGrupo].sort((a, b) => {
            let precoA = (a.precos && a.precos.length > 0) ? a.precos[0].valor : 0;
            let precoB = (b.precos && b.precos.length > 0) ? b.precos[0].valor : 0;
            return precoA - precoB; 
        });

        opcoesGrupo.forEach(op => {
            let infoArray = JSON.stringify(op.precos);
            let textoPreco = "";
            let valorInicial = (op.precos && op.precos.length > 0) ? op.precos[0].valor : 0;

            if (valorInicial === 0 && (!op.precos || op.precos.length <= 1)) {
                textoPreco = " - (Padrão / Sem Custo)";
            } else if (op.precos && op.precos.length > 1) {
                textoPreco = " - (+ Custo Variável)";
            } else {
                textoPreco = ` - (+ R$ ${valorInicial.toFixed(2)})`;
            }

            html += `<option value="${nomeGrupo}: ${op.nome}" data-precos='${infoArray}' data-mult="${op.multiplicador}">${op.nome}${textoPreco}</option>`;
        });
        html += `</select>`;
    }

    // OPCIONAIS AVULSOS (CHECKBOXES)
    if(avulsos.length > 0) {
        html += `<label style="margin-top:15px; font-weight:600; display:block; margin-bottom:5px;">Opcionais Extras (Opcional)</label>
                 <div class="acabamento-seletor">`;
        avulsos.forEach(a => {
            let infoArray = JSON.stringify(a.precos);
            let valorInicial = (a.precos && a.precos.length > 0) ? a.precos[0].valor : 0;
            let classePreco = valorInicial === 0 ? "gratis" : "destaque";
            let textoPreco = valorInicial === 0 ? "Sem custo extra" : `+ R$ ${valorInicial.toFixed(2)}`;
            if (a.precos && a.precos.length > 1) textoPreco = "+ Custo Variável";

            html += `
                <label class="check-box-custom">
                    <div style="display:flex; align-items:center;">
                        <input type="checkbox" class="check-acab" data-precos='${infoArray}' data-mult="${a.multiplicador}" value="${a.nome}" onchange="atualizarPrecoAoVivo('${p.id}')">
                        <span class="check-box-nome">${a.nome}</span>
                    </div>
                    <span class="check-box-preco ${classePreco}">${textoPreco}</span>
                </label>
            `;
        });
        html += `</div>`;
    }

    html += `</div></div>
             <div class="w2p-footer">
                <div><div class="w2p-price-label">Valor Total Final</div><div class="w2p-price">R$ <span id="previewSubtotal">0.00</span></div></div>
                <button class="btn-success" onclick="confirmarCarrinho('${p.id}')"><i class="fa fa-shopping-cart"></i> Adicionar ao Carrinho</button>
             </div>`;
    
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalFundo').style.display = 'flex';
    atualizarPrecoAoVivo(p.id);
}

function selecionarQtd(btn, valor, idProduto) {
    document.querySelectorAll('.btn-qty').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); 
    document.getElementById('cfgQ').value = valor;
    atualizarPrecoAoVivo(idProduto);
}

// ---------------------------------------------------------
// O CÁLCULO GERAL (Cobre as 4 áreas da gráfica)
// ---------------------------------------------------------
function atualizarPrecoAoVivo(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let qtdCopias = parseFloat(document.getElementById('cfgQ')?.value || 1);
    
    let numPaginas = 1; let medidaL = 1; let medidaA = 1;

    if(p.tipo === 'folha') numPaginas = parseFloat(document.getElementById('cfgPaginas')?.value || 1);
    if(p.tipo === 'm2' || p.tipo === 'm_linear' || p.tipo === 'cm2') {
        medidaL = parseFloat(document.getElementById('cfgL')?.value || 1);
        medidaA = parseFloat(document.getElementById('cfgA')?.value || 1);
    }

    let isFrenteVerso = false;
    document.querySelectorAll('.check-grupo, .check-acab:checked').forEach(el => {
        let opt = el.options ? el.options[el.selectedIndex] : el;
        if(opt && opt.getAttribute('data-mult') === 'cobrar_paginas_verso') isFrenteVerso = true;
    });
    let folhasFisicas = isFrenteVerso ? Math.ceil(numPaginas / 2) : numPaginas;

    const divFolhas = document.getElementById('infoFolhas');
    if(divFolhas && p.tipo === 'folha') {
        divFolhas.style.display = 'flex';
        divFolhas.innerHTML = `<i class="fa fa-layer-group" style="font-size:20px;"></i> <div><b>${folhasFisicas} Folhas Físicas</b><br><small>Gastas na produção.</small></div>`;
    }

    let precoBaseOpt = getPrecoReal(p.precos, qtdCopias);
    let subtotalCopia = 0;

    if(p.tipo === 'folha') subtotalCopia = precoBaseOpt * numPaginas; 
    else if(p.tipo === 'm2') subtotalCopia = precoBaseOpt * (medidaL * medidaA);
    else if(p.tipo === 'cm2') subtotalCopia = precoBaseOpt * (medidaL * medidaA);
    else if(p.tipo === 'm_linear') subtotalCopia = precoBaseOpt * medidaL;
    else subtotalCopia = precoBaseOpt;

    document.querySelectorAll('.check-grupo, .check-acab:checked').forEach(el => {
        let opt = el.options ? el.options[el.selectedIndex] : el;
        if(!opt || !opt.value || opt.value === "") return;

        let arrayPrecosOpt = JSON.parse(opt.getAttribute('data-precos'));
        let tipoMult = opt.getAttribute('data-mult');
        let valorDaOpcao = 0;

        if(tipoMult === 'cobrar_paginas_frente' || tipoMult === 'cobrar_paginas_verso') {
            valorDaOpcao = getPrecoReal(arrayPrecosOpt, numPaginas) * numPaginas;
        } else if(tipoMult === 'cobrar_folhas') {
            valorDaOpcao = getPrecoReal(arrayPrecosOpt, folhasFisicas) * folhasFisicas;
        } else if(tipoMult === 'cobrar_fixo') {
            valorDaOpcao = getPrecoReal(arrayPrecosOpt, folhasFisicas) * 1; 
        } else if(tipoMult === 'cobrar_area_m2') {
            let m2 = (p.tipo === 'cm2') ? ((medidaL/100) * (medidaA/100)) : (medidaL * medidaA);
            valorDaOpcao = getPrecoReal(arrayPrecosOpt, qtdCopias) * m2;
        } else if(tipoMult === 'cobrar_area_cm2') {
            let cm2 = (p.tipo === 'm2') ? ((medidaL*100) * (medidaA*100)) : (medidaL * medidaA);
            valorDaOpcao = getPrecoReal(arrayPrecosOpt, qtdCopias) * cm2;
        } else if(tipoMult === 'cobrar_m_linear') {
            let linear = (p.tipo === 'cm2') ? (medidaL/100) : medidaL;
            valorDaOpcao = getPrecoReal(arrayPrecosOpt, qtdCopias) * linear;
        } else {
            valorDaOpcao = getPrecoReal(arrayPrecosOpt, qtdCopias) * 1;
        }
        
        subtotalCopia += valorDaOpcao;
    });

    let totalFinal = subtotalCopia * qtdCopias;
    document.getElementById('previewSubtotal').innerText = totalFinal.toFixed(2);
}

function confirmarCarrinho(id) {
    const p = bancoDeDados.find(i => i.id === id);
    const subtotalReal = parseFloat(document.getElementById('previewSubtotal').innerText);
    let det = "", qtdCopias = parseFloat(document.getElementById('cfgQ')?.value || 0);

    if(p.qtdsFixas && qtdCopias === 0) return alert("Selecione a Tiragem!");

    if(p.tipo === 'folha') {
        det = `${qtdCopias} un de ${document.getElementById('cfgPaginas').value} págs`;
    } else if(p.tipo === 'm2' || p.tipo === 'm_linear') {
        det = `${qtdCopias} un (${document.getElementById('cfgL').value}x${document.getElementById('cfgA').value}m)`;
    } else if(p.tipo === 'cm2') {
        det = `${qtdCopias} un (${document.getElementById('cfgL').value}x${document.getElementById('cfgA').value}cm)`;
    } else {
        det = `${qtdCopias} un / pct`;
    }

    let nomesAcab = [];
    document.querySelectorAll('.check-grupo').forEach(s => { if(s.selectedIndex > 0) nomesAcab.push(s.options[s.selectedIndex].value); });
    document.querySelectorAll('.check-acab:checked').forEach(c => { nomesAcab.push(c.value); });
    if(nomesAcab.length > 0) det += ` | ${nomesAcab.join(' | ')}`;

    carrinho.push({ nome: p.nome, total: subtotalReal, detalhes: det, sku: p.sku });
    fecharModal(); atualizarCarrinho();
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho');
    let t = carrinho.reduce((acc, i) => acc + i.total, 0);
    div.innerHTML = carrinho.map((i, idx) => `<div style="display:flex; justify-content:space-between; margin-bottom:12px; padding:15px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px;"><span><b style="color:#2D3748;">[${i.sku || '--'}] ${i.nome}</b><br><small style="color:#718096; line-height:1.4; display:block; margin-top:5px;">${i.detalhes}</small></span><b style="color:var(--gva-azul);">R$ ${i.total.toFixed(2)} <i class="fa fa-trash" style="color:#E53E3E; cursor:pointer; margin-left:10px;" onclick="removerItem(${idx})"></i></b></div>`).join('') || "<div style='color:#A0AEC0; padding:20px; text-align:center;'>Vazio.</div>";
    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
}

function removerItem(idx) { carrinho.splice(idx, 1); atualizarCarrinho(); }

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    if(!nome || carrinho.length === 0) return alert("Preencha o cliente e o carrinho!");
    const t = parseFloat(document.getElementById('totalCarrinho').innerText);
    const p = { cliente: nome, telefone: document.getElementById('telCliente').value, end: document.getElementById('endCliente').value, itens: [...carrinho], total: t, status: "💰 Avaliação", dataCriacao: new Date().toLocaleDateString('pt-BR') };
    db.collection("pedidos").add(p).then(() => { carrinho = []; document.getElementById('nomeCliente').value = ""; atualizarCarrinho(); mudarAba('loja'); });
}

function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, idx) => `
        <div class="gva-card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;"><span>👤 ${p.cliente}</span>
            <select onchange="mudarStatus('${p.id}', this.value)" style="padding:5px; border-radius:5px; border:1px solid #E2E8F0;">
                <option ${p.status === '💰 Avaliação' ? 'selected' : ''}>💰 Avaliação</option>
                <option ${p.status === '🖨️ Produção' ? 'selected' : ''}>🖨️ Produção</option>
                <option value="cancelar">❌ Cancelar</option><option value="entregar">📦 Finalizado</option>
            </select></div>
            <div class="card-body">
                <p style="margin-top:0; font-weight:bold;">Total: R$ ${p.total.toFixed(2)}</p>
                <button class="btn-gva" style="font-size:12px; padding:8px 15px;" onclick="imprimirCupom(${idx})">Ficha W2P</button>
            </div>
        </div>`).join('');
}

function mudarStatus(id, v) {
    if(v === 'cancelar') { if(confirm("Cancelar?")) db.collection("pedidos").doc(id).delete(); }
    else if(v === 'entregar') { 
        const p = pedidosGVA.find(i => i.id === id);
        db.collection("pedidos_arquivados").add({...p, status: 'Finalizado'}).then(() => db.collection("pedidos").doc(id).delete());
    } else { db.collection("pedidos").doc(id).update({status: v}); }
}

function imprimirCupom(idx) {
    const { jsPDF } = window.jspdf; const p = pedidosGVA[idx]; const doc = new jsPDF({ format: [80, 280] });
    function via(y, tit) {
        doc.setFontSize(10); doc.text("GVA VENOM ARTS", 40, y, null, null, "center");
        doc.setFontSize(7); doc.text(tit, 40, y+5, null, null, "center");
        doc.line(5, y+7, 75, y+7); doc.text(`Cliente: ${p.cliente}`, 5, y+11);
        let cy = y+16; p.itens.forEach(i => { 
            const n = doc.splitTextToSize(`- ${i.nome} | ${i.detalhes}`, 70);
            doc.text(n, 5, cy); cy += (n.length * 4);
            doc.text(`R$ ${i.total.toFixed(2)}`, 75, cy-4, null, null, "right");
        });
        doc.line(5, cy, 75, cy); doc.text(`TOTAL: R$ ${p.total.toFixed(2)}`, 75, cy+4, null, null, "right"); return cy + 15;
    }
    via(10, "Ficha de Produção"); window.open(doc.output('bloburl'), '_blank');
}

async function calcularFinanceiro() {
    let fat = pedidosGVA.reduce((acc, p) => acc + (p.total || 0), 0);
    document.getElementById('finFaturamento').innerText = fat.toFixed(2);
    document.getElementById('finSaldo').innerText = fat.toFixed(2);
}

// ---------------------------------------------------------
// CRUD ADMIN (Tabelas Visuais e Grade)
// ---------------------------------------------------------
function renderizarListaAcabamentos() {
    const tabela = document.getElementById('tabelaGradeW2P');
    if(!tabela) return;
    const termoBusca = document.getElementById('filtroGrade')?.value.toLowerCase() || "";
    const listaFiltrada = acabamentos.filter(a => a.nome.toLowerCase().includes(termoBusca) || (a.grupo && a.grupo.toLowerCase().includes(termoBusca)));

    let html = `<thead><tr><th>Vínculo</th><th>Opção W2P</th><th>Preço Venda</th><th>Regra</th><th>Ações</th></tr></thead><tbody>`;
    listaFiltrada.forEach(a => {
        let precoInicial = (a.precos && a.precos.length > 0) ? a.precos[0].valor : 0;
        let pText = (a.precos && a.precos.length > 1) ? "Escalonado" : `R$ ${precoInicial.toFixed(2)}`;
        html += `<tr><td><small>${a.vinculo}</small></td>
                <td><b>${a.nome}</b><br><small class="col-grupo">${a.grupo || 'Solto'}</small></td>
                <td class="col-venda">${pText}</td>
                <td><small style="color:#A0AEC0;">${a.multiplicador}</small></td>
                <td class="acoes"><button class="btn-grid-edit" onclick="editarAcabamento('${a.id}')"><i class="fa fa-pen"></i></button>
                <button class="btn-grid-del" onclick="excluirItem('acabamentos', '${a.id}')"><i class="fa fa-trash"></i></button></td></tr>`;
    });
    html += `</tbody>`;
    tabela.innerHTML = html;
}

function editarAcabamento(id) {
    const a = acabamentos.find(i => i.id === id);
    document.getElementById('editAcabId').value = a.id;
    document.getElementById('acabNome').value = a.nome;
    document.getElementById('acabGrupo').value = a.grupo || "";
    document.getElementById('acabCatVinculo').value = a.vinculo;
    document.getElementById('acabMultiplicador').value = a.multiplicador;
    document.getElementById('acabPrecoCusto').value = a.precoCusto || 0;
    document.getElementById('acabPeso').value = a.peso || 0;
    document.getElementById('acabPrazo').value = a.prazo || 0;
    preencherTabelaPrecos('containerPrecosAcabamento', a.precos);
    document.getElementById('btnSalvarAcab').innerHTML = "<i class='fa fa-save'></i> Atualizar Grade"; window.scrollTo(0,0);
}

async function salvarAcabamento() {
    const id = document.getElementById('editAcabId').value;
    const arrayPrecos = extrairTabelaPrecos('containerPrecosAcabamento');
    const d = { nome: document.getElementById('acabNome').value, grupo: document.getElementById('acabGrupo').value, vinculo: document.getElementById('acabCatVinculo').value, multiplicador: document.getElementById('acabMultiplicador').value, precoCusto: document.getElementById('acabPrecoCusto').value, peso: parseFloat(document.getElementById('acabPeso').value) || 0, prazo: parseInt(document.getElementById('acabPrazo').value) || 0, precos: arrayPrecos };
    if(id) await db.collection("acabamentos").doc(id).update(d); else await db.collection("acabamentos").add(d);
    limparFormAcabamento();
}

function limparFormAcabamento() {
    document.getElementById('editAcabId').value = ""; document.getElementById('acabNome').value = ""; document.getElementById('acabPrecoCusto').value = "0.00"; document.getElementById('acabPeso').value = "0.00"; document.getElementById('acabPrazo').value = "0"; preencherTabelaPrecos('containerPrecosAcabamento', []); document.getElementById('btnSalvarAcab').innerHTML = "<i class='fa fa-save'></i> Salvar Variação na Grade";
}

function renderizarListaAdmin() {
    const div = document.getElementById('listaGerenciarProdutos');
    div.innerHTML = `<table class="wp-table-grid"><thead><tr><th>Produto Base</th><th>Regra W2P</th><th>Ações</th></tr></thead><tbody>` + 
        bancoDeDados.map(p => `<tr><td><b>${p.nome}</b></td><td>${p.tipo}</td><td class="acoes"><button class="btn-grid-edit" onclick="editarProduto('${p.id}')"><i class="fa fa-pen"></i></button> <button class="btn-grid-del" onclick="excluirItem('catalogo', '${p.id}')"><i class="fa fa-trash"></i></button></td></tr>`).join('') + `</tbody></table>`;
}

function editarProduto(id) {
    const p = bancoDeDados.find(i => i.id === id);
    document.getElementById('editId').value = p.id;
    document.getElementById('adminSku').value = p.sku || "";
    document.getElementById('adminNome').value = p.nome;
    document.getElementById('adminCatSelect').value = p.categoria;
    document.getElementById('adminQtdsFixas').value = p.qtdsFixas || "";
    document.getElementById('adminTipo').value = p.tipo;
    document.getElementById('adminImg').value = p.img || "";
    preencherTabelaPrecos('containerPrecosProduto', p.precos);
    document.getElementById('btnSalvarProd').innerText = "Atualizar Produto Base"; window.scrollTo(0,0);
}

async function salvarNovoProduto() {
    const id = document.getElementById('editId').value;
    const arrayPrecos = extrairTabelaPrecos('containerPrecosProduto');
    const d = { sku: document.getElementById('adminSku').value, nome: document.getElementById('adminNome').value, precos: arrayPrecos, categoria: document.getElementById('adminCatSelect').value, tipo: document.getElementById('adminTipo').value, qtdsFixas: document.getElementById('adminQtdsFixas').value, img: document.getElementById('adminImg').value };
    if(id) await db.collection("catalogo").doc(id).update(d); else await db.collection("catalogo").add(d);
    document.getElementById('editId').value = ""; document.getElementById('adminSku').value = ""; document.getElementById('adminNome').value = ""; document.getElementById('adminQtdsFixas').value = ""; document.getElementById('adminImg').value = ""; preencherTabelaPrecos('containerPrecosProduto', []); document.getElementById('btnSalvarProd').innerText = "Salvar Produto Base";
}

function renderizarListaCategorias() {
    const div = document.getElementById('listaGerenciarCategorias');
    div.innerHTML = `<table class="wp-table-grid"><tbody>` + categorias.map(c => `<tr><td>${c.nome}</td><td class="acoes"><button class="btn-grid-del" onclick="excluirItem('categorias', '${c.id}')"><i class="fa fa-trash"></i></button></td></tr>`).join('') + `</tbody></table>`;
}
async function salvarCategoria() {
    const nome = document.getElementById('catNome').value;
    if(nome) { await db.collection("categorias").add({nome}); document.getElementById('catNome').value = ""; }
}

function excluirItem(coll, id) { if(confirm("Confirma exclusão?")) db.collection(coll).doc(id).delete(); }

function mudarAba(aba) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    if(aba === 'admin') toggleAdminSub('acabamentos');
}

function toggleAdminSub(s) { 
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.sub-nav-gva button').forEach(b => b.classList.remove('sub-active'));
    document.getElementById('subAdmin' + s.charAt(0).toUpperCase() + s.slice(1)).style.display = 'block';
    document.getElementById('subBtn' + s.charAt(0).toUpperCase() + s.slice(1)).classList.add('sub-active');
}
function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function fazerLogin() { auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value, document.getElementById('loginSenha').value); }
function fazerLogout() { auth.signOut().then(() => window.location.reload()); }

document.addEventListener('DOMContentLoaded', () => {
    preencherTabelaPrecos('containerPrecosProduto', []);
    preencherTabelaPrecos('containerPrecosAcabamento', []);
});
