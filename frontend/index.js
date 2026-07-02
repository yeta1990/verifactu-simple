// Veri*Factu — Dashboard page logic

document.addEventListener('DOMContentLoaded', () => {
    // Inject navbar
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        navbarPlaceholder.innerHTML = navbarHTML('dashboard');
    }

    loadDashboardStats();
    renderRecentActivity();
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
