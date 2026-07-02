// Veri*Factu — AEAT Query page

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    if (!app) return;

    // --- Build page ---
    app.innerHTML = `
        ${navbarHTML('query')}

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
                                Consultar
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
    let companies = [];
    apiFetch('/api/companies')
        .then(data => {
            companies = Array.isArray(data) ? data : (data.items || []);
            companies.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name || c.id;
                companySelect.appendChild(opt);
            });
        })
        .catch(err => {
            showToast('Error al cargar empresas: ' + err.message, 'is-danger');
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
        btnConsultar.textContent = 'Consultando…';
        resultsArea.innerHTML = '<div class="has-text-centered py-6"><p class="is-loading"></p></div>';

        try {
            const resp = await apiFetch(`/api/${companyId}/query?year=${year}&month=${month}`);
            const data = resp.data || [];

            if (!data.length) {
                resultsArea.innerHTML = emptyState('No se encontraron facturas para este período');
                return;
            }

            // Build table: iterate over first item's keys for columns
            const headers = Object.keys(data[0]);
            let tableHTML = `
                <table class="table is-fullwidth is-striped is-hoverable">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(row => {
                tableHTML += '<tr>';
                headers.forEach(h => {
                    const val = row[h];
                    tableHTML += `<td>${val !== null && val !== undefined ? escapeHtml(String(val)) : ''}</td>`;
                });
                tableHTML += '</tr>';
            });

            tableHTML += '</tbody></table>';
            resultsArea.innerHTML = tableHTML;
        } catch (err) {
            showToast('Error en la consulta: ' + err.message, 'is-danger');
            resultsArea.innerHTML = '';
        } finally {
            btnConsultar.disabled = false;
            btnConsultar.textContent = 'Consultar';
        }
    });
});
