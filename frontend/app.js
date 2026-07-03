// Veri*Factu — Shared utilities

const API_BASE = '';

/**
 * Fetch wrapper with robust error handling.
 *
 * El backend responde errores como JSON {error: '...'}, pero a veces la
 * respuesta no es JSON (página HTML 500, 204 vacío, 405, caída de red...).
 * Antes se hacía resp.json() antes de comprobar resp.ok y se perdía el
 * mensaje real (SyntaxError "Unexpected token"). Ahora se lee de forma
 * segura y siempre se lanza un Error legible.
 *
 * @param {string} url - API endpoint
 * @param {object} opts - fetch options
 * @returns {Promise<object>} parsed JSON (lanza Error si no es ok)
 */
async function apiFetch(url, opts = {}) {
    let resp;
    try {
        resp = await fetch(API_BASE + url, {
            headers: { 'Content-Type': 'application/json', ...opts.headers },
            ...opts,
        });
    } catch (networkErr) {
        // Sin red, servidor caído, CORS, etc.
        throw new Error('No se ha podido conectar con el servidor. Comprueba que está en ejecución.');
    }

    // Leemos el cuerpo como texto y parseamos JSON de forma segura
    // (la respuesta puede no ser JSON: HTML de error 500, 204 vacío, etc.)
    let data = null;
    let parseErr = null;
    try {
        const text = await resp.text();
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (_) {
                // El cuerpo no es JSON (p.ej. HTML de error de Flask)
                parseErr = text.trim().slice(0, 200);
            }
        }
    } catch (_) {
        // No se pudo leer el cuerpo
    }

    if (!resp.ok) {
        let msg = '';
        if (data && typeof data === 'object' && data.error) {
            msg = data.error;
        } else if (data && typeof data === 'object' && data.message) {
            msg = data.message;
        } else if (parseErr) {
            msg = parseErr;
        } else {
            msg = `Error HTTP ${resp.status}`;
        }
        // Añadimos el código de estado para facilitar el diagnóstico
        const err = new Error(msg);
        err.status = resp.status;
        err.data = data;
        throw err;
    }

    // Respuesta OK pero sin cuerpo (p.ej. 204) → devolvemos objeto vacío
    return data ?? {};
}

/**
 * Show a Bulma toast notification.
 * Los toasts se apilan verticalmente (no se eliminan entre sí) y los de
 * error/aviso duran más que los de éxito/info.
 * @param {string} message
 * @param {'is-success'|'is-danger'|'is-warning'|'is-info'} type
 * @param {number} [duration] - ms (opcional; por defecto según tipo)
 */
function showToast(message, type = 'is-info', duration) {
    const icons = {
        'is-success': 'fa-circle-check',
        'is-danger':  'fa-circle-exclamation',
        'is-warning': 'fa-triangle-exclamation',
        'is-info':    'fa-circle-info',
    };
    const defaultDuration = {
        'is-success': 4000,
        'is-info':    4000,
        'is-warning': 7000,
        'is-danger':  8000,
    };
    const ms = duration ?? defaultDuration[type] ?? 5000;

    // Apilar toasts existentes: recalculamos posición vertical
    const stack = document.querySelectorAll('.notification.is-toast');
    let topOffset = 1; // rem
    stack.forEach(t => { topOffset += t.offsetHeight / 16 + 0.5; });

    const toast = document.createElement('div');
    toast.className = `notification ${type} is-toast`;
    toast.style.top = `${topOffset}rem`;
    toast.innerHTML = `
        <span class="toast-icon"><i class="fas ${icons[type] || icons['is-info']}"></i></span>
        <span class="toast-body">${message}</span>
        <button class="delete" aria-label="cerrar"></button>
    `;
    document.body.appendChild(toast);

    const remove = () => {
        toast.style.transition = 'opacity .3s ease, transform .3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(110%)';
        setTimeout(() => {
            toast.remove();
            // Reordenar toasts restantes
            let offset = 1;
            document.querySelectorAll('.notification.is-toast').forEach(t => {
                t.style.top = `${offset}rem`;
                offset += t.offsetHeight / 16 + 0.5;
            });
        }, 300);
    };

    toast.querySelector('.delete').addEventListener('click', remove);
    let toastTimer = setTimeout(remove, ms);
    // Pausar auto-cierre al entrar el ratón y reanudarlo al salir
    toast.addEventListener('mouseenter', () => clearTimeout(toastTimer));
    toast.addEventListener('mouseleave', () => { toastTimer = setTimeout(remove, ms); });
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str - Raw string
 * @returns {string} Escaped HTML
 */
function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

/**
 * Open a Bulma modal. Returns a reference to the modal element.
 * @param {string} title - Modal title
 * @param {string} bodyHTML - Inner HTML for modal-content
 * @param {function|null} onConfirm - callback when confirm clicked (if null, no confirm btn)
 * @param {string} confirmText - label for confirm button
 * @returns {HTMLElement} the modal element
 */
function openModal(title, bodyHTML, onConfirm = null, confirmText = 'Aceptar') {
    const modal = document.createElement('div');
    modal.className = 'modal is-active';
    modal.innerHTML = `
        <div class="modal-background" onclick="this.closest('.modal').classList.remove('is-active')"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">${title}</p>
                <button class="delete" aria-label="close" onclick="this.closest('.modal').classList.remove('is-active')"></button>
            </header>
            <section class="modal-card-body">${bodyHTML}</section>
            ${onConfirm ? `<footer class="modal-card-foot">
                <button class="button is-primary modal-confirm">${confirmText}</button>
                <button class="button modal-cancel" onclick="this.closest('.modal').classList.remove('is-active')">Cancelar</button>
            </footer>` : ''}
        </div>
    `;
    document.body.appendChild(modal);
    if (onConfirm) {
        modal.querySelector('.modal-confirm').addEventListener('click', () => {
            onConfirm();
            modal.classList.remove('is-active');
        });
    }
    return modal;
}

/**
 * Show an empty-state placeholder.
 * @param {string} message
 * @returns {string} HTML
 */
function emptyState(message) {
    return `<div class="has-text-centered has-text-grey py-6">${message}</div>`;
}

/**
 * Format a date string for display.
 * @param {string} dt - ISO date or datetime string
 * @returns {string}
 */
function formatDate(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * Format a number as EUR.
 * @param {number} n
 * @returns {string}
 */
function formatEUR(n) {
    return parseFloat(n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

/**
 * Get URL query parameter by name.
 * @param {string} name
 * @returns {string|null}
 */
function getParam(name) {
    const p = new URLSearchParams(window.location.search);
    return p.get(name);
}

// ── Company persistence (localStorage) ──────────────────────────────────

const STORAGE_KEY = 'verifactu_selected_company';

/**
 * Get the currently selected company ID from localStorage.
 * @returns {string|null}
 */
function getSelectedCompany() {
    return localStorage.getItem(STORAGE_KEY);
}

/**
 * Save a company ID as the selected (default) company.
 * @param {string|number} companyId
 */
function setSelectedCompany(companyId) {
    if (companyId) {
        localStorage.setItem(STORAGE_KEY, String(companyId));
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
}

/**
 * Build the company selector dropdown with options already embedded.
 * @param {Array<{id: number,name:string}>|null} companies - companies list (or null for empty)
 * @param {number|null} selectedId
 * @returns {string}
 */
function companySelectorHTML(companies, selectedId = null) {
    selectedId = selectedId ? String(selectedId) : null;
    const opts = (companies || []).map(c => {
        const name = c.name || 'Empresa sin nombre';
        const sel = String(c.id) === selectedId ? ' selected' : '';
        return `<option value="${c.id}"${sel}>${escapeHtml(name)}</option>`;
    }).join('');

    return `
        <div class="navbar-item">
            <div class="control">
                <div class="select is-small is-fullwidth">
                    <select onchange="onNavbarCompanyChange(this.value)">
                        <option value="">Empresa…</option>
                        ${opts}
                    </select>
                </div>
            </div>
        </div>
    `;
}

/**
 * Called when navbar company selector changes.
 * Saves to localStorage and navigates to invoices page.
 * @param {string} companyId
 */
function onNavbarCompanyChange(companyId) {
    if (companyId) {
        setSelectedCompany(companyId);
        window.location.href = `/frontend/invoices.html?company_id=${companyId}`;
    } else {
        setSelectedCompany(null);
    }
}

/**
 * Build the shared navbar HTML.
 * @param {string} activePage - current page identifier (e.g. 'dashboard', 'companies')
 * @param {Array<{id: number,name:string}>|null} companies - companies list for selector
 * @param {number|null} selectedId - pre-selected company ID
 * @returns {string}
 */
function navbarHTML(activePage = '', companies = null, selectedId = null) {
    const logo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 50'%3E%3Ctext x='5' y='36' font-family='Arial sans-serif' font-size='32' font-weight='bold' fill='%23ffffff'%3EVeri%3C/tex%3E%3Ctext x='55' y='36' font-family='Arial sans-serif' font-size='32' font-weight='bold' fill='%2348c78a'%3E%2A%3C/text%3E%3Ctext x='65' y='36' font-family='Arial sans-serif' font-size='32' font-weight='bold' fill='%23ffffff'%3EFactu%3C/text%3E%3C/svg%3E";
    const pages = [
        { id: 'dashboard',     label: 'Dashboard',     href: '/' },
        { id: 'companies',     label: 'Empresas',      href: '/frontend/companies.html' },
        { id: 'invoices',      label: 'Facturas',      href: '/frontend/invoices.html' },
        { id: 'process',       label: 'Envío',         href: '/frontend/process.html' },
        { id: 'query',         label: 'Consulta AEAT', href: '/frontend/query.html' },
        { id: 'config',        label: 'Configuración',  href: '/frontend/config.html' },
    ];
    return `
    <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
        <div class="navbar-brand">
            <a class="navbar-item" href="/">
                <img src="${logo}" alt="Veri*Factu" style="max-height:2.2rem; margin-right:0.5rem;">
                <strong>Veri*Factu</strong>
            </a>
            <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false" data-target="main-navbar">
                <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
            </a>
        </div>
        <div id="main-navbar" class="navbar-menu">
            <div class="navbar-start">
                ${pages.map(p => `
                    <a class="navbar-item ${p.id === activePage ? 'is-active' : ''}" href="${p.href}">${p.label}</a>
                `).join('')}
            </div>
            <div class="navbar-end">
                ${companySelectorHTML(companies, selectedId)}
            </div>
        </div>
    </nav>`;
}

/** Activate Bulma navbar burger toggle */
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        const burger = e.target.closest('.navbar-burger');
        if (burger) {
            const target = document.getElementById(burger.dataset.target);
            burger.classList.toggle('is-active');
            if (target) target.classList.toggle('is-active');
        }
    });
});