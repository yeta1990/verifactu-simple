document.addEventListener('DOMContentLoaded', async () => {
    const app = document.getElementById('app');

    // Load companies for navbar selector
    let companies = [];
    try {
        companies = await apiFetch('/api/companies');
    } catch (err) {
        console.error('Error loading companies for navbar:', err);
    }
    const selectedId = getSelectedCompany();

    // Navbar (companies already loaded above, pass them directly)
    app.innerHTML = navbarHTML('companies', companies, selectedId ? parseInt(selectedId) : null);

    // Content section
    app.innerHTML += `
        <section class="section">
            <div class="container">
                <div class="level">
                    <div class="level-left">
                        <h1 class="title">Empresas</h1>
                    </div>
                    <div class="level-right">
                        <a class="button is-primary" id="btn-new-company">
                            <span class="icon">
                                <i class="fas fa-plus"></i>
                            </span>
                            <span>Nueva empresa</span>
                        </a>
                    </div>
                </div>
                <div id="companies-table"></div>
            </div>
        </section>
    `;

    // Modal for creating a new company
    const modalHTML = `
        <div class="modal" id="company-modal">
            <div class="modal-background"></div>
            <div class="modal-card">
                <header class="modal-card-head">
                    <p class="modal-card-title">Nueva empresa</p>
                    <button class="delete" aria-label="close"></button>
                </header>
                <section class="modal-card-body">
                    <form id="company-form">
                        <div class="field">
                            <label class="label">Nombre *</label>
                            <div class="control">
                                <input class="input" type="text" name="name" required>
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">Nombre comercial</label>
                            <div class="control">
                                <input class="input" type="text" name="trade_name" placeholder="Nombre que aparece en la factura (opcional)">
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">NIF *</label>
                            <div class="control">
                                <input class="input" type="text" name="vat_id" required>
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">Dirección</label>
                            <div class="control">
                                <input class="input" type="text" name="address">
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">Código postal</label>
                            <div class="control">
                                <input class="input" type="text" name="postal_code">
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">Ciudad</label>
                            <div class="control">
                                <input class="input" type="text" name="city">
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">Provincia</label>
                            <div class="control">
                                <input class="input" type="text" name="state">
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">País</label>
                            <div class="control">
                                <input class="input" type="text" name="country" value="ES">
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">Email</label>
                            <div class="control">
                                <input class="input" type="text" name="email">
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">Teléfono</label>
                            <div class="control">
                                <input class="input" type="text" name="phone">
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">Contacto</label>
                            <div class="control">
                                <input class="input" type="text" name="contact">
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">
                                <input class="checkbox" type="checkbox" name="test" checked>
                                Modo prueba
                            </label>
                        </div>
                        <div class="field is-grouped">
                            <div class="control">
                                <button type="submit" class="button is-primary">Crear empresa</button>
                            </div>
                            <div class="control">
                                <button type="button" class="button is-light" id="btn-cancel-modal">Cancelar</button>
                            </div>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Fetch and render companies
    async function loadCompanies() {
        try {
            const companies = await apiFetch('/api/companies');
            const container = document.getElementById('companies-table');

            if (!companies || companies.length === 0) {
                container.innerHTML = emptyState('No hay empresas registradas — Crea tu primera empresa para empezar');
                return;
            }

            const rows = companies.map(company => `
                <tr>
                    <td>${escapeHtml(company.name)}</td>
                    <td>${escapeHtml(company.vat_id)}</td>
                    <td>${escapeHtml(company.country)}</td>
                    <td>${escapeHtml(company.phone || '—')}</td>
                    <td>
                        <a href="#" class="button is-small is-info is-outlined btn-view-company" data-id="${company.id}">
                            <span class="icon is-small"><i class="fas fa-eye"></i></span>
                            <span>Ver</span>
                        </a>
                    </td>
                </tr>
            `).join('');

            container.innerHTML = `
                <div class="table-container">
                    <table class="table is-striped is-hoverable">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>NIF</th>
                                <th>País</th>
                                <th>Teléfono</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            showToast('Error al cargar las empresas', 'is-danger');
        }
    }

    loadCompanies();

    // View company buttons — save as selected and navigate
    document.getElementById('companies-table').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-view-company');
        if (btn) {
            const id = btn.dataset.id;
            setSelectedCompany(id);
            window.location.href = `company.html?id=${id}`;
        }
    });

    // Open modal
    document.getElementById('btn-new-company').addEventListener('click', () => {
        const modal = document.getElementById('company-modal');
        if (modal) modal.classList.add('is-active');
    });

    // Cancel button closes modal
    document.getElementById('btn-cancel-modal').addEventListener('click', () => {
        const modal = document.getElementById('company-modal');
        modal.classList.remove('is-active');
    });

    // Modal background close
    document.querySelector('#company-modal .modal-background').addEventListener('click', () => {
        const modal = document.getElementById('company-modal');
        modal.classList.remove('is-active');
    });

    // Delete button close
    document.querySelector('#company-modal .delete').addEventListener('click', () => {
        const modal = document.getElementById('company-modal');
        modal.classList.remove('is-active');
    });

    // Form submit
    document.getElementById('company-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
            name: form.name.value,
            trade_name: form.trade_name.value,
            vat_id: form.vat_id.value,
            address: form.address.value,
            postal_code: form.postal_code.value,
            city: form.city.value,
            state: form.state.value,
            country: form.country.value,
            email: form.email.value,
            phone: form.phone.value,
            contact: form.contact.value,
            test: form.test.checked
        };

        try {
            const result = await apiFetch('/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            showToast('Empresa creada correctamente', 'is-success');
            const modal = document.getElementById('company-modal');
            modal.classList.remove('is-active');
            form.reset();
            form.test.checked = true;
            setSelectedCompany(result.id);
            window.location.href = `company.html?id=${result.id}`;
        } catch (err) {
            showToast('Error al crear la empresa: ' + err.message, 'is-danger');
        }
    });
});
