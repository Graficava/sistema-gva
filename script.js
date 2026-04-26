const firebaseConfig = {
    apiKey: "AIzaSyC4pkjSYpuz4iF0ijF50VxaZ2npsYCi7II",
    authDomain: "app-graficava.firebaseapp.com",
    projectId: "app-graficava",
    storageBucket: "app-graficava.firebasestorage.app",
    messagingSenderId: "37941958808",
    appId: "1:37941958808:web:b321e78b2191fd1d83d8ed"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let bdCategorias = [];
let bdProdutos = [];
let bdClientes =[];
let bdPedidos = [];
let bdDespesas = [];
let bdAcabamentos = [];
let carrinho =[];

// Variáveis de Filtro da Vitrine
let filtroSetor = 'Todos';
let filtroCategoria = 'Todas';
let filtroSubcategoria = 'Todas';

const STATUSES =[
    "Aguardando pagamento",
    "Em produção",
    "Acabamento",
    "Pronto para Retirada",
    "Entregue",
    "Cancelado / Estorno"
];

auth.onAuthStateChanged(user => {
    const telaLogin = document.getElementById('telaLogin');
    const appInterface = document.getElementById('appInterface');
    if (user) {
        telaLogin.classList.add('hidden');
        appInterface.classList.remove('hidden');
        iniciarLeitura();
        
        const dataFiltro = document.getElementById('finDataFiltro');
        if(dataFiltro && !dataFiltro.value) {
            dataFiltro.valueAsDate = new Date();
        }
    } else {
        telaLogin.classList.remove('hidden');
        appInterface.classList.add('hidden');
    }
});

function entrar() {
    const e = document.getElementById('email').value;
    const s = document.getElementById('senha').value;
    if (!e || !s) return;
    auth.signInWithEmailAndPassword(e, s).catch(() => {
        document.getElementById('msgErro').classList.remove('hidden');
    });
}

function sair() { auth.signOut(); }

function iniciarLeitura() {
    db.collection("categorias").onSnapshot(s => { 
        bdCategorias = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderCat(); 
    });
    db.collection("produtos").onSnapshot(s => { 
        bdProdutos = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderVitrine(); renderProdTable();
    });
    db.collection("clientes").orderBy("nome").onSnapshot(s => { 
        bdClientes = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderCliTable(); renderCliSelectCart();
    });
    db.collection("acabamentos").onSnapshot(s => {
        bdAcabamentos = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderAcabTable(); atualizarListaAcabamentosProduto();
    });
    db.collection("pedidos").orderBy("data", "desc").limit(200).onSnapshot(s => {
        bdPedidos = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderFinanceiro(); renderKanbanProducao();
    });
    db.collection("despesas").orderBy("data", "desc").limit(200).onSnapshot(s => {
        bdDespesas = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderFinanceiro();
    });
}

// --- KANBAN DE PRODUÇÃO ---
function renderKanbanProducao() {
    const container = document.getElementById('kanbanContainer');
    if(!container) return;

    // Filtra os pedidos que NÃO estão arquivados
    const pedidosAtivos = bdPedidos.filter(p => !p.arquivado);

    let html = '';
    STATUSES.forEach(status => {
        const pedidosDoStatus = pedidosAtivos.filter(p => p.status === status);
        html += `
            <div class="bg-slate-100 rounded-xl p-4 w-80 flex-shrink-0 flex flex-col h-full border border-slate-200">
                <div class="flex justify-between items-center mb-4 shrink-0">
                    <h3 class="font-bold text-slate-700 uppercase text-[10px] tracking-widest">${status}</h3>
                    <span class="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-1 rounded-full">${pedidosDoStatus.length}</span>
                </div>
                <div class="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
                    ${pedidosDoStatus.map(p => gerarCardPedido(p)).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function gerarCardPedido(p) {
    const dataFormatada = p.data.toDate().toLocaleDateString('pt-BR') + ' ' + p.data.toDate().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    let options = STATUSES.map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('');

    let corBorda = 'border-l-slate-400';
    if(p.status === 'Aguardando pagamento') corBorda = 'border-l-amber-400';
    if(p.status === 'Em produção') corBorda = 'border-l-blue-500';
    if(p.status === 'Acabamento') corBorda = 'border-l-indigo-500';
    if(p.status === 'Pronto para Retirada') corBorda = 'border-l-emerald-400';
    if(p.status === 'Entregue') corBorda = 'border-l-emerald-600';
    if(p.status === 'Cancelado / Estorno') corBorda = 'border-l-red-500';

    let btnArquivar = '';
    if (p.status === 'Entregue' || p.status === 'Cancelado / Estorno') {
        btnArquivar = `<button type="button" onclick="arquivarPedido('${p.id}')" class="bg-slate-200 text-slate-600 px-3 rounded hover:bg-slate-300 transition" title="Arquivar Pedido (Remover da Tela)"><i class="fa fa-archive"></i></button>`;
    }

    return `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 border-l-4 ${corBorda}">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[9px] font-bold text-slate-400">${dataFormatada}</span>
                <span class="text-[10px] font-black text-indigo-600">R$ ${p.total.toFixed(2)}</span>
            </div>
            <h4 class="font-bold text-slate-800 text-xs mb-2">${p.clienteNome}</h4>
            <div class="text-[9px] text-slate-500 mb-3 space-y-1">
                ${p.itens.map(i => `<p>• ${i.qtdCarrinho}x ${i.nome} <span class="opacity-70">(${i.desc})</span></p>`).join('')}
            </div>
            <div class="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                <select onchange="mudarStatusPedido('${p.id}', this.value)" class="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                    ${options}
                </select>
                ${btnArquivar}
                <button type="button" onclick="imprimirRecibo('${p.id}')" class="bg-slate-800 text-white px-3 rounded hover:bg-slate-700 transition" title="Imprimir Recibo"><i class="fa fa-print"></i></button>
            </div>
        </div>
    `;
}

async function mudarStatusPedido(id, novoStatus) {
    try { await db.collection("pedidos").doc(id).update({ status: novoStatus }); } 
    catch(e) { console.error(e); alert("Erro ao atualizar status."); }
}

async function arquivarPedido(id) {
    if(confirm("Deseja remover este pedido do painel de produção? Ele continuará salvo no Financeiro e no Histórico do Cliente.")) {
        try { await db.collection("pedidos").doc(id).update({ arquivado: true }); } 
        catch(e) { console.error(e); alert("Erro ao arquivar pedido."); }
    }
}

// --- IMPRESSÃO DE RECIBO (2 VIAS) ---
function imprimirReciboDireto(idPedido, objPedido) {
    const p = objPedido || bdPedidos.find(x => x.id === idPedido);
    if(!p) return;
    
    const janela = window.open('', '', 'width=350,height=800');
    let html = `
        <html><head><style>
            body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; color: #000; font-size: 12px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .linha { border-bottom: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; font-size: 12px; border-collapse: collapse; }
            th, td { text-align: left; padding: 2px 0; vertical-align: top; }
            .right { text-align: right; }
            img.logo { max-width: 150px; margin: 0 auto 10px auto; display: block; }
            .prod-item { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
            .prod-desc { font-size: 12px; margin-bottom: 10px; padding-left: 10px; }
            @media print { .quebra-pagina { page-break-before: always; } }
        </style></head><body>

        <!-- VIA DO CLIENTE -->
        <img src="https://i.postimg.cc/GtwRkLBF/gva-pr-ERP-26.png" class="logo" alt="GVA Gráfica" />
        <div class="center bold" style="font-size: 14px;">Gráfica Venom Arts LTDA</div>
        <div class="center" style="font-size: 10px; margin-bottom: 10px;">
            CNPJ: 17.184.159/0001-06<br/>
            IM: 2231694 | IE: 14.623.58-2<br/>
            Rua Lopes Trovão nº 474 Lojas 202 e 201<br/>
            Icaraí, Niterói - RJ 24220-071<br/>
            www.graficava.com.br<br/>
            WhatsApp: 21 99993-0190<br/>
            Insta: @grafica.venomarts
        </div>
        <div class="linha"></div>
        <div class="center bold" style="font-size: 14px;">Pedido: ${idPedido.substring(0,6).toUpperCase()}</div>
        <div class="center">Data: ${p.data.toDate ? p.data.toDate().toLocaleDateString('pt-BR') : p.data.toLocaleDateString('pt-BR')} ${p.data.toDate ? p.data.toDate().toLocaleTimeString('pt-BR') : p.data.toLocaleTimeString('pt-BR')}</div>
        <div class="linha"></div>
        <div>Cliente: ${p.clienteNome}</div>
        <div class="linha"></div>
        <table>
            <tr><th>Qtd/Item</th><th class="right">Valor</th></tr>
            ${p.itens.map(i => `<tr><td>${i.qtdCarrinho}x ${i.nome}<br/><small>${i.desc}</small></td><td class="right">R$ ${i.valor.toFixed(2)}</td></tr>`).join('')}
        </table>
        <div class="linha"></div>
        <div class="right bold">Subtotal: R$ ${(p.total + (p.desconto || 0)).toFixed(2)}</div>
        ${p.desconto > 0 ? `<div class="right text-red-500">Desconto: - R$ ${p.desconto.toFixed(2)}</div>` : ''}
        <div class="right bold">Total: R$ ${p.total.toFixed(2)}</div>
        <div class="right">Valor Pago: R$ ${(p.valorPago || 0).toFixed(2)}</div>
        <div class="right bold">Saldo: R$ ${(p.saldoDevedor || 0).toFixed(2)}</div>
        <div class="linha"></div>
        <div class="center">Obrigado pela preferência!</div>

        <!-- QUEBRA DE PÁGINA PARA A IMPRESSORA TÉRMICA -->
        <div class="quebra-pagina"></div>

        <!-- VIA DA PRODUÇÃO -->
        <div class="center bold" style="font-size: 16px; margin-bottom: 10px;">VIA DA PRODUÇÃO</div>
        <div class="center bold" style="font-size: 14px;">Pedido: ${idPedido.substring(0,6).toUpperCase()}</div>
        <div class="center">Data: ${p.data.toDate ? p.data.toDate().toLocaleDateString('pt-BR') : p.data.toLocaleDateString('pt-BR')} ${p.data.toDate ? p.data.toDate().toLocaleTimeString('pt-BR') : p.data.toLocaleTimeString('pt-BR')}</div>
        <div class="linha"></div>
        <div class="bold" style="font-size: 14px;">Cliente: ${p.clienteNome}</div>
        <div class="linha"></div>
        ${p.itens.map(i => `
            <div class="prod-item">[ ] ${i.qtdCarrinho}x ${i.nome}</div>
            <div class="prod-desc">${i.desc.replace(/\|/g, '<br/>')}</div>
        `).join('')}
        <div class="linha"></div>
        <div class="center">Fim da Ordem de Serviço</div>

        <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
        </script>
        </body></html>
    `;
    janela.document.write(html);
    janela.document.close();
}

function imprimirRecibo(idPedido) {
    imprimirReciboDireto(idPedido, null);
}

// --- LÓGICA DE ATRIBUTOS E COMBINAÇÕES ---
function addOpcaoAtrib(container, n = '', p = '') {
    const div = document.createElement('div');
    div.className = "flex gap-2 item-opcao";
    div.innerHTML = `<input type="text" placeholder="Opção" value="${n}" class="op-nome flex-1 text-xs p-2 border border-slate-200 rounded bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" /><input type="number" placeholder="R$" value="${p}" class="op-preco w-20 text-xs p-2 border border-slate-200 rounded bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500" /><button type="button" onclick="this.parentElement.remove()" class="text-slate-300 hover:text-red-500">✕</button>`;
    container.appendChild(div);
}

function addAtributo(nome = '', tipo = 'multiplica', opcoes =[]) {
    const div = document.createElement('div');
    div.className = "bg-white p-4 rounded border border-slate-100 shadow-sm item-atrib";
    div.innerHTML = `
        <div class="flex gap-2 mb-3">
            <input type="text" placeholder="Grupo (ex: Papel)" value="${nome}" class="atrib-nome flex-1 font-bold text-sm p-2 border-b-2 border-indigo-50 outline-none focus:border-indigo-500" />
            <select class="atrib-tipo text-xs p-2 border-b-2 border-indigo-50 outline-none text-slate-500 font-bold">
                <option value="multiplica" ${tipo === 'multiplica' ? 'selected' : ''}>Multiplica pela Qtd</option>
                <option value="fixo" ${tipo === 'fixo' ? 'selected' : ''}>Fixo no Pedido</option>
            </select>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-300">✕</button>
        </div>
        <div class="lista-opcoes space-y-2"></div>
        <button type="button" class="btn-add-op mt-3 text-[10px] font-bold uppercase text-indigo-400 hover:text-indigo-600">+ Add Opção</button>
    `;
    document.getElementById('listaAtributos').appendChild(div);
    const containerOpcoes = div.querySelector('.lista-opcoes');
    div.querySelector('.btn-add-op').onclick = () => addOpcaoAtrib(containerOpcoes);
    if (opcoes && opcoes.length > 0) opcoes.forEach(o => addOpcaoAtrib(containerOpcoes, o.nome, o.preco));
    else addOpcaoAtrib(containerOpcoes);
}

function addAtributoManual() { addAtributo('', 'multiplica',[]); }

function ajustarCamposProduto() {
    const r = document.getElementById('prodRegraPreco').value;
    document.getElementById('boxPrecoBase').style.display = (r === 'pacote' || r === 'progressivo' || r === 'combinacao') ? 'none' : 'block';
    document.getElementById('boxPacotes').style.display = r === 'pacote' ? 'block' : 'none';
    document.getElementById('boxProgressivo').style.display = r === 'progressivo' ? 'block' : 'none';
    document.getElementById('boxCombinacoes').style.display = r === 'combinacao' ? 'block' : 'none';
    document.getElementById('boxMedidas').style.display = r === 'm2' ? 'grid' : 'none';
}

function addLinhaPacote(q='', p='') {
    const div = document.createElement('div');
    div.className = "flex gap-2";
    div.innerHTML = `<input type="text" placeholder="Qtd (ex: 1.000 Cartões)" value="${q}" class="q w-full p-2 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-amber-500" /><input type="number" placeholder="Total R$" value="${p}" class="p w-full p-2 border border-slate-200 rounded font-bold text-amber-600 text-xs outline-none focus:ring-2 focus:ring-amber-500" /><button type="button" onclick="this.parentElement.remove()" class="text-red-300">✕</button>`;
    document.getElementById('listaGradePacotes').appendChild(div);
}

function addLinhaProgressivo(q='', p='') {
    const div = document.createElement('div');
    div.className = "flex gap-2";
    div.innerHTML = `<input type="number" placeholder="Qtd Mín" value="${q}" class="q w-full p-2 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-emerald-500" /><input type="number" placeholder="Unit R$" value="${p}" class="p w-full p-2 border border-slate-200 rounded font-bold text-emerald-600 text-xs outline-none focus:ring-2 focus:ring-emerald-500" /><button type="button" onclick="this.parentElement.remove()" class="text-red-300">✕</button>`;
    document.getElementById('listaGradeProgressivo').appendChild(div);
}

function gerarGradeCombinacoes() {
    const v1 = document.getElementById('combValores1').value.split(',').map(s=>s.trim()).filter(s=>s);
    const v2 = document.getElementById('combValores2').value.split(',').map(s=>s.trim()).filter(s=>s);
    const container = document.getElementById('listaGradeCombinacoes');
    container.innerHTML = '';
    
    if(v1.length === 0 || v2.length === 0) return alert("Preencha os valores separados por vírgula nos dois atributos.");

    v1.forEach(op1 => {
        v2.forEach(op2 => {
            const div = document.createElement('div');
            div.className = "flex gap-2 items-center item-combinacao";
            div.innerHTML = `
                <input type="text" readonly value="${op1}" class="c-op1 w-1/3 p-2 border border-purple-200 rounded text-xs bg-white outline-none font-bold text-slate-600" />
                <input type="text" readonly value="${op2}" class="c-op2 w-1/3 p-2 border border-purple-200 rounded text-xs bg-white outline-none font-bold text-slate-600" />
                <input type="number" placeholder="Preço R$" class="c-preco w-1/3 p-2 border border-purple-200 rounded font-bold text-purple-700 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
            `;
            container.appendChild(div);
        });
    });
}

function atualizarListaAcabamentosProduto(salvos =[]) {
    const container = document.getElementById('listaCheckAcabamentos');
    const catSelect = document.getElementById('prodCategoria');
    if(!container || !catSelect) return;
    const cat = catSelect.value;
    const filtrados = bdAcabamentos.filter(a => a.categoria === cat || a.categoria === "Geral");
    container.innerHTML = filtrados.map(a => {
        const obj = salvos.find(s => (s.id || s) === a.id);
        const checked = obj ? 'checked' : '';
        const starAtiva = (obj && obj.padrao) ? 'text-amber-400' : 'text-slate-200';
        return `<div class="flex items-center justify-between p-2 bg-white border border-slate-200 rounded"><label class="text-[10px] font-bold flex items-center gap-2 cursor-pointer"><input type="checkbox" class="check-acab-prod" value="${a.id}" ${checked} /> ${a.nome}</label><i class="fa fa-star cursor-pointer star-padrao ${starAtiva}" onclick="this.classList.toggle('text-amber-400'); this.classList.toggle('text-slate-200')"></i></div>`;
    }).join('');
}

async function salvarProduto() {
    const id = document.getElementById('prodId').value;
    const regra = document.getElementById('prodRegraPreco').value;
    
    let atributos =[];
    document.querySelectorAll('.item-atrib').forEach(caixa => {
        let ops =[];
        caixa.querySelectorAll('.item-opcao').forEach(l => {
            const n = l.querySelector('.op-nome').value;
            const p = parseFloat(l.querySelector('.op-preco').value) || 0;
            if (n) ops.push({ nome: n, preco: p });
        });
        const nomeAtrib = caixa.querySelector('.atrib-nome').value;
        const tipoAtrib = caixa.querySelector('.atrib-tipo').value;
        if (nomeAtrib) atributos.push({ nome: nomeAtrib, tipo: tipoAtrib, opcoes: ops });
    });

    let acabList =[];
    document.querySelectorAll('.check-acab-prod:checked').forEach(chk => {
        const star = chk.closest('div').querySelector('.star-padrao');
        acabList.push({ id: chk.value, padrao: star.classList.contains('text-amber-400') });
    });

    let pacotes =[];
    document.querySelectorAll('#listaGradePacotes > div').forEach(d => {
        const q = d.querySelector('.q').value; 
        const p = parseFloat(d.querySelector('.p').value);
        if (q && p) pacotes.push({ qtd: q, preco: p });
    });

    let progressivo =[];
    document.querySelectorAll('#listaGradeProgressivo > div').forEach(d => {
        const q = parseInt(d.querySelector('.q').value); const p = parseFloat(d.querySelector('.p').value);
        if (q && p) progressivo.push({ q: q, p: p });
    });

    let combinacoes = null;
    if (regra === 'combinacao') {
        const n1 = document.getElementById('combNome1').value;
        const n2 = document.getElementById('combNome2').value;
        const v1 = document.getElementById('combValores1').value;
        const v2 = document.getElementById('combValores2').value;
        let precos =[];
        document.querySelectorAll('.item-combinacao').forEach(d => {
            precos.push({
                op1: d.querySelector('.c-op1').value,
                op2: d.querySelector('.c-op2').value,
                preco: parseFloat(d.querySelector('.c-preco').value) || 0
            });
        });
        combinacoes = { nome1: n1, nome2: n2, valores1: v1, valores2: v2, precos: precos };
    }

    const d = {
        nome: document.getElementById('prodNome').value,
        setor: document.getElementById('prodSetor').value,
        categoria: document.getElementById('prodCategoria').value,
        subcategoria: document.getElementById('prodSubcategoria').value || '',
        regraPreco: regra,
        preco: parseFloat(document.getElementById('prodPreco').value) || 0,
        foto: document.getElementById('prodFoto').value || '',
        ref: document.getElementById('prodRef').value || '',
        material: document.getElementById('prodMaterial').value || '',
        gramatura: document.getElementById('prodGramatura').value || '',
        prazo: parseInt(document.getElementById('prodPrazo').value) || 0,
        larguraBobina: parseFloat(document.getElementById('prodLargBobina').value) || 0,
        larguraMax: parseFloat(document.getElementById('prodLargMax').value) || 0,
        compMax: parseFloat(document.getElementById('prodCompMax').value) || 0,
        obs: document.getElementById('prodObs').value || '',
        atributos: atributos,
        acabamentos: acabList,
        pacotes: pacotes,
        progressivo: progressivo,
        combinacoes: combinacoes
    };

    if (!d.nome) return alert("Nome obrigatório!");
    
    try {
        if (id) await db.collection("produtos").doc(id).update(d); 
        else await db.collection("produtos").add(d);
        
        alert("Produto salvo com sucesso!");
        document.getElementById('prodId').value = '';
        mudarSubAba('sub-prod', document.querySelectorAll('.sub-aba-btn')[1]);
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar produto.");
    }
}

function editProd(id) {
    const p = bdProdutos.find(x => x.id === id);
    if (!p) return;
    document.getElementById('prodId').value = p.id;
    document.getElementById('prodNome').value = p.nome || '';
    document.getElementById('prodSetor').value = p.setor || 'Gráfico';
    document.getElementById('prodCategoria').value = p.categoria || '';
    document.getElementById('prodSubcategoria').value = p.subcategoria || '';
    document.getElementById('prodRegraPreco').value = p.regraPreco || 'unidade';
    document.getElementById('prodPreco').value = p.preco || 0;
    document.getElementById('prodFoto').value = p.foto || '';
    document.getElementById('prodRef').value = p.ref || '';
    document.getElementById('prodMaterial').value = p.material || '';
    document.getElementById('prodGramatura').value = p.gramatura || '';
    document.getElementById('prodPrazo').value = p.prazo || 0;
    document.getElementById('prodLargBobina').value = p.larguraBobina || 0;
    document.getElementById('prodLargMax').value = p.larguraMax || 0;
    document.getElementById('prodCompMax').value = p.compMax || 0;
    document.getElementById('prodObs').value = p.obs || '';
    
    document.getElementById('listaAtributos').innerHTML = '';
    if (p.atributos) p.atributos.forEach(a => addAtributo(a.nome, a.tipo || 'multiplica', a.opcoes));
    
    document.getElementById('listaGradePacotes').innerHTML = '';
    if (p.pacotes) p.pacotes.forEach(pct => addLinhaPacote(pct.qtd, pct.preco));

    document.getElementById('listaGradeProgressivo').innerHTML = '';
    if (p.progressivo) p.progressivo.forEach(prg => addLinhaProgressivo(prg.q, prg.p));

    if (p.combinacoes) {
        document.getElementById('combNome1').value = p.combinacoes.nome1 || '';
        document.getElementById('combNome2').value = p.combinacoes.nome2 || '';
        document.getElementById('combValores1').value = p.combinacoes.valores1 || '';
        document.getElementById('combValores2').value = p.combinacoes.valores2 || '';
        const container = document.getElementById('listaGradeCombinacoes');
        container.innerHTML = '';
        p.combinacoes.precos.forEach(c => {
            const div = document.createElement('div');
            div.className = "flex gap-2 items-center item-combinacao";
            div.innerHTML = `
                <input type="text" readonly value="${c.op1}" class="c-op1 w-1/3 p-2 border border-purple-200 rounded text-xs bg-white outline-none font-bold text-slate-600" />
                <input type="text" readonly value="${c.op2}" class="c-op2 w-1/3 p-2 border border-purple-200 rounded text-xs bg-white outline-none font-bold text-slate-600" />
                <input type="number" placeholder="Preço R$" value="${c.preco}" class="c-preco w-1/3 p-2 border border-purple-200 rounded font-bold text-purple-700 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
            `;
            container.appendChild(div);
        });
    } else {
        document.getElementById('combNome1').value = '';
        document.getElementById('combNome2').value = '';
        document.getElementById('combValores1').value = '';
        document.getElementById('combValores2').value = '';
        document.getElementById('listaGradeCombinacoes').innerHTML = '';
    }

    ajustarCamposProduto();
    atualizarListaAcabamentosProduto(p.acabamentos ||[]);
    mudarSubAba('sub-prod', document.querySelectorAll('.sub-aba-btn')[1]);
}

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
    
    // Limpa o campo de nome do arquivo
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

    // Pega o nome do arquivo se o usuário digitou
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
    
    const totalPedido = (sub + frete) - desconto;
    const saldo = totalPedido - pago;
    
    document.getElementById('totalCarrinho').innerText = "R$ " + totalPedido.toFixed(2);
    document.getElementById('cartSaldoDevedor').innerText = "R$ " + saldo.toFixed(2);
}

async function enviarPedido(imprimir = false) {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    
    const idCli = document.getElementById('cartClienteId').value;
    const nomeCliInput = document.getElementById('cartClienteInput').value;
    const total = parseFloat(document.getElementById('totalCarrinho').innerText.replace("R$ ",""));
    const pago = parseFloat(document.getElementById('cartValorPago').value) || 0;
    const desconto = parseFloat(document.getElementById('cartDesconto').value) || 0;
    const saldo = total - pago;
    const statusInicial = saldo > 0 ? "Aguardando pagamento" : "Em produção";

    const pedido = {
        clienteId: idCli || "Consumidor Final",
        clienteNome: idCli ? bdClientes.find(x => x.id === idCli).nome : (nomeCliInput || "Consumidor Final"),
        itens: carrinho,
        total: total,
        desconto: desconto,
        valorPago: pago,
        saldoDevedor: saldo,
        data: new Date(),
        status: statusInicial,
        arquivado: false
    };
    
    const docRef = await db.collection("pedidos").add(pedido);
    
    if (idCli && document.getElementById('cartPagamento').value === "Saldo_Cliente") {
        const c = bdClientes.find(x => x.id === idCli);
        await db.collection("clientes").doc(idCli).update({ credito: (c.credito || 0) - pago });
    }
    
    alert("PEDIDO SALVO!");
    carrinho =[]; 
    document.getElementById('cartValorPago').value = 0; 
    document.getElementById('cartDesconto').value = 0; 
    renderCarrinho();
    
    if(imprimir) imprimirReciboDireto(docRef.id, pedido);
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
        const dataObj = p.data.toDate ? p.data.toDate() : new Date(p.data);
        const dataStr = dataObj.toISOString().split('T')[0];
        
        if (dataStr === dataSelecionada && p.valorPago > 0) {
            entradasTotal += p.valorPago;
            transacoes.push({
                dataObj: dataObj,
                desc: `Pedido: ${p.clienteNome}`,
                tipo: 'entrada',
                valor: p.valorPago,
                id: p.id
            });
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
            <td class="p-4 font-bold text-slate-700">${t.desc}</td>
            <td class="p-4 font-black text-right ${t.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}">
                ${t.tipo === 'entrada' ? '+' : '-'} R$ ${t.valor.toFixed(2)}
                ${t.tipo === 'entrada' ? `<button onclick="abrirDetalhesPedido('${t.id}')" class="ml-3 text-indigo-400 hover:text-indigo-600" title="Ver Detalhes do Pedido"><i class="fa fa-eye"></i></button>` : ''}
                ${t.tipo === 'saida' ? `<button onclick="excluirDespesa('${t.id}')" class="ml-3 text-red-300 hover:text-red-600" title="Excluir Saída"><i class="fa fa-trash"></i></button>` : ''}
            </td>
        </tr>
    `).join('');
}

function abrirDetalhesPedido(id) {
    const p = bdPedidos.find(x => x.id === id);
    if(!p) return;
    
    const dataFormatada = p.data.toDate ? p.data.toDate().toLocaleString('pt-BR') : new Date(p.data).toLocaleString('pt-BR');
    
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
        
        <div class="space-y-1 border-t border-slate-100 pt-4">
            <div class="flex justify-between text-xs font-bold text-slate-500"><span>Subtotal:</span> <span>R$ ${(p.total + (p.desconto || 0)).toFixed(2)}</span></div>
            ${p.desconto > 0 ? `<div class="flex justify-between text-xs font-bold text-red-500"><span>Desconto:</span> <span>- R$ ${p.desconto.toFixed(2)}</span></div>` : ''}
            <div class="flex justify-between text-sm font-black text-slate-800 mt-1"><span>Total:</span> <span>R$ ${p.total.toFixed(2)}</span></div>
            <div class="flex justify-between text-xs font-bold text-emerald-600 mt-1"><span>Valor Pago:</span> <span>R$ ${(p.valorPago || 0).toFixed(2)}</span></div>
            <div class="flex justify-between text-xs font-bold text-red-500 mt-1"><span>Saldo Devedor:</span> <span>R$ ${(p.saldoDevedor || 0).toFixed(2)}</span></div>
        </div>
        
        <div class="mt-6 flex gap-2">
            <button type="button" onclick="imprimirRecibo('${p.id}')" class="flex-1 bg-indigo-600 text-white py-3 rounded font-bold text-xs hover:bg-indigo-700 transition uppercase tracking-widest shadow-md"><i class="fa fa-print"></i> Reimprimir Recibo</button>
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

function toggleOpcoesPagamento() { document.getElementById('divParcelas').style.display = (document.getElementById('cartPagamento').value === 'Credito_Parcelado') ? 'block' : 'none'; }
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
