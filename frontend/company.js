// Veri*Factu — Company Detail page

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('navbar').innerHTML = navbarHTML('companies');

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

        // Render company detail + invoices
        const html = renderCompany(company) + await renderInvoices(companyId);
        document.getElementById('app').innerHTML = html;

    } catch (err) {
        document.getElementById('app').innerHTML = emptyState('Error al cargar los datos: ' + err.message);
        showToast('Error al cargar la empresa', 'is-danger');
    }
});

function renderCompany(company) {
    const fields = [
        { label: 'Nombre',       value: company.name },
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
