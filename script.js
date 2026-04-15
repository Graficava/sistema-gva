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
        if(selAcab) selAcab.innerHTML = `<option value="Geral">Todas Categorias</option>` + options;
    });
    db.collection("acabamentos").onSnapshot(snap => {
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
    db.collection("financeiro_avulso").onSnapshot(() => calcularFinanceiro());
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
        let imgHtml = p.img ? `<img src="${p.img}">` : `<div style="color:#A0AEC0; font-size:40px;"><i class="fa fa-image"></i></div>`;
        grade.innerHTML += `
            <div class="zap-card" onclick="abrirConfigurador('${p.id}')">
                <div class="zap-color-bg">${imgHtml}</div>
                <div class="zap-info">
                    <h4>${p.nome}</h4>
                    <p>A partir de R$ ${parseFloat(p.preco || 0).toFixed(2)}</p>
                    <button class="btn-gva" style="width:100%">Configurar</button>
                </div>
            </div>`;
    });
}

// ---------------------------------------------------------
// MOTOR MATEMÁTICO DE ESCALONAMENTO
// ---------------------------------------------------------
function getPrecoReal(precoStr, qtdComparacao) {
    if(!precoStr) return 0;
    let pStr = String(precoStr).trim();
    if(!pStr.includes(':')) return parseFloat(pStr) || 0;

    const faixas = pStr.split(',').map(f => {
        const [q, v] = f.split(':');
        return { qtd: parseInt(q), valor: parseFloat(v) };
    }).sort((a,b) => b.qtd - a.qtd);

    const faixa = faixas.find(f => qtdComparacao >= f.qtd);
    return faixa ? faixa.valor : (faixas[faixas.length-1]?.valor || 0);
}

// ---------------------------------------------------------
// UI: MODAL WEB2PRINT PREMIUM
// ---------------------------------------------------------
function abrirConfigurador(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let imgSrc = p.img ? `<img src="${p.img}">` : `<div style="padding:100px; color:#CBD5E0; font-size:80px; text-align:center;"><i class="fa fa-file-alt"></i></div>`;
    
    let html = `
        <div class="w2p-header">
            <h2>${p.nome}</h2>
            <button class="btn-close" onclick="fecharModal()"><i class="fa fa-times"></i></button>
        </div>
        <div class="w2p-body">
            <div class="w2p-left">
                ${imgSrc}
                <div id="infoFolhas" style="display:none; width:100%;"></div>
            </div>
            <div class="w2p-right gva-form-large">
    `;
    
    // FORMATO DO PRODUTO (Páginas, Metragem ou Qtd)
    if(p.tipo === 'folha') {
        html += `<div class="w2p-section-title">Estrutura do Arquivo</div>
                 <div class="form-row">
                    <div class="form-group">
                        <label>Páginas (No PDF):</label>
                        <input type="number" id="cfgPaginas" value="1" min="1" oninput="atualizarPrecoAoVivo('${p.id}')">
                    </div>`;
        if(p.qtdsFixas) {
            html += `<div class="form-group"><label>Tiragem (Cópias):</label><div class="qty-btns">`;
            p.qtdsFixas.split(',').forEach(q => { html += `<button class="btn-qty" onclick="selecionarQtd(this, ${q.trim()}, '${p.id}')">${q.trim()}</button>`; });
            html += `</div><input type="hidden" id="cfgQ" value="0"></div></div>`;
        } else {
            html += `<div class="form-group"><label>Tiragem (Cópias):</label><input type="number" id="cfgQ" value="1" min="1" oninput="atualizarPrecoAoVivo('${p.id}')"></div></div>`;
        }
    } else if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        html += `<div class="w2p-section-title">Dimensões e Tiragem</div>
                 <div class="form-row">
                    <div class="form-group"><label>Largura (m):</label><input type="number" id="cfgL" value="1.00" step="0.01" oninput="atualizarPrecoAoVivo('${p.id}')"></div>
                    <div class="form-group"><label>Altura (m):</label><input type="number" id="cfgA" value="1.00" step="0.01" oninput="atualizarPrecoAoVivo('${p.id}')"></div>
                 </div>
                 <label>Quantidade:</label><input type="number" id="cfgQ" value="1" min="1" oninput="atualizarPrecoAoVivo('${p.id}')">`;
    } else {
        html += `<div class="w2p-section-title">Tiragem</div>`;
        if(p.qtdsFixas) {
            html += `<div class="qty-btns">`;
            p.qtdsFixas.split(',').forEach(q => { html += `<button class="btn-qty" onclick="selecionarQtd(this, ${q.trim()}, '${p.id}')">${q.trim()}</button>`; });
            html += `</div><input type="hidden" id="cfgQ" value="0">`;
        } else {
            html += `<input type="number" id="cfgQ" value="1" min="1" oninput="atualizarPrecoAoVivo('${p.id}')">`;
        }
    }

    // VARIAÇÕES E ACABAMENTOS
    const acabFiltrados = acabamentos.filter(a => a.vinculo === p.categoria || a.vinculo === 'Geral');
    const grupos = {}; const avulsos = [];
    
    acabFiltrados.forEach(a => {
        if(a.grupo && a.grupo.trim() !== '') {
            if(!grupos[a.grupo]) grupos[a.grupo] = []; grupos[a.grupo].push(a);
        } else { avulsos.push(a); }
    });

    if(Object.keys(grupos).length > 0 || avulsos.length > 0) {
        html += `<div class="w2p-section-title">Personalização</div>`;
    }

    for (const nomeGrupo in grupos) {
        html += `<label>${nomeGrupo}</label>
                 <select class="grupo-var-select check-grupo" onchange="atualizarPrecoAoVivo('${p.id}')">
                    <option value="" data-preco="0" data-mult="unidade_simples">Selecione uma opção...</option>`;
        grupos[nomeGrupo].forEach(op => {
            html += `<option value="${nomeGrupo}: ${op.nome}" data-preco="${op.preco}" data-mult="${op.multiplicador}">${op.nome}</option>`;
        });
        html += `</select>`;
    }

    if(avulsos.length > 0) {
        html += `<label style="margin-top:15px;">Serviços Extras</label><div class="acabamento-seletor">`;
        avulsos.forEach(a => {
            html += `<label><input type="checkbox" class="check-acab" data-preco="${a.preco}" data-mult="${a.multiplicador}" value="${a.nome}" onchange="atualizarPrecoAoVivo('${p.id}')"> ${a.nome}</label>`;
        });
        html += `</div>`;
    }

    html += `</div></div>
             <div class="w2p-footer">
                <div>
                    <div class="w2p-price-label">Valor Total</div>
                    <div class="w2p-price">R$ <span id="previewSubtotal">0.00</span></div>
                </div>
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
// INTELIGÊNCIA DE CÁLCULO (O MOTOR)
// ---------------------------------------------------------
function atualizarPrecoAoVivo(id) {
    const p = bancoDeDados.find(item => item.id === id);
    let qtdCopias = parseFloat(document.getElementById('cfgQ')?.value || 1);
    let numPaginas = parseFloat(document.getElementById('cfgPaginas')?.value || 1);
    
    // 1. O sistema caça se alguma opção selecionada é "Frente e Verso"
    let isFrenteVerso = false;
    document.querySelectorAll('.check-grupo, .check-acab:checked').forEach(el => {
        let opt = el.options ? el.options[el.selectedIndex] : el;
        if(opt && opt.getAttribute('data-mult') === 'cobrar_paginas_verso') isFrenteVerso = true;
    });

    let folhasFisicas = isFrenteVerso ? Math.ceil(numPaginas / 2) : numPaginas;

    // Atualiza info de folhas na UI
    const divFolhas = document.getElementById('infoFolhas');
    if(divFolhas && p.tipo === 'folha') {
        divFolhas.style.display = 'flex';
        divFolhas.innerHTML = `<i class="fa fa-layer-group" style="font-size:20px;"></i> <div><b>${folhasFisicas} Folhas Físicas</b><br><small>Utilizadas por cópia montada.</small></div>`;
    }

    // 2. Cálculo do Produto Base (Se houver)
    let precoBaseOpt = getPrecoReal(p.escalonado || p.preco, qtdCopias);
    let multiplicadorBase = 1;
    if(p.tipo === 'folha') multiplicadorBase = numPaginas; // Se a gráfica cobra o produto base por pág.
    else if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        multiplicadorBase = (parseFloat(document.getElementById('cfgL')?.value || 1) * parseFloat(document.getElementById('cfgA')?.value || 1));
    }
    let subtotalCopia = precoBaseOpt * multiplicadorBase;

    // 3. Somar Variações usando as Regras de Cobrança Matemáticas
    document.querySelectorAll('.check-grupo, .check-acab:checked').forEach(el => {
        let opt = el.options ? el.options[el.selectedIndex] : el;
        if(!opt || !opt.value) return;

        let precoStr = opt.getAttribute('data-preco');
        let tipoMult = opt.getAttribute('data-mult');
        let valorDaOpcao = 0;

        if(tipoMult === 'cobrar_paginas_frente' || tipoMult === 'cobrar_paginas_verso') {
            // Tinta: Calcula baseado no Total de Páginas no PDF
            valorDaOpcao = getPrecoReal(precoStr, numPaginas) * numPaginas;
        } 
        else if(tipoMult === 'cobrar_folhas') {
            // Papel do Miolo: Calcula baseado nas Folhas Físicas
            valorDaOpcao = getPrecoReal(precoStr, folhasFisicas) * folhasFisicas;
        } 
        else if(tipoMult === 'cobrar_fixo') {
            // Encadernação: Olha a espessura (folhas), acha o preço na tabela, cobra 1 VEZ.
            valorDaOpcao = getPrecoReal(precoStr, folhasFisicas) * 1;
        } 
        else if(tipoMult === 'cobrar_area') {
            // Adesivos/Lonas Extras
            let area = (parseFloat(document.getElementById('cfgL')?.value || 1) * parseFloat(document.getElementById('cfgA')?.value || 1));
            valorDaOpcao = getPrecoReal(precoStr, qtdCopias) * area;
        } 
        else {
            // unidade_simples: Fixo por unidade (Ex: Laminação)
            valorDaOpcao = getPrecoReal(precoStr, qtdCopias) * 1;
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

    if(p.qtdsFixas && qtdCopias === 0) return alert("Selecione uma tiragem válida!");

    if(p.tipo === 'folha') {
        let pags = document.getElementById('cfgPaginas').value;
        det = `${qtdCopias} un de ${pags} págs`;
    } else if(p.tipo === 'm_linear' || p.tipo === 'm2') {
        let l = document.getElementById('cfgL').value, a = document.getElementById('cfgA').value;
        det = `${qtdCopias} un (${l}x${a}m)`;
    } else {
        det = `${qtdCopias} un`;
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
    let m = parseFloat(document.getElementById('valorMotoboy').value) || 0;
    let t = carrinho.reduce((acc, i) => acc + i.total, 0) + m;
    let s = parseFloat(document.getElementById('valorSinal').value) || 0;
    div.innerHTML = carrinho.map((i, idx) => `<div style="display:flex; justify-content:space-between; margin-bottom:12px; padding:15px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px;"><span><b style="color:#2D3748;">[${i.sku || '--'}] ${i.nome}</b><br><small style="color:#718096; line-height:1.4; display:block; margin-top:5px;">${i.detalhes}</small></span><b style="color:var(--gva-azul);">R$ ${i.total.toFixed(2)} <i class="fa fa-trash" style="color:#E53E3E; cursor:pointer; margin-left:10px;" onclick="removerItem(${idx})"></i></b></div>`).join('') || "<div style='color:#A0AEC0; padding:20px; text-align:center;'>Nenhum item configurado.</div>";
    document.getElementById('totalCarrinho').innerText = t.toFixed(2);
    document.getElementById('restanteCarrinho').innerText = (t - s).toFixed(2);
}

function removerItem(idx) { carrinho.splice(idx, 1); atualizarCarrinho(); }
function toggleCamposPagamento() { document.getElementById('divParcelas').style.display = document.getElementById('formaPagamento').value === 'CreditoParc' ? 'block' : 'none'; }
function toggleCamposEntrega() { document.getElementById('divMotoboy').style.display = document.getElementById('metodoEntrega').value === 'Motoboy' ? 'block' : 'none'; }

function enviarPedido() {
    const nome = document.getElementById('nomeCliente').value;
    if(!nome || carrinho.length === 0) return alert("Preencha o cliente e configure um produto!");
    const t = parseFloat(document.getElementById('totalCarrinho').innerText);
    const s = parseFloat(document.getElementById('valorSinal').value) || 0;
    const p = { cliente: nome, telefone: document.getElementById('telCliente').value, end: document.getElementById('endCliente').value, itens: [...carrinho], total: t, sinal: s, restante: t-s, status: "💰 Pagamento", dataCriacao: new Date().toLocaleDateString('pt-BR') };
    db.collection("pedidos").add(p).then(() => { carrinho = []; document.getElementById('nomeCliente').value = ""; atualizarCarrinho(); mudarAba('loja'); });
}

function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    div.innerHTML = pedidosGVA.map((p, idx) => `
        <div class="gva-card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;"><span>👤 ${p.cliente}</span>
            <select onchange="mudarStatus('${p.id}', this.value)" style="padding:5px; border-radius:5px; border:1px solid #ddd;">
                <option ${p.status === '💰 Pagamento' ? 'selected' : ''}>💰 Pagamento</option>
                <option ${p.status === '📂 Verif. Arquivos' ? 'selected' : ''}>📂 Verif. Arquivos</option>
                <option ${p.status === '🖨️ Impressão' ? 'selected' : ''}>🖨️ Impressão</option>
                <option ${p.status === '✂️ Acabamento' ? 'selected' : ''}>✂️ Acabamento</option>
                <option ${p.status === '🏠 Pronto' ? 'selected' : ''}>🏠 Pronto</option>
                <option value="cancelar">❌ Cancelar</option><option value="entregar">📦 Entregue</option>
            </select></div>
            <div class="card-body">
                <p style="margin-top:0; font-weight:bold;">Total: R$ ${p.total.toFixed(2)}</p>
                <button class="btn-gva" style="font-size:12px; padding:8px 15px;" onclick="imprimirCupom(${idx})"><i class="fa fa-print"></i> Ficha</button>
                <button class="btn-gva" style="background:#25D366; font-size:12px; padding:8px 15px; margin-left:5px;" onclick="enviarWA(${idx})"><i class="fab fa-whatsapp"></i> Cliente</button>
            </div>
        </div>`).join('');
}

function mudarStatus(id, v) {
    if(v === 'cancelar') { if(confirm("Cancelar?")) db.collection("pedidos").doc(id).delete(); }
    else if(v === 'entregar') { 
        const p = pedidosGVA.find(i => i.id === id);
        db.collection("pedidos_arquivados").add({...p, status: 'Entregue'}).then(() => db.collection("pedidos").doc(id).delete());
    } else { db.collection("pedidos").doc(id).update({status: v}); }
}

function enviarWA(idx) {
    const p = pedidosGVA[idx];
    const msg = window.encodeURIComponent(`Olá ${p.cliente}, o status do seu pedido na GVA mudou para: ${p.status}`);
    window.open(`https://wa.me/55${p.telefone.replace(/\D/g,'')}?text=${msg}`);
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
    let prox = via(10, "VIA CLIENTE"); doc.line(0, prox-5, 80, prox-5); via(prox+5, "VIA PRODUÇÃO");
    window.open(doc.output('bloburl'), '_blank');
}

async function calcularFinanceiro() {
    let fat = pedidosGVA.reduce((acc, p) => acc + (p.total || 0), 0);
    const snap = await db.collection("financeiro_avulso").get();
    let extras = 0, saidas = 0;
    snap.forEach(doc => { const d = doc.data(); if(d.tipo === 'entrada') extras += d.valor; else saidas += d.valor; });
    document.getElementById('finFaturamento').innerText = fat.toFixed(2);
    document.getElementById('finEntradas').innerText = extras.toFixed(2);
    document.getElementById('finSaidas').innerText = saidas.toFixed(2);
    document.getElementById('finSaldo').innerText = (fat + extras - saidas).toFixed(2);
}

function abrirLancamento(tipo) {
    const v = prompt("Valor (R$):"); const d = prompt("Descrição:");
    if(v && d) db.collection("financeiro_avulso").add({ tipo, valor: parseFloat(v), desc: d, data: new Date().toLocaleDateString('pt-BR') });
}

function renderizarListaAdmin() {
    const div = document.getElementById('listaGerenciarProdutos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Ação</th></tr></thead><tbody>` + 
        bancoDeDados.map(p => `<tr><td><b>${p.nome}</b><br><small>${p.sku || '--'}</small></td><td>${p.categoria}</td><td style="text-align:right"><button class="btn-gva" style="padding:6px 12px; font-size:12px; background:#EBF4FF; color:var(--gva-azul);" onclick="editarProduto('${p.id}')">Editar</button> <button class="btn-gva" style="padding:6px 12px; font-size:12px; background:#FFF5F5; color:#E53E3E;" onclick="excluirItem('catalogo', '${p.id}')">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

function editarProduto(id) {
    const p = bancoDeDados.find(i => i.id === id);
    document.getElementById('editId').value = p.id;
    document.getElementById('adminSku').value = p.sku || "";
    document.getElementById('adminNome').value = p.nome;
    document.getElementById('adminPreco').value = p.preco || 0;
    document.getElementById('adminCatSelect').value = p.categoria;
    document.getElementById('adminQtdsFixas').value = p.qtdsFixas || "";
    document.getElementById('adminEscalonado').value = p.escalonado || "";
    document.getElementById('adminTipo').value = p.tipo;
    document.getElementById('adminImg').value = p.img || "";
    document.getElementById('btnSalvarProd').innerText = "Atualizar Produto"; window.scrollTo(0,0);
}

function renderizarListaCategorias() {
    const div = document.getElementById('listaGerenciarCategorias');
    div.innerHTML = `<table class="wp-table"><tbody>` + categorias.map(c => `<tr><td>${c.nome}</td><td style="text-align:right"><button class="btn-gva" style="padding:6px 12px; font-size:12px; background:#EBF4FF; color:var(--gva-azul);" onclick="editarCategoria('${c.id}')">Editar</button> <button class="btn-gva" style="padding:6px 12px; font-size:12px; background:#FFF5F5; color:#E53E3E;" onclick="excluirItem('categorias', '${c.id}')">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

function editarCategoria(id) {
    const c = categorias.find(i => i.id === id);
    document.getElementById('editCatId').value = c.id;
    document.getElementById('catNome').value = c.nome;
    document.getElementById('btnSalvarCat').innerText = "Atualizar";
}

function renderizarListaAcabamentos() {
    const div = document.getElementById('listaGerenciarAcabamentos');
    div.innerHTML = `<table class="wp-table"><tbody>` + acabamentos.map(a => `<tr><td><b>${a.nome}</b><br><small style="color:#718096;">Vínculo: ${a.vinculo} | Grupo: ${a.grupo || 'Nenhum'}</small></td><td style="text-align:right"><button class="btn-gva" style="padding:6px 12px; font-size:12px; background:#EBF4FF; color:var(--gva-azul);" onclick="editarAcabamento('${a.id}')">Editar</button> <button class="btn-gva" style="padding:6px 12px; font-size:12px; background:#FFF5F5; color:#E53E3E;" onclick="excluirItem('acabamentos', '${a.id}')">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

function editarAcabamento(id) {
    const a = acabamentos.find(i => i.id === id);
    document.getElementById('editAcabId').value = a.id;
    document.getElementById('acabNome').value = a.nome;
    document.getElementById('acabPreco').value = a.preco;
    document.getElementById('acabCatVinculo').value = a.vinculo;
    document.getElementById('acabGrupo').value = a.grupo || "";
    document.getElementById('acabMultiplicador').value = a.multiplicador || "unidade_simples";
    document.getElementById('btnSalvarAcab').innerText = "Atualizar";
}

async function salvarNovoProduto() {
    const id = document.getElementById('editId').value;
    const d = { sku: document.getElementById('adminSku').value, nome: document.getElementById('adminNome').value, preco: parseFloat(document.getElementById('adminPreco').value), categoria: document.getElementById('adminCatSelect').value, tipo: document.getElementById('adminTipo').value, qtdsFixas: document.getElementById('adminQtdsFixas').value, escalonado: document.getElementById('adminEscalonado').value, img: document.getElementById('adminImg').value };
    if(id) await db.collection("catalogo").doc(id).update(d); else await db.collection("catalogo").add(d);
    limparFormAdmin();
}

async function salvarCategoria() {
    const id = document.getElementById('editCatId').value;
    const nome = document.getElementById('catNome').value;
    if(!nome) return;
    if(id) await db.collection("categorias").doc(id).update({nome}); else await db.collection("categorias").add({nome});
    document.getElementById('catNome').value = ""; document.getElementById('editCatId').value = ""; document.getElementById('btnSalvarCat').innerText = "Salvar Categoria";
}

async function salvarAcabamento() {
    const id = document.getElementById('editAcabId').value;
    const d = { nome: document.getElementById('acabNome').value, preco: document.getElementById('acabPreco').value, vinculo: document.getElementById('acabCatVinculo').value, grupo: document.getElementById('acabGrupo').value, multiplicador: document.getElementById('acabMultiplicador').value };
    if(id) await db.collection("acabamentos").doc(id).update(d); else await db.collection("acabamentos").add(d);
    document.getElementById('acabNome').value = ""; document.getElementById('acabPreco').value = ""; document.getElementById('acabGrupo').value = ""; document.getElementById('editAcabId').value = ""; document.getElementById('btnSalvarAcab').innerText = "Salvar Variação";
}

function mudarAba(aba) {
    const titulos = { cliente: "Catálogo Web2Print", carrinho: "Orçamentos e Pedidos", loja: "Painel de Produção", caixa: "Fluxo de Caixa", admin: "Banco de Dados" };
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
function filtrarProdutos() {
    const b = document.getElementById('buscaProduto').value.toLowerCase();
    carregarProdutos(bancoDeDados.filter(p => p.nome.toLowerCase().includes(b) || (p.sku && p.sku.toLowerCase().includes(b))));
}
function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }
function excluirItem(coll, id) { if(confirm("Tem certeza que deseja excluir?")) db.collection(coll).doc(id).delete(); }
function limparFormAdmin() { document.getElementById('editId').value = ""; document.getElementById('adminSku').value = ""; document.getElementById('adminNome').value = ""; document.getElementById('adminPreco').value = "0"; document.getElementById('adminQtdsFixas').value = ""; document.getElementById('adminEscalonado').value = ""; document.getElementById('adminImg').value = ""; document.getElementById('btnSalvarProd').innerText = "Salvar Produto"; }
function fazerLogin() { auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value, document.getElementById('loginSenha').value); }
function fazerLogout() { auth.signOut().then(() => window.location.reload()); }
