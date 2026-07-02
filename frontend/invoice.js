// Veri*Factu — Invoice Creation Page

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');

    // ── State ──────────────────────────────────────────────────────────
    let companies = [];
    let selectedCompanyId = null;
    let selectedClientId = null;  // null = nuevo cliente
    let clients = [];
    let lines = []; // {descr, units, price, vat}
    let searchTimeout = null;

    // ── Helpers ────────────────────────────────────────────────────────
    function escHTML(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function renderLineIndex(i) {
        return i + 1;
    }

    // ── Build page skeleton ────────────────────────────────────────────
    function buildSkeleton() {
        return `
    ${navbarHTML('')}

    <section class="section">
        <div class="container">
            <p class="title">Nueva Factura</p>
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

            <!-- Client selector: always a searchable dropdown -->
            <div class="columns">
                <div class="column is-6">
                    <div class="field">
                        <label class="label">Seleccionar cliente</label>
                        <div class="control has-icons-left" style="position:relative;">
                            <input class="input" id="f-client-search" type="text"
                                   placeholder="Buscar o escribir nombre de cliente…">
                            <span class="icon is-left" id="client-search-icon" style="display:none;">
                                <i class="fas fa-check has-text-success"></i>
                            </span>
                            <div class="dropdown" id="client-dropdown" style="display:none; z-index:10; position:absolute; top:100%; left:0; right:0; min-width:100%;">
                                <div class="dropdown-menu" id="client-dropdown-menu"
                                      style="max-height:200px; overflow-y:auto; border:1px solid #dbdbdb; border-top:none; background:white;">
                                </div>
                            </div>
                        </div>
                        <p class="help is-size-7 has-text-grey" id="client-hint">
                            Selecciona un cliente existente o deja vacío para crear uno nuevo
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
                            <th style="width:5%">#</th>
                            <th style="width:30%">Descripción</th>
                            <th style="width:10%">Unidades</th>
                            <th style="width:12%">Precio</th>
                            <th style="width:8%">IVA%</th>
                            <th style="width:12%">Subtotal</th>
                            <th style="width:12%">IVA</th>
                            <th style="width:11%">Total</th>
                            <th style="width:7%">Acciones</th>
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
    function computeLineValues(line) {
        const units = parseFloat(line.units) || 0;
        const price = parseFloat(line.price) || 0;
        const vat = (parseFloat(line.vat) || 0);
        const subtotal = units * price;
        const iva = subtotal * vat / 100;
        const total = subtotal + iva;
        return { subtotal, iva, total };
    }

    function fmtEUR(n) {
        return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
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
            html += `
                <tr>
                    <td class="has-text-centered">${renderLineIndex(i)}</td>
                    <td>
                        <input class="input is-small" type="text" placeholder="Descripción"
                               value="${escHTML(line.descr)}" data-line="${i}" data-field="descr">
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
                               value="${line.vat}" data-line="${i}" data-field="vat">
                    </td>
                    <td class="has-text-right has-text-weight-bold">${fmtEUR(v.subtotal)}</td>
                    <td class="has-text-right has-text-weight-bold">${fmtEUR(v.iva)}</td>
                    <td class="has-text-right has-text-weight-bold has-text-link">${fmtEUR(v.total)}</td>
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
        document.getElementById('sum-base').value = fmtEUR(base);
        document.getElementById('sum-iva').value = fmtEUR(iva);
        document.getElementById('sum-total').value = fmtEUR(total);
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
        document.getElementById('f-name').value = '';
        document.getElementById('f-vat_id').value = '';
        document.getElementById('f-address').value = '';
        document.getElementById('f-postal_code').value = '';
        document.getElementById('f-city').value = '';
        document.getElementById('f-state').value = '';
        document.getElementById('f-country').value = 'ES';
        document.getElementById('f-email').value = '';
        const searchInput = document.getElementById('f-client-search');
        if (searchInput) searchInput.value = '';
        const icon = document.getElementById('client-search-icon');
        if (icon) icon.style.display = 'none';
        updateTypeBadge();
    }

// ── Pre-fill client fields from a saved client record ───────────────
    function fillClientDataFromClient(client) {
        selectedClientId = client.id;
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
    async function loadClients(companyId) {
        if (!companyId) {
            clients = [];
            buildClientDropdown([]);
            return;
        }
        try {
            clients = await apiFetch('/api/' + companyId + '/clients');
        } catch (err) {
            console.error('Error loading clients:', err);
            clients = [];
        }
        buildClientDropdown(clients);
    }

// ── Build client dropdown based on whether clients exist ────────────
    function buildClientDropdown(clientList) {
        const hint = document.getElementById('client-hint');
        const menu = document.getElementById('client-dropdown-menu');
        const searchInput = document.getElementById('f-client-search');

        if (clientList.length === 0) {
            // No clients: show hint, clear dropdown
            hint.textContent = 'No hay clientes aún — se guardará como nuevo cliente';
            hint.className = 'help is-size-7 has-text-grey';
            menu.innerHTML = '<div class="dropdown-item has-text-grey">No hay clientes disponibles</div>';
            searchInput.placeholder = 'Nuevo cliente — escribe el nombre';
        } else {
            // Clients exist: populate dropdown with all clients
            let html = '';
            clientList.forEach(c => {
                const vatPart = c.vat_id ? ' — ' + escHTML(c.vat_id) : '';
                html += '<div class="dropdown-item" data-client-id="' + c.id + '">'
                      + escHTML(c.name) + vatPart + '</div>';
            });
            menu.innerHTML = html;
            searchInput.placeholder = 'Buscar cliente existente…';
            hint.textContent = 'Selecciona un cliente de la lista o deja vacío para crear uno nuevo';
            hint.className = 'help is-size-7 has-text-grey';
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
                opts += `<option value="${c.id}">${escHTML(name)}</option>`;
            });
            select.innerHTML = opts;

            // Pre-select from URL param
            const urlCompanyId = getParam('company_id');
            if (urlCompanyId) {
                const found = list.find(c => String(c.id) === String(urlCompanyId));
                if (found) {
                    select.value = found.id;
                    selectedCompanyId = found.id;
                    // Load clients for this company (starts empty)
                    loadClients(found.id);
                    // Add visual indicator
                    const badge = document.createElement('span');
                    badge.className = 'tag is-success is-small ml-2';
                    badge.textContent = '✓ Seleccionada';
                    select.parentNode.appendChild(badge);
                }
            }

            // Enable select
            select.disabled = false;

        } catch (err) {
            wrapper.innerHTML = '<p class="has-text-danger">Error al cargar empresas: ' + escHTML(err.message) + '</p>';
            select.disabled = true;
        }
    }

    // ── Event: company selection ───────────────────────────────────────
    function bindCompanySelect() {
        const select = document.getElementById('company-select');
        select.addEventListener('change', async () => {
            selectedCompanyId = select.value || null;
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

    // ── Event: client search (searchable dropdown) ────────────────────
    function bindClientSearch() {
        const input = document.getElementById('f-client-search');
        const dropdown = document.getElementById('client-dropdown');
        const menu = document.getElementById('client-dropdown-menu');
        const icon = document.getElementById('client-search-icon');
        if (!input) return;

        let searchTimeout = null;

        // Show dropdown on focus
        input.addEventListener('focus', () => {
            dropdown.style.display = 'block';
        });

        // Filter on input
        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = input.value.trim().toLowerCase();

            if (!query) {
                selectedClientId = null;
                icon.style.display = 'none';
                // Re-show all clients
                buildClientDropdown(clients);
                return;
            }

            // Debounce search
            searchTimeout = setTimeout(() => {
                const results = clients.filter(c =>
                    c.name.toLowerCase().includes(query) ||
                    (c.vat_id && c.vat_id.toLowerCase().includes(query))
                );

                if (results.length === 0) {
                    menu.innerHTML = '<div class="dropdown-item has-text-grey">Sin resultados</div>';
                } else {
                    let html = '';
                    results.forEach(c => {
                        const vatPart = c.vat_id ? ' — ' + escHTML(c.vat_id) : '';
                        html += '<div class="dropdown-item" data-client-id="' + c.id + '">'
                              + escHTML(c.name) + vatPart + '</div>';
                    });
                    menu.innerHTML = html;
                }
                dropdown.style.display = 'block';
            }, 200);
        });

        // Handle click on dropdown items
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            const clientId = parseInt(item.dataset.clientId);
            const client = clients.find(c => c.id === clientId);
            if (client) {
                fillClientDataFromClient(client);
                input.value = client.name;
                dropdown.style.display = 'none';
                icon.style.display = '';
            }
        });

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#f-client-search') && !e.target.closest('#client-dropdown')) {
                dropdown.style.display = 'none';
            }
        });

        // Close on Escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        });
    }

    // ── Event: add line ────────────────────────────────────────────────
    function bindAddLine() {
        document.getElementById('btn-add-line').addEventListener('click', () => {
            lines.push({ descr: '', units: 1, price: 0, vat: 21 });
            renderLines();
        });
    }

    // ── Event: lines table (input changes + delete) ────────────────────
    function bindLinesTable() {
        const tbody = document.getElementById('lines-tbody');

        tbody.addEventListener('change', (e) => {
            const input = e.target.closest('input');
            if (!input) return;
            const lineIdx = parseInt(input.dataset.line);
            const field = input.dataset.field;
            if (isNaN(lineIdx) || !lines[lineIdx]) return;

            if (field === 'descr') {
                lines[lineIdx].descr = input.value;
            } else {
                lines[lineIdx][field] = parseFloat(input.value) || 0;
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
                    vat: parseFloat(l.vat) || 0
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
    loadCompanies();
    bindCompanySelect();
    bindClientSearch();
    bindAddLine();
    bindLinesTable();
    bindVatIdChange();
    bindSave();
    bindClear();
    updateTypeBadge();
});
