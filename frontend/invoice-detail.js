// Veri*Factu — Invoice Detail Page

document.addEventListener('DOMContentLoaded', () => {
    const invoiceId = getParam('id');
    const companyId = getParam('company_id');

    if (!invoiceId || !companyId) {
        document.getElementById('app').innerHTML = emptyState('Invoice ID and Company ID are required.');
        return;
    }

    document.getElementById('app').innerHTML = navbarHTML('companies');

    fetchInvoice(companyId, invoiceId);
});

async function fetchInvoice(companyId, invoiceId) {
    try {
        const [invoice, company] = await Promise.all([
            apiFetch(`/api/${companyId}/invoices/${invoiceId}`),
            apiFetch(`/api/${companyId}`),
        ]);
        renderInvoice(companyId, invoiceId, invoice, company);
    } catch (err) {
        document.getElementById('app').innerHTML = navbarHTML('companies') +
            `<section class="section"><div class="container"><div class="notification is-danger">Error loading invoice: ${err.message}</div></div></section>`;
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
        statusExtra = `<div class="mt-2 has-text-danger"><small>${escapeHTML(inv.verifactu_err)}</small></div>`;
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
        const btnClass = 'button is-small is-outlined mt-2';
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
            <button class="button is-danger is-outlined is-small mt-2 void-btn">Anular</button>
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
                <a href="/frontend/invoice.html?company_id=${companyId}" class="button is-small is-light mb-3">← Volver</a>
                <div class="is-flex is-align-items-center is-flex-wrap-wrap is-justify-content-space-between">
                    <div>
                        <h1 class="is-size-2">Factura ${escapeHTML(inv.number_format)}</h1>
                        ${invoiceRefHTML}
                    </div>
                    <button class="button is-primary is-small" id="downloadPdfBtn" style="white-space:nowrap;">
                        ⬇ Descargar PDF
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
                    <div class="mb-5">
                        ${voidButtonHTML}
                        ${rectButtonsHTML}
                    </div>
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
 * Layout: A4 single page.
 *   Top-left: issuing company data.
 *   Top-right: client data.
 *   Bottom: items table + totals + QR + payment info.
 */
async function generatePdf(companyId, invoiceId, inv, company, qrSrc) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const pageW = 210;
    const pageH = 297;
    const colW = (pageW - 20) / 2; // 10mm margins, two columns
    const leftX = 10;
    const rightX = 10 + colW + 5;
    const bodyTop = 60;

    // ── Colors ──
    const dark = [40, 40, 40];
    const grey = [120, 120, 120];
    const lightGrey = [235, 235, 235];
    const green = [72, 199, 138];

    // ── Header bar ──
    doc.setFillColor(...green);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Veri*Factu', 12, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Factura', pageW - 12, 12, { align: 'right' });

    // ── Company (top-left) ──
    doc.setTextColor(...dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name, leftX, 26);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const companyLines = [
        company.vat_id ? `NIF: ${company.vat_id}` : '',
        company.address || '',
        [company.postal_code, company.city].filter(Boolean).join(' '),
        company.country !== 'ES' ? company.country : '',
        company.email || '',
        company.phone || '',
    ].filter(Boolean);
    companyLines.forEach((line, i) => doc.text(line, leftX, 32 + i * 5));

    // ── Client (top-right) ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Datos del Cliente', rightX, 26);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const clientLines = [
        inv.name || '',
        inv.vat_id ? `NIF: ${inv.vat_id}` : '',
        inv.address || '',
        [inv.postal_code, inv.city].filter(Boolean).join(' '),
        inv.country !== 'ES' ? inv.country : '',
        inv.email || '',
    ].filter(Boolean);
    clientLines.forEach((line, i) => doc.text(line, rightX, 32 + i * 5));

    // ── Invoice meta ──
    doc.setDrawColor(...lightGrey);
    doc.setLineWidth(0.5);
    doc.line(leftX, 42, pageW - 10, 42);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...dark);
    doc.text(`Factura: ${inv.number_format}`, leftX, 48);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grey);
    doc.text(`Fecha: ${formatDate(inv.dt)}`, leftX, 53);
    const type = inv.verifactu_type || 'F1';
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.text(`Tipo: ${type}`, rightX, 48, { align: 'right' });
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    const statusText = inv.voided ? 'Anulada' : inv.verifactu_dt ? 'Enviada' : 'No enviada';
    doc.text(`Estado: ${statusText}`, rightX, 53, { align: 'right' });

    // ── Items table ──
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
        startY: bodyTop,
        margin: { left: 10, right: 10 },
        head: [['Descripción', 'Unidades', 'Precio', 'Subtotal', 'IVA%', 'IVA', 'Total']],
        body: tableData.length > 0 ? tableData : [['Sin líneas', '', '', '', '', '', '']],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        columnStyles: {
            0: { cellWidth: 45 },
            1: { halign: 'right', cellWidth: 14 },
            2: { halign: 'right', cellWidth: 22 },
            3: { halign: 'right', cellWidth: 22 },
            4: { halign: 'right', cellWidth: 12 },
            5: { halign: 'right', cellWidth: 22 },
            6: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didDrawPage: () => {},
    });

    const tableBottom = doc.lastAutoTable.finalY + 5;

    // ── Totals (right-aligned) ──
    doc.setFontSize(9);
    doc.setTextColor(...grey);
    doc.text('Base imponible', pageW - 12, tableBottom, { align: 'right' });
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.text(formatEUR(inv.bi), pageW - 55, tableBottom, { align: 'right' });

    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'normal');
    doc.text('Cuota IVA', pageW - 12, tableBottom + 6, { align: 'right' });
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.text(formatEUR(inv.tvat), pageW - 55, tableBottom + 6, { align: 'right' });

    doc.setDrawColor(...green);
    doc.setLineWidth(0.8);
    doc.line(pageW - 55, tableBottom + 10, pageW - 12, tableBottom + 10);

    doc.setFontSize(11);
    doc.text('Total', pageW - 12, tableBottom + 18, { align: 'right' });
    doc.text(formatEUR(inv.total), pageW - 55, tableBottom + 18, { align: 'right' });

    // ── Footer: QR + Payment info ──
    const footerY = tableBottom + 30;
    const footerH = pageH - footerY - 10;

    // Payment info (left)
    doc.setFontSize(8);
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.text('Forma de pago', leftX, footerY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grey);
    doc.text('Transferencia vía Stripe (pagado)', leftX, footerY + 5);

    // QR (right)
    try {
        const imgData = await fetch(qrSrc).then(r => r.arrayBuffer());
        const qrBase64 = arrayBufferToBase64(imgData);
        doc.addImage(qrBase64, 'PNG', rightX - 20, footerY - 2, 30, 30);
        doc.setFontSize(6);
        doc.setTextColor(...grey);
        doc.text('Escanea para verificar', rightX - 20, footerY + 35, { align: 'center' });
    } catch (e) {
        doc.setFontSize(7);
        doc.setTextColor(...grey);
        doc.text('QR no disponible', rightX - 20, footerY + 10, { align: 'center' });
    }

    // ── Page bottom line ──
    doc.setDrawColor(...lightGrey);
    doc.setLineWidth(0.3);
    doc.line(10, pageH - 10, pageW - 10, pageH - 10);
    doc.setFontSize(6);
    doc.setTextColor(...grey);
    doc.text('Documento generado por Veri*Factu', 12, pageH - 5);

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
