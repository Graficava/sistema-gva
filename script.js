// ... (Configurações do Firebase permanecem iguais)

// FUNÇÃO PARA GERAR O CUPOM DE 80mm EM 2 VIAS
function imprimirCupom(index) {
    const { jsPDF } = window.jspdf;
    const p = pedidosGVA[index];
    // Criamos um documento mais longo para caber as 2 vias
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 280] });

    function desenharVia(yInicial, tituloVia) {
        let y = yInicial;
        
        // Cabeçalho GVA
        doc.setFontSize(10); doc.setFont("helvetica", "bold");
        doc.text("GVA • VENOM ARTS", 40, y, null, null, "center");
        doc.setFontSize(7); doc.setFont("helvetica", "normal");
        doc.text("CNPJ: 17.184.159/0001-06", 40, y + 4, null, null, "center");
        doc.text("Rua Lopes Trovão, 474 - Icaraí - Niterói", 40, y + 7, null, null, "center");
        doc.text("Zap: (21) 99993-0190", 40, y + 10, null, null, "center");
        
        y += 14;
        doc.setFont("helvetica", "bold");
        doc.text(`--- ${tituloVia} ---`, 40, y, null, null, "center");
        
        y += 6;
        doc.setFontSize(8);
        doc.text("CLIENTE:", 5, y); doc.setFont("helvetica", "normal"); doc.text(p.cliente.toUpperCase(), 20, y);
        y += 4;
        doc.setFont("helvetica", "bold"); doc.text("DATA:", 5, y); doc.setFont("helvetica", "normal"); doc.text(p.dataCriacao, 15, y);
        
        // LÓGICA MOTOBOY: ANEXAR ENDEREÇO
        if (p.motoboy > 0) {
            y += 5;
            doc.setFillColor(240, 240, 240);
            doc.rect(5, y - 1, 70, 12, 'F');
            doc.setFont("helvetica", "bold"); doc.text("ENTREGA MOTOBOY", 7, y + 3);
            doc.setFontSize(7); doc.setFont("helvetica", "normal");
            doc.text(`End: ${p.end || 'Não informado'}`, 7, y + 6);
            doc.text(`CEP: ${p.cep || '---'}`, 7, y + 9);
            y += 12;
        }

        y += 4;
        doc.line(5, y, 75, y);
        y += 5;
        
        // Itens
        p.itens.forEach(item => {
            doc.setFont("helvetica", "bold");
            doc.text(item.nome.substring(0, 28), 5, y);
            doc.text(item.total.toFixed(2), 75, y, null, null, "right");
            y += 4;
            doc.setFontSize(6); doc.setFont("helvetica", "italic");
            doc.text(`Det: ${item.detalhes}`, 5, y);
            y += 5;
            doc.setFontSize(8);
        });

        doc.line(5, y, 75, y);
        y += 5;
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL DO PEDIDO:", 5, y); doc.text("R$ " + p.total.toFixed(2), 75, y, null, null, "right");
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.text("SINAL PAGO:", 5, y); doc.text("R$ " + p.sinal.toFixed(2), 75, y, null, null, "right");
        y += 5;
        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.text("RESTANTE:", 5, y); doc.text("R$ " + p.restante.toFixed(2), 75, y, null, null, "right");
        
        return y + 15; // Retorna a posição para a próxima via
    }

    // Gerar as 2 Vias
    let proximoY = desenharVia(10, "VIA DO CLIENTE");
    doc.setLineDashPattern([2, 2], 0); // Linha pontilhada para corte
    doc.line(0, proximoY - 8, 80, proximoY - 8);
    desenharVia(proximoY, "VIA DA PRODUÇÃO");

    window.open(doc.output('bloburl'), '_blank');
}

// CORREÇÃO DO RODAPÉ NO SCRIPT PARA MANTER CONSISTÊNCIA
function atualizarRodapeGVA() {
    const footer = document.querySelector('.main-footer');
    if(footer) {
        footer.innerHTML = `
            <div class="footer-grid">
                <div class="footer-box">
                    <b>GVA • Gráfica Venom Arts LTDA</b><br>
                    CNPJ: 17.184.159/0001-06<br>
                    Rua Lopes Trovão, nº 474 - Lojas 201 e 202<br>
                    Icaraí - Niterói - RJ | CEP 24220-071
                </div>
                <div class="footer-box text-center">
                    <i class="fab fa-whatsapp"></i> 21 99993-0190<br>
                    <i class="far fa-envelope"></i> contato@graficava.com.br<br>
                    <b>@grafica.venomarts | @graficava</b>
                </div>
                <div class="footer-box text-right">
                    <b>Horário de Funcionamento:</b><br>
                    Segunda a Sexta: 10h às 16h<br>
                    Sábado: 10h às 14h
                </div>
            </div>`;
    }
}
