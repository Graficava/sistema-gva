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

// ACESSO E ABAS
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
    const titulos = { cliente: "Catálogo", carrinho: "Orçamento", loja: "Produção", caixa: "Financeiro", admin: "Configurações" };
    document.getElementById('tituloPagina').innerText = titulos[aba];
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('aba' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('btn' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
}

function iniciarSincronizacao() {
    db.collection("categorias").onSnapshot(snap => {
        categorias = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarMenus();
        renderizarListaCategorias();
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

// GESTÃO ADMIN: EDITAR E SALVAR
async function salvarNovoProduto() {
    const id = document.getElementById('editId').value;
    const dados = {
        sku: document.getElementById('adminSku').value,
        nome: document.getElementById('adminNome').value,
        preco: parseFloat(document.getElementById('adminPreco').value),
        categoria: document.getElementById('adminCatSelect').value,
        tipo: document.getElementById('adminTipo').value,
        img: document.getElementById('adminImg').value
    };
    if(id) await db.collection("catalogo").doc(id).update(dados);
    else await db.collection("catalogo").add(dados);
    limparFormAdmin(); alert("Salvo!");
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

async function salvarCategoria() {
    const id = document.getElementById('editCatId')?.value;
    const nome = document.getElementById('catNome').value;
    if(!nome) return;
    if(id) await db.collection("categorias").doc(id).update({nome});
    else await db.collection("categorias").add({nome});
    document.getElementById('catNome').value = "";
    if(document.getElementById('editCatId')) document.getElementById('editCatId').value = "";
    document.getElementById('btnSalvarCat').innerText = "Salvar Categoria";
}

function editarCategoria(id) {
    const c = categorias.find(i => i.id === id);
    if(!document.getElementById('editCatId')) {
        const input = document.createElement("input");
        input.type = "hidden"; input.id = "editCatId";
        document.getElementById('subAdminMenus').appendChild(input);
    }
    document.getElementById('editCatId').value = c.id;
    document.getElementById('catNome').value = c.nome;
    document.getElementById('btnSalvarCat').innerText = "Atualizar Categoria";
}

async function salvarAcabamento() {
    const id = document.getElementById('editAcabId').value;
    const nome = document.getElementById('acabNome').value;
    const preco = parseFloat(document.getElementById('acabPreco').value);
    if(!nome) return;
    if(id) await db.collection("acabamentos").doc(id).update({nome, preco});
    else await db.collection("acabamentos").add({nome, preco});
    document.getElementById('acabNome').value = ""; document.getElementById('acabPreco').value = "";
    document.getElementById('editAcabId').value = "";
    document.getElementById('btnSalvarAcab').innerText = "Salvar";
}

function editarAcabamento(id) {
    const a = acabamentos.find(i => i.id === id);
    document.getElementById('editAcabId').value = a.id;
    document.getElementById('acabNome').value = a.nome;
    document.getElementById('acabPreco').value = a.preco;
    document.getElementById('btnSalvarAcab').innerText = "Atualizar";
}

// NOTA EM 2 VIAS
function imprimirCupom(index) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[index];
    const doc = new jsPDF({ format: [80, 280] });

    function desenharVia(y, titulo) {
        doc.setFontSize(10); doc.text("GVA VENOM ARTS", 40, y, null, null, "center");
        doc.setFontSize(7); doc.text("CNPJ: 17.184.159/0001-06", 40, y+4, null, null, "center");
        doc.text(titulo, 40, y+8, null, null, "center");
        doc.line(5, y+10, 75, y+10);
        doc.text(`Cliente: ${p.cliente}`, 5, y+14);
        if(p.motoboy > 0) doc.text(`Entrega: ${p.end || '---'} | CEP: ${p.cep || '---'}`, 5, y+18);
        let currentY = y+22;
        p.itens.forEach(i => { doc.text(`- ${i.nome}: R$ ${i.total.toFixed(2)}`, 5, currentY); currentY += 4; });
        doc.text(`TOTAL: R$ ${p.total.toFixed(2)}`, 75, currentY, null, null, "right");
        return currentY + 15;
    }

    let proximoY = desenharVia(10, "VIA DO CLIENTE");
    doc.line(0, proximoY-8, 80, proximoY-8);
    desenharVia(proximoY, "VIA DA PRODUÇÃO");
    window.open(doc.output('bloburl'), '_blank');
}

// (Funções de produção, catálogo e medidas permanecem as mesmas, garantindo a integração)
function toggleAdminSub(s) {
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.sub-nav-gva button').forEach(b => b.classList.remove('sub-active'));
    document.getElementById('subAdmin' + s.charAt(0).toUpperCase() + s.slice(1)).style.display = 'block';
    document.getElementById('subBtn' + s.charAt(0).toUpperCase() + s.slice(1)).classList.add('sub-active');
}

function renderizarListaAdmin() {
    const div = document.getElementById('listaGerenciarProdutos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>SKU</th><th>Nome</th><th>Ações</th></tr></thead><tbody>` + 
        bancoDeDados.map(p => `<tr><td>${p.sku || '--'}</td><td>${p.nome}</td><td><button class="btn-mini" onclick="editarProduto('${p.id}')">Editar</button><button class="btn-mini" style="color:red" onclick="excluirItem('catalogo', '${p.id}')">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

function renderizarListaCategorias() {
    const div = document.getElementById('listaGerenciarCategorias');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>Categoria</th><th>Ações</th></tr></thead><tbody>` + 
        categorias.map(c => `<tr><td>${c.nome}</td><td><button class="btn-mini" onclick="editarCategoria('${c.id}')">Editar</button><button class="btn-mini" style="color:red" onclick="excluirItem('categorias', '${c.id}')">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

function renderizarListaAcabamentos() {
    const div = document.getElementById('listaGerenciarAcabamentos');
    div.innerHTML = `<table class="wp-table"><thead><tr><th>Acabamento</th><th>Ações</th></tr></thead><tbody>` + 
        acabamentos.map(a => `<tr><td>${a.nome}</td><td><button class="btn-mini" onclick="editarAcabamento('${a.id}')">Editar</button><button class="btn-mini" style="color:red" onclick="excluirItem('acabamentos', '${a.id}')">Excluir</button></td></tr>`).join('') + `</tbody></table>`;
}

function excluirItem(coll, id) { if(confirm("Deseja excluir?")) db.collection(coll).doc(id).delete(); }

// ... (Outras funções auxiliares mantidas para funcionamento completo)
