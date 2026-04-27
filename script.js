// --- PDV E MODAL ---
function setFiltroSetor(s) { 
    filtroSetor = s; 
    filtroCategoria = 'Todas'; 
    filtroSubcategoria = 'Todas'; 
    renderVitrine(); 
}
function setFiltroCategoria(c) { 
    filtroCategoria = c; 
    filtroSubcategoria = 'Todas'; 
    renderVitrine(); 
}
function setFiltroSubcategoria(sc) { 
    filtroSubcategoria = sc; 
    renderVitrine(); 
}

function renderVitrine() {
    const grid = document.getElementById('gradeProdutos');
    if (!grid) return;
    
    document.querySelectorAll('.btn-setor').forEach(b => b.classList.remove('ring-2', 'ring-slate-400'));
    const activeBtn = document.querySelector(`.data-setor-${filtroSetor.replace('. ','')}`);
    if(activeBtn) activeBtn.classList.add('ring-2', 'ring-slate-400');

    let prods = bdProdutos;
    if (filtroSetor !== 'Todos') prods = prods.filter(p => p.setor === filtroSetor);
    
    const cats =[...new Set(prods.map(p => p.categoria).filter(c => c))];
    const menuCat = document.getElementById('menuFiltroCat');
    if(cats.length > 0) {
        menuCat.innerHTML = `<button onclick="setFiltroCategoria('Todas')" class="px-4 py-1 rounded text-xs font-bold ${filtroCategoria==='Todas'?'bg-slate-800 text-white':'bg-white border border-slate-200 text-slate-600'}">Todas as Categorias</button>` + 
            cats.map(c => `<button onclick="setFiltroCategoria('${c}')" class="px-4 py-1 rounded text-xs font-bold ${filtroCategoria===c?'bg-slate-800 text-white':'bg-white border border-slate-200 text-slate-600'}">${c}</button>`).join('');
        menuCat.classList.remove('hidden');
    } else {
        menuCat.classList.add('hidden');
    }

    if (filtroCategoria !== 'Todas') prods = prods.filter(p => p.categoria === filtroCategoria);

    const subcats =[...new Set(prods.map(p => p.subcategoria).filter(sc => sc))];
    const menuSubCat = document.getElementById('menuFiltroSubCat');
    if(subcats.length > 0 && filtroCategoria !== 'Todas') {
        menuSubCat.innerHTML = `<button onclick="setFiltroSubcategoria('Todas')" class="px-4 py-1 rounded text-xs font-bold ${filtroSubcategoria==='Todas'?'bg-indigo-600 text-white':'bg-white border border-slate-200 text-slate-600'}">Todas as Subcategorias</button>` + 
            subcats.map(sc => `<button onclick="setFiltroSubcategoria('${sc}')" class="px-4 py-1 rounded text-xs font-bold ${filtroSubcategoria===sc?'bg-indigo-600 text-white':'bg-white border border-slate-200 text-slate-600'}">${sc}</button>`).join('');
        menuSubCat.classList.remove('hidden');
    } else {
        menuSubCat.classList.add('hidden');
    }

    if (filtroSubcategoria !== 'Todas') prods = prods.filter(p => p.subcategoria === filtroSubcategoria);

    const termo = document.getElementById('buscaProduto')?.value.toLowerCase() || '';
    if (termo) prods = prods.filter(p => p.nome.toLowerCase().includes(termo));
    
    grid.innerHTML = prods.map(p => {
        let precoExibicao = p.preco || 0;
        if (p.regraPreco === 'pacote' && p.pacotes && p.pacotes.length > 0) {
            precoExibicao = Math.min(...p.pacotes.map(pct => pct.preco));
        } else if (p.regraPreco === 'progressivo' && p.progressivo && p.progressivo.length > 0) {
            precoExibicao = Math.min(...p.progressivo.map(prg => prg.p));
        } else if (p.regraPreco === 'combinacao' && p.combinacoes && p.combinacoes.precos.length > 0) {
            precoExibicao = Math.min(...p.combinacoes.precos.map(c => c.preco));
        }

        let bgClass = 'bg-white border-slate-200';
        let tagClass = 'text-slate-400';
        
        if (p.setor === 'Gráfico') { bgClass = 'bg-yellow-50 border-yellow-200'; tagClass = 'text-yellow-600'; } 
        else if (p.setor === 'Com. Visual') { bgClass = 'bg-blue-50 border-blue-200'; tagClass = 'text-blue-600'; } 
        else if (p.setor === 'Outros') { bgClass = 'bg-emerald-50 border-emerald-200'; tagClass = 'text-emerald-600'; }

        return `
        <div onclick="abrirConfigurador('${p.id}')" class="${bgClass} p-6 rounded border shadow-sm hover:shadow-xl cursor-pointer transition-all group">
            <div class="h-44 bg-white rounded mb-5 bg-contain bg-no-repeat bg-center transition group-hover:scale-105 shadow-sm" style="background-image:url('${p.foto || 'https://via.placeholder.com/200'}')"></div>
            <h4 class="font-bold text-slate-800 text-sm mb-1 truncate">${p.nome}</h4>
            <p class="text-[10px] font-bold ${tagClass} uppercase mb-4">${p.categoria} ${p.subcategoria ? ' > '+p.subcategoria : ''}</p>
            <p class="text-xl font-black text-indigo-600">
                <span class="text-[10px] text-slate-500 font-bold uppercase">A partir de</span> 
                R$ ${precoExibicao.toFixed(2)}
            </p>
        </div>
        `;
    }).join('');
}

function abrirConfigurador(id) {
    const p = bdProdutos.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modalNomeProd').innerText = p.nome;
    document.getElementById('modalProdId').value = p.id;
    document.getElementById('modalProdPrecoBase').value = p.preco || 0;
    document.getElementById('modalProdRegra').value = p.regraPreco;
    document.getElementById('modalHeaderImg').style.backgroundImage = `url('${p.foto || 'https://via.placeholder.com/400'}')`;
    
    const inputNomeArq = document.getElementById('w2pNomeArquivo');
    if(inputNomeArq) inputNomeArq.value = '';

    const divObs = document.getElementById('modalObs');
    if (p.obs && p.obs.trim() !== '') {
        divObs.innerHTML = `<strong>Aviso:</strong> ${p.obs}`;
        divObs.classList.remove('hidden');
    } else {
        divObs.classList.add('hidden');
    }

    const divMedidas = document.getElementById('modalCorpoMedidas');
    const regra = p.regraPreco;

    if (regra === 'm2') {
        divMedidas.innerHTML = `
            <div class="space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">Largura (m)</label><input type="number" id="w2pLargura" value="0.01" step="0.01" oninput="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div class="space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">Altura (m)</label><input type="number" id="w2pAltura" value="0.01" step="0.01" oninput="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div class="space-y-1 col-span-2"><label class="text-[10px] font-bold text-slate-400 uppercase">Quantidade</label><input type="number" id="w2pQtd" value="1" oninput="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        `;
    } else if (regra === 'pacote') {
        let opts = (p.pacotes ||[]).map(pct => `<option value="${pct.qtd}" data-preco="${pct.preco}">${pct.qtd} - R$ ${pct.preco.toFixed(2)}</option>`).join('');
        divMedidas.innerHTML = `<div class="col-span-2 space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">Escolha o Pacote</label><select id="w2pPacote" onchange="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500">${opts}</select></div>`;
    } else if (regra === 'combinacao' && p.combinacoes) {
        let opts1 = p.combinacoes.valores1.split(',').map(s => `<option value="${s.trim()}">${s.trim()}</option>`).join('');
        let opts2 = p.combinacoes.valores2.split(',').map(s => `<option value="${s.trim()}">${s.trim()}</option>`).join('');
        divMedidas.innerHTML = `
            <div class="space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">${p.combinacoes.nome1}</label><select id="w2pComb1" onchange="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500">${opts1}</select></div>
            <div class="space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">${p.combinacoes.nome2}</label><select id="w2pComb2" onchange="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500">${opts2}</select></div>
            <div class="space-y-1 col-span-2"><label class="text-[10px] font-bold text-slate-400 uppercase">Quantidade de Lotes</label><input type="number" id="w2pQtd" value="1" min="1" oninput="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        `;
    } else {
        divMedidas.innerHTML = `<div class="col-span-2 space-y-1"><label class="text-[10px] font-bold text-slate-400 uppercase">Quantidade</label><input type="number" id="w2pQtd" value="1" min="1" oninput="calcularPrecoAoVivo()" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>`;
    }

    const divVariacoes = document.getElementById('modalCorpoVariacoes');
    const tituloVariacoes = document.getElementById('tituloVariacoes');
    if (p.atributos && p.atributos.length > 0) {
        tituloVariacoes.classList.remove('hidden');
        divVariacoes.innerHTML = p.atributos.map(a => `
            <div class="space-y-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase">${a.nome}</label>
                <select class="sel-var w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" data-tipo="${a.tipo || 'multiplica'}" onchange="calcularPrecoAoVivo()">
                    ${a.opcoes.map(o => `<option value="${o.preco}">${o.nome} ${o.preco > 0 ? '(+ R$ ' + o.preco.toFixed(2) + ')' : '(Grátis)'}</option>`).join('')}
                </select>
            </div>
        `).join('');
    } else {
        tituloVariacoes.classList.add('hidden');
        divVariacoes.innerHTML = '';
    }

    const divAcabamentos = document.getElementById('modalCorpoAcabamentos');
    const tituloAcabamentos = document.getElementById('tituloAcabamentos');
    const acabPermitidos = p.acabamentos ||[];
    
    if (acabPermitidos.length > 0) {
        tituloAcabamentos.classList.remove('hidden');
        
        let optionsAcab = `<option value="" data-preco="0" data-regra="unidade">Nenhum</option>`;
        acabPermitidos.forEach(obj => {
            const a = bdAcabamentos.find(x => x.id === (obj.id || obj));
            if (!a) return;
            const selected = obj.padrao ? 'selected' : '';
            optionsAcab += `<option value="${a.id}" data-preco="${a.venda}" data-regra="${a.regra}" ${selected}>${a.nome} (+ R$ ${a.venda.toFixed(2)})</option>`;
        });

        divAcabamentos.innerHTML = `
            <select id="selAcabamentoUnico" class="w-full p-3 border border-slate-200 rounded bg-slate-50 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" onchange="calcularPrecoAoVivo()">
                ${optionsAcab}
            </select>
        `;
    } else {
        tituloAcabamentos.classList.add('hidden');
        divAcabamentos.innerHTML = '';
    }

    document.getElementById('modalW2P').classList.remove('hidden');
    calcularPrecoAoVivo();
}

function calcularPrecoAoVivo() {
    const idProd = document.getElementById('modalProdId').value;
    const p = bdProdutos.find(x => x.id === idProd);
    const regra = document.getElementById('modalProdRegra').value;
    const base = parseFloat(document.getElementById('modalProdPrecoBase').value) || 0;
    
    let extraVarMultiplica = 0;
    let extraVarFixo = 0;
    
    document.querySelectorAll('.sel-var').forEach(s => {
        const val = parseFloat(s.value) || 0;
        if (s.dataset.tipo === 'fixo') {
            extraVarFixo += val;
        } else {
            extraVarMultiplica += val;
        }
    });

    let qtd = 1; let totalBase = 0; let m2 = 1;
    let bloqueado = false;

    const btnAdd = document.getElementById('btnAdicionarCarrinho');
    const avisoBobina = document.getElementById('avisoBobina');
    const erroMax = document.getElementById('erroMedidaMax');

    if (regra === 'm2') {
        const l = parseFloat(document.getElementById('w2pLargura')?.value) || 0;
        const a = parseFloat(document.getElementById('w2pAltura')?.value) || 0;
        qtd = parseInt(document.getElementById('w2pQtd')?.value) || 1;
        
        const menorLado = Math.min(l, a);
        const maiorLado = Math.max(l, a);
        
        if (p && p.larguraMax > 0 && menorLado > p.larguraMax) {
            erroMax.classList.remove('hidden');
            bloqueado = true;
        } else {
            erroMax.classList.add('hidden');
        }

        if (!bloqueado && p && p.larguraBobina > 0 && menorLado > p.larguraBobina) {
            avisoBobina.classList.remove('hidden');
        } else {
            avisoBobina.classList.add('hidden');
        }
        
        m2 = l * a; 
        if (m2 < 0.5 && m2 > 0) m2 = 0.5; 

        totalBase = ((base + extraVarMultiplica) * m2 * qtd) + extraVarFixo;
    } else if (regra === 'pacote') {
        const sel = document.getElementById('w2pPacote');
        qtd = 1; 
        totalBase = (parseFloat(sel?.options[sel.selectedIndex]?.dataset.preco) || 0) + (extraVarMultiplica * qtd) + extraVarFixo;
    } else if (regra === 'combinacao' && p.combinacoes) {
        qtd = parseInt(document.getElementById('w2pQtd')?.value) || 1;
        const v1 = document.getElementById('w2pComb1')?.value;
        const v2 = document.getElementById('w2pComb2')?.value;
        let precoComb = base;
        const comb = p.combinacoes.precos.find(c => c.op1 === v1 && c.op2 === v2);
        if (comb) precoComb = comb.preco;
        
        totalBase = ((precoComb + extraVarMultiplica) * qtd) + extraVarFixo;
    } else if (regra === 'progressivo') {
        qtd = parseInt(document.getElementById('w2pQtd')?.value) || 1;
        let precoUnit = base;
        if (p && p.progressivo) {
            let faixas = [...p.progressivo].sort((a,b) => b.q - a.q);
            let faixa = faixas.find(f => qtd >= f.q);
            if (faixa) precoUnit = faixa.p;
        }
        totalBase = ((precoUnit + extraVarMultiplica) * qtd) + extraVarFixo;
    } else {
        qtd = parseInt(document.getElementById('w2pQtd')?.value) || 1;
        totalBase = ((base + extraVarMultiplica) * qtd) + extraVarFixo;
    }

    let totalAcab = 0;
    const selAcab = document.getElementById('selAcabamentoUnico');
    if (selAcab && selAcab.value !== "") {
        const opt = selAcab.options[selAcab.selectedIndex];
        const pA = parseFloat(opt.dataset.preco) || 0;
        const rA = opt.dataset.regra;
        if (rA === 'm2') totalAcab += pA * m2 * qtd; 
        else if (rA === 'lote') totalAcab += pA; 
        else totalAcab += pA * qtd;
    }

    document.getElementById('modalSubtotal').innerText = "R$ " + (totalBase + totalAcab).toFixed(2);

    if (bloqueado) {
        btnAdd.disabled = true;
        btnAdd.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        btnAdd.disabled = false;
        btnAdd.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function confirmarAdicaoCarrinho() {
    const p = bdProdutos.find(x => x.id === document.getElementById('modalProdId').value);
    const totalItem = parseFloat(document.getElementById('modalSubtotal').innerText.replace("R$ ",""));
    
    let qtdTexto = document.getElementById('w2pQtd')?.value || 1;
    if (p.regraPreco === 'pacote') {
        const sel = document.getElementById('w2pPacote');
        qtdTexto = sel?.value || "1";
    } else if (p.regraPreco === 'combinacao' && p.combinacoes) {
        const v1 = document.getElementById('w2pComb1')?.value;
        const v2 = document.getElementById('w2pComb2')?.value;
        qtdTexto = `${qtdTexto}x (${v1} | ${v2})`;
    } else {
        qtdTexto = qtdTexto + " un.";
    }

    let varsEscolhidas =[];
    document.querySelectorAll('.sel-var').forEach(s => varsEscolhidas.push(s.options[s.selectedIndex].text.split(" (+")[0].split(" (Grátis)")[0]));
    
    const selAcab = document.getElementById('selAcabamentoUnico');
    if (selAcab && selAcab.value !== "") {
        const nomeAcab = selAcab.options[selAcab.selectedIndex].text.split(" (+")[0];
        varsEscolhidas.push(`Acab: ${nomeAcab}`);
    }

    const nomeArquivo = document.getElementById('w2pNomeArquivo')?.value.trim();
    let nomeFinal = p.nome;
    if (nomeArquivo) {
        nomeFinal += ` (${nomeArquivo})`;
    }
    
    carrinho.push({ 
        nome: nomeFinal, 
        valorUnitario: totalItem, 
        qtdCarrinho: 1,
        valor: totalItem, 
        desc: `${qtdTexto} | ${varsEscolhidas.join(' | ')}` 
    });
    
    fecharModal(); renderCarrinho();
}

// --- CARRINHO E FINANCEIRO ---
function renderCarrinho() {
    const div = document.getElementById('listaCarrinho');
    if (!div) return;
    let sub = 0;
    div.innerHTML = carrinho.map((item, i) => {
        sub += item.valor;
        return `
        <div class="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100">
            <div class="w-[55%]">
                <p class="font-bold text-slate-800 text-xs">${item.nome}</p>
                <p class="text-[9px] font-medium text-slate-400 mt-1">${item.desc}</p>
            </div>
            <div class="flex items-center gap-3">
                <input type="number" value="${item.qtdCarrinho}" min="1" onchange="alterarQtdCarrinho(${i}, this.value)" class="w-12 p-1 text-xs border border-slate-200 rounded text-center font-bold outline-none focus:ring-1 focus:ring-indigo-500" />
                <div class="text-right w-16">
                    <p class="font-black text-indigo-600 text-sm">R$ ${item.valor.toFixed(2)}</p>
                    <button type="button" onclick="carrinho.splice(${i},1);renderCarrinho()" class="text-[9px] font-bold text-red-400 uppercase mt-1 hover:text-red-600 transition">Remover</button>
                </div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('subtotalCart').innerText = "R$ " + sub.toFixed(2);
    atualizarTotalFinal();
}

function alterarQtdCarrinho(index, novaQtd) {
    let q = parseInt(novaQtd) || 1;
    carrinho[index].qtdCarrinho = q;
    carrinho[index].valor = carrinho[index].valorUnitario * q;
    renderCarrinho();
}

function atualizarTotalFinal() {
    const sub = parseFloat(document.getElementById('subtotalCart').innerText.replace("R$ ","")) || 0;
    const frete = parseFloat(document.getElementById('cartFreteValor').value) || 0;
    const desconto = parseFloat(document.getElementById('cartDesconto').value) || 0;
    const pago = parseFloat(document.getElementById('cartValorPago').value) || 0;
    const formaPagto = document.getElementById('cartPagamento').value;

    let taxaDescPagto = 0;
    if (formaPagto === 'Pix' || formaPagto === 'Dinheiro') {
        taxaDescPagto = sub * -0.05; // -5% de desconto
    } else if (formaPagto === 'Credito_Vista') {
        taxaDescPagto = sub * 0.05; // +5% de acréscimo
    }

    const elTaxa = document.getElementById('cartTaxaPagto');
    if(elTaxa) {
        elTaxa.innerText = "R$ " + taxaDescPagto.toFixed(2);
        if(taxaDescPagto < 0) elTaxa.className = "text-emerald-500 font-bold";
        else if(taxaDescPagto > 0) elTaxa.className = "text-red-500 font-bold";
        else elTaxa.className = "text-slate-400 font-bold";
    }

    const totalPedido = (sub + taxaDescPagto + frete) - desconto;
    const saldo = totalPedido - pago;
    
    document.getElementById('totalCarrinho').innerText = "R$ " + totalPedido.toFixed(2);
    document.getElementById('cartSaldoDevedor').innerText = "R$ " + saldo.toFixed(2);
}

async function enviarPedido(imprimir = false, isOrcamento = false) {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    
    const idCli = document.getElementById('cartClienteId').value;
    const nomeCliInput = document.getElementById('cartClienteInput').value;
    const total = parseFloat(document.getElementById('totalCarrinho').innerText.replace("R$ ",""));
    
    let pago = parseFloat(document.getElementById('cartValorPago').value) || 0;
    let formaPagto = document.getElementById('cartPagamento').value;
    
    if (isOrcamento) {
        pago = 0;
        formaPagto = '';
    }

    const desconto = parseFloat(document.getElementById('cartDesconto').value) || 0;
    const taxaPagto = parseFloat(document.getElementById('cartTaxaPagto').innerText.replace("R$ ","")) || 0;
    const frete = parseFloat(document.getElementById('cartFreteValor').value) || 0;

    const saldo = total - pago;
    
    let statusInicial = "Em produção";
    if (isOrcamento) statusInicial = "Orçamento";
    else if (saldo > 0) statusInicial = "Aguardando pagamento";

    const pedido = {
        clienteId: idCli || "Consumidor Final",
        clienteNome: idCli ? bdClientes.find(x => x.id === idCli).nome : (nomeCliInput || "Consumidor Final"),
        itens: carrinho,
        total: total,
        desconto: desconto,
        taxaPagto: taxaPagto,
        frete: frete,
        formaPagamento: formaPagto,
        valorPago: pago,
        saldoDevedor: saldo,
        data: new Date(),
        status: statusInicial,
        arquivado: false,
        pagamentos: pago > 0 ? [{ data: new Date(), valor: pago, forma: formaPagto }] :[]
    };
    
    const docRef = await db.collection("pedidos").add(pedido);
    
    if (!isOrcamento && idCli && formaPagto === "Saldo_Cliente") {
        const c = bdClientes.find(x => x.id === idCli);
        await db.collection("clientes").doc(idCli).update({ credito: (c.credito || 0) - pago });
    }
    
    alert(isOrcamento ? "ORÇAMENTO SALVO COM SUCESSO!" : "PEDIDO SALVO!");
    
    if (isOrcamento) {
        if(confirm("Deseja enviar este orçamento para o WhatsApp do cliente?")) {
            enviarWhatsApp(docRef.id, 'orcamento', pedido);
        }
    } else if(imprimir) {
        imprimirReciboDireto(docRef.id, pedido);
    }

    carrinho =[]; 
    document.getElementById('cartValorPago').value = 0; 
    document.getElementById('cartDesconto').value = 0; 
    document.getElementById('cartFreteValor').value = 0;
    document.getElementById('cartPagamento').value = 'Pix';
    toggleOpcoesPagamento();
    renderCarrinho();
}

// --- FLUXO DE CAIXA (FINANCEIRO) E DETALHES ---
function renderFinanceiro() {
    const dataFiltroInput = document.getElementById('finDataFiltro');
    if (!dataFiltroInput) return;
    
    const dataSelecionada = dataFiltroInput.value; 
    if (!dataSelecionada) return;

    let entradasTotal = 0;
    let saidasTotal = 0;
    let transacoes =[];

    bdPedidos.forEach(p => {
        if (!p.data) return;
        
        if (p.pagamentos && p.pagamentos.length > 0) {
            p.pagamentos.forEach((pag, index) => {
                const pagDataObj = pag.data.toDate ? pag.data.toDate() : new Date(pag.data);
                const pagDataStr = pagDataObj.toISOString().split('T')[0];
                
                if (pagDataStr === dataSelecionada) {
                    entradasTotal += pag.valor;
                    transacoes.push({
                        dataObj: pagDataObj,
                        desc: `Pedido: ${p.clienteNome} ${index > 0 ? '(Pgto Saldo)' : ''} - ${pag.forma ? pag.forma.replace('_', ' ') : ''}`,
                        tipo: 'entrada',
                        valor: pag.valor,
                        id: p.id,
                        isPedido: true,
                        saldoDevedor: p.saldoDevedor
                    });
                }
            });
        } else {
            const dataObj = p.data.toDate ? p.data.toDate() : new Date(p.data);
            const dataStr = dataObj.toISOString().split('T')[0];
            
            if (dataStr === dataSelecionada && p.valorPago > 0) {
                entradasTotal += p.valorPago;
                transacoes.push({
                    dataObj: dataObj,
                    desc: `Pedido: ${p.clienteNome}`,
                    tipo: 'entrada',
                    valor: p.valorPago,
                    id: p.id,
                    isPedido: true,
                    saldoDevedor: p.saldoDevedor
                });
            }
        }
    });

    bdDespesas.forEach(d => {
        if (!d.data) return;
        const dataObj = d.data.toDate ? d.data.toDate() : new Date(d.data);
        const dataStr = dataObj.toISOString().split('T')[0];
        
        if (dataStr === dataSelecionada) {
            saidasTotal += d.valor;
            transacoes.push({
                dataObj: dataObj,
                desc: d.descricao,
                tipo: 'saida',
                valor: d.valor,
                id: d.id
            });
        }
    });

    transacoes.sort((a, b) => b.dataObj - a.dataObj);

    document.getElementById('finEntradas').innerText = `R$ ${entradasTotal.toFixed(2)}`;
    document.getElementById('finSaidas').innerText = `R$ ${saidasTotal.toFixed(2)}`;
    document.getElementById('finSaldo').innerText = `R$ ${(entradasTotal - saidasTotal).toFixed(2)}`;

    const tab = document.getElementById('listaFinanceiroTab');
    tab.innerHTML = transacoes.length === 0 
        ? `<tr><td colspan="3" class="p-4 text-center text-slate-400 font-normal">Nenhuma movimentação neste dia.</td></tr>`
        : transacoes.map(t => `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
            <td class="p-4 text-slate-400 font-medium">${t.dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</td>
            <td class="p-4 font-bold text-slate-700">
                ${t.desc}
                ${t.isPedido && t.saldoDevedor > 0 ? `<span class="ml-2 text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase tracking-widest">Falta R$ ${t.saldoDevedor.toFixed(2)}</span>` : ''}
            </td>
            <td class="p-4 font-black text-right ${t.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}">
                ${t.tipo === 'entrada' ? '+' : '-'} R$ ${t.valor.toFixed(2)}
                ${t.isPedido && t.saldoDevedor > 0 ? `<button onclick="receberSaldo('${t.id}')" class="ml-3 text-emerald-500 hover:text-emerald-700" title="Receber Saldo Devedor"><i class="fa fa-hand-holding-usd"></i></button>` : ''}
                ${t.isPedido ? `<button onclick="abrirDetalhesPedido('${t.id}')" class="ml-3 text-indigo-400 hover:text-indigo-600" title="Ver Detalhes do Pedido"><i class="fa fa-eye"></i></button>` : ''}
                ${t.tipo === 'saida' ? `<button onclick="excluirDespesa('${t.id}')" class="ml-3 text-red-300 hover:text-red-600" title="Excluir Saída"><i class="fa fa-trash"></i></button>` : ''}
            </td>
        </tr>
    `).join('');
}

function receberSaldo(idPedido) {
    const p = bdPedidos.find(x => x.id === idPedido);
    if (!p || p.saldoDevedor <= 0) return;

    document.getElementById('recSaldoIdPedido').value = idPedido;
    document.getElementById('recSaldoValor').value = p.saldoDevedor.toFixed(2);
    document.getElementById('recSaldoForma').value = 'Pix';
    document.getElementById('modalReceberSaldo').classList.remove('hidden');
}

async function confirmarRecebimentoSaldo() {
    const idPedido = document.getElementById('recSaldoIdPedido').value;
    const valorRecebidoStr = document.getElementById('recSaldoValor').value;
    const formaPagto = document.getElementById('recSaldoForma').value;

    const p = bdPedidos.find(x => x.id === idPedido);
    if (!p) return;

    const valorRecebido = parseFloat(valorRecebidoStr.replace(',', '.'));
    if (isNaN(valorRecebido) || valorRecebido <= 0) return alert("Valor inválido.");
    if (valorRecebido > (p.saldoDevedor + 0.01)) return alert("O valor recebido não pode ser maior que o saldo devedor.");

    const novoPago = p.valorPago + valorRecebido;
    let novoSaldo = p.saldoDevedor - valorRecebido;
    if (novoSaldo < 0) novoSaldo = 0;
    
    const novoStatus = (novoSaldo === 0 && (p.status === 'Aguardando pagamento' || p.status === 'Orçamento')) ? 'Em produção' : p.status;

    const novoPagamento = {
        data: new Date(),
        valor: valorRecebido,
        forma: formaPagto
    };

    let pagamentosAtualizados = p.pagamentos ||[];
    if (!p.pagamentos && p.valorPago > 0) {
        pagamentosAtualizados.push({ data: p.data, valor: p.valorPago, forma: p.formaPagamento || 'Não informada' });
    }
    pagamentosAtualizados.push(novoPagamento);

    try {
        await db.collection("pedidos").doc(idPedido).update({
            valorPago: novoPago,
            saldoDevedor: novoSaldo,
            status: novoStatus,
            pagamentos: pagamentosAtualizados
        });
        
        if (formaPagto === "Saldo_Cliente" && p.clienteId && p.clienteId !== "Consumidor Final") {
            const c = bdClientes.find(x => x.id === p.clienteId);
            if(c) {
                await db.collection("clientes").doc(p.clienteId).update({ credito: (c.credito || 0) - valorRecebido });
            }
        }

        alert("Pagamento registrado com sucesso! O caixa de hoje foi atualizado.");
        document.getElementById('modalReceberSaldo').classList.add('hidden');
    } catch (e) {
        console.error(e);
        alert("Erro ao registrar pagamento.");
    }
}

function abrirDetalhesPedido(id) {
    const p = bdPedidos.find(x => x.id === id);
    if(!p) return;
    
    const dataFormatada = p.data.toDate ? p.data.toDate().toLocaleString('pt-BR') : new Date(p.data).toLocaleString('pt-BR');
    
    let pagamentosHtml = '';
    if (p.pagamentos && p.pagamentos.length > 0) {
        pagamentosHtml = `
            <div class="mb-4 border-t border-slate-100 pt-4">
                <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Histórico de Pagamentos</p>
                <div class="space-y-2">
                    ${p.pagamentos.map(pag => {
                        const d = pag.data.toDate ? pag.data.toDate().toLocaleString('pt-BR') : new Date(pag.data).toLocaleString('pt-BR');
                        return `<div class="flex justify-between items-center text-xs bg-slate-50 p-2 rounded border border-slate-100">
                            <span><span class="font-bold text-slate-700">${pag.forma ? pag.forma.replace('_', ' ') : 'Não informada'}</span> <br/><span class="text-[9px] text-slate-400">${d}</span></span>
                            <span class="font-black text-emerald-600">R$ ${pag.valor.toFixed(2)}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }

    let btnReceber = p.saldoDevedor > 0 ? `<button type="button" onclick="receberSaldo('${p.id}'); document.getElementById('modalDetalhesPedido').classList.add('hidden');" class="flex-1 bg-emerald-600 text-white py-3 rounded font-bold text-xs hover:bg-emerald-700 transition uppercase tracking-widest shadow-md"><i class="fa fa-hand-holding-usd"></i> Receber</button>` : '';

    let html = `
        <div class="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
            <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase">Cliente</p>
                <p class="font-bold text-slate-800">${p.clienteNome}</p>
            </div>
            <div class="text-right">
                <p class="text-[10px] font-bold text-slate-400 uppercase">Data</p>
                <p class="font-bold text-slate-800 text-sm">${dataFormatada}</p>
            </div>
        </div>
        
        <div class="mb-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Status Atual</p>
            <span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-[10px] font-black uppercase">${p.status}</span>
        </div>

        <div class="mb-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Itens do Pedido</p>
            <div class="space-y-2 bg-slate-50 p-3 rounded border border-slate-100 max-h-40 overflow-y-auto">
                ${p.itens.map(i => `
                    <div class="flex justify-between text-xs">
                        <span class="font-bold text-slate-700">${i.qtdCarrinho}x ${i.nome} <br/><span class="font-normal text-[9px] text-slate-500">${i.desc}</span></span>
                        <span class="font-black text-indigo-600">R$ ${i.valor.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${pagamentosHtml}

        <div class="space-y-1 border-t border-slate-100 pt-4">
            <div class="flex justify-between text-xs font-bold text-slate-500"><span>Subtotal:</span> <span>R$ ${(p.total - (p.taxaPagto || 0) - (p.frete || 0) + (p.desconto || 0)).toFixed(2)}</span></div>
            ${p.taxaPagto ? `<div class="flex justify-between text-xs font-bold ${p.taxaPagto > 0 ? 'text-red-500' : 'text-emerald-500'}"><span>Taxa/Desc. Pgto:</span> <span>${p.taxaPagto > 0 ? '+' : ''} R$ ${p.taxaPagto.toFixed(2)}</span></div>` : ''}
            ${p.frete > 0 ? `<div class="flex justify-between text-xs font-bold text-slate-500"><span>Frete:</span> <span>+ R$ ${p.frete.toFixed(2)}</span></div>` : ''}
            ${p.desconto > 0 ? `<div class="flex justify-between text-xs font-bold text-red-500"><span>Desconto Manual:</span> <span>- R$ ${p.desconto.toFixed(2)}</span></div>` : ''}
            <div class="flex justify-between text-sm font-black text-slate-800 mt-1 pt-1 border-t border-slate-100"><span>Total:</span> <span>R$ ${p.total.toFixed(2)}</span></div>
            <div class="flex justify-between text-xs font-bold text-emerald-600 mt-1"><span>Valor Pago:</span> <span>R$ ${(p.valorPago || 0).toFixed(2)}</span></div>
            <div class="flex justify-between text-xs font-bold text-red-500 mt-1"><span>Saldo Devedor:</span> <span>R$ ${(p.saldoDevedor || 0).toFixed(2)}</span></div>
        </div>
        
        <div class="mt-6 flex gap-2">
            ${btnReceber}
            <button type="button" onclick="enviarWhatsApp('${p.id}', '${p.status === 'Orçamento' ? 'orcamento' : 'recibo'}')" class="flex-1 bg-green-500 text-white py-3 rounded font-bold text-xs hover:bg-green-600 transition uppercase tracking-widest shadow-md"><i class="fab fa-whatsapp"></i> Zap</button>
            <button type="button" onclick="imprimirRecibo('${p.id}')" class="flex-1 bg-indigo-600 text-white py-3 rounded font-bold text-xs hover:bg-indigo-700 transition uppercase tracking-widest shadow-md"><i class="fa fa-print"></i> Imprimir</button>
        </div>
    `;
    
    document.getElementById('corpoDetalhesPedido').innerHTML = html;
    document.getElementById('modalDetalhesPedido').classList.remove('hidden');
}

async function salvarDespesa() {
    const desc = document.getElementById('finDesc').value;
    const valor = parseFloat(document.getElementById('finValor').value);
    const dataFiltro = document.getElementById('finDataFiltro').value;
    
    if (!desc || !valor) return alert("Preencha a descrição e o valor da saída.");
    
    const hoje = new Date();
    const [ano, mes, dia] = dataFiltro.split('-');
    const dataRegistro = new Date(ano, mes - 1, dia, hoje.getHours(), hoje.getMinutes(), hoje.getSeconds());

    await db.collection("despesas").add({
        descricao: desc,
        valor: valor,
        data: dataRegistro
    });
    
    document.getElementById('finDesc').value = '';
    document.getElementById('finValor').value = '';
    alert("Saída registrada com sucesso!");
}

async function excluirDespesa(id) {
    if(confirm("Tem certeza que deseja excluir esta saída?")) {
        await db.collection("despesas").doc(id).delete();
    }
}

// --- AUXILIARES GERAIS ---
function mudarAba(aba, btn) { 
    document.querySelectorAll('.aba-content').forEach(el => { el.classList.add('hidden'); el.classList.remove('flex', 'block'); }); 
    const target = document.getElementById('aba-'+aba);
    target.classList.remove('hidden');
    if(aba === 'producao') target.classList.add('flex'); else target.classList.add('block');
    document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('active-aba')); 
    if(btn) btn.classList.add('active-aba'); 
}
function mudarSubAba(sub, btn) { document.querySelectorAll('.sub-aba-content').forEach(el => el.classList.add('hidden')); document.getElementById(sub).classList.remove('hidden'); document.querySelectorAll('.sub-aba-btn').forEach(b => b.classList.remove('active-sub', 'text-indigo-600')); if(btn) btn.classList.add('active-sub', 'text-indigo-600'); }
function fecharModal() { document.getElementById('modalW2P').classList.add('hidden'); }
function fecharModalFora(event) { if (event.target.id === 'modalW2P') fecharModal(); }
function renderCat() { const tab = document.getElementById('listaCategoriasTab'); if(tab) tab.innerHTML = bdCategorias.map(c => `<tr class="border-b border-slate-50"><td class="p-4 font-bold text-slate-600">${c.nome}</td><td class="p-4 text-right"><button type="button" onclick="editCat('${c.id}')" class="text-indigo-500 mr-3">Editar</button><button type="button" onclick="db.collection('categorias').doc('${c.id}').delete()" class="text-red-300">✕</button></td></tr>`).join(''); const catSelect = document.getElementById('prodCategoria'); if(catSelect) catSelect.innerHTML = bdCategorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join(''); const acabCat = document.getElementById('acabCategoria'); if(acabCat) acabCat.innerHTML = catSelect.innerHTML; }

function renderCliSelectCart() { 
    const dl = document.getElementById('listaClientesDatalist'); 
    if(dl) dl.innerHTML = bdClientes.map(c => `<option value="${c.nome}"></option>`).join(''); 
}

function atualizarInfoCreditoCarrinho() { 
    const inputVal = document.getElementById('cartClienteInput').value; 
    const c = bdClientes.find(x => x.nome === inputVal);
    const label = document.getElementById('labelCreditoCli'); 
    
    if(!c) { 
        document.getElementById('cartClienteId').value = "";
        label.innerText = "Saldo: R$ 0.00"; 
        label.className = "text-emerald-500 font-bold"; 
        return; 
    } 
    
    document.getElementById('cartClienteId').value = c.id;
    const credito = c.credito || 0; 
    label.innerText = `Saldo: R$ ${credito.toFixed(2)}`; 
    label.className = credito >= 0 ? "text-emerald-500 font-bold" : "text-red-500 font-bold"; 
}

function toggleOpcoesPagamento() { 
    document.getElementById('divParcelas').style.display = (document.getElementById('cartPagamento').value === 'Credito_Parcelado') ? 'block' : 'none'; 
    atualizarTotalFinal();
}
function toggleOpcoesEntrega() { const v = document.getElementById('cartEntrega').value; document.getElementById('divFrete').style.display = (v === 'Retirada') ? 'none' : 'block'; atualizarTotalFinal(); }
function renderAcabTable() { const tab = document.getElementById('listaAcabamentosTab'); if(tab) tab.innerHTML = bdAcabamentos.map(a => `<tr class="border-b border-slate-50"><td class="p-4 font-bold text-slate-600">${a.nome} (${a.grupo})</td><td class="p-4 text-center"><button type="button" onclick="editAcab('${a.id}')" class="text-indigo-500 mr-3 font-bold text-[10px] uppercase">Editar</button><button type="button" onclick="db.collection('acabamentos').doc('${a.id}').delete()" class="text-red-300 font-bold text-[10px]">X</button></td></tr>`).join(''); }

function renderProdTable() { const tab = document.getElementById('listaProdutosTab'); if(!tab) return; tab.innerHTML = bdProdutos.map(p => `<tr class="border-b border-slate-50 hover:bg-slate-50 transition"><td class="p-4 font-bold text-slate-700">${p.nome}</td><td class="p-4 text-slate-400 text-[10px] uppercase">${p.setor || 'Gráfico'}</td><td class="p-4 text-center"><button type="button" onclick="editProd('${p.id}')" class="text-indigo-500 mr-3 font-bold text-[10px] uppercase">Editar</button><button type="button" onclick="db.collection('produtos').doc('${p.id}').delete()" class="text-red-300 font-bold text-[10px]">X</button></td></tr>`).join(''); }

function renderCliTable() { 
    const tab = document.getElementById('listaClientesTab'); 
    if(!tab) return; 
    
    const termo = document.getElementById('buscaClienteTab')?.value.toLowerCase() || '';
    let filtrados = bdClientes;
    
    if (termo) {
        filtrados = bdClientes.filter(c => c.nome.toLowerCase().includes(termo) || (c.documento && c.documento.includes(termo)));
    }

    tab.innerHTML = filtrados.map(c => `<tr class="border-b border-slate-50 hover:bg-slate-50"><td class="p-4 font-bold text-slate-700">${c.nome}</td><td class="p-4 font-bold ${c.credito >= 0 ? 'text-emerald-500' : 'text-red-500'}">R$ ${(c.credito || 0).toFixed(2)}</td><td class="p-4 text-center space-x-3"><button type="button" onclick="verHistoricoCliente('${c.id}')" class="text-indigo-400 text-[10px] font-black uppercase hover:text-indigo-500">Histórico</button><button type="button" onclick="editCli('${c.id}')" class="text-slate-400 text-[10px] font-black uppercase hover:text-indigo-500">Editar</button><button type="button" onclick="db.collection('clientes').doc('${c.id}').delete()" class="text-red-300 hover:text-red-500">✕</button></td></tr>`).join(''); 
}

async function salvarCategoria() { const id = document.getElementById('catId').value; const nome = document.getElementById('catNome').value; if(!nome) return; if(id) await db.collection("categorias").doc(id).update({nome: nome}); else await db.collection("categorias").add({nome: nome}); document.getElementById('catId').value = ''; document.getElementById('catNome').value = ''; }
function editCat(id) { const c = bdCategorias.find(x => x.id === id); document.getElementById('catId').value = c.id; document.getElementById('catNome').value = c.nome; }

function verHistoricoCliente(idCli) { 
    const cliente = bdClientes.find(x => x.id === idCli); 
    const pedidosCli = bdPedidos.filter(p => p.clienteId === idCli); 
    document.getElementById('histNomeCli').innerText = `Pedidos de: ${cliente.nome}`; 
    const corpo = document.getElementById('corpoHistoricoCli'); 
    corpo.innerHTML = pedidosCli.length === 0 
        ? "<p class='text-center text-slate-400 py-10'>Nenhum pedido.</p>" 
        : pedidosCli.map(p => `
            <div class="bg-slate-50 p-4 rounded border border-slate-100">
                <div class="flex justify-between font-bold text-indigo-900 mb-2">
                    <span>${p.data.toDate().toLocaleDateString('pt-BR')}</span>
                    <span>R$ ${p.total.toFixed(2)}</span>
                </div>
                <div class="text-xs text-slate-500 mb-3">
                    ${p.itens.map(i => `• ${i.qtdCarrinho}x ${i.nome}`).join('<br/>')}
                </div>
                <div class="flex gap-4">
                    <button type="button" onclick="abrirDetalhesPedido('${p.id}')" class="text-[10px] font-bold text-indigo-500 uppercase hover:underline"><i class="fa fa-eye"></i> Ver Detalhes</button>
                    <button type="button" onclick="imprimirRecibo('${p.id}')" class="text-[10px] font-bold text-indigo-500 uppercase hover:underline"><i class="fa fa-print"></i> Imprimir Recibo</button>
                </div>
            </div>
        `).join(''); 
    document.getElementById('modalHistoricoCli').classList.remove('hidden'); 
}

async function salvarCliente() { const id = document.getElementById('cliId').value; const d = { nome: document.getElementById('cliNome').value, documento: document.getElementById('cliDoc').value, telefone: document.getElementById('cliTel').value, endereco: document.getElementById('cliEnd').value, credito: parseFloat(document.getElementById('cliCredito').value) || 0 }; if(!d.nome) return alert("Nome obrigatório"); if(id) await db.collection("clientes").doc(id).update(d); else await db.collection("clientes").add(d); limparFormCli(); }
function editCli(id) { const c = bdClientes.find(x => x.id === id); document.getElementById('cliId').value = c.id; document.getElementById('cliNome').value = c.nome; document.getElementById('cliDoc').value = c.documento || ''; document.getElementById('cliTel').value = c.telefone || ''; document.getElementById('cliEnd').value = c.endereco || ''; document.getElementById('cliCredito').value = c.credito || 0; document.getElementById('tituloCliForm').innerText = "Editar Cadastro"; }
function limparFormCli() { document.querySelectorAll('#sub-cli input').forEach(i => i.value = ''); document.getElementById('cliId').value = ''; document.getElementById('tituloCliForm').innerText = "Novo Cliente"; }
async function salvarAcabamento() { const id = document.getElementById('acabId').value; const d = { nome: document.getElementById('acabNome').value, grupo: document.getElementById('acabGrupo').value, categoria: document.getElementById('acabCategoria').value, regra: document.getElementById('acabRegra').value, venda: parseFloat(document.getElementById('acabPrecoVenda').value) || 0, custo: parseFloat(document.getElementById('acabCusto').value) || 0 }; if(!d.nome) return alert("Nome obrigatório"); if(id) await db.collection("acabamentos").doc(id).update(d); else await db.collection("acabamentos").add(d); limparFormAcab(); }
function editAcab(id) { const a = bdAcabamentos.find(x => x.id === id); if(!a) return; document.getElementById('acabId').value = a.id; document.getElementById('acabNome').value = a.nome; document.getElementById('acabGrupo').value = a.grupo || ''; document.getElementById('acabCategoria').value = a.categoria || ''; document.getElementById('acabRegra').value = a.regra || 'unidade'; document.getElementById('acabPrecoVenda').value = a.venda || 0; document.getElementById('acabCusto').value = a.custo || 0; document.getElementById('tituloAcabForm').innerText = "Editar Acabamento"; }
function limparFormAcab() { document.getElementById('acabId').value = ''; document.getElementById('acabNome').value = ''; document.getElementById('acabGrupo').value = ''; document.getElementById('acabPrecoVenda').value = ''; document.getElementById('acabCusto').value = ''; document.getElementById('tituloAcabForm').innerText = "Novo Acabamento"; }
