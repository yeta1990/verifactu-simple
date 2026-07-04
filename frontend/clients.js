// Veri*Factu — Clients page (G-1)

document.addEventListener('DOMContentLoaded', async () => {
    const app = document.getElementById('app');
    let companies = [];
    try {
        companies = await apiFetch('/api/companies');
    } catch (err) {
        console.error('Error loading companies:', err);
    }

    let companyId = getParam('company_id') || getSelectedCompany();
    if (companyId && !companies.some(c => String(c.id) === String(companyId))) {
        // keep but it may be invalid
    }
    if (!companyId && companies.length > 0) {
        companyId = String(companies[0].id);
        setSelectedCompany(companyId);
    }

    let searchTimeout = null;

    function renderSkeleton() {
        app.innerHTML = `
            ${navbarHTML('clients', companies, companyId ? parseInt(companyId) : null)}
            <section class="section">
                <div class="container">
                    <h1 class="title">Clientes</h1>
                    <div class="has-text-centered py-6">
                        <p class="vf-spinner is-size-4 has-text-grey">Cargando clientes…</p>
                    </div>
                </div>
            </section>
        `;
    }

    function renderNoCompany() {
        app.innerHTML = `
            ${navbarHTML('clients', companies, null)}
            <section class="section">
                <div class="container has-text-centered">
                    <h1 class="title">No hay empresa seleccionada</h1>
                    <p class="has-text-grey">Selecciona o crea una empresa para gestionar sus clientes.</p>
                    <div class="mt-4">
                        <a href="/frontend/companies.html" class="button is-primary">Ir a Empresas</a>
                    </div>
                </div>
            </section>
        `;
    }

    function renderPage(clients) {
        const rows = (clients || []).map(c => `
            <tr>
                <td><strong>${escapeHtml(c.name || '')}</strong></td>
                <td>${escapeHtml(c.vat_id || '—')}</td>
                <td>${escapeHtml([c.address, c.postal_code, c.city].filter(Boolean).join(', ') || '—')}</td>
                <td>${escapeHtml(c.email || '—')}</td>
                <td>${escapeHtml(c.phone || '—')}</td>
                <td>
                    <div class="table-actions">
                        <button class="button is-small is-info is-outlined btn-edit-client" data-id="${c.id}">
                            <span class="icon is-small"><i class="fas fa-pen"></i></span>
                            <span>Editar</span>
                        </button>
                        <button class="button is-small is-danger is-outlined btn-delete-client" data-id="${c.id}" data-name="${escapeHtml(c.name || '')}">
                            <span class="icon is-small"><i class="fas fa-trash"></i></span>
                            <span>Eliminar</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        app.innerHTML = `
            ${navbarHTML('clients', companies, companyId ? parseInt(companyId) : null)}
            <section class="section">
                <div class="container">
                    <div class="level">
                        <div class="level-left">
                            <div>
                                <h1 class="title">Clientes</h1>
                                <p class="subtitle is-6 has-text-grey">Gestión de clientes de la empresa seleccionada</p>
                            </div>
                        </div>
                        <div class="level-right">
                            <div class="buttons">
                                <a href="/frontend/invoice.html?company_id=${companyId}" class="button is-primary is-size-7">
                                    <span class="icon"><i class="fas fa-plus"></i></span>
                                    <span>Nuevo cliente</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div class="field">
                        <div class="control has-icons-left">
                            <input class="input" type="text" id="client-search" placeholder="Buscar por nombre o NIF…">
                            <span class="icon is-left"><i class="fas fa-magnifying-glass"></i></span>
                        </div>
                    </div>

                    <div class="box">
                        <div class="table-container">
                            <table class="table is-fullwidth is-striped is-hoverable">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>NIF</th>
                                        <th>Dirección</th>
                                        <th>Email</th>
                                        <th>Teléfono</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="clients-body">
                                    ${rows || `<tr><td colspan="6" class="has-text-centered has-text-grey py-6">No hay clientes. Se crean automáticamente al facturar, o crea uno nuevo.</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="mt-3">
                        <a href="/frontend/company.html?id=${companyId}" class="button is-small is-light">← Volver a empresa</a>
                    </div>
                </div>
            </section>
        `;

        wireActions(clients);
    }

    // --- Modal de edición/creación (compartido) ---
    function openClientModal(client) {
        const isEdit = !!client;
        const c = client || {};
        const bodyHTML = `
            <form id="client-form">
                <div class="field">
                    <label class="label">Nombre *</label>
                    <div class="control">
                        <input class="input" type="text" name="name" value="${escapeHtml(c.name || '')}" required>
                    </div>
                </div>
                <div class="field">
                    <label class="label">NIF</label>
                    <div class="control">
                        <input class="input" type="text" name="vat_id" value="${escapeHtml(c.vat_id || '')}">
                    </div>
                </div>
                <div class="field">
                    <label class="label">Dirección</label>
                    <div class="control">
                        <input class="input" type="text" name="address" value="${escapeHtml(c.address || '')}">
                    </div>
                </div>
                <div class="columns">
                    <div class="column">
                        <div class="field">
                            <label class="label">Código postal</label>
                            <div class="control">
                                <input class="input" type="text" name="postal_code" value="${escapeHtml(c.postal_code || '')}">
                            </div>
                        </div>
                    </div>
                    <div class="column">
                        <div class="field">
                            <label class="label">Ciudad</label>
                            <div class="control">
                                <input class="input" type="text" name="city" value="${escapeHtml(c.city || '')}">
                            </div>
                        </div>
                    </div>
                    <div class="column">
                        <div class="field">
                            <label class="label">Provincia</label>
                            <div class="control">
                                <input class="input" type="text" name="state" value="${escapeHtml(c.state || '')}">
                            </div>
                        </div>
                    </div>
                    <div class="column">
                        <div class="field">
                            <label class="label">País</label>
                            <div class="control">
                                <input class="input" type="text" name="country" value="${escapeHtml(c.country || 'ES')}">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="field">
                    <label class="label">Email</label>
                    <div class="control">
                        <input class="input" type="text" name="email" value="${escapeHtml(c.email || '')}">
                    </div>
                </div>
            </form>
        `;
        openModal(
            isEdit ? 'Editar cliente' : 'Nuevo cliente',
            bodyHTML,
            async () => {
                const form = document.getElementById('client-form');
                if (!form.name.value.trim()) {
                    showToast('El nombre es obligatorio', 'is-warning');
                    return false;
                }
                const data = {
                    name: form.name.value.trim(),
                    vat_id: form.vat_id.value.trim(),
                    address: form.address.value.trim(),
                    postal_code: form.postal_code.value.trim(),
                    city: form.city.value.trim(),
                    state: form.state.value.trim(),
                    country: form.country.value.trim() || 'ES',
                    email: form.email.value.trim(),
                };
                try {
                    if (isEdit) {
                        await apiFetch(`/api/${companyId}/clients/${c.id}`, { method: 'PUT', body: JSON.stringify(data) });
                        showToast('Cliente actualizado', 'is-success');
                    } else {
                        await apiFetch(`/api/${companyId}/clients`, { method: 'POST', body: JSON.stringify(data) });
                        showToast('Cliente creado', 'is-success');
                    }
                    loadClients();
                } catch (err) {
                    showToast('Error: ' + err.message, 'is-danger');
                }
            },
            isEdit ? 'Guardar' : 'Crear'
        );
    }

    function wireActions(clients) {
        // Búsqueda incremental
        const search = document.getElementById('client-search');
        if (search) {
            search.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => loadClients(search.value.trim()), 300);
            });
        }

        const tbody = document.getElementById('clients-body');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.btn-edit-client');
                if (editBtn) {
                    const id = parseInt(editBtn.dataset.id, 10);
                    const client = (clients || []).find(c => c.id === id);
                    if (client) openClientModal(client);
                    return;
                }
                const delBtn = e.target.closest('.btn-delete-client');
                if (delBtn) {
                    const id = delBtn.dataset.id;
                    const name = delBtn.dataset.name || '';
                    openModal(
                        'Eliminar cliente',
                        `<p>¿Seguro que deseas eliminar el cliente <strong>${escapeHtml(name)}</strong>?</p>`,
                        async () => {
                            try {
                                await apiFetch(`/api/${companyId}/clients/${id}`, { method: 'DELETE' });
                                showToast('Cliente eliminado', 'is-success');
                                loadClients();
                            } catch (err) {
                                showToast('Error: ' + err.message, 'is-danger');
                            }
                        },
                        'Eliminar'
                    );
                }
            });
        }
    }

    async function loadClients(q) {
        if (!companyId) { renderNoCompany(); return; }
        try {
            const url = `/api/${companyId}/clients` + (q ? `?q=${encodeURIComponent(q)}` : '');
            const clients = await apiFetch(url);
            renderPage(clients);
        } catch (err) {
            app.innerHTML = `
                ${navbarHTML('clients', companies, parseInt(companyId))}
                <section class="section"><div class="container">
                    <div class="notification is-danger">Error al cargar clientes: ${escapeHtml(err.message)}</div>
                </div></section>
            `;
        }
    }

    // --- init ---
    if (!companyId) {
        renderNoCompany();
    } else {
        setSelectedCompany(companyId);
        renderSkeleton();
        loadClients();
    }
});
