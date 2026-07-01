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
        const invoice = await apiFetch(`/api/${companyId}/invoices/${invoiceId}`);
        renderInvoice(companyId, invoice);
    } catch (err) {
        document.getElementById('app').innerHTML = navbarHTML('companies') +
            `<section class="section"><div class="container"><div class="notification is-danger">Error loading invoice: ${err.message}</div></div></section>`;
    }
}

function renderInvoice(companyId, inv) {
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

    const html = `
    <section class="section">
        <div class="container">
            <!-- Header -->
            <div class="mb-5">
                <a href="/frontend/invoice.html?company_id=${companyId}" class="button is-small is-light mb-3">← Volver</a>
                <div class="is-flex is-align-items-center is-flex-wrap-wrap">
                    <h1 class="is-size-2">Factura ${escapeHTML(inv.number_format)}</h1>
                    <span class="tag ${type === 'F1' || type === 'F3' ? 'is-info' : type === 'F2' ? 'is-warning' : type === 'R1' || type === 'R5' ? 'is-dark' : 'is-light'}">${escapeHTML(type || '—')}</span>
                    <span class="tag is-light">${formatDate(inv.dt)}</span>
                </div>
                ${invoiceRefHTML}
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
