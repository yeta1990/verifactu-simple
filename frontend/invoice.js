// Veri*Factu — Invoice Creation Page

document.addEventListener('DOMContentLoaded', async () => {
    const app = document.getElementById('app');

    // ── State ──────────────────────────────────────────────────────────
    let companies = [];
    let selectedCompanyId = null;
    let selectedClientId = null;  // null = nuevo cliente
    let clients = [];
    let lines = []; // {descr, units, price, vat}
    let searchTimeout = null;

    // ── Helpers ────────────────────────────────────────────────────────
    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function renderLineIndex(i) {
        return i + 1;
    }

    // ── Load companies first (before rendering) ────────────────────────
    try {
        companies = await apiFetch('/api/companies');
        const list = Array.isArray(companies) ? companies : (companies.items || []);

        // Determine selected company: URL param > localStorage > first
        const urlCompanyId = getParam('company_id');
        const savedCompanyId = getSelectedCompany();

        if (urlCompanyId) {
            const found = list.find(c => String(c.id) === String(urlCompanyId));
            if (found) {
                selectedCompanyId = found.id;
                setSelectedCompany(found.id);
            }
        } else if (savedCompanyId) {
            const found = list.find(c => String(c.id) === String(savedCompanyId));
            if (found) {
                selectedCompanyId = found.id;
            }
        } else if (list.length > 0) {
            selectedCompanyId = list[0].id;
            setSelectedCompany(list[0].id);
        }
    } catch (err) {
        console.error('Error loading companies:', err);
    }

    // ── Build page skeleton ────────────────────────────────────────────
    function buildSkeleton() {
        return `
    ${navbarHTML('', companies, selectedCompanyId)}

    <section class="section">
        <div class="container">
            <h1 class="title">Nueva Factura</h1>
            <p class="subtitle">Rellenar los datos del cliente, líneas y resumen</p>

            <p class="mt-3">
                <a href="/frontend/companies.html" class="button is-small is-light">← Volver</a>
            </p>

            <!-- Company selector -->
            <div class="columns">
                <div class="column is-4">
                    <div class="field">
                        <label class="label">Empresa *</label>
                        <div class="control has-icons-left">
                            <span class="select is-fullwidth" id="company-select-wrapper">
                                <p class="control is-disabled">
                                    <select id="company-select" disabled>
                                        <option>Cargando empresas…</option>
                                    </select>
                                </p>
                            </span>
                            <span class="icon is-left"><i class="fas fa-building"></i></span>
                        </div>
                    </div>
                </div>
            </div>

            <hr>

            <!-- Section 1: Client data -->
            <h2 class="title is-5">Datos del cliente</h2>

            <!-- Client selector: native dropdown + incremental search (G-2) -->
            <div class="columns">
                <div class="column is-6">
                    <div class="field">
                        <label class="label">Buscar / seleccionar cliente</label>
                        <div class="control has-icons-left">
                            <input class="input" type="text" id="f-client-search" placeholder="Escribe para buscar (nombre o NIF)…">
                            <span class="icon is-left"><i class="fas fa-magnifying-glass"></i></span>
                        </div>
                        <div class="select is-fullwidth mt-2">
                            <select id="f-client-select">
                                <option value="">— Seleccionar cliente —</option>
                            </select>
                        </div>
                        <p class="help is-size-7 has-text-grey" id="client-hint">
                            Selecciona un cliente para auto-rellenar sus datos, o rellena los campos manualmente para crear uno nuevo
                        </p>
                    </div>
                </div>
            </div>

            <!-- Client NIF (moved to next row) -->
            <div class="columns">
                <div class="column is-4">
                    <div class="field">
                        <label class="label">NIF</label>
                        <div class="control">
                            <input class="input" id="f-vat_id" type="text" placeholder="B87654321">
                        </div>
                    </div>
                </div>
            </div>

            <hr>

            <!-- Client name (always visible, editable for new or selected client) -->
            <div class="columns">
                <div class="column is-4">
                    <div class="field">
                        <label class="label">Nombre cliente <span class="has-text-danger">*</span></label>
                        <div class="control">
                            <input class="input" id="f-name" type="text" placeholder="Nombre del cliente" required>
                        </div>
                    </div>
                </div>
                <div class="column is-4">
                    <div class="field">
                        <label class="label">Referencia</label>
                        <div class="control">
                            <input class="input" id="f-ref" type="text" placeholder="Ref. interna">
                        </div>
                    </div>
                </div>
            </div>

            <div class="columns">
                <div class="column is-8">
                    <div class="field">
                        <label class="label">Dirección</label>
                        <div class="control">
                            <input class="input" id="f-address" type="text" placeholder="Calle, número, piso…">
                        </div>
                    </div>
                </div>
                <div class="column is-2">
                    <div class="field">
                        <label class="label">C. Postal</label>
                        <div class="control">
                            <input class="input" id="f-postal_code" type="text" placeholder="28001">
                        </div>
                    </div>
                </div>
                <div class="column is-2">
                    <div class="field">
                        <label class="label">País</label>
                        <div class="control">
                            <input class="input" id="f-country" type="text" value="ES" placeholder="ES">
                        </div>
                    </div>
                </div>
            </div>

            <div class="columns">
                <div class="column is-4">
                    <div class="field">
                        <label class="label">Ciudad</label>
                        <div class="control">
                            <input class="input" id="f-city" type="text" placeholder="Madrid">
                        </div>
                    </div>
                </div>
                <div class="column is-4">
                    <div class="field">
                        <label class="label">Provincia</label>
                        <div class="control">
                            <input class="input" id="f-state" type="text" placeholder="Provincia">
                        </div>
                    </div>
                </div>
                <div class="column is-4">
                    <div class="field">
                        <label class="label">Email</label>
                        <div class="control">
                            <input class="input" id="f-email" type="text" placeholder="cliente@ejemplo.com">
                        </div>
                    </div>
                </div>
            </div>

            <div class="columns">
                <div class="column is-8">
                    <div class="field">
                        <label class="label">Observaciones</label>
                        <div class="control">
                            <textarea class="textarea" id="f-comments" placeholder="Notas internas sobre esta factura"></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <hr>

            <!-- Section 2: Invoice lines -->
            <div class="is-flex is-justify-content-space-between is-align-items-center mb-3">
                <h2 class="title is-5">Líneas de factura</h2>
                <button class="button is-primary is-size-7" id="btn-add-line">
                    <span class="icon"><i class="fas fa-plus"></i></span>
                    <span>Añadir línea</span>
                </button>
            </div>

            <div class="table-container">
                <table class="table is-fullwidth is-bordered" id="lines-table">
                    <thead>
                        <tr>
                            <th style="width:4%">#</th>
                            <th style="width:24%">Descripción</th>
                            <th style="width:8%">Unidades</th>
                            <th style="width:10%">Precio</th>
                            <th style="width:7%">IVA%</th>
                            <th style="width:7%">Clave</th>
                            <th style="width:8%">Calif.</th>
                            <th style="width:10%">Subtotal</th>
                            <th style="width:10%">IVA</th>
                            <th style="width:10%">Total</th>
                            <th style="width:6%">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="lines-tbody">
                        <!-- rows injected by JS -->
                    </tbody>
                </table>
            </div>

            <div class="has-text-centered has-text-grey mt-2" id="lines-empty">
                <p>Añade al menos una línea para crear la factura.</p>
            </div>
            <p class="help is-size-7 has-text-grey mt-2">
                <strong>IVA% vacío</strong> = operación no sujeta/exenta (Calificación N1). •
                <strong>Clave</strong>: 01 general, 02 exportación, 03 bienes usados, 04 agencias viaje, 05 cupones, 06 determinadas, 07 itinerancia. •
                <strong>Calif.</strong>: Auto = según IVA; S1 sujeta, S2 exenta, N1 no sujeta, N2 no sujeta por localización.
            </p>

            <hr>

            <!-- Section 3: Summary -->
            <h2 class="title is-5">Resumen</h2>
            <div class="columns">
                <div class="column is-4 is-offset-8">
                    <div class="field">
                        <label class="label">Base imponible</label>
                        <div class="control">
                            <input class="input is-static" id="sum-base" type="text" value="0,00 €" readonly>
                        </div>
                    </div>
                    <div class="field">
                        <label class="label">Cuota IVA</label>
                        <div class="control">
                            <input class="input is-static" id="sum-iva" type="text" value="0,00 €" readonly>
                        </div>
                    </div>
                    <div class="field">
                        <label class="label has-text-weight-bold">TOTAL</label>
                        <div class="control">
                            <input class="input is-size-5 has-text-weight-bold" id="sum-total" type="text" value="0,00 €" readonly>
                        </div>
                    </div>
                </div>
            </div>

            <hr>

            <!-- Type badge (informational) -->
            <div class="field">
                <div class="control">
                    <span class="tag is-info is-medium" id="type-badge">Tipo: F2 (sin NIF)</span>
                </div>
            </div>

            <!-- Action buttons -->
            <div class="field is-grouped is-justify-content-flex-end mt-5">
                <button class="button is-light" id="btn-clear">Limpiar</button>
                <button class="button is-primary" id="btn-save">Guardar factura</button>
            </div>
        </div>
    </section>
        `;
    }

    // ── Compute line values ─────────────────────────────────────────────
    // Debe replicar el cálculo del backend (app/models.py process_lines):
    // cuota sobre la base SIN redondear y redondeo aritmético al alza (half-up).
    function computeLineValues(line) {
        const units = parseFloat(line.units) || 0;
        const price = parseFloat(line.price) || 0;
        const vat = (parseFloat(line.vat) || 0);
        const baseRaw = units * price;                 // base sin redondear
        const subtotal = roundHalfUp2(baseRaw);        // base imponible
        const iva = vat ? roundHalfUp2(baseRaw * vat / 100) : 0;  // cuota sobre base sin redondear
        const total = roundHalfUp2(subtotal + iva);    // base + cuota (coherente)
        return { subtotal, iva, total };
    }

    // ── Render lines table ─────────────────────────────────────────────
    function renderLines() {
        const tbody = document.getElementById('lines-tbody');
        const emptyMsg = document.getElementById('lines-empty');

        if (lines.length === 0) {
            tbody.innerHTML = '';
            emptyMsg.style.display = '';
            updateSummary();
            return;
        }

        emptyMsg.style.display = 'none';

        let html = '';
        lines.forEach((line, i) => {
            const v = computeLineValues(line);
            const vatVal = (line.vat === '' || line.vat == null) ? '' : line.vat;
            html += `
                <tr>
                    <td class="has-text-centered">${renderLineIndex(i)}</td>
                    <td>
                        <input class="input is-small" type="text" placeholder="Descripción"
                               value="${escapeHtml(line.descr)}" data-line="${i}" data-field="descr">
                    </td>
                    <td>
                        <input class="input is-small has-text-centered" type="number" min="0" step="any"
                               value="${line.units}" data-line="${i}" data-field="units">
                    </td>
                    <td>
                        <input class="input is-small has-text-right" type="number" min="0" step="any"
                               value="${line.price}" data-line="${i}" data-field="price">
                    </td>
                    <td>
                        <input class="input is-small has-text-centered" type="number" min="0" step="any"
                               value="${vatVal}" data-line="${i}" data-field="vat" placeholder="Vacío=exenta">
                    </td>
                    <td>
                        <div class="select is-small">
                            <select data-line="${i}" data-field="clave_regimen" aria-label="Clave de régimen">
                                ${['01','02','03','04','05','06','07'].map(k =>
                                    `<option value="${k}" ${line.clave_regimen === k ? 'selected' : ''}>${k}</option>`).join('')}
                            </select>
                        </div>
                    </td>
                    <td>
                        <div class="select is-small">
                            <select data-line="${i}" data-field="calificacion" aria-label="Calificación operación">
                                ${[['','Auto'],['S1','S1 suj.'],['S2','S2 exenta'],['S3','S3'],['N1','N1 no suj.'],['N2','N2']].map(([val,label]) =>
                                    `<option value="${val}" ${line.calificacion === val ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
                            </select>
                        </div>
                    </td>
                    <td class="has-text-right has-text-weight-bold">${formatEUR(v.subtotal)}</td>
                    <td class="has-text-right has-text-weight-bold">${formatEUR(v.iva)}</td>
                    <td class="has-text-right has-text-weight-bold has-text-link">${formatEUR(v.total)}</td>
                    <td class="has-text-centered">
                        <button class="button is-small is-danger is-outlined btn-delete-line" data-line="${i}">
                            <span class="icon is-small"><i class="fas fa-trash"></i></span>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        updateSummary();
    }

    // ── Update summary totals ──────────────────────────────────────────
    function updateSummary() {
        let base = 0, iva = 0, total = 0;
        lines.forEach(line => {
            const v = computeLineValues(line);
            base += v.subtotal;
            iva += v.iva;
            total += v.total;
        });
        // Redondear los totales acumulados (la suma de float puede dar ruido)
        document.getElementById('sum-base').value = formatEUR(roundHalfUp2(base));
        document.getElementById('sum-iva').value = formatEUR(roundHalfUp2(iva));
        document.getElementById('sum-total').value = formatEUR(roundHalfUp2(total));
    }

    // ── Update type badge ──────────────────────────────────────────────
    function updateTypeBadge() {
        const vatId = document.getElementById('f-vat_id').value.trim();
        const badge = document.getElementById('type-badge');
        if (vatId) {
            badge.textContent = 'Tipo: F1 (con NIF)';
            badge.className = 'tag is-success is-medium';
        } else {
            badge.textContent = 'Tipo: F2 (sin NIF)';
            badge.className = 'tag is-info is-medium';
        }
    }

// ── Clear client fields (start fresh for new client) ────────────────
    function clearClientFields() {
        selectedClientId = null;
        document.getElementById('f-client-select').value = '';
        document.getElementById('f-name').value = '';
        document.getElementById('f-vat_id').value = '';
        document.getElementById('f-address').value = '';
        document.getElementById('f-postal_code').value = '';
        document.getElementById('f-city').value = '';
        document.getElementById('f-state').value = '';
        document.getElementById('f-country').value = 'ES';
        document.getElementById('f-email').value = '';
        updateTypeBadge();
    }

// ── Pre-fill client fields from a saved client record ───────────────
    function fillClientDataFromClient(client) {
        selectedClientId = client.id;
        document.getElementById('f-client-select').value = client.id;
        document.getElementById('f-name').value = client.name || '';
        document.getElementById('f-vat_id').value = client.vat_id || '';
        document.getElementById('f-address').value = client.address || '';
        document.getElementById('f-postal_code').value = client.postal_code || '';
        document.getElementById('f-city').value = client.city || '';
        document.getElementById('f-state').value = client.state || '';
        document.getElementById('f-country').value = client.country || 'ES';
        document.getElementById('f-email').value = client.email || '';
        updateTypeBadge();
    }

// ── Load clients for a company and populate dropdown ────────────────
    async function loadClients(companyId, q) {
        if (!companyId) {
            clients = [];
            buildClientDropdown([]);
            return;
        }
        try {
            const url = '/api/' + companyId + '/clients' + (q ? ('?q=' + encodeURIComponent(q)) : '');
            clients = await apiFetch(url);
        } catch (err) {
            console.error('Error loading clients:', err);
            clients = [];
        }
        buildClientDropdown(clients);
    }

// ── Build client dropdown options ──────────────────────────────────
    function buildClientDropdown(clientList) {
        const hint = document.getElementById('client-hint');
        const select = document.getElementById('f-client-select');

        if (clientList.length === 0) {
            // No clients: show empty state in select
            select.innerHTML = '<option value="" disabled selected>No hay clientes registrados</option>';
            hint.textContent = 'No hay clientes registrados. Rellena los datos del cliente para crear uno nuevo.';
        } else {
            // Clients exist: populate select with all clients
            let opts = '<option value="">— Seleccionar cliente —</option>';
            clientList.forEach(c => {
                const label = c.vat_id ? escapeHtml(c.name) + ' — ' + escapeHtml(c.vat_id) : escapeHtml(c.name);
                opts += '<option value="' + c.id + '">' + label + '</option>';
            });
            select.innerHTML = opts;
            hint.textContent = 'Selecciona un cliente para auto-rellenar sus datos, o rellena los campos manualmente para crear uno nuevo';
        }

        selectedClientId = null;
    }

    // ── Load companies ─────────────────────────────────────────────────
    async function loadCompanies() {
        const wrapper = document.getElementById('company-select-wrapper');
        const select = document.getElementById('company-select');

        try {
            companies = await apiFetch('/api/companies');
            // companies may be an array or { items: [...], ...} — handle both
            const list = Array.isArray(companies) ? companies : (companies.items || []);

            // Clear placeholder
            wrapper.querySelector('p').classList.remove('is-disabled');
            wrapper.innerHTML = '';
            wrapper.appendChild(select);

            let opts = '<option value="">— Seleccionar empresa —</option>';
            list.forEach(c => {
                const name = c.name || 'Empresa sin nombre';
                opts += `<option value="${c.id}">${escapeHtml(name)}</option>`;
            });
            select.innerHTML = opts;

            // Pre-select priority: URL param > localStorage > first company
            let preselected = null;
            const urlCompanyId = getParam('company_id');
            const savedCompanyId = getSelectedCompany();

            if (urlCompanyId) {
                preselected = list.find(c => String(c.id) === String(urlCompanyId));
            } else if (savedCompanyId) {
                preselected = list.find(c => String(c.id) === String(savedCompanyId));
            }

            if (preselected) {
                select.value = preselected.id;
                selectedCompanyId = preselected.id;
                // Save to localStorage for future use
                setSelectedCompany(preselected.id);
                // Load clients for this company
                loadClients(preselected.id);
                // Add visual indicator
                const badge = document.createElement('span');
                badge.className = 'tag is-success is-small ml-2';
                badge.textContent = '✓ Seleccionada';
                select.parentNode.appendChild(badge);
            }

            // Enable select
            select.disabled = false;

        } catch (err) {
            wrapper.innerHTML = '<p class="has-text-danger">Error al cargar empresas: ' + escapeHtml(err.message) + '</p>';
            select.disabled = true;
        }
    }

    // ── Event: company selection ───────────────────────────────────────
    function bindCompanySelect() {
        const select = document.getElementById('company-select');
        select.addEventListener('change', async () => {
            selectedCompanyId = select.value || null;
            // Save to localStorage
            if (selectedCompanyId) {
                setSelectedCompany(selectedCompanyId);
            }
            // Remove old badge if any
            const old = select.parentNode.querySelector('.tag');
            if (old) old.remove();

            // Load clients for selected company
            if (selectedCompanyId) {
                await loadClients(selectedCompanyId);
            } else {
                clients = [];
                buildClientDropdown([]);
            }

            // Always clear client fields — never pre-fill with company data
            clearClientFields();

            if (selectedCompanyId) {
                const badge = document.createElement('span');
                badge.className = 'tag is-success is-small ml-2';
                badge.textContent = '✓ Seleccionada';
                select.parentNode.appendChild(badge);
            }
        });
    }

    // ── Event: client select change ──────────────────────────
    function bindClientSelect() {
        const select = document.getElementById('f-client-select');
        if (!select) return;

        select.addEventListener('change', () => {
            const val = select.value;
            if (!val) {
                clearClientFields();
                return;
            }
            const clientId = parseInt(val);
            const client = clients.find(c => c.id === clientId);
            if (client) {
                fillClientDataFromClient(client);
            }
        });
    }

    // ── Event: client search (incremental, G-2) ─────────────────────
    function bindClientSearch() {
        const search = document.getElementById('f-client-search');
        if (!search) return;
        search.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (selectedCompanyId) loadClients(selectedCompanyId, search.value.trim());
            }, 300);
        });
    }

    // ── Event: add line ────────────────────────────────────────────────
    function bindAddLine() {
        document.getElementById('btn-add-line').addEventListener('click', () => {
            lines.push({ descr: '', units: 1, price: 0, vat: 21, clave_regimen: '01', calificacion: '' });
            renderLines();
        });
    }

    // ── Event: lines table (input changes + delete) ────────────────────
    function bindLinesTable() {
        const tbody = document.getElementById('lines-tbody');

        tbody.addEventListener('change', (e) => {
            const el = e.target.closest('input, select');
            if (!el) return;
            const lineIdx = parseInt(el.dataset.line);
            const field = el.dataset.field;
            if (isNaN(lineIdx) || !lines[lineIdx]) return;

            if (field === 'descr') {
                lines[lineIdx].descr = el.value;
            } else if (field === 'vat') {
                // IVA vacío = operación no sujeta/exenta (C-1)
                lines[lineIdx].vat = el.value === '' ? '' : parseFloat(el.value);
            } else if (field === 'clave_regimen' || field === 'calificacion') {
                lines[lineIdx][field] = el.value;
            } else {
                lines[lineIdx][field] = parseFloat(el.value) || 0;
            }
            renderLines();
        });

        // Delete line
        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-delete-line');
            if (!btn) return;
            const idx = parseInt(btn.dataset.line);
            if (!isNaN(idx) && lines[idx]) {
                lines.splice(idx, 1);
                renderLines();
            }
        });
    }

    // ── Event: VAT ID change → type badge ──────────────────────────────
    function bindVatIdChange() {
        document.getElementById('f-vat_id').addEventListener('input', updateTypeBadge);
    }

    // ── Event: save ────────────────────────────────────────────────────
    function bindSave() {
        document.getElementById('btn-save').addEventListener('click', async () => {
            // Validation
            const name = document.getElementById('f-name').value.trim();
            if (!name) {
                showToast('El nombre del cliente es obligatorio.', 'is-danger');
                document.getElementById('f-name').focus();
                return;
            }
            if (!selectedCompanyId) {
                showToast('Selecciona una empresa.', 'is-warning');
                document.getElementById('company-select').focus();
                return;
            }
            if (lines.length === 0) {
                showToast('Añade al menos una línea.', 'is-warning');
                return;
            }

            // Validate each line
            for (let i = 0; i < lines.length; i++) {
                const l = lines[i];
                if (!l.descr.trim()) {
                    showToast(`La línea ${i + 1} necesita una descripción.`, 'is-danger');
                    return;
                }
                if (parseFloat(l.units) <= 0) {
                    showToast(`La línea ${i + 1} necesita unidades > 0.`, 'is-danger');
                    return;
                }
                if (parseFloat(l.price) <= 0) {
                    showToast(`La línea ${i + 1} necesita precio > 0.`, 'is-danger');
                    return;
                }
            }

            const payload = {
                client_id: selectedClientId,
                name: name,
                vat_id: document.getElementById('f-vat_id').value.trim(),
                address: document.getElementById('f-address').value.trim(),
                postal_code: document.getElementById('f-postal_code').value.trim(),
                city: document.getElementById('f-city').value.trim(),
                state: document.getElementById('f-state').value.trim(),
                country: document.getElementById('f-country').value.trim() || 'ES',
                email: document.getElementById('f-email').value.trim(),
                ref: document.getElementById('f-ref').value.trim(),
                comments: document.getElementById('f-comments').value.trim(),
                lines: lines.map(l => ({
                    descr: l.descr,
                    units: parseFloat(l.units) || 0,
                    price: parseFloat(l.price) || 0,
                    vat: (l.vat === '' || l.vat == null) ? null : parseFloat(l.vat),
                    clave_regimen: l.clave_regimen || '01',
                    calificacion: l.calificacion || null
                }))
            };

            const btn = document.getElementById('btn-save');
            btn.disabled = true;
            btn.innerHTML = '<span class="icon"><i class="fas fa-spinner fa-spin"></i></span> Guardando…';

            try {
                const resp = await apiFetch(`/api/${selectedCompanyId}/invoices`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                const invoiceId = resp.id;
                showToast('Factura guardada correctamente.', 'is-success');

                // Redirect to detail page
                const urlCompanyId = getParam('company_id') || selectedCompanyId;
                window.location.href = `invoice-detail.html?id=${invoiceId}&company_id=${urlCompanyId}`;

            } catch (err) {
                showToast('Error al guardar: ' + err.message, 'is-danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Guardar factura';
            }
        });
    }

    // ── Event: clear ───────────────────────────────────────────────────
    function bindClear() {
        document.getElementById('btn-clear').addEventListener('click', () => {
            clearClientFields();
            document.getElementById('f-name').value = '';
            document.getElementById('f-address').value = '';
            document.getElementById('f-postal_code').value = '';
            document.getElementById('f-city').value = '';
            document.getElementById('f-state').value = '';
            document.getElementById('f-country').value = 'ES';
            document.getElementById('f-email').value = '';
            document.getElementById('f-ref').value = '';
            document.getElementById('f-comments').value = '';
            lines = [];
            renderLines();
            updateTypeBadge();
        });
    }

    // ── Init ───────────────────────────────────────────────────────────
    app.innerHTML = buildSkeleton();

    // If a company is pre-selected, load its clients
    if (selectedCompanyId) {
        loadClients(selectedCompanyId);
    }

    bindCompanySelect();
    bindClientSelect();
    bindClientSearch();
    bindAddLine();
    bindLinesTable();
    bindVatIdChange();
    bindSave();
    bindClear();
    updateTypeBadge();
});
