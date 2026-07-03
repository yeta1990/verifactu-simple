// Veri*Factu — Process / Send page
document.addEventListener('DOMContentLoaded', async () => {
    const app = document.getElementById('app');
    if (!app) return;

    // Load companies ONCE - used for navbar AND for filtering
    let companies = [];
    try {
        companies = await apiFetch('/api/companies');
    } catch (err) {
        console.error('Error loading companies:', err);
    }
    const selectedId = getSelectedCompany();

    // --- helpers ---
    function render(html) {
        app.innerHTML = html;
        // re-activate burger after re-render
        document.addEventListener('click', (e) => {
            const burger = e.target.closest('.navbar-burger');
            if (burger) {
                const target = document.getElementById(burger.dataset.target);
                burger.classList.toggle('is-active');
                if (target) target.classList.toggle('is-active');
            }
        });
    }

    // --- state ---
    let selectedCompanyIds = new Set();

    // --- company filter from URL ---
    const urlCompanyId = getParam('company_id');
    if (urlCompanyId) {
        selectedCompanyIds.add(urlCompanyId);
    }

    // --- build company selector (only if no company_id in URL) ---
    function buildCompanySelector(compList) {
        if (urlCompanyId) return; // filter already applied

        const options = compList.map(c =>
            `<option value="${c.id}">${escapeHTML(c.name || c.id)}</option>`
        ).join('');

        const selectorHTML = `
            <div class="field">
                <label class="label">Filtrar por empresa</label>
                <div class="control has-icons-left">
                    <div class="select is-fullwidth">
                        <select id="company-filter">
                            <option value="">Todas las empresas</option>
                            ${options}
                        </select>
                    </div>
                    <div class="icon is-left"><span class="is-size-3">🏢</span></div>
                </div>
            </div>
        `;

        // Insert selector before the main content area
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.outerHTML = `<div id="main-content">${selectorHTML}<div id="results-area"></div></div>`;
        }

        document.getElementById('company-filter').addEventListener('change', (e) => {
            const val = e.target.value;
            selectedCompanyIds.clear();
            if (val) selectedCompanyIds.add(val);
            filterAndRenderResults();
        });
    }

    // --- render results from API ---
    function renderResults(data) {
        // /api/pending returns { pending: [...] }
        const pendingInvoices = Array.isArray(data.pending) ? data.pending : [];

        renderApp({
            ok: [],
            ko: [],
            waitMessages: [],
            pendingInvoiceCounts: pendingInvoices,
        });
    }

    // --- main render ---
    function renderApp(data) {
        const { ok = [], ko = [], waitMessages = [], pendingInvoiceCounts = [] } = data;

        // Build company selector
        let companySelectorHTML = '';
        if (!urlCompanyId) {
            const options = companies.map(c =>
                `<option value="${c.id}">${escapeHTML(c.name || c.id)}</option>`
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
                        <div class="icon is-left"><span class="is-size-3">🏢</span></div>
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
                        ${ok.map(item => `<li>Factura ${escapeHTML(item.num || item.id)} enviada correctamente</li>`).join('')}
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
                            `<li class="has-text-danger">Factura ${escapeHTML(item.num || item.id)}: ${escapeHTML(item.descrError || 'Error desconocido')} (código ${escapeHTML(item.codError || '—')})</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        // Build pending invoices table
        window._processPendingInvoices = pendingInvoiceCounts;
        const filteredInvoices = getFilteredInvoices(pendingInvoiceCounts);

        let pendingTableHTML = '';
        if (filteredInvoices.length > 0) {
            pendingTableHTML = `
                <div class="table-container">
                    <table class="table is-striped is-hoverable is-fullwidth">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="check-all"></th>
                                <th>Número</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Total</th>
                                <th>Empresa</th>
                            </tr>
                        </thead>
                        <tbody id="pending-invoices-body">
                            ${filteredInvoices.map(inv => `
                                <tr data-company="${inv.company_id}" data-id="${inv.id}">
                                    <td><input type="checkbox" class="invoice-checkbox" data-id="${inv.id}"></td>
                                    <td>${escapeHTML(inv.num || '—')}</td>
                                    <td>${formatDate(inv.fecha || inv.created_at)}</td>
                                    <td>${escapeHTML(inv.cliente || inv.customer_name || '—')}</td>
                                    <td>${formatEUR(inv.total || inv.amount || 0)}</td>
                                    <td>${escapeHTML(inv.company_name || inv.empresa || '—')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            pendingTableHTML = `<div class="has-text-centered has-text-grey py-6"><p class="is-size-5">No hay facturas pendientes</p><p class="has-text-grey-light">Las facturas pendientes aparecerán aquí cuando se creen.</p></div>`;
        }

        // Build action buttons
        const buttonsHTML = `
            <div class="field is-grouped mt-4">
                <div class="control">
                    <button class="button is-primary" id="btn-send-selected" disabled>
                        <span class="icon is-small"><span class="icon-send"></span></span>
                        <span>Enviar seleccionadas</span>
                    </button>
                </div>
                <div class="control">
                    <button class="button is-info" id="btn-send-all">
                        <span class="icon is-small"><span class="icon-send"></span></span>
                        <span>Enviar todas</span>
                    </button>
                </div>
            </div>
        `;

        render(`
            ${navbarHTML('process', companies, selectedId ? parseInt(selectedId) : null)}
            <section class="section">
                <div class="container">
                    <h1 class="title">Panel de envío de facturas</h1>
                    ${companySelectorHTML}
                    ${okHTML}
                    ${koHTML}
                    <h2 class="subtitle">Facturas pendientes de envío</h2>
                    ${pendingTableHTML}
                    ${buttonsHTML}
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

        let pendingTableHTML = '';
        if (filtered.length > 0) {
            pendingTableHTML = `
                <div class="table-container">
                    <table class="table is-striped is-hoverable is-fullwidth">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="check-all"></th>
                                <th>Número</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Total</th>
                                <th>Empresa</th>
                            </tr>
                        </thead>
                        <tbody id="pending-invoices-body">
                            ${filtered.map(inv => `
                                <tr data-company="${inv.company_id}" data-id="${inv.id}">
                                    <td><input type="checkbox" class="invoice-checkbox" data-id="${inv.id}"></td>
                                    <td>${escapeHTML(inv.num || '—')}</td>
                                    <td>${formatDate(inv.fecha || inv.created_at)}</td>
                                    <td>${escapeHTML(inv.cliente || inv.customer_name || '—')}</td>
                                    <td>${formatEUR(inv.total || inv.amount || 0)}</td>
                                    <td>${escapeHTML(inv.company_name || inv.empresa || '—')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            pendingTableHTML = `<div class="has-text-centered has-text-grey py-6"><p class="is-size-5">No hay facturas pendientes</p><p class="has-text-grey-light">Las facturas pendientes aparecerán aquí cuando se creen.</p></div>`;
        }

        const resultsArea = document.getElementById('results-area');
        if (resultsArea) {
            resultsArea.innerHTML = `
                <h2 class="subtitle">Facturas pendientes de envío</h2>
                ${pendingTableHTML}
                <div class="field is-grouped mt-4">
                    <div class="control">
                        <button class="button is-primary" id="btn-send-selected" disabled>
                            <span class="icon is-small"><span class="icon-send"></span></span>
                            <span>Enviar seleccionadas</span>
                        </button>
                    </div>
                    <div class="control">
                        <button class="button is-info" id="btn-send-all">
                            <span class="icon is-small"><span class="icon-send"></span></span>
                            <span>Enviar todas</span>
                        </button>
                    </div>
                </div>
                <div id="send-results"></div>
            `;
        }
        attachEventListeners();
    }

    // --- attach event listeners ---
    function attachEventListeners() {
        // Select all checkbox
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

        // Send selected button
        const btnSendSelected = document.getElementById('btn-send-selected');
        if (btnSendSelected) {
            btnSendSelected.addEventListener('click', () => sendInvoices(true));
        }

        // Send all button
        const btnSendAll = document.getElementById('btn-send-all');
        if (btnSendAll) {
            btnSendAll.addEventListener('click', () => sendInvoices(false));
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
                if (checked.length === 0) {
                    showToast('Selecciona al menos una factura', 'is-warning');
                    return;
                }
                body.selected = checked.map(cb => {
                    const tr = cb.closest('tr');
                    return {
                        company_id: Number(tr.dataset.company),
                        invoice_id: Number(tr.dataset.id)
                    };
                });
            }
            const data = await apiFetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const companies = data.companies || {};

            let html = '';
            for (const [companyId, result] of Object.entries(companies)) {
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
                                    ${result.ok.map(item => `<li>Factura ${escapeHTML(item.num || item.id)} enviada correctamente</li>`).join('')}
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
                                        `<li class="has-text-danger">Factura ${escapeHTML(item.num || item.id)}: ${escapeHTML(item.descrError || 'Error desconocido')} (código ${escapeHTML(item.codError || '—')})</li>`
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
                        Error al enviar: ${escapeHTML(err.message)}
                    </div>
                `;
            }
            showToast('Error al enviar facturas', 'is-danger');
        } finally {
            if (btnSendSelected) btnSendSelected.classList.remove('is-loading');
            if (btnSendAll) btnSendAll.classList.remove('is-loading');
        }
    }

    // --- utility ---
    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Populate navbar company selector
});
