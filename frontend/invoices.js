// Veri*Factu — Invoices list page (filtered by selected company)

document.addEventListener('DOMContentLoaded', async () => {
    const app = document.getElementById('app');
    const navbarEl = document.getElementById('navbar');

    // Get selected company from URL param or localStorage
    let companyId = getParam('company_id') || getSelectedCompany();
    let company = null;
    let allCompanies = [];
    // Estado de la lista actualmente mostrada (para exportar CSV). Debe
    // inicializarse antes del try que llama a renderPage (TDZ).
    let currentFiltered = [];

    // ── Loading state ──────────────────────────────────────────────────
    navbarEl.innerHTML = navbarHTML('invoices', allCompanies, null);
    app.innerHTML = `
        <section class="section">
            <div class="container has-text-centered">
                <h1 class="title">Cargando facturas…</h1>
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
                            <h1 class="title">No hay empresas</h1>
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
                    <h1 class="title has-text-danger">Error</h1>
                    <p class="has-text-danger">${escapeHtml(err.message)}</p>
                    <div class="mt-4">
                        <a href="/frontend/companies.html" class="button is-primary">Ir a Empresas</a>
                    </div>
                </div>
            </section>
        `;
    }

    // ── ¿Es anulable? (enviada a la AEAT, no anulada, no referenciada) ──
    function isVoidable(inv) {
        return !!inv.verifactu_dt && !inv.voided && !inv.invoice_ref_id;
    }

    // ── Render de una fila (compartido por vista inicial y filtrada) ──
    function renderRow(inv) {
        // Status
        let statusTag;
        if (inv.voided) {
            statusTag = '<span class="tag is-danger">Anulada</span>';
        } else if (inv.verifactu_dt) {
            statusTag = '<span class="tag is-success">Enviada</span>';
        } else {
            statusTag = '<span class="tag is-warning">Pendiente</span>';
        }

        // Type badge (incluye R5)
        const typeMap = {
            'F1': 'is-success', 'F2': 'is-info', 'F3': 'is-primary',
            'R1': 'is-warning', 'R2': 'is-danger', 'R5': 'is-dark',
        };
        const typeClass = typeMap[inv.verifactu_type] || 'is-light';
        const typeLabel = inv.verifactu_type || '—';

        const voidable = isVoidable(inv);

        return `
            <tr>
                <td class="has-text-centered">
                    <input type="checkbox" class="invoice-void-cb" data-id="${inv.id}" ${voidable ? '' : 'disabled'} aria-label="Seleccionar para anular">
                </td>
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
                    </div>
                </td>
            </tr>
        `;
    }

    // ── Render page ────────────────────────────────────────────────────
    function renderPage(company, invoices) {
        // Sort invoices by date descending
        const sorted = [...invoices].sort((a, b) => {
            return new Date(b.dt || 0) - new Date(a.dt || 0);
        });
        currentFiltered = sorted;

        // Filter / count by status
        const sentCount = sorted.filter(i => i.verifactu_dt && !i.voided).length;
        const pendingCount = sorted.filter(i => !i.verifactu_dt && !i.voided).length;
        const voidedCount = sorted.filter(i => i.voided).length;

        const rows = sorted.map(renderRow).join('');

        navbarEl.innerHTML = navbarHTML('invoices', allCompanies, parseInt(companyId));
        app.innerHTML = `
            <section class="section">
                <div class="container">
                    <div class="level">
                        <div class="level-left">
                            <div>
                                <h1 class="title">${escapeHtml(company.name || 'Empresa')}</h1>
                                <p class="subtitle is-6 has-text-grey">${escapeHtml(company.vat_id || '')} — Facturas</p>
                            </div>
                        </div>
                        <div class="level-right">
                            <div class="buttons">
                                <a href="/frontend/invoice.html?company_id=${companyId}" class="button is-primary is-size-7">
                                    <span class="icon"><i class="fas fa-plus"></i></span>
                                    <span>Nueva factura</span>
                                </a>
                                <button class="button is-danger is-outlined is-size-7" id="btn-void-selected" disabled>
                                    <span class="icon"><i class="fas fa-ban"></i></span>
                                    <span>Anular seleccionadas</span>
                                </button>
                                <button class="button is-light is-size-7" id="btn-export-csv">
                                    <span class="icon"><i class="fas fa-file-csv"></i></span>
                                    <span>Exportar CSV</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Filter tabs -->
                    <div class="tabs is-small">
                        <ul>
                            <li class="is-active" data-filter="all"><a>Todas (${sorted.length})</a></li>
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
                                            <th style="width:3rem"><input type="checkbox" id="check-all-void" aria-label="Seleccionar todas las anulables"></th>
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

        // Wire filter tabs + bulk actions
        wireFilters(sorted);
        wireBulkActions();
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
                currentFiltered = filtered;

                if (filtered.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="8" class="has-text-centered has-text-grey py-6">No hay facturas con este filtro.</td></tr>`;
                } else {
                    tbody.innerHTML = filtered.map(renderRow).join('');
                }
                updateVoidButton();
            });
        });
    }

    // ── Bulk void actions (F-11) ────────────────────────────────────────
    function wireBulkActions() {
        const checkAll = document.getElementById('check-all-void');
        if (checkAll) {
            checkAll.addEventListener('change', () => {
                document.querySelectorAll('.invoice-void-cb').forEach(cb => {
                    if (!cb.disabled) cb.checked = checkAll.checked;
                });
                updateVoidButton();
            });
        }

        const tbody = document.getElementById('invoices-body');
        if (tbody) {
            tbody.addEventListener('change', (e) => {
                if (e.target.classList.contains('invoice-void-cb')) updateVoidButton();
            });
        }

        const btnVoid = document.getElementById('btn-void-selected');
        if (btnVoid) {
            btnVoid.addEventListener('click', () => {
                const ids = Array.from(document.querySelectorAll('.invoice-void-cb:checked')).map(cb => cb.dataset.id);
                if (ids.length === 0) {
                    showToast('Selecciona al menos una factura enviada para anular', 'is-warning');
                    return;
                }
                openModal(
                    'Confirmar anulación',
                    `<p>¿Seguro que deseas anular <strong>${ids.length}</strong> factura(s)? Esta acción envía un registro de anulación a la AEAT y no se puede deshacer.</p>`,
                    async () => {
                        try {
                            await apiFetch(`/api/${companyId}/invoices/${ids.join(',')}/voided`, { method: 'POST' });
                            showToast(`${ids.length} factura(s) anulada(s) correctamente`, 'is-success');
                            window.location.reload();
                        } catch (err) {
                            showToast('Error al anular: ' + err.message, 'is-danger');
                        }
                    },
                    'Anular'
                );
            });
        }

        const btnExport = document.getElementById('btn-export-csv');
        if (btnExport) {
            btnExport.addEventListener('click', () => exportInvoicesCSV());
        }
    }

    function updateVoidButton() {
        const checked = document.querySelectorAll('.invoice-void-cb:checked');
        const btn = document.getElementById('btn-void-selected');
        if (!btn) return;
        btn.disabled = checked.length === 0;
        btn.querySelector('span:last-child').textContent = checked.length > 0
            ? `Anular ${checked.length} seleccionada(s)`
            : 'Anular seleccionadas';
    }

    // ── Export invoices to CSV (G-6) ───────────────────────────────────
    function exportInvoicesCSV() {
        const rows = currentFiltered || [];
        if (rows.length === 0) {
            showToast('No hay facturas para exportar', 'is-warning');
            return;
        }
        const escapeCSV = (val) => {
            const s = String(val == null ? '' : val);
            if (/[";\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
            return s;
        };
        const sep = ';';
        const header = ['Fecha', 'Número', 'Tipo', 'Cliente', 'NIF Cliente', 'Base', 'IVA', 'Total', 'Estado']
            .map(escapeCSV).join(sep);
        const body = rows.map(inv => {
            let estado = inv.voided ? 'Anulada' : (inv.verifactu_dt ? 'Enviada' : 'Pendiente');
            return [
                formatDate(inv.dt),
                inv.number_format || inv.num || '',
                inv.verifactu_type || '',
                inv.name || '',
                inv.vat_id || '',
                inv.bi != null ? String(inv.bi).replace('.', ',') : '',
                inv.tvat != null ? String(inv.tvat).replace('.', ',') : '',
                inv.total != null ? String(inv.total).replace('.', ',') : '',
                estado,
            ].map(escapeCSV).join(sep);
        }).join('\r\n');
        const csv = '\uFEFF' + header + '\r\n' + body;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'facturas.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
