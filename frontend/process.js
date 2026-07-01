// Veri*Factu — Process / Send page
document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    if (!app) return;

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

    // --- initial skeleton ---
    render(`
        ${navbarHTML('process')}
        <section class="section">
            <div class="container">
                <h1 class="title">Panel de envío de facturas</h1>
                <div id="loading" class="has-text-centered py-6">
                    <span class="loader is-loading"></span>&nbsp; Cargando…
                </div>
            </div>
        </section>
    `);

    // --- state ---
    let companiesList = [];
    let selectedCompanyIds = new Set();

    // --- company filter from URL ---
    const urlCompanyId = getParam('company_id');
    if (urlCompanyId) {
        selectedCompanyIds.add(urlCompanyId);
    }

    // --- load companies for dropdown ---
    apiFetch('/api/companies')
        .then(data => {
            companiesList = Array.isArray(data) ? data : (data.companies || []);
            buildCompanySelector();
            return apiFetch('/api/process');
        })
        .then(processResult => {
            renderResults(processResult);
        })
        .catch(err => {
            render(`
                ${navbarHTML('process')}
                <section class="section">
                    <div class="container">
                        <h1 class="title">Panel de envío de facturas</h1>
                        <p class="has-text-danger">${err.message}</p>
                    </div>
                </section>
            `);
        });

    // --- build company selector (only if no company_id in URL) ---
    function buildCompanySelector() {
        if (urlCompanyId) return; // filter already applied

        const options = companiesList.map(c =>
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
        const companies = data.companies || {};
        const companiesEl = document.getElementById('results-area');
        if (!companiesEl) {
            renderApp(companies);
            return;
        }

        let allOk = [];
        let allKo = [];
        let waitMessages = [];
        let pendingInvoiceCounts = [];

        for (const [companyId, result] of Object.entries(companies)) {
            if (result.message) {
                waitMessages.push({ companyId, message: result.message });
            } else if (result.ok || result.ko) {
                allOk = allOk.concat(result.ok || []);
                allKo = allKo.concat(result.ko || []);
            }
            pendingInvoiceCounts.push({ companyId, ...result });
        }

        renderApp({
            ok: allOk,
            ko: allKo,
            waitMessages,
            pendingInvoiceCounts,
        });
    }

    // --- main render ---
    function renderApp(data) {
        const { ok = [], ko = [], waitMessages = [], pendingInvoiceCounts = [] } = data;

        // Build company selector
        let companySelectorHTML = '';
        if (!urlCompanyId) {
            const options = companiesList.map(c =>
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

        // Build next-send info
        let nextSendHTML = '';
        for (const wm of waitMessages) {
            const match = wm.message && wm.message.match(/Next send in (\d+) seconds/);
            const seconds = match ? parseInt(match[1], 10) : null;
            if (seconds && seconds > 0) {
                nextSendHTML += `
                    <div class="notification is-warning">
                        <strong>Próximo envío en ${seconds} segundos.</strong><br>
                        Las facturas se enviarán automáticamente al alcanzar el tiempo programado.
                    </div>
                `;
            } else {
                nextSendHTML = `
                    <div class="notification is-info">
                        <strong>Sin programación.</strong> Las facturas pendientes se enviarán al pulsar "Enviar".
                    </div>
                `;
            }
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
                                <th>Número</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Total</th>
                                <th>Empresa</th>
                            </tr>
                        </thead>
                        <tbody id="pending-invoices-body">
                            ${filteredInvoices.map(inv => `
                                <tr data-company="${inv.company_id}">
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
            pendingTableHTML = `<div class="has-text-centered has-text-grey py-6">No hay facturas pendientes</div>`;
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
                    <button class="button is-light" id="btn-send-all">
                        <span class="icon is-small"><span class="icon-send"></span></span>
                        <span>Enviar todas</span>
                    </button>
                </div>
            </div>
        `;

        render(`
            ${navbarHTML('process')}
            <section class="section">
                <div class="container">
                    <h1 class="title">Panel de envío de facturas</h1>
                    ${companySelectorHTML}
                    ${nextSendHTML}
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
        // Re-render with filtered data — pendingInvoiceCounts is in scope from renderApp
        const pendingInvoiceCounts = window._processPendingInvoices || [];
        const filtered = getFilteredInvoices(pendingInvoiceCounts);

        let pendingTableHTML = '';
        if (filtered.length > 0) {
            pendingTableHTML = `
                <div class="table-container">
                    <table class="table is-striped is-hoverable is-fullwidth">
                        <thead>
                            <tr>
                                <th>Número</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Total</th>
                                <th>Empresa</th>
                            </tr>
                        </thead>
                        <tbody id="pending-invoices-body">
                            ${filtered.map(inv => `
                                <tr data-company="${inv.company_id}">
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
            pendingTableHTML = `<div class="has-text-centered has-text-grey py-6">No hay facturas pendientes</div>`;
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
                        <button class="button is-light" id="btn-send-all">
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
        // Send selected button
        const btnSendSelected = document.getElementById('btn-send-selected');
        if (btnSendSelected) {
            btnSendSelected.addEventListener('click', () => sendInvoices());
        }

        // Send all button
        const btnSendAll = document.getElementById('btn-send-all');
        if (btnSendAll) {
            btnSendAll.addEventListener('click', () => sendInvoices());
        }
    }

    // --- send invoices ---
    async function sendInvoices() {
        const sendResults = document.getElementById('send-results');
        const btnSendSelected = document.getElementById('btn-send-selected');
        const btnSendAll = document.getElementById('btn-send-all');

        // Add loading state to buttons
        if (btnSendSelected) btnSendSelected.classList.add('is-loading');
        if (btnSendAll) btnSendAll.classList.add('is-loading');

        try {
            const data = await apiFetch('/api/process');
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

});
