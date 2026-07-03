// Veri*Factu — Company Detail page

document.addEventListener('DOMContentLoaded', async () => {
    const companyId = getParam('id');
    if (!companyId) {
        document.getElementById('app').innerHTML = emptyState('No se ha especificado una empresa.');
        return;
    }

    try {
        // Fetch all companies, then find the matching one
        const companies = await apiFetch('/api/companies');
        const company = companies.find(c => String(c.id) === String(companyId));

        if (!company) {
            document.getElementById('app').innerHTML = emptyState('Empresa no encontrada.');
            return;
        }

        // Save as selected company
        setSelectedCompany(companyId);

        // Render company detail + invoices
        // Render company detail + invoices
        const html = renderCompany(company, companyId, companies) + await renderInvoices(companyId);
        document.getElementById('app').innerHTML = html;

        // Wire edit modal
        wireEditModal(company);

    } catch (err) {
        document.getElementById('app').innerHTML = emptyState('Error al cargar los datos: ' + err.message);
        showToast('Error al cargar la empresa', 'is-danger');
    }
});

function renderCompany(company, companyId, companies) {
    const fields = [
        { label: 'Nombre',       value: company.name },
        { label: 'Nombre comercial', value: company.trade_name },
        { label: 'NIF / VAT',    value: company.vat_id },
        { label: 'Dirección',    value: company.address },
        { label: 'Código Postal',value: company.postal_code },
        { label: 'Ciudad',       value: company.city },
        { label: 'Provincia',    value: company.state },
        { label: 'País',         value: company.country },
        { label: 'Email',        value: company.email },
        { label: 'Teléfono',     value: company.phone },
        { label: 'Contacto',     value: company.contact },
        { label: 'Fórmula',      value: company.formula },
        { label: 'Fórmula (R)',  value: company.formula_r },
        { label: 'Primera núm.', value: company.first_num },
        { label: 'Creada',       value: formatDate(company.created) },
        { label: 'Test',         value: company.test ? 'Sí' : 'No' },
        { label: 'Últ. envío',   value: formatDate(company.next_send) },
    ];

    const rows = fields.map(f => `
        <tr>
            <th class="is-vcentered">${f.label}</th>
            <td class="is-vcentered">${f.value || '—'}</td>
        </tr>
    `).join('');

    return `
    ${navbarHTML('companies', companies || [], parseInt(companyId))}
    <section class="section">
        <div class="container">
            <p class="mb-3">
                <a href="/frontend/companies.html" class="button is-small is-light">← Volver</a>
            </p>
            <h1 class="title">${company.name}</h1>
            <p class="subtitle is-6 has-text-grey">${company.vat_id || ''}</p>

            <div class="box">
                <table class="table is-fullwidth">
                    <tbody>${rows}</tbody>
                </table>
            </div>

            <div class="buttons">
                <a href="/frontend/invoice.html?company_id=${company.id}" class="button is-primary">
                    <span class="icon"><i class="fas fa-plus"></i></span>
                    <span>Nueva factura</span>
                </a>
                <button class="button is-light" id="btn-edit-company">
                    <span class="icon"><i class="fas fa-pen"></i></span>
                    <span>Editar empresa</span>
                </button>
            </div>

            <div class="modal" id="edit-modal">
                <div class="modal-background"></div>
                <div class="modal-card">
                    <header class="modal-card-head">
                        <p class="modal-card-title">Editar empresa</p>
                        <button class="delete" aria-label="close"></button>
                    </header>
                    <section class="modal-card-body">
                        <form id="edit-form">
                            <div class="field">
                                <label class="label">Nombre *</label>
                                <div class="control">
                                    <input class="input" type="text" name="name" value="${escapeHtml(company.name || '')}" required>
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Nombre comercial</label>
                                <div class="control">
                                    <input class="input" type="text" name="trade_name" value="${escapeHtml(company.trade_name || '')}" placeholder="Nombre que aparece en la factura (opcional)">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">NIF *</label>
                                <div class="control">
                                    <input class="input" type="text" name="vat_id" value="${escapeHtml(company.vat_id || '')}" required>
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Dirección</label>
                                <div class="control">
                                    <input class="input" type="text" name="address" value="${escapeHtml(company.address || '')}">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Código postal</label>
                                <div class="control">
                                    <input class="input" type="text" name="postal_code" value="${escapeHtml(company.postal_code || '')}">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Ciudad</label>
                                <div class="control">
                                    <input class="input" type="text" name="city" value="${escapeHtml(company.city || '')}">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Provincia</label>
                                <div class="control">
                                    <input class="input" type="text" name="state" value="${escapeHtml(company.state || '')}">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">País</label>
                                <div class="control">
                                    <input class="input" type="text" name="country" value="${escapeHtml(company.country || 'ES')}">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Email</label>
                                <div class="control">
                                    <input class="input" type="text" name="email" value="${escapeHtml(company.email || '')}">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Teléfono</label>
                                <div class="control">
                                    <input class="input" type="text" name="phone" value="${escapeHtml(company.phone || '')}">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Contacto</label>
                                <div class="control">
                                    <input class="input" type="text" name="contact" value="${escapeHtml(company.contact || '')}">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">
                                    <input class="checkbox" type="checkbox" name="test" ${company.test ? 'checked' : ''}>
                                    Modo prueba
                                </label>
                            </div>
                            <div class="field is-grouped">
                                <div class="control">
                                    <button type="submit" class="button is-primary">Guardar cambios</button>
                                </div>
                                <div class="control">
                                    <button type="button" class="button is-light" id="btn-cancel-edit">Cancelar</button>
                                </div>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </div>
    </section>`;
}

async function renderInvoices(companyId) {
    let invoices = [];
    try {
        invoices = await apiFetch(`/api/${companyId}/invoices`);
    } catch (_) {
        // If endpoint doesn't exist, fall back to empty
        invoices = [];
    }

    if (!invoices || invoices.length === 0) {
        return `
        <section class="section">
            <div class="container">
                ${emptyState('Esta empresa no tiene facturas — Crea la primera factura')}
            </div>
        </section>`;
    }

    // Check for pending invoices to conditionally show "Enviar facturas"
    const hasPending = invoices.some(inv => !inv.verifactu_dt && !inv.voided);
    let sendButtonHTML = '';
    if (hasPending) {
        sendButtonHTML = `
            <div class="buttons">
                <a href="/frontend/process.html?company_id=${companyId}" class="button is-info">
                    <span class="icon"><i class="fas fa-paper-plane"></i></span>
                    <span>Enviar facturas</span>
                </a>
            </div>
        `;
    }

    const rows = invoices.map(inv => {
        // Status determination
        let statusTag;
        if (inv.voided) {
            statusTag = '<span class="tag is-danger">Anulada</span>';
        } else if (inv.verifactu_dt) {
            statusTag = '<span class="tag is-success">Enviada</span>';
        } else {
            statusTag = '<span class="tag is-warning">Pendiente</span>';
        }

        return `
        <tr>
            <td>${formatDate(inv.dt)}</td>
            <td>${inv.number_format || inv.num || '—'}</td>
            <td>${inv.verifactu_type || '—'}</td>
            <td>${formatEUR(inv.total)}</td>
            <td>${statusTag}</td>
            <td>
                <a href="/frontend/invoice-detail.html?id=${inv.id}&company_id=${companyId}">Ver</a>
            </td>
        </tr>`;
    }).join('');

    return `
    <section class="section">
        <div class="container">
            <h2 class="title is-4">Facturas</h2>
            ${sendButtonHTML}
            <div class="box">
                <table class="table is-fullwidth is-striped is-hoverable">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Número</th>
                            <th>Tipo</th>
                            <th>Importe total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    </section>`;
}

function wireEditModal(company) {
    const modal = document.getElementById('edit-modal');
    if (!modal) return;

    const btnEdit = document.getElementById('btn-edit-company');
    const btnCancel = document.getElementById('btn-cancel-edit');
    const btnDelete = modal.querySelector('.delete');
    const bg = modal.querySelector('.modal-background');
    const form = document.getElementById('edit-form');

    const close = () => modal.classList.remove('is-active');
    const open = () => modal.classList.add('is-active');

    if (btnEdit) btnEdit.addEventListener('click', open);
    if (btnCancel) btnCancel.addEventListener('click', close);
    if (btnDelete) btnDelete.addEventListener('click', close);
    if (bg) bg.addEventListener('click', close);

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
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
                await apiFetch(`/api/${company.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                showToast('Empresa actualizada correctamente', 'is-success');
                close();
                location.reload();
            } catch (err) {
                showToast('Error al actualizar la empresa: ' + err.message, 'is-danger');
            }
        });
    }
}
