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
 * Fetch and display all dashboard statistics.
 */
async function loadDashboardStats() {
    // Card 1 — Companies count
    try {
        const companies = await apiFetch('/api/companies');
        const count = Array.isArray(companies) ? companies.length : (companies.total || companies.count || 0);
        document.getElementById('stat-companies').textContent = count;
    } catch (err) {
        console.error('Failed to load companies:', err);
        document.getElementById('stat-companies').textContent = '—';
        showToast('Error al cargar empresas: ' + err.message, 'is-danger');
    }

    // Card 2 — Pending invoices (total across all companies)
    try {
        const pending = await apiFetch('/api/pending');
        const count = Array.isArray(pending.pending) ? pending.pending.length : 0;
        document.getElementById('stat-pending').textContent = count;
    } catch (err) {
        console.error('Failed to load pending invoices:', err);
        document.getElementById('stat-pending').textContent = '—';
        showToast('Error al cargar facturas pendientes: ' + err.message, 'is-danger');
    }

    // Card 3 — Sent today (placeholder)
    document.getElementById('stat-sent-today').textContent = '—';
}

/**
 * Render the "Recent activity" section.
 * Currently shows an empty state; can be wired to a future /api/activity endpoint.
 */
function renderRecentActivity() {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    container.innerHTML = emptyState('No hay movimientos recientes para mostrar.');
}
