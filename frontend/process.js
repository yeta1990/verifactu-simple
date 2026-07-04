// Veri*Factu — Process / Send page
document.addEventListener('DOMContentLoaded', async () => {
    const app = document.getElementById('app');
    if (!app) return;

    // Load companies (navbar + filtro) y config (modo de envío) en paralelo
    let companies = [];
    let sendMode = 'mock';
    try {
        const [comps, conf] = await Promise.all([
            apiFetch('/api/companies'),
            apiFetch('/api/config').catch(() => ({})),
        ]);
        companies = comps || [];
        sendMode = (conf && conf.send_mode) || 'mock';
    } catch (err) {
        console.error('Error loading companies:', err);
    }
    const selectedId = getSelectedCompany();

    // Map company_id -> test flag (para mostrar modo prueba/producción por fila)
    const companyTestMap = {};
    companies.forEach(c => { companyTestMap[c.id] = c.test; });

    // --- helpers ---
    function render(html) {
        app.innerHTML = html;
        // El toggle del burger ya se gestiona globalmente por app.js (delegación
        // en document), así que sobrevive a los re-renders.
    }

    // --- state ---
    let selectedCompanyIds = new Set();

    // --- company filter from URL ---
    const urlCompanyId = getParam('company_id');
    if (urlCompanyId) {
        selectedCompanyIds.add(urlCompanyId);
    }

    // --- mode banner ---
    function buildModeBanner() {
        const isProd = sendMode === 'prod';
        const isTest = sendMode === 'test';
        const cls = isProd ? 'is-danger' : isTest ? 'is-warning' : 'is-info';
        const icon = isProd ? 'fa-triangle-exclamation' : isTest ? 'fa-flask' : 'fa-circle-info';
        const label = isProd ? 'MODO PRODUCCIÓN — los envíos a la AEAT son reales e irreversibles'
            : isTest ? 'MODO TEST — envíos a la sede de pruebas de la AEAT'
            : 'MODO MOCK — sin envío real (simulado)';
        return `<div class="notification ${cls} is-light mb-4"><span class="icon"><i class="fas ${icon}"></i></span> ${escapeHtml(label)}</div>`;
    }

    // --- pending table builder (compartido) ---
    function pendingTableHTML(invoices) {
        if (!invoices || invoices.length === 0) {
            return `<div class="has-text-centered has-text-grey py-6"><p class="is-size-5">No hay facturas pendientes</p><p class="has-text-grey-light">Las facturas pendientes aparecerán aquí cuando se creen.</p></div>`;
        }
        return `
            <div class="table-container">
                <table class="table is-striped is-hoverable is-fullwidth">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="check-all" aria-label="Seleccionar todas las visibles"></th>
                            <th>Número</th>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Total</th>
                            <th>Empresa</th>
                            <th>Modo</th>
                        </tr>
                    </thead>
                    <tbody id="pending-invoices-body">
                        ${invoices.map(inv => `
                            <tr data-company="${inv.company_id}" data-id="${inv.id}">
                                <td><input type="checkbox" class="invoice-checkbox" data-id="${inv.id}" aria-label="Seleccionar factura ${escapeHtml(inv.num || '')}"></td>
                                <td>${escapeHtml(inv.num || '—')}</td>
                                <td>${formatDate(inv.fecha || inv.created_at)}</td>
                                <td>${escapeHtml(inv.cliente || inv.customer_name || '—')}</td>
                                <td>${formatEUR(inv.total || inv.amount || 0)}</td>
                                <td>${escapeHtml(inv.company_name || inv.empresa || '—')}</td>
                                <td>${companyTestMap[inv.company_id]
                                    ? '<span class="tag is-warning">Prueba</span>'
                                    : '<span class="tag is-danger">Prod</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // --- action buttons builder ---
    function actionButtonsHTML() {
        return `
            <div class="field is-grouped mt-4">
                <div class="control">
                    <button class="button is-primary" id="btn-send-selected" disabled>
                        <span class="icon is-small"><i class="fas fa-paper-plane"></i></span>
                        <span>Enviar seleccionadas</span>
                    </button>
                </div>
                <div class="control">
                    <button class="button is-info" id="btn-send-all">
                        <span class="icon is-small"><i class="fas fa-paper-plane"></i></span>
                        <span>Enviar todas</span>
                    </button>
                </div>
            </div>
        `;
    }

    // --- render results from API ---
    function renderResults(data) {
        const pendingInvoices = Array.isArray(data.pending) ? data.pending : [];
        renderApp({ ok: [], ko: [], waitMessages: [], pendingInvoiceCounts: pendingInvoices });
    }

    // --- main render ---
    function renderApp(data) {
        const { ok = [], ko = [] } = data;

        // Build company selector
        let companySelectorHTML = '';
        if (!urlCompanyId) {
            const options = companies.map(c =>
                `<option value="${c.id}">${escapeHtml(c.name || c.id)}</option>`
            ).join('');
            companySelectorHTML = `
                <div class="field">
                    <label class="label">Filtrar por empresa</label>
                    <div class="control has-icons-left">
                        <div class="select is-fullwidth">
                            <select id="company-filter">
                                <option value="">Todas las empresas</option>
                                ${options}
                            </select>
                        </div>
                        <span class="icon is-left"><i class="fas fa-building"></i></span>
                    </div>
                </div>
            `;
        }

        // Build OK results
        let okHTML = '';
        if (ok.length > 0) {
            okHTML = `
                <div class="notification is-success mb-4">
                    <strong>${ok.length} factura(s) enviada(s) correctamente:</strong>
                    <ul style="margin-top:0.5rem;margin-bottom:0;">
                        ${ok.map(item => `<li>Factura ${escapeHtml(item.num || item.id)} enviada correctamente</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Build KO results
        let koHTML = '';
        if (ko.length > 0) {
            koHTML = `
                <div class="notification is-danger mb-4">
                    <strong>${ko.length} factura(s) con errores:</strong>
                    <ul style="margin-top:0.5rem;margin-bottom:0;">
                        ${ko.map(item =>
                            `<li class="has-text-danger">Factura ${escapeHtml(item.num || item.id)}: ${escapeHtml(item.descrError || 'Error desconocido')} (código ${escapeHtml(item.codError || '—')})</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        // Build pending invoices table
        window._processPendingInvoices = data.pendingInvoiceCounts || [];
        const filteredInvoices = getFilteredInvoices(window._processPendingInvoices);
        const tableHTML = pendingTableHTML(filteredInvoices);

        render(`
            ${navbarHTML('process', companies, selectedId ? parseInt(selectedId) : null)}
            <section class="section">
                <div class="container">
                    <h1 class="title">Panel de envío de facturas</h1>
                    ${buildModeBanner()}
                    ${companySelectorHTML}
                    ${okHTML}
                    ${koHTML}
                    <div id="results-area">
                        <h2 class="subtitle">Facturas pendientes de envío</h2>
                        ${tableHTML}
                        ${actionButtonsHTML()}
                    </div>
                    <div id="send-results"></div>
                </div>
            </section>
        `);

        attachEventListeners();
    }

    // --- filter invoices by selected company ---
    function getFilteredInvoices(pendingInvoiceCounts) {
        if (selectedCompanyIds.size === 0) return pendingInvoiceCounts;
        return pendingInvoiceCounts.filter(inv => selectedCompanyIds.has(String(inv.company_id)));
    }

    function filterAndRenderResults() {
        const pendingInvoiceCounts = window._processPendingInvoices || [];
        const filtered = getFilteredInvoices(pendingInvoiceCounts);

        const resultsArea = document.getElementById('results-area');
        if (resultsArea) {
            resultsArea.innerHTML = `
                <h2 class="subtitle">Facturas pendientes de envío</h2>
                ${pendingTableHTML(filtered)}
                ${actionButtonsHTML()}
            `;
        }
        attachEventListeners();
    }

    // --- attach event listeners ---
    function attachEventListeners() {
        // Company filter (solo existe si no hay company_id en la URL)
        const companyFilter = document.getElementById('company-filter');
        if (companyFilter) {
            companyFilter.addEventListener('change', (e) => {
                selectedCompanyIds.clear();
                if (e.target.value) selectedCompanyIds.add(e.target.value);
                filterAndRenderResults();
            });
        }

        // Select all checkbox (solo visibles)
        const checkAll = document.getElementById('check-all');
        if (checkAll) {
            checkAll.addEventListener('change', () => {
                document.querySelectorAll('.invoice-checkbox').forEach(cb => {
                    cb.checked = checkAll.checked;
                });
                updateSendButtons();
            });
        }

        // Individual checkboxes
        document.querySelectorAll('.invoice-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSendButtons);
        });

        // Send buttons (con confirmación)
        const btnSendSelected = document.getElementById('btn-send-selected');
        if (btnSendSelected) {
            btnSendSelected.addEventListener('click', () => confirmSend(true));
        }
        const btnSendAll = document.getElementById('btn-send-all');
        if (btnSendAll) {
            btnSendAll.addEventListener('click', () => confirmSend(false));
        }
    }

    function updateSendButtons() {
        const checked = document.querySelectorAll('.invoice-checkbox:checked');
        const btnSendSelected = document.getElementById('btn-send-selected');
        if (btnSendSelected) {
            btnSendSelected.disabled = checked.length === 0;
            const count = checked.length;
            btnSendSelected.querySelector('span:last-child').textContent = count > 0
                ? `Enviar ${count} seleccionada(s)`
                : 'Enviar seleccionadas';
        }
    }

    // --- confirm before sending (UX-1) ---
    function confirmSend(selectedOnly) {
        const visibleRows = Array.from(document.querySelectorAll('#pending-invoices-body tr'));
        const count = selectedOnly
            ? document.querySelectorAll('.invoice-checkbox:checked').length
            : visibleRows.length;
        if (count === 0) {
            showToast(selectedOnly ? 'Selecciona al menos una factura' : 'No hay facturas pendientes para enviar', 'is-warning');
            return;
        }
        const isProd = sendMode === 'prod';
        const body = isProd
            ? `<div class="notification is-danger is-light mb-3"><span class="icon"><i class="fas fa-triangle-exclamation"></i></span> <strong>ATENCIÓN: modo PRODUCCIÓN.</strong> El envío a la AEAT es <strong>irreversible</strong>.</div>
               <p>¿Confirmas el envío de ${count} factura(s) a la AEAT en producción?</p>`
            : `<p>¿Confirmas el envío de ${count} factura(s) a la AEAT?</p>
               <p class="mt-2 is-size-7 has-text-grey">Modo actual: <strong>${escapeHtml(sendMode)}</strong>${sendMode === 'mock' ? ' (simulado, sin envío real)' : ''}</p>`;
        openModal(
            'Confirmar envío a la AEAT',
            body,
            () => sendInvoices(selectedOnly),
            'Enviar'
        );
    }

    // --- send invoices ---
    async function sendInvoices(selectedOnly) {
        const sendResults = document.getElementById('send-results');
        const btnSendSelected = document.getElementById('btn-send-selected');
        const btnSendAll = document.getElementById('btn-send-all');

        // Add loading state to buttons
        if (btnSendSelected) btnSendSelected.classList.add('is-loading');
        if (btnSendAll) btnSendAll.classList.add('is-loading');

        try {
            const body = {};
            if (selectedOnly) {
                const checked = Array.from(document.querySelectorAll('.invoice-checkbox:checked'));
                body.selected = checked.map(cb => {
                    const tr = cb.closest('tr');
                    return { company_id: Number(tr.dataset.company), invoice_id: Number(tr.dataset.id) };
                });
            } else {
                // "Enviar todas" respeta el filtro visual: envía las facturas visibles
                const visible = Array.from(document.querySelectorAll('#pending-invoices-body tr'));
                body.selected = visible.map(tr => ({
                    company_id: Number(tr.dataset.company),
                    invoice_id: Number(tr.dataset.id)
                }));
            }
            const data = await apiFetch('/api/process', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            const companiesResult = data.companies || {};

            let html = '';
            for (const [companyId, result] of Object.entries(companiesResult)) {
                if (result.message) {
                    html += `
                        <div class="notification is-warning">
                            <strong>Próximo envío en ${result.message.replace('Next send in ', '').replace(' seconds', '')} segundos.</strong>
                        </div>
                    `;
                } else if (result.ok || result.ko) {
                    if (result.ok && result.ok.length > 0) {
                        html += `
                            <div class="notification is-success mb-2">
                                <strong>${result.ok.length} factura(s) enviada(s) correctamente:</strong>
                                <ul style="margin-top:0.25rem;margin-bottom:0;">
                                    ${result.ok.map(item => `<li>Factura ${escapeHtml(item.num || item.id)} enviada correctamente</li>`).join('')}
                                </ul>
                            </div>
                        `;
                    }
                    if (result.ko && result.ko.length > 0) {
                        html += `
                            <div class="notification is-danger mb-2">
                                <strong>${result.ko.length} factura(s) con errores:</strong>
                                <ul style="margin-top:0.25rem;margin-bottom:0;">
                                    ${result.ko.map(item =>
                                        `<li class="has-text-danger">Factura ${escapeHtml(item.num || item.id)}: ${escapeHtml(item.descrError || 'Error desconocido')} (código ${escapeHtml(item.codError || '—')})</li>`
                                    ).join('')}
                                </ul>
                            </div>
                        `;
                    }
                }
            }

            if (sendResults) {
                sendResults.innerHTML = html;
                showToast('Envío completado', 'is-success');
            }

            // Refresh pending list (it will be shorter)
            const pendingData = await apiFetch('/api/pending');
            window._processPendingInvoices = Array.isArray(pendingData.pending) ? pendingData.pending : [];
            filterAndRenderResults();

        } catch (err) {
            if (sendResults) {
                sendResults.innerHTML = `
                    <div class="notification is-danger">
                        Error al enviar: ${escapeHtml(err.message)}
                    </div>
                `;
            }
            showToast('Error al enviar facturas', 'is-danger');
        } finally {
            if (btnSendSelected) btnSendSelected.classList.remove('is-loading');
            if (btnSendAll) btnSendAll.classList.remove('is-loading');
        }
    }

    // --- initial load: show navbar + loading, then fetch pending invoices ---
    render(`
        ${navbarHTML('process', companies, selectedId ? parseInt(selectedId) : null)}
        <section class="section">
            <div class="container">
                <h1 class="title">Panel de envío de facturas</h1>
                <div class="has-text-centered py-6">
                    <p class="vf-spinner is-size-4 has-text-grey">Cargando facturas pendientes…</p>
                </div>
            </div>
        </section>
    `);

    try {
        const pendingData = await apiFetch('/api/pending');
        renderResults(pendingData);
    } catch (err) {
        render(`
            ${navbarHTML('process', companies, selectedId ? parseInt(selectedId) : null)}
            <section class="section">
                <div class="container">
                    <h1 class="title">Panel de envío de facturas</h1>
                    ${buildModeBanner()}
                    <div class="notification is-danger">
                        <span class="icon"><i class="fas fa-circle-exclamation"></i></span>
                        Error al cargar las facturas pendientes: ${escapeHtml(err.message)}
                    </div>
                </div>
            </section>
        `);
    }
});
