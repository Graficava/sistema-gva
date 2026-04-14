/* CÉREBRO DO SISTEMA GVA */
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pedidosGVA = []; 
let pedidosConcluidosGVA = []; 
let bancoDeDados = []; 
let fluxoCaixa = []; 

const produtosPadrao = [
    { nome: "Impressões / Apostilas", descricao: "Impressões avulsas ou arquivos fechados.", tipo: "impressao", categoria: "Serviços", vendas: 50, img: "https://placehold.co/400x300/dc3545/FFFFFF?text=Impressoes" },
    { nome: "Cartões de Visita", descricao: "Couchê 250g. Brilho ou fosco.", tipo: "tabela", categoria: "Papelaria", vendas: 40, precos: { "1000": 90.00, "2000": 170.00, "5000": 390.00 }, img: "https://placehold.co/400x300/0056b3/FFFFFF?text=Cartoes" },
    { nome: "Panfletos e Flyers", descricao: "Frente e verso colorido, Couchê 90g.", tipo: "tabela", categoria: "Papelaria", vendas: 30, precos: { "2500": 120.00, "5000": 200.00, "10000": 350.00 }, img: "https://placehold.co/400x300/17a2b8/FFFFFF?text=Panfletos" },
    { nome: "Banner e Lonas", descricao: "Lona Brilho 440g com ilhós.", tipo: "m2", categoria: "Comunicação Visual", vendas: 20, preco: 65.00, img: "https://placehold.co/400x300/28a745/FFFFFF?text=Banner+M2" },
    { nome: "Encadernação Espiral", descricao: "Capa transparente e contracapa preta.", tipo: "encadernacao", categoria: "Serviços", vendas: 10, img: "https://placehold.co/400x300/6f42c1/FFFFFF?text=Encadernacao" }
];

function salvarNoStorage() { 
    localStorage.setItem('GVA_PEDIDOS', JSON.stringify(pedidosGVA)); 
    localStorage.setItem('GVA_CONCLUIDOS', JSON.stringify(pedidosConcluidosGVA)); 
    localStorage.setItem('GVA_CATALOGO', JSON.stringify(bancoDeDados)); 
    localStorage.setItem('GVA_CAIXA', JSON.stringify(fluxoCaixa)); 
}

function carregarDoStorage() {
    const dp = localStorage.getItem('GVA_PEDIDOS'); if (dp) pedidosGVA = JSON.parse(dp);
    const dc = localStorage.getItem('GVA_CONCLUIDOS'); if (dc) pedidosConcluidosGVA = JSON.parse(dc);
    const dCat = localStorage.getItem('GVA_CATALOGO'); if (dCat) bancoDeDados = JSON.parse(dCat); else { bancoDeDados = [...produtosPadrao]; }
    const dCx = localStorage.getItem('GVA_CAIXA'); if (dCx) fluxoCaixa = JSON.parse(dCx);
    
    salvarNoStorage(); 
    carregarProdutos(); 
    atualizarProducao(); 
    atualizarListaCaixa(); 
    atualizarDashboard();
}

function salvarNovoProduto() {
    let cat = document.getElementById('adminCategoria').value; 
    let tipo = document.getElementById('adminTipo').value; 
    let nome = document.getElementById('adminNome').value; 
    let desc = document.getElementById('adminDesc').value; 
    let preco = parseFloat(document.getElementById('adminPreco').value.replace(',', '.')); 
    let img = document.getElementById('adminImg').value;
    
    if (!nome || isNaN(preco)) { mostrarAlerta("Preencha o nome e preço válidos!"); return; }
    if (!img) img = `https://placehold.co/400x300/333333/FFFFFF?text=${nome.replace(/ /g, '+')}`;
    
    bancoDeDados.push({ nome: nome, descricao: desc, tipo: tipo, categoria: cat, preco: preco, img: img, vendas: 0 }); 
    salvarNoStorage(); carregarProdutos();
    
    document.getElementById('adminNome').value = ""; document.getElementById('adminDesc').value = ""; document.getElementById('adminPreco').value = ""; document.getElementById('adminImg').value = ""; 
    mostrarAlerta("✅ Produto adicionado ao catálogo!");
}

function mostrarAlerta(m) { document.getElementById('alertaTexto').innerText = m; document.getElementById('alertaFundo').style.display = 'flex'; }
function fecharAlerta() { document.getElementById('alertaFundo').style.display = 'none'; }

let indiceParaRemover = null;
function abrirConfirmacao(i) { indiceParaRemover = i; document.getElementById('confirmTexto').innerText = `CANCELAR o pedido de ${pedidosGVA[i].cliente}?`; document.getElementById('confirmFundo').style.display = 'flex'; }
function fecharConfirmacao() { document.getElementById('confirmFundo').style.display = 'none'; }
function executarExclusao() { pedidosGVA.splice(indiceParaRemover, 1); salvarNoStorage(); atualizarProducao(); fecharConfirmacao(); }

let carrinho = []; 
let produtoSendoConfigurado = null;

function filtrarProdutos() {
    let textoBusca = document.getElementById('buscaProduto').value.toLowerCase();
    let categoriaEscolhida = document.getElementById('filtroCategoria').value;

    let produtosFiltrados = bancoDeDados.filter(p => {
        let bateNome = p.nome.toLowerCase().includes(textoBusca) || p.descricao.toLowerCase().includes(textoBusca);
        let bateCategoria = (categoriaEscolhida === "Todos") || (p.categoria === categoriaEscolhida);
        return bateNome && bateCategoria;
    });

    carregarProdutos(produtosFiltrados); 
}

function carregarProdutos(lista = bancoDeDados) {
    const grade = document.getElementById('gradeCliente'); 
    grade.innerHTML = '';
    
    if(lista.length === 0) { 
        grade.innerHTML = "<p style='color:#666; padding: 20px;'>Nenhum produto encontrado.</p>"; 
        return; 
    }

    let listaOrdenada = [...lista].sort((a, b) => (b.vendas || 0) - (a.vendas || 0));

    listaOrdenada.forEach((p) => {
        let indiceReal = bancoDeDados.indexOf(p);
        let txtPreco = "";
        
        if(p.tipo === "tabela") txtPreco = "Valores em pacotes"; 
        else if(p.tipo === "m2") txtPreco = `R$ ${p.preco.toFixed(2).replace('.', ',')} / m²`; 
        else if(p.tipo === "impressao" || p.tipo === "encadernacao") txtPreco = "Sob medida"; 
        else txtPreco = `R$ ${p.preco.toFixed(2).replace('.', ',')} / un`; 
        
        grade.innerHTML += `
        <div class="card">
            <div class="card-img-container"><img src="${p.img}" onerror="this.src='https://placehold.co/400x300/ccc/333?text=Sem+Foto'"></div>
            <div class="card-body">
                <div>
                    <small style="color:#00ffcc; background:#111; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold; margin-bottom:5px; display:inline-block;">${p.categoria || 'Geral'}</small>
                    <h4>${p.nome}</h4>
                    <p class="descricao">${p.descricao}</p>
                </div>
                <div>
                    <p class="preco">${txtPreco}</p>
                    <button class="acao" onclick="abrirModal(${indiceReal})">Adicionar</button>
                </div>
            </div>
        </div>`;
    });
}

function abrirModal(index) {
    produtoSendoConfigurado = bancoDeDados[index]; 
    const modal = document.getElementById('modalConteudo'); 
    let html = `<h3>⚙️ Montar: ${produtoSendoConfigurado.nome}</h3>`;
    
    if (produtoSendoConfigurado.tipo === 'tabela') { 
        html += `<label>Escolha o pacote:</label><select id="cfgPacote">`; 
        for (let qtd in produtoSendoConfigurado.precos) { html += `<option value="${qtd}">${qtd} un - R$ ${produtoSendoConfigurado.precos[qtd].toFixed(2).replace('.',',')}</option>`; } 
        html += `</select>`; 
    } 
    else if (produtoSendoConfigurado.tipo === 'm2') { html += `<label>Largura (m):</label><input type="number" id="cfgLargura" step="0.01"><label>Altura (m):</label><input type="number" id="cfgAltura" step="0.01">`; } 
    else if (produtoSendoConfigurado.tipo === 'impressao') { html += `<label style="color:#0056b3;">1. Anexar PDF (Opcional):</label><input type="file" id="arquivoPDF" accept="application/pdf" onchange="lerPDF(event)" style="border: 2px dashed #0056b3;"><span id="statusPDF"></span><br><label>2. Opções:</label><select id="cfgTamanho"><option value="A4">A4</option><option value="A3">A3 (+ R$ 1,50)</option></select><select id="cfgPapel"><option value="Sulfite 75g">Sulfite 75g</option><option value="Sulfite 90g">Sulfite 90g (+ 0,50)</option><option value="Couchê 115g">Couchê 115g (+ 1,00)</option></select><select id="cfgLados"><option value="frente">Só Frente</option><option value="frente_verso">Frente e Verso (+ 50%)</option></select><label>3. Páginas:</label><input type="number" id="cfgQtdPaginas" value="1" min="1">`; } 
    else if (produtoSendoConfigurado.tipo === 'encadernacao') { html += `<label>Tamanho:</label><select id="cfgEncTamanho"><option value="A4">A4</option><option value="A3">A3</option></select><label>Folhas:</label><input type="number" id="cfgEncFolhas" value="50" min="1">`; } 
    else if (produtoSendoConfigurado.tipo === 'unidade') { html += `<label>Quantidade:</label><input type="number" id="cfgQuantidade" value="1" min="1">`; }
    
    html += `<div class="btn-grupo" style="margin-top:20px;"><button class="acao" style="background:#6c757d;" onclick="fecharModal()">Cancelar</button><button class="acao" style="background:#00ffcc; color:#111;" onclick="confirmarItem()">Salvar Orçamento</button></div>`;
    modal.innerHTML = html; 
    document.getElementById('modalFundo').style.display = 'flex';
}

function fecharModal() { document.getElementById('modalFundo').style.display = 'none'; }

function lerPDF(event) {
    const f = event.target.files[0]; const s = document.getElementById('statusPDF');
    if (typeof pdfjsLib === 'undefined') { return; } 
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    if (f) { 
        s.innerText = "⏳ Lendo..."; s.style.color = "#ffc107"; 
        const r = new FileReader(); 
        r.onload = function() { 
            pdfjsLib.getDocument(new Uint8Array(this.result)).promise.then(pdf => { 
                document.getElementById('cfgQtdPaginas').value = pdf.numPages; 
                s.innerText = "✅ Lido!"; s.style.color = "#28a745"; 
            }); 
        }; 
        r.readAsArrayBuffer(f); 
    }
}

function confirmarItem() {
    let total = 0; let desc = "";
    if (produtoSendoConfigurado.tipo === 'tabela') { let qtd = document.getElementById('cfgPacote').value; total = produtoSendoConfigurado.precos[qtd]; desc = `${qtd} un`; } 
    else if (produtoSendoConfigurado.tipo === 'm2') { let l = parseFloat(document.getElementById('cfgLargura').value.replace(',', '.')); let a = parseFloat(document.getElementById('cfgAltura').value.replace(',', '.')); total = (l * a) * produtoSendoConfigurado.preco; desc = `${l}x${a}m`; } 
    else if (produtoSendoConfigurado.tipo === 'impressao') { let tam = document.getElementById('cfgTamanho').value; let pap = document.getElementById('cfgPapel').value; let lad = document.getElementById('cfgLados').value; let q = parseInt(document.getElementById('cfgQtdPaginas').value); let pBase = 1.00; if (pap === "Sulfite 90g") pBase += 0.50; if (pap === "Couchê 115g") pBase += 1.00; if (tam === "A3") pBase += 1.50; if (lad === "frente_verso") pBase *= 1.5; total = pBase * q; desc = `${q} pág | ${tam} | ${pap}`; } 
    else if (produtoSendoConfigurado.tipo === 'encadernacao') { let tam = document.getElementById('cfgEncTamanho').value; let f = parseInt(document.getElementById('cfgEncFolhas').value); let pE = 5.00; if (f > 50 && f <= 100) pE = 8.00; else if (f > 100 && f <= 200) pE = 12.00; else if (f > 200) pE = 18.00; if (tam === "A3") pE += 5.00; total = pE; desc = `${tam} | Espiral p/ ${f} folhas`; } 
    else if (produtoSendoConfigurado.tipo === 'unidade') { let q = parseInt(document.getElementById('cfgQuantidade').value); total = q * produtoSendoConfigurado.preco; desc = `${q} un`; }
    
    carrinho.push({ nome: produtoSendoConfigurado.nome, detalhes: desc, total: total }); 
    fecharModal(); 
    atualizarCarrinho();
}

function verificarEntrega() {
    const metodo = document.getElementById('metodoEntrega').value; 
    const divDados = document.getElementById('dadosEntrega');
    if (metodo === 'Motoboy') { divDados.style.display = 'block'; } 
    else { divDados.style.display = 'none'; document.getElementById('taxaEntrega').value = "0"; atualizarCarrinho(); }
}

function atualizarCarrinho() {
    const div = document.getElementById('listaCarrinho'); let s = 0;
    if (carrinho.length === 0) { div.innerHTML = "<p style='color:#666;'>Vazio.</p>"; document.getElementById('totalCarrinho').innerText = "0,00"; document.getElementById('restanteCarrinho').innerText = "0,00"; return; }
    
    div.innerHTML = ''; 
    carrinho.forEach(i => { 
        s += i.total; 
        div.innerHTML += `<div class="lista-item lista-flex"><div><b style="color:#0056b3;">${i.nome}</b><br><small style="color:#666;">${i.detalhes}</small></div><b>R$ ${i.total.toFixed(2).replace('.',',')}</b></div>`; 
    });
    
    let d = parseFloat(document.getElementById('valorDesconto').value.replace(',', '.')) || 0;
    let taxa = parseFloat(document.getElementById('taxaEntrega').value.replace(',', '.')) || 0;
    let sinal = parseFloat(document.getElementById('valorSinal').value.replace(',', '.')) || 0;
    
    let t = (s + taxa) - d; if (t < 0) t = 0; 
    let restante = t - sinal; if (restante < 0) restante = 0;
    
    document.getElementById('totalCarrinho').innerText = t.toFixed(2).replace('.',','); 
    document.getElementById('restanteCarrinho').innerText = restante.toFixed(2).replace('.',',');
}

function enviarPedido() {
    const nome = document.getElementById('nomeDoCliente').value; 
    const tel = document.getElementById('telDoCliente').value;
    if (!nome || !tel) { mostrarAlerta("Preencha Nome e WhatsApp!"); return; }
    
    carrinho.forEach(item => {
        let produtoNoBanco = bancoDeDados.find(prod => prod.nome === item.nome);
        if(produtoNoBanco) { produtoNoBanco.vendas = (produtoNoBanco.vendas || 0) + 1; }
    });

    let s = carrinho.reduce((acc, i) => acc + i.total, 0); 
    let d = parseFloat(document.getElementById('valorDesconto').value.replace(',', '.')) || 0; 
    let taxa = parseFloat(document.getElementById('taxaEntrega').value.replace(',', '.')) || 0; 
    let sinal = parseFloat(document.getElementById('valorSinal').value.replace(',', '.')) || 0;
    
    let dtEntrega = document.getElementById('dataEntrega').value;
    if(dtEntrega) { let pDt = dtEntrega.split('-'); dtEntrega = `${pDt[2]}/${pDt[1]}/${pDt[0]}`; } else { dtEntrega = "A combinar"; }
    
    let obs = document.getElementById('obsPedido').value; 
    let enderecoStr = document.getElementById('enderecoCliente').value; 
    
    let t = (s + taxa) - d; if (t < 0) t = 0; 
    let restante = t - sinal; if (restante < 0) restante = 0;
    
    pedidosGVA.push({ 
        cliente: nome, telefone: tel, pagamento: document.getElementById('formaPagamento').value, 
        entrega: document.getElementById('metodoEntrega').value, endereco: enderecoStr, previsao: dtEntrega, observacao: obs, 
        taxaEntrega: taxa, itens: [...carrinho], descontoAplicado: d, sinal: sinal, restante: restante, 
        total: t, status: "Novo Pedido 📂", data: new Date().toLocaleDateString('pt-BR') 
    });
    
    carrinho = []; 
    document.getElementById('nomeDoCliente').value = ""; document.getElementById('telDoCliente').value = ""; document.getElementById('valorDesconto').value = "0"; document.getElementById('taxaEntrega').value = "0"; document.getElementById('valorSinal').value = "0"; document.getElementById('enderecoCliente').value = ""; document.getElementById('obsPedido').value = ""; document.getElementById('dataEntrega').value = "";
    
    salvarNoStorage(); atualizarCarrinho(); atualizarProducao(); carregarProdutos(); mostrarAlerta("Salvo no Painel!"); mudarAba('loja');
}

function obterMesAtual() { let d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }

function adicionarTransacao() {
    let tipo = document.getElementById('caixaTipo').value; let desc = document.getElementById('caixaDesc').value; let valor = parseFloat(document.getElementById('caixaValor').value.replace(',', '.'));
    if(!desc || isNaN(valor) || valor <= 0) { mostrarAlerta("Preencha a descrição e um valor válido!"); return; }
    fluxoCaixa.push({ data: new Date().toLocaleDateString('pt-BR'), mes: obterMesAtual(), tipo: tipo, descricao: desc, valor: valor });
    salvarNoStorage(); document.getElementById('caixaDesc').value = ""; document.getElementById('caixaValor').value = "";
    atualizarDashboard(); atualizarListaCaixa(); mostrarAlerta("Lançamento registrado!");
}

function atualizarListaCaixa() {
    const div = document.getElementById('listaCaixa'); div.innerHTML = ''; let m = obterMesAtual(); let itensMes = fluxoCaixa.filter(i => i.mes === m);
    if(itensMes.length === 0) { div.innerHTML = "<p style='color:#666;'>Sem movimentações manuais neste mês.</p>"; return; }
    itensMes.slice().reverse().forEach((item) => {
        let cor = item.tipo === 'entrada' ? '#28a745' : '#dc3545'; let sinal = item.tipo === 'entrada' ? '+' : '-';
        div.innerHTML += `<div class="lista-item" style="border-left-color: ${cor}"><div style="display:flex; justify-content:space-between;"><b>${item.descricao}</b><span style="color:${cor}; font-weight:bold;">${sinal} R$ ${item.valor.toFixed(2).replace('.',',')}</span></div><small style="color:#666;">${item.data}</small></div>`;
    });
}

function atualizarDashboard() {
    let m = obterMesAtual(); document.getElementById('mesAtualTexto').innerText = m;
    let receitasPedidos = 0; pedidosConcluidosGVA.forEach(p => { if (p.mesConclusao === m) receitasPedidos += p.total; });
    let entradasExtras = 0; let saidas = 0;
    fluxoCaixa.forEach(i => { if(i.mes === m) { if(i.tipo === 'entrada') entradasExtras += i.valor; else saidas += i.valor; } });
    let totalEntradas = receitasPedidos + entradasExtras; let saldoLiquido = totalEntradas - saidas;
    document.getElementById('dashEntradas').innerText = `R$ ${totalEntradas.toFixed(2).replace('.', ',')}`;
    document.getElementById('dashSaidas').innerText = `R$ ${saidas.toFixed(2).replace('.', ',')}`;
    document.getElementById('faturamentoValor').innerText = saldoLiquido.toFixed(2).replace('.', ',');
}

function concluirVenda(i) { let p = pedidosGVA[i]; p.dataConclusao = new Date().toLocaleDateString('pt-BR'); p.mesConclusao = obterMesAtual(); pedidosConcluidosGVA.push(p); pedidosGVA.splice(i, 1); salvarNoStorage(); atualizarProducao(); atualizarDashboard(); }

function abrirHistorico() {
    const div = document.getElementById('listaHistorico'); let m = obterMesAtual(); div.innerHTML = ''; let pM = pedidosConcluidosGVA.filter(p => p.mesConclusao === m);
    if (pM.length === 0) { div.innerHTML = "<p>Sem vendas este mês.</p>"; } 
    else { pM.slice().reverse().forEach(p => { div.innerHTML += `<div class="item-historico"><div style="display:flex; justify-content:space-between;"><b>👤 ${p.cliente}</b><span style="font-size:12px;">${p.dataConclusao}</span></div><div style="color:#28a745; font-weight:bold; font-size:16px;">R$ ${p.total.toFixed(2).replace('.', ',')}</div></div>`; }); } 
    document.getElementById('historicoFundo').style.display = 'flex';
}
function fecharHistorico() { document.getElementById('historicoFundo').style.display = 'none'; }

function exportarRelatorioCSV() {
    let mesAtual = obterMesAtual(); let pM = pedidosConcluidosGVA.filter(p => p.mesConclusao === mesAtual); if (pM.length === 0) { mostrarAlerta("Sem dados para exportar neste mês."); return; }
    let csvContent = "data:text/csv;charset=utf-8,\uFEFFData,Cliente,Telefone,Pagamento,Entrega,Taxa Motoboy,Desconto,Total\n";
    pM.forEach(p => { let taxaStr = p.taxaEntrega ? p.taxaEntrega.toFixed(2) : "0.00"; let descStr = p.descontoAplicado ? p.descontoAplicado.toFixed(2) : "0.00"; csvContent += `"${p.dataConclusao}","${p.cliente}","${p.telefone}","${p.pagamento}","${p.entrega}","R$ ${taxaStr.replace('.',',')}","R$ ${descStr.replace('.',',')}","R$ ${p.total.toFixed(2).replace('.',',')}"\n`; });
    const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `GVA_Financeiro_${mesAtual.replace('/', '-')}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function abrirWhatsApp(index) {
    let pedido = pedidosGVA[index]; let numeroLimpo = pedido.telefone.replace(/\D/g, ''); 
    if (numeroLimpo.length >= 10 && !numeroLimpo.startsWith('55')) { numeroLimpo = '55' + numeroLimpo; }
    let mensagem = `Olá ${pedido.cliente}, tudo bem? Aqui é da *GVA Venom Arts*! Passando para avisar que o seu pedido (${pedido.itens.length} itens) está com o status: *${pedido.status}*.`;
    let url = `https://api.whatsapp.com/send?phone=${numeroLimpo}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_top'); 
}

function gerarReciboPDF(index) {
    const { jsPDF } = window.jspdf; let p = pedidosGVA[index];
    let alturaItens = p.itens.length * 15; let alturaExtras = 0;
    if (p.taxaEntrega > 0) alturaExtras += 8; if (p.descontoAplicado > 0) alturaExtras += 8; if (p.sinal > 0) alturaExtras += 12; if (p.entrega === 'Motoboy' && p.endereco) alturaExtras += 15; if (p.observacao) alturaExtras += 20; 
    let alturaTotal = 135 + alturaItens + alturaExtras; 

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, alturaTotal] });
    doc.setTextColor(0, 0, 0); 
    
    try { let imgLogo = document.getElementById('logoGVA'); doc.addImage(imgLogo, 'JPEG', 20, 5, 40, 15); } catch(e) { }

    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("GVA VENOM ARTS", 40, 26, null, null, "center");
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("CNPJ: 00.000.000/0000-00", 40, 31, null, null, "center"); doc.text("End: Sua Rua, 123 - Centro", 40, 35, null, null, "center"); doc.text("Tel: (00) 90000-0000 | @graficavenomarts", 40, 39, null, null, "center");
    doc.line(5, 43, 75, 43); 
    
    doc.setFont("helvetica", "bold"); doc.text("CUPOM DE PRODUCAO", 40, 48, null, null, "center");
    doc.setFont("helvetica", "normal"); doc.text(`Cliente: ${p.cliente}`, 5, 54); doc.text(`Data: ${p.data}`, 5, 59); doc.setFont("helvetica", "bold"); doc.text(`Previsao: ${p.previsao}`, 5, 64); doc.setFont("helvetica", "normal"); doc.text(`Pgto: ${p.pagamento}`, 5, 69); doc.text(`Entrega: ${p.entrega}`, 5, 74);

    let linhaAtual = 79;
    if (p.entrega === 'Motoboy' && p.endereco) { let enderecoQuebrado = doc.splitTextToSize(`Endereco: ${p.endereco}`, 70); doc.text(enderecoQuebrado, 5, linhaAtual); linhaAtual += (enderecoQuebrado.length * 4) + 2; }
    
    doc.line(5, linhaAtual, 75, linhaAtual); linhaAtual += 6;
    doc.setFont("helvetica", "bold"); doc.text("QTD / ITEM", 5, linhaAtual); doc.text("TOTAL", 75, linhaAtual, null, null, "right"); doc.setFont("helvetica", "normal"); linhaAtual += 6;

    p.itens.forEach(item => {
        let nomeQuebrado = doc.splitTextToSize(item.nome, 50); doc.text(nomeQuebrado, 5, linhaAtual); doc.text(item.total.toFixed(2), 75, linhaAtual, null, null, "right");
        linhaAtual += (nomeQuebrado.length * 4);
        doc.setFontSize(8); let detQuebrado = doc.splitTextToSize(`+ ${item.detalhes}`, 65); doc.text(detQuebrado, 5, linhaAtual);
        linhaAtual += (detQuebrado.length * 3) + 3;
    });

    doc.line(5, linhaAtual, 75, linhaAtual); linhaAtual += 6;

    if (p.taxaEntrega > 0) { doc.text("Taxa Motoboy:", 5, linhaAtual); doc.text(`+ ${p.taxaEntrega.toFixed(2)}`, 75, linhaAtual, null, null, "right"); linhaAtual += 5; }
    if (p.descontoAplicado > 0) { doc.text("Desconto:", 5, linhaAtual); doc.text(`- ${p.descontoAplicado.toFixed(2)}`, 75, linhaAtual, null, null, "right"); linhaAtual += 5; }

    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("TOTAL DO PEDIDO:", 5, linhaAtual); doc.text(`R$ ${p.total.toFixed(2)}`, 75, linhaAtual, null, null, "right");
    linhaAtual += 6;

    if (p.sinal > 0) { doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("Sinal Pago:", 5, linhaAtual); doc.text(`- ${p.sinal.toFixed(2)}`, 75, linhaAtual, null, null, "right"); linhaAtual += 6; doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("FALTA PAGAR:", 5, linhaAtual); doc.text(`R$ ${p.restante.toFixed(2)}`, 75, linhaAtual, null, null, "right"); linhaAtual += 8; } else { linhaAtual += 6; }

    if(p.observacao) { doc.line(5, linhaAtual, 75, linhaAtual); linhaAtual += 5; doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("OBSERVACOES:", 5, linhaAtual); linhaAtual += 4; doc.setFont("helvetica", "normal"); let obsQuebrada = doc.splitTextToSize(p.observacao, 70); doc.text(obsQuebrada, 5, linhaAtual); linhaAtual += (obsQuebrada.length * 4) + 2; }

    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("Obrigado pela preferencia!", 40, linhaAtual + 4, null, null, "center");
    doc.save(`Cupom_GVA_${p.cliente.replace(/ /g, '_')}.pdf`);
}

function atualizarProducao() {
    const div = document.getElementById('listaProducao');
    if (pedidosGVA.length === 0) { div.innerHTML = "<p style='color:#666; text-align:center;'>Fila vazia.</p>"; return; }
    div.innerHTML = '';
    pedidosGVA.forEach((p, i) => {
        let infoD = p.descontoAplicado > 0 ? `<br><small style="color:#dc3545;">Desc: -R$ ${p.descontoAplicado.toFixed(2).replace('.',',')}</small>` : '';
        let infoEnd = p.entrega === 'Motoboy' && p.endereco ? `<br><small style="color:#666;">📍 Endereço: ${p.endereco}</small>` : '';
        let infoSinal = p.sinal > 0 ? `<br><small style="color:#28a745;">Sinal: R$ ${p.sinal.toFixed(2).replace('.',',')}</small><br><b style="color:#dc3545; font-size:14px;">Resta: R$ ${p.restante.toFixed(2).replace('.',',')}</b>` : '';
        let infoObs = p.observacao ? `<div style="background:#fff3cd; padding:8px; margin-top:10px; border-radius:4px; font-size:12px; border-left:3px solid #ffc107;"><b>Obs:</b> ${p.observacao}</div>` : '';
        
        div.innerHTML += `<div class="lista-item"><div class="lista-flex"><div><b style="font-size:18px;">👤 ${p.cliente}</b><br><small>📞 ${p.telefone}</small><br><small style="color:#17a2b8; font-weight:bold;">📅 Prev: ${p.previsao}</small> ${infoEnd}<br><small style="color:#0056b3; font-weight:bold;">💳 ${p.pagamento} | 📍 ${p.entrega}</small></div><div style="text-align:right;"><b style="color:#28a745; font-size:18px;">Total: R$ ${p.total.toFixed(2).replace('.',',')}</b>${infoD}${infoSinal}</div></div>${infoObs}<div style="margin-top:10px; display:flex; gap:10px;"><button class="acao" style="background:#25D366; padding: 8px; font-size: 12px;" onclick="abrirWhatsApp(${i})">💬 WhatsApp</button><button class="acao" style="background:#17a2b8; padding: 8px; font-size: 12px;" onclick="gerarReciboPDF(${i})">🖨️ Cupom Térmico</button></div><div style="margin-top:15px; background:#f8f9fa; padding:10px; border-radius:6px;"><select onchange="mudarStatus(${i}, this.value)" style="margin:0; border-color:#00ffcc;"><option ${p.status === 'Novo Pedido 📂' ? 'selected' : ''}>Novo Pedido 📂</option><option ${p.status === 'Na Fila de Impressão 🖨️' ? 'selected' : ''}>Na Fila de Impressão 🖨️</option><option ${p.status === 'Em Acabamento ✂️' ? 'selected' : ''}>Em Acabamento ✂️</option><option ${p.status === 'Pronto para Retirada ✅' ? 'selected' : ''}>Pronto para Retirada ✅</option></select></div><div style="margin-top:15px; display:flex; gap:10px;"><button class="acao" style="background:#28a745; flex:2;" onclick="concluirVenda(${i})">Concluir 💰</button><button class="acao" style="background:#dc3545; flex:1;" onclick="abrirConfirmacao(${i})">Cancelar</button></div></div>`;
    });
}

function mudarStatus(index, s) { pedidosGVA[index].status = s; salvarNoStorage(); }

function mudarAba(aba) { 
    ['Cliente', 'Carrinho', 'Loja', 'Caixa', 'Admin'].forEach(id => { 
        document.getElementById('btn' + id).classList.remove('active'); 
        document.getElementById('aba' + id).classList.remove('active'); 
    }); 
    let cap = aba.charAt(0).toUpperCase() + aba.slice(1); 
    document.getElementById('btn' + cap).classList.add('active'); 
    document.getElementById('aba' + cap).classList.add('active'); 
}

carregarDoStorage();