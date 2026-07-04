// Veri*Factu — Dashboard page logic

document.addEventListener('DOMContentLoaded', async () => {
    // Load companies for navbar selector
    let companies = [];
    try {
        companies = await apiFetch('/api/companies');
    } catch (err) {
        console.error('Failed to load companies for navbar:', err);
    }
    const selectedId = getSelectedCompany();

    // Inject navbar with company selector
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        navbarPlaceholder.innerHTML = navbarHTML('dashboard', companies, selectedId ? parseInt(selectedId) : null);
    }

    loadDashboardStats();
    renderRecentActivity();

    // New invoice button — redirect with selected company
    const btnNewInvoice = document.getElementById('btn-new-invoice');
    if (btnNewInvoice) {
        btnNewInvoice.addEventListener('click', (e) => {
            e.preventDefault();
            const companyId = getSelectedCompany();
            if (companyId) {
                window.location.href = `/frontend/invoice.html?company_id=${companyId}`;
            } else {
                window.location.href = '/frontend/invoice.html';
            }
        });
    }
});

/**
 * Fetch and display all dashboard statistics (en paralelo).
 */
async function loadDashboardStats() {
    const [companiesRes, pendingRes, statsRes] = await Promise.all([
        apiFetch('/api/companies').catch(err => ({ __err: err })),
        apiFetch('/api/pending').catch(err => ({ __err: err })),
        apiFetch('/api/stats').catch(err => ({ __err: err })),
    ]);

    // Card 1 — Companies count
    if (companiesRes && companiesRes.__err) {
        document.getElementById('stat-companies').textContent = '—';
        showToast('Error al cargar empresas: ' + companiesRes.__err.message, 'is-danger');
    } else {
        const count = Array.isArray(companiesRes) ? companiesRes.length : 0;
        document.getElementById('stat-companies').textContent = count;
    }

    // Card 2 — Pending invoices
    if (pendingRes && pendingRes.__err) {
        document.getElementById('stat-pending').textContent = '—';
        if (!(pendingRes.__err.status === 401)) {
            showToast('Error al cargar facturas pendientes: ' + pendingRes.__err.message, 'is-danger');
        }
    } else {
        const count = Array.isArray(pendingRes.pending) ? pendingRes.pending.length : 0;
        document.getElementById('stat-pending').textContent = count;
    }

    // Card 3 — Sent today
    if (statsRes && statsRes.__err) {
        document.getElementById('stat-sent-today').textContent = '—';
    } else {
        document.getElementById('stat-sent-today').textContent = statsRes.sent_today ?? 0;
    }
}

/**
 * Render the "Recent activity" section from /api/activity.
 */
async function renderRecentActivity() {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    try {
        const resp = await apiFetch('/api/activity');
        const items = Array.isArray(resp.activity) ? resp.activity : [];
        if (items.length === 0) {
            container.innerHTML = emptyState('No hay movimientos recientes para mostrar.');
            return;
        }
        const rows = items.map(it => {
            const tagClass = it.action === 'Anulada' ? 'is-danger'
                : it.action === 'Enviada a AEAT' ? 'is-success'
                : 'is-info';
            return `
                <tr>
                    <td><span class="tag ${tagClass} is-size-7">${escapeHtml(it.action)}</span></td>
                    <td>${escapeHtml(it.num || '—')}</td>
                    <td>${escapeHtml(it.verifactu_type || '—')}</td>
                    <td>${escapeHtml(it.company_name || '—')}</td>
                    <td class="has-text-right">${formatEUR(it.total)}</td>
                    <td>${formatDate(it.when)}</td>
                </tr>
            `;
        }).join('');
        container.innerHTML = `
            <div class="table-container">
                <table class="table is-fullwidth is-striped is-narrow">
                    <thead>
                        <tr>
                            <th>Acción</th>
                            <th>Número</th>
                            <th>Tipo</th>
                            <th>Empresa</th>
                            <th class="has-text-right">Total</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = emptyState('No se pudo cargar la actividad reciente.');
    }
}
