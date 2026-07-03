// Veri*Factu — Invoices list page (filtered by selected company)

document.addEventListener('DOMContentLoaded', async () => {
    const app = document.getElementById('app');
    const navbarEl = document.getElementById('navbar');

    // Get selected company from URL param or localStorage
    let companyId = getParam('company_id') || getSelectedCompany();
    let company = null;
    let allCompanies = [];

    // ── Loading state ──────────────────────────────────────────────────
    navbarEl.innerHTML = navbarHTML('invoices', allCompanies, null);
    app.innerHTML = `
        <section class="section">
            <div class="container has-text-centered">
                <p class="title">Cargando facturas…</p>
            </div>
        </section>
    `;

    try {
        // Load all companies (needed for navbar selector)
        allCompanies = await apiFetch('/api/companies');

        // If no company selected, redirect to companies list
        if (!companyId || !allCompanies.some(c => String(c.id) === String(companyId))) {
            // Try to use first available company
            if (allCompanies.length > 0) {
                companyId = String(allCompanies[0].id);
                setSelectedCompany(companyId);
            } else {
                app.innerHTML = `
                    <section class="section">
                        <div class="container has-text-centered">
                            <p class="title">No hay empresas</p>
                            <p class="has-text-grey">Primero necesitas crear una empresa para empezar a facturar.</p>
                            <div class="mt-4">
                                <a href="/frontend/companies.html" class="button is-primary">Ir a Empresas</a>
                            </div>
                        </div>
                    </section>
                `;
                return;
            }
        }

        // Find the selected company
        company = allCompanies.find(c => String(c.id) === String(companyId));

        // Load invoices for this company
        const invoices = await apiFetch(`/api/${companyId}/invoices`);

        renderPage(company, invoices || []);

    } catch (err) {
        app.innerHTML = `
            <section class="section">
                <div class="container has-text-centered">
                    <p class="title has-text-danger">Error</p>
                    <p class="has-text-danger">${escapeHtml(err.message)}</p>
                    <div class="mt-4">
                        <a href="/frontend/companies.html" class="button is-primary">Ir a Empresas</a>
                    </div>
                </div>
            </section>
        `;
    }

    // ── Render page ────────────────────────────────────────────────────
    function renderPage(company, invoices) {
        // Sort invoices by date descending
        const sorted = [...invoices].sort((a, b) => {
            return new Date(b.dt || 0) - new Date(a.dt || 0);
        });

        // Filter / count by status
        const sentCount = sorted.filter(i => i.verifactu_dt && !i.voided).length;
        const pendingCount = sorted.filter(i => !i.verifactu_dt && !i.voided).length;
        const voidedCount = sorted.filter(i => i.voided).length;

        const rows = sorted.map(inv => {
            // Status
            let statusTag;
            if (inv.voided) {
                statusTag = '<span class="tag is-danger">Anulada</span>';
            } else if (inv.verifactu_dt) {
                statusTag = '<span class="tag is-success">Enviada</span>';
            } else {
                statusTag = '<span class="tag is-warning">Pendiente</span>';
            }

            // Type badge
            const typeMap = {
                'F1': 'is-success',
                'F2': 'is-info',
                'F3': 'is-primary',
                'R1': 'is-warning',
                'R2': 'is-danger',
            };
            const typeClass = typeMap[inv.verifactu_type] || 'is-light';
            const typeLabel = inv.verifactu_type || '—';

            return `
                <tr>
                    <td>${formatDate(inv.dt)}</td>
                    <td><strong>${escapeHtml(inv.number_format || inv.num || '—')}</strong></td>
                    <td>${escapeHtml(inv.name || '—')}</td>
                    <td>${formatEUR(inv.total)}</td>
                    <td><span class="tag ${typeClass} is-size-7">${typeLabel}</span></td>
                    <td>${statusTag}</td>
                    <td>
                        <a href="/frontend/invoice-detail.html?id=${inv.id}&company_id=${companyId}" class="has-text-link">Ver</a>
                        ${!inv.verifactu_dt && !inv.voided ? `
                            <span class="ml-2">|</span>
                            <a href="/frontend/invoice.html?company_id=${companyId}" class="has-text-weight-bold">Editar</a>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        navbarEl.innerHTML = navbarHTML('invoices', allCompanies, parseInt(companyId));
        app.innerHTML = `
            <section class="section">
                <div class="container">
                    <div class="level">
                        <div class="level-left">
                            <div>
                                <p class="title">${escapeHtml(company.name || 'Empresa')}</p>
                                <p class="subtitle is-6 has-text-grey">${escapeHtml(company.vat_id || '')} — Facturas</p>
                            </div>
                        </div>
                        <div class="level-right">
                            <a href="/frontend/invoice.html?company_id=${companyId}" class="button is-primary is-size-7">
                                <span class="icon"><i class="fas fa-plus"></i></span>
                                <span>Nueva factura</span>
                            </a>
                        </div>
                    </div>

                    <!-- Filter tabs -->
                    <div class="tabs is-small">
                        <ul>
                            <li class="is-active" data-filter="all"><a>All (${sorted.length})</a></li>
                            <li data-filter="pending"><a>Pendientes (${pendingCount})</a></li>
                            <li data-filter="sent"><a>Enviadas (${sentCount})</a></li>
                            <li data-filter="voided"><a>Anuladas (${voidedCount})</a></li>
                        </ul>
                    </div>

                    ${sorted.length === 0
                        ? emptyState('No hay facturas para esta empresa — Crea la primera factura')
                        : `
                        <div class="box">
                            <div class="table-container">
                                <table class="table is-fullwidth is-striped is-hoverable" id="invoices-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Número</th>
                                            <th>Cliente</th>
                                            <th>Importe</th>
                                            <th>Tipo</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="invoices-body">
                                        ${rows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `
                    }

                    <div class="mt-3">
                        <a href="/frontend/company.html?id=${companyId}" class="button is-small is-light">← Volver a empresa</a>
                    </div>
                </div>
            </section>
        `;

        // Wire filter tabs
        wireFilters(sorted);
    }

    // ── Filter logic ───────────────────────────────────────────────────
    function wireFilters(allInvoices) {
        const tabs = document.querySelectorAll('.tabs li[data-filter]');
        const tbody = document.getElementById('invoices-body');
        if (!tbody) return;

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                tabs.forEach(t => t.classList.remove('is-active'));
                tab.classList.add('is-active');

                const filter = tab.dataset.filter;
                let filtered;
                switch (filter) {
                    case 'pending':
                        filtered = allInvoices.filter(i => !i.verifactu_dt && !i.voided);
                        break;
                    case 'sent':
                        filtered = allInvoices.filter(i => i.verifactu_dt && !i.voided);
                        break;
                    case 'voided':
                        filtered = allInvoices.filter(i => i.voided);
                        break;
                    default:
                        filtered = allInvoices;
                }

                if (filtered.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" class="has-text-centered has-text-grey py-6">No hay facturas con este filtro.</td></tr>`;
                } else {
                    const rows = filtered.map(inv => {
                        let statusTag;
                        if (inv.voided) {
                            statusTag = '<span class="tag is-danger">Anulada</span>';
                        } else if (inv.verifactu_dt) {
                            statusTag = '<span class="tag is-success">Enviada</span>';
                        } else {
                            statusTag = '<span class="tag is-warning">Pendiente</span>';
                        }

                        const typeMap = {
                            'F1': 'is-success', 'F2': 'is-info', 'F3': 'is-primary',
                            'R1': 'is-warning', 'R2': 'is-danger',
                        };
                        const typeClass = typeMap[inv.verifactu_type] || 'is-light';
                        const typeLabel = inv.verifactu_type || '—';

                        return `
                            <tr>
                                <td>${formatDate(inv.dt)}</td>
                                <td><strong>${escapeHtml(inv.number_format || inv.num || '—')}</strong></td>
                                <td>${escapeHtml(inv.name || '—')}</td>
                                <td>${formatEUR(inv.total)}</td>
                                <td><span class="tag ${typeClass} is-size-7">${typeLabel}</span></td>
                                <td>${statusTag}</td>
                                <td>
                                    <div class="table-actions">
                                        <a href="/frontend/invoice-detail.html?id=${inv.id}&company_id=${companyId}" class="button is-small is-info is-outlined">
                                            <span class="icon is-small"><i class="fas fa-eye"></i></span>
                                            <span>Ver</span>
                                        </a>
                                        ${!inv.verifactu_dt && !inv.voided ? `
                                            <a href="/frontend/invoice.html?company_id=${companyId}" class="button is-small is-light">
                                                <span class="icon is-small"><i class="fas fa-pen"></i></span>
                                                <span>Editar</span>
                                            </a>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('');
                    tbody.innerHTML = rows;
                }
            });
        });
    }
});
