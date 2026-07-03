// Veri*Factu — Invoice Detail Page

// Module-scope para que fetchInvoice pueda reutilizarla en el catch
// (antes se referenciaba una variable inexistente y rompía el manejo de error)
let allCompanies = [];

document.addEventListener('DOMContentLoaded', async () => {
    const invoiceId = getParam('id');
    const companyId = getParam('company_id');

    if (!invoiceId || !companyId) {
        document.getElementById('app').innerHTML = emptyState('Se requiere el identificador de factura y de empresa.');
        return;
    }

    // Save as selected company
    setSelectedCompany(companyId);

    // Load companies first for navbar
    try {
        allCompanies = await apiFetch('/api/companies');
    } catch (err) {
        console.error('Error loading companies:', err);
    }

    document.getElementById('app').innerHTML = navbarHTML('companies', allCompanies, parseInt(companyId));

    fetchInvoice(companyId, invoiceId, allCompanies);
});

async function fetchInvoice(companyId, invoiceId, allCompanies) {
    try {
        const [invoice, company] = await Promise.all([
            apiFetch(`/api/${companyId}/invoices/${invoiceId}`),
            apiFetch(`/api/${companyId}`),
        ]);

        renderInvoice(companyId, invoiceId, invoice, company);
    } catch (err) {
        document.getElementById('app').innerHTML = navbarHTML('companies', allCompanies || [], parseInt(companyId)) +
            `<section class="section"><div class="container"><div class="notification is-danger"><span class="icon"><i class="fas fa-circle-exclamation"></i></span> Error al cargar la factura: ${escapeHtml(err.message)}</div></div></section>`;
    }
}

function renderInvoice(companyId, invoiceId, inv, company) {
    const app = document.getElementById('app');

    // Status badge
    let statusHTML = '';
    let statusClass = '';
    let statusText = '';
    let statusExtra = '';

    if (inv.voided) {
        statusClass = 'is-danger';
        statusText = 'Anulada';
    } else if (!inv.verifactu_dt) {
        statusClass = 'is-warning';
        statusText = 'No enviada';
        statusExtra = `
            <div class="mt-3">
                <a href="/frontend/process.html?company_id=${companyId}" class="button is-warning is-small">Enviar ahora</a>
            </div>`;
    } else if (inv.verifactu_err != null && inv.verifactu_err !== 0) {
        statusClass = 'is-danger';
        statusText = 'Error en envío';
        statusExtra = `<div class="mt-2 has-text-danger"><small>Código de error AEAT: <strong>${escapeHTML(inv.verifactu_err)}</strong></small></div>`;
    } else {
        statusClass = 'is-success';
        statusText = 'Enviada correctamente';
        statusExtra = `
            <div class="mt-2">
                <p class="has-text-grey">CSV: <code>${escapeHTML(inv.verifactu_csv || '—')}</code></p>
                <p class="has-text-grey mt-1">Fecha envío: ${formatDate(inv.verifactu_dt)}</p>
            </div>`;
    }

    // Rectification buttons (only if NOT voided AND verifactu_dt is null)
    let rectButtonsHTML = '';
    const isSent = !!inv.verifactu_dt;
    const isVoided = !!inv.voided;
    const type = inv.verifactu_type || '';

    if (!isVoided && !isSent) {
        const btnClass = 'button is-small is-outlined';
        if (type === 'F1' || type === 'F3') {
            rectButtonsHTML = `
                <button class="${btnClass} rect-btn" data-action="rect">Rectificación por integración</button>
                <button class="${btnClass} rect-btn" data-action="rect2">Rectificación R2</button>
                <button class="${btnClass} rect-btn" data-action="rectsust">Rectificación por sustitución</button>
            `;
        } else if (type === 'F2') {
            rectButtonsHTML = `
                <button class="${btnClass} rect-btn" data-action="rect">Rectificación por integración</button>
                <button class="${btnClass} rect-btn" data-action="sust">Sustitutiva</button>
                <button class="${btnClass} rect-btn" data-action="rectsust">Rectificación por sustitución</button>
            `;
        } else if (type === 'R1' || type === 'R5') {
            rectButtonsHTML = `
                <button class="${btnClass} rect-btn" data-action="rectsust">Rectificación por sustitución</button>
            `;
        }
    }

    // Anular button (only if NOT voided AND NOT yet sent)
    let voidButtonHTML = '';
    if (!isVoided && !isSent) {
        voidButtonHTML = `
            <button class="button is-danger is-outlined is-small void-btn">
                <span class="icon is-small"><i class="fas fa-ban"></i></span>
                <span>Anular</span>
            </button>
        `;
    }

    // Invoice ref line
    let invoiceRefHTML = '';
    if (inv.invoice_ref) {
        invoiceRefHTML = `<p class="is-size-7 has-text-grey mt-2">Factura rectificada/sustituida de: ${escapeHTML(inv.invoice_ref)}</p>`;
    }

    // Lines table
    let linesRows = '';
    if (inv.lines && inv.lines.length > 0) {
        linesRows = inv.lines.map(line => `
            <tr>
                <td>${escapeHTML(line.descr)}</td>
                <td>${line.units}</td>
                <td class="has-text-right">${formatEUR(line.price)}</td>
                <td class="has-text-right">${formatEUR(line.bi)}</td>
                <td class="has-text-right">${line.vat}%</td>
                <td class="has-text-right">${formatEUR(line.tvat)}</td>
                <td class="has-text-right"><strong>${formatEUR(line.total)}</strong></td>
            </tr>
        `).join('');
    } else {
        linesRows = `<tr><td colspan="7" class="has-text-centered has-text-grey">Sin líneas</td></tr>`;
    }

    // QR Code
    const qrSrc = `/api/${companyId}/invoices/${invoiceId}/qr`;

    // Company address line
    const companyAddr = [company.address, company.postal_code, company.city, company.country]
        .filter(Boolean).join(', ');

    const html = `
    <section class="section">
        <div class="container">
            <!-- Header -->
            <div class="mb-5">
                <a href="/frontend/invoices.html?company_id=${companyId}" class="button is-small is-light mb-3">← Volver</a>
                <div class="is-flex is-align-items-center is-flex-wrap-wrap is-justify-content-space-between">
                    <div>
                        <h1 class="is-size-2">Factura ${escapeHTML(inv.number_format)}</h1>
                        ${invoiceRefHTML}
                    </div>
                    <button class="button is-primary is-small" id="downloadPdfBtn" style="white-space:nowrap;">
                        <span class="icon is-small"><i class="fas fa-file-pdf"></i></span>
                        <span>Descargar PDF</span>
                    </button>
                </div>
                <div class="is-flex mt-2">
                    <span class="tag ${type === 'F1' || type === 'F3' ? 'is-info' : type === 'F2' ? 'is-warning' : type === 'R1' || type === 'R5' ? 'is-dark' : 'is-light'}">${escapeHTML(type || '—')}</span>
                    <span class="tag is-light ml-2">${formatDate(inv.dt)}</span>
                </div>
            </div>

            <!-- Status -->
            <div class="mb-5">
                <span class="tag ${statusClass} is-medium">${statusText}</span>
                ${statusExtra}
            </div>

            <div class="columns">
                <!-- Left: Client + Lines -->
                <div class="column is-two-thirds">
                    <!-- Client Data -->
                    <div class="box mb-5">
                        <h2 class="is-size-4 mb-4">Datos del Cliente</h2>
                        <table class="table is-fullwidth is-narrow">
                            <tr><td class="is-vcentered has-text-weight-bold">Nombre</td><td>${escapeHTML(inv.name || '—')}</td></tr>
                            <tr><td class="is-vcentered has-text-weight-bold">VAT ID</td><td>${escapeHTML(inv.vat_id || '—')}</td></tr>
                            <tr><td class="is-vcentered has-text-weight-bold">Dirección</td><td>${escapeHTML(inv.address || '—')}</td></tr>
                            <tr><td class="is-vcentered has-text-weight-bold">C.P.</td><td>${escapeHTML(inv.postal_code || '—')}</td></tr>
                            <tr><td class="is-vcentered has-text-weight-bold">Ciudad</td><td>${escapeHTML(inv.city || '—')}</td></tr>
                            <tr><td class="is-vcentered has-text-weight-bold">País</td><td>${escapeHTML(inv.country || '—')}</td></tr>
                            <tr><td class="is-vcentered has-text-weight-bold">Email</td><td>${escapeHTML(inv.email || '—')}</td></tr>
                        </table>
                    </div>

                    <!-- Lines -->
                    <h2 class="is-size-4 mb-4">Líneas de Factura</h2>
                    <div class="table-container mb-5">
                        <table class="table is-fullwidth is-striped">
                            <thead>
                                <tr>
                                    <th>Descripción</th>
                                    <th>Unidades</th>
                                    <th class="has-text-right">Precio</th>
                                    <th class="has-text-right">Subtotal</th>
                                    <th class="has-text-right">IVA%</th>
                                    <th class="has-text-right">IVA</th>
                                    <th class="has-text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${linesRows}
                            </tbody>
                        </table>
                    </div>

                    <!-- Summary -->
                    <div class="box mb-5">
                        <h2 class="is-size-4 mb-4">Resumen</h2>
                        <table class="table is-fullwidth is-narrow">
                            <tr><td class="has-text-weight-bold">Base imponible</td><td class="has-text-right"><strong>${formatEUR(inv.bi)}</strong></td></tr>
                            <tr><td class="has-text-weight-bold">Cuota IVA</td><td class="has-text-right"><strong>${formatEUR(inv.tvat)}</strong></td></tr>
                            <tr class="is-size-5"><td class="has-text-weight-bold">Total</td><td class="has-text-right"><strong>${formatEUR(inv.total)}</strong></td></tr>
                        </table>
                    </div>

                    <!-- Actions -->
                    ${(voidButtonHTML || rectButtonsHTML) ? `<div class="buttons mb-5">${voidButtonHTML}${rectButtonsHTML}</div>` : ''}
                </div>

                <!-- Right: QR -->
                <div class="column">
                    <div class="box has-text-centered">
                        <h2 class="is-size-4 mb-4">Código QR</h2>
                        <img src="${qrSrc}" alt="QR Code" style="max-width:220px; width:100%;">
                        <p class="is-size-7 has-text-grey mt-3">Escanea para verificar la factura</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
    `;

    app.innerHTML += html;

    // Attach event listeners
    attachActionHandlers(companyId, invoiceId, inv);

    // Download PDF button
    const pdfBtn = document.getElementById('downloadPdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            generatePdf(companyId, invoiceId, inv, company, qrSrc);
        });
    }
}

function attachActionHandlers(companyId, invoiceId, inv) {
    // Void button
    const voidBtn = document.querySelector('.void-btn');
    if (voidBtn) {
        voidBtn.addEventListener('click', () => {
            openModal(
                'Confirmar anulación',
                `<p>¿Está seguro de que desea anular esta factura? Esta acción no se puede deshacer.</p>`,
                async () => {
                    try {
                        await apiFetch(`/api/${companyId}/invoices/${invoiceId}/voided`, {
                            method: 'POST',
                        });
                        showToast('Factura anulada correctamente', 'is-success');
                        window.location.reload();
                    } catch (err) {
                        showToast(`Error: ${err.message}`, 'is-danger');
                    }
                },
                'Anular'
            );
        });
    }

    // Rectification buttons
    document.querySelectorAll('.rect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const actionLabels = {
                rect: 'Rectificación por integración',
                rect2: 'Rectificación R2',
                rectsust: 'Rectificación por sustitución',
                sust: 'Sustitutiva',
            };
            const endpoints = {
                rect: `/api/${companyId}/invoices/${invoiceId}/rect`,
                rect2: `/api/${companyId}/invoices/${invoiceId}/rect2`,
                rectsust: `/api/${companyId}/invoices/${invoiceId}/rectsust`,
                sust: `/api/${companyId}/invoices/${invoiceId}/sust`,
            };
            openModal(
                'Confirmar rectificación',
                `<p>¿Desea crear una ${actionLabels[action] || 'rectificación'} para esta factura?</p>`,
                async () => {
                    try {
                        await apiFetch(endpoints[action], {
                            method: 'POST',
                        });
                        showToast('Rectificación creada correctamente', 'is-success');
                        window.location.href = `/frontend/invoice.html?company_id=${companyId}`;
                    } catch (err) {
                        showToast(`Error: ${err.message}`, 'is-danger');
                    }
                },
                'Confirmar'
            );
        });
    });
}

function escapeHTML(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Generate and download invoice PDF using jsPDF.
 * Layout: A4 with generous spacing, clear visual hierarchy.
 */
async function generatePdf(companyId, invoiceId, inv, company, qrSrc) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const pageW = 210;
    const pageH = 297;
    const MX = 15;            // margin X
    const MY = 12;            // margin Y
    const contentW = pageW - 2 * MX;
    const colGap = 8;
    const colW = (contentW - colGap) / 2;
    const leftX = MX;
    const rightX = MX + colW + colGap;

    // ── Palette (design system backoffice) ──
    const C = {
        green:     [13, 148, 136],    // --color-primary #0d9488
        greenDark: [15, 118, 110],    // --color-primary-dark #0f766e
        dark:      [30, 41, 59],      // --color-dark #1e293b
        text:      [51, 65, 85],      // --color-text #334155
        grey:      [100, 116, 139],   // --color-text-light #64748b
        lightGrey: [248, 250, 252],   // --color-bg-soft #f8fafc
        midGrey:   [226, 232, 240],   // --color-border #e2e8f0
        white:     [255, 255, 255],
        bg:        [240, 253, 250],   // --color-bg-accent #f0fdfa
    };

    /** Draw a rounded-ish background box */
    function box(x, y, w, h, color) {
        doc.setFillColor(...color);
        doc.roundedRect(x, y, w, h, 2, 2, 'F');
    }

    /** Section label (small caps style) */
    function sectionLabel(text, x, y) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.green);
        doc.text(text.toUpperCase(), x, y);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. HEADER BAR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    doc.setFillColor(...C.green);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    // Nombre comercial (o razón social como fallback) en la barra de cabecera
    const headerText = String(company.trade_name || company.name || 'Veri*Factu');
    const maxHeaderW = pageW - 2 * MX - 35; // reserva espacio para "FACTURA" + margen
    let headerSize = 16;
    doc.setFont('helvetica', 'bold');
    do {
        doc.setFontSize(headerSize);
        if (doc.getTextWidth(headerText) <= maxHeaderW) break;
        headerSize -= 1;
    } while (headerSize > 9);
    let fittedText = headerText;
    if (doc.getTextWidth(fittedText) > maxHeaderW) {
        while (fittedText.length > 0 && doc.getTextWidth(fittedText + '…') > maxHeaderW) {
            fittedText = fittedText.slice(0, -1);
        }
        fittedText += '…';
    }
    doc.text(fittedText, MX, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('FACTURA', pageW - MX, 14, { align: 'right' });

    let y = MY + 24; // cursor after header

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. COMPANY + CLIENT side-by-side
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const addrBoxH = 38;
    box(leftX, y, colW, addrBoxH, C.lightGrey);
    box(rightX, y, colW, addrBoxH, C.lightGrey);

    // Company
    sectionLabel('Emisor', leftX + 4, y + 6);
    doc.setTextColor(...C.dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name || '', leftX + 4, y + 13);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.grey);
    const coLines = [
        company.vat_id ? `NIF: ${company.vat_id}` : '',
        company.address || '',
        [company.postal_code, company.city].filter(Boolean).join(', '),
        company.country && company.country !== 'ES' ? company.country : '',
        company.email || '',
        company.phone || '',
    ].filter(Boolean);
    coLines.forEach((line, i) => doc.text(line, leftX + 4, y + 19 + i * 4.5));

    // Client
    sectionLabel('Cliente', rightX + 4, y + 6);
    doc.setTextColor(...C.dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(inv.name || '', rightX + 4, y + 13);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.grey);
    const clLines = [
        inv.vat_id ? `NIF: ${inv.vat_id}` : '',
        inv.address || '',
        [inv.postal_code, inv.city].filter(Boolean).join(', '),
        inv.country && inv.country !== 'ES' ? inv.country : '',
        inv.email || '',
    ].filter(Boolean);
    clLines.forEach((line, i) => doc.text(line, rightX + 4, y + 19 + i * 4.5));

    y += addrBoxH + 10;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. INVOICE META (number, date, type, status)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const metaH = 14;
    box(leftX, y, contentW, metaH, C.lightGrey);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(`Factura: ${inv.number_format}`, leftX + 6, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.grey);
    doc.text(`Fecha: ${formatDate(inv.dt)}`, leftX + 6 + doc.getTextWidth(`Factura: ${inv.number_format}`) + 8, y + 7);

    y += metaH + 10;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. ITEMS TABLE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    sectionLabel('Detalle', leftX, y - 3);

    const tableData = (inv.lines || []).map(line => [
        line.descr || '',
        String(line.units || 0),
        formatEUR(line.price),
        formatEUR(line.bi),
        `${line.vat || 0}%`,
        formatEUR(line.tvat),
        formatEUR(line.total),
    ]);

    doc.autoTable({
        startY: y + 2,
        margin: { left: MX, right: MX },
        head: [['Descripción', 'Uds.', 'Precio', 'Base', 'IVA %', 'IVA €', 'Total']],
        body: tableData.length > 0 ? tableData : [['—', '', '', '', '', '', '']],
        theme: 'striped',
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: C.midGrey,
            lineWidth: 0.2,
            textColor: C.dark,
            valign: 'middle',
        },
        headStyles: {
            fillColor: C.green,
            textColor: C.white,
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: 3.5,
        },
        alternateRowStyles: {
            fillColor: C.bg,
        },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { halign: 'right', cellWidth: 14 },
            2: { halign: 'right', cellWidth: 22 },
            3: { halign: 'right', cellWidth: 24 },
            4: { halign: 'right', cellWidth: 16 },
            5: { halign: 'right', cellWidth: 24 },
            6: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
        },
    });

    const tableBottom = doc.lastAutoTable.finalY;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. TOTALS (right side, boxed)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const totalsW = 80;
    const totalsX = pageW - MX - totalsW;
    const totalsY = tableBottom + 8;
    const totalsH = 34;

    box(totalsX, totalsY, totalsW, totalsH, C.lightGrey);

    const txLabel = totalsX + 6;
    const txValue = totalsX + totalsW - 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.grey);
    doc.text('Base imponible', txLabel, totalsY + 8);
    doc.setTextColor(...C.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(formatEUR(inv.bi), txValue, totalsY + 8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.grey);
    doc.text('IVA', txLabel, totalsY + 16);
    doc.setTextColor(...C.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(formatEUR(inv.tvat), txValue, totalsY + 16, { align: 'right' });

    // Separator line
    doc.setDrawColor(...C.green);
    doc.setLineWidth(0.6);
    doc.line(txLabel, totalsY + 21, txValue, totalsY + 21);

    // Total
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text('TOTAL', txLabel, totalsY + 29);
    doc.text(formatEUR(inv.total), txValue, totalsY + 29, { align: 'right' });

    const sectionAfterTable = totalsY + totalsH + 10;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6. FOOTER: Payment info (left) + QR (right)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const footerY = sectionAfterTable;
    const qrSize = 28;
    const footerBoxH = qrSize + 16;

    box(leftX, footerY, contentW, footerBoxH, C.lightGrey);

    // Payment info
    sectionLabel('Forma de pago', leftX + 6, footerY + 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.text('Transferencia bancaria vía Stripe', leftX + 6, footerY + 15);
    doc.setTextColor(...C.grey);
    doc.setFontSize(7);
    doc.text('Pagado', leftX + 6, footerY + 21);

    // QR code
    try {
        const imgData = await fetch(qrSrc).then(r => r.arrayBuffer());
        const qrBase64 = arrayBufferToBase64(imgData);
        const qrX = pageW - MX - qrSize - 6;
        const qrY = footerY + (footerBoxH - qrSize) / 2;
        doc.addImage(qrBase64, 'PNG', qrX, qrY, qrSize, qrSize);
        doc.setFontSize(6);
        doc.setTextColor(...C.grey);
        doc.text('Verificar en AEAT', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });
    } catch (e) {
        doc.setFontSize(7);
        doc.setTextColor(...C.grey);
        doc.text('QR no disponible', pageW - MX - 30, footerY + footerBoxH / 2);
    }

    doc.save(`factura_${inv.number_format}.pdf`);
}

/** Convert ArrayBuffer to base64 for jsPDF addImage */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}
