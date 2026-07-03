// Veri*Factu — AEAT Query page

document.addEventListener('DOMContentLoaded', async () => {
    const app = document.getElementById('app');
    if (!app) return;

    // Load companies for navbar selector
    let companies = [];
    try {
        companies = await apiFetch('/api/companies');
    } catch (err) {
        console.error('Error loading companies for navbar:', err);
    }
    const selectedId = getSelectedCompany();

    // --- Build page ---
    app.innerHTML = `
        ${navbarHTML('query', companies, selectedId ? parseInt(selectedId) : null)}

        <section class="section">
            <div class="container">
                <h1 class="title">Consulta AEAT</h1>

                <div class="box">
                    <div class="columns">
                        <div class="column">
                            <label class="label" for="company-select">Empresa</label>
                            <div class="select is-fullwidth">
                                <select id="company-select">
                                    <option value="">— Seleccionar empresa —</option>
                                </select>
                            </div>
                        </div>
                        <div class="column">
                            <label class="label" for="year-select">Año</label>
                            <div class="select is-fullwidth">
                                <select id="year-select"></select>
                            </div>
                        </div>
                        <div class="column">
                            <label class="label" for="month-select">Mes</label>
                            <div class="select is-fullwidth">
                                <select id="month-select"></select>
                            </div>
                        </div>
                        <div class="column is-narrow" style="display:flex;align-items:flex-end;">
                            <button id="btn-consultar" class="button is-primary is-fullwidth">
                                <span class="icon"><i class="fas fa-magnifying-glass"></i></span>
                                <span>Consultar</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div id="results-area"></div>
            </div>
        </section>
    `;

    // --- Populate selects ---
    const companySelect = document.getElementById('company-select');
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const btnConsultar = document.getElementById('btn-consultar');
    const resultsArea = document.getElementById('results-area');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Years: currentYear … 2200
    for (let y = currentYear; y <= 2200; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    // Months: 01 … 12
    for (let m = 1; m <= 12; m++) {
        const ms = String(m).padStart(2, '0');
        const opt = document.createElement('option');
        opt.value = ms;
        opt.textContent = monthNames[m - 1];
        if (ms === currentMonth) opt.selected = true;
        monthSelect.appendChild(opt);
    }

    // --- Load companies ---
    companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name || c.id;
        companySelect.appendChild(opt);
    });

    // --- Consultar handler ---
    btnConsultar.addEventListener('click', async () => {
        const companyId = companySelect.value;
        const year = yearSelect.value;
        const month = monthSelect.value;

        if (!companyId) {
            showToast('Selecciona una empresa', 'is-warning');
            return;
        }

        btnConsultar.disabled = true;
        btnConsultar.innerHTML = '<span class="vf-spinner"></span> Consultando…';
        resultsArea.innerHTML = '<div class="has-text-centered py-6"><p class="vf-spinner vf-spinner-lg has-text-grey">Consultando AEAT…</p></div>';

        try {
            const resp = await apiFetch(`/api/${companyId}/query?year=${year}&month=${month}`);
            const data = resp.data || [];

            if (!data.length) {
                resultsArea.innerHTML = emptyState('No se encontraron facturas para este período');
                return;
            }

            // Define meaningful columns from the nested structure
            const columns = [
                { label: 'NIF Emisor',           extract: r => r.IDFactura?.IDEmisorFactura || '' },
                { label: 'Num. Factura',         extract: r => r.IDFactura?.NumSerieFactura || '' },
                { label: 'Fecha Factura',        extract: r => r.IDFactura?.FechaExpedicionFactura || '' },
                { label: 'Descripción',          extract: r => r.DatosRegistroFacturacion?.DescripcionOperacion || '' },
                { label: 'Tipo Factura',         extract: r => r.DatosRegistroFacturacion?.TipoFactura || '' },
                { label: 'Destinatario',         extract: r => {
                        const d = r.DatosRegistroFacturacion?.Destinatarios;
                        return d?.IDDestinatario?.NombreRazon
                            ? d.IDDestinatario.NombreRazon + ' (' + d.IDDestinatario.NIF + ')'
                            : (r.FacturaSinIdentifDestinatarioArt61d === 'S' ? '(Sin identificar)' : '');
                    }},
                { label: 'Base Imponible',       extract: r => {
                        const ds = r.DatosRegistroFacturacion?.Desglose?.DetalleDesglose;
                        return ds?.BaseImponibleOimporteNoSujeto ? formatEUR(ds.BaseImponibleOimporteNoSujeto) : '';
                    }},
                { label: 'Cuota Iva',            extract: r => {
                        const ds = r.DatosRegistroFacturacion?.Desglose?.DetalleDesglose;
                        return ds?.CuotaRepercutida ? formatEUR(ds.CuotaRepercutida) : '';
                    }},
                { label: 'Tipo Impositivo',      extract: r => {
                        const ds = r.DatosRegistroFacturacion?.Desglose?.DetalleDesglose;
                        return ds?.TipoImpositivo ? ds.TipoImpositivo + '%' : '';
                    }},
                { label: 'Clave Régimen',        extract: r => {
                        const ds = r.DatosRegistroFacturacion?.Desglose?.DetalleDesglose;
                        return ds?.ClaveRegimen || '';
                    }},
                { label: 'Importe Total',        extract: r => {
                        const total = r.DatosRegistroFacturacion?.ImporteTotal;
                        return total ? formatEUR(total) : '';
                    }},
                { label: 'NIF Presentador',      extract: r => r.DatosPresentacion?.NIFPresentador || '' },
                { label: 'Fecha/Hora Registro',  extract: r => formatDate(r.DatosRegistroFacturacion?.FechaHoraHusoGenRegistro) },
                { label: 'Huella',               extract: r => r.DatosRegistroFacturacion?.Huella ? escapeHtml(r.DatosRegistroFacturacion.Huella.slice(0, 16)) + '…' : '' },
                { label: 'Estado',               extract: r => r.EstadoRegistro?.EstadoRegistro || '' },
                { label: 'Id Petición',          extract: r => r.DatosPresentacion?.IdPeticion || '' },
            ];

            let tableHTML = `
                <div class="table-container">
                    <table class="table is-fullwidth is-striped is-hoverable is-bordered">
                        <thead>
                            <tr>
                                ${columns.map(c => `<th>${c.label}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;

            data.forEach(row => {
                tableHTML += '<tr>';
                columns.forEach(col => {
                    const val = col.extract(row);
                    tableHTML += `<td>${val !== null && val !== undefined && val !== '' ? escapeHtml(String(val)) : '<span class="has-text-light">—</span>'}</td>`;
                });
                tableHTML += '</tr>';
            });

            tableHTML += '</tbody></table></div>';
            resultsArea.innerHTML = tableHTML;
        } catch (err) {
            showToast('Error en la consulta: ' + err.message, 'is-danger');
            resultsArea.innerHTML = '';
        } finally {
            btnConsultar.disabled = false;
            btnConsultar.innerHTML = '<span class="icon"><i class="fas fa-magnifying-glass"></i></span><span>Consultar</span>';
        }
    });
});
