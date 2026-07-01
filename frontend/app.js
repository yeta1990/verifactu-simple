// Veri*Factu — Shared utilities

const API_BASE = '';

/**
 * Fetch wrapper with error handling.
 * @param {string} url - API endpoint
 * @param {object} opts - fetch options
 * @returns {Promise<object>} parsed JSON
 */
async function apiFetch(url, opts = {}) {
    const resp = await fetch(API_BASE + url, {
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        ...opts,
    });
    const data = await resp.json();
    if (!resp.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
    }
    return data;
}

/**
 * Show a Bulma toast notification.
 * @param {string} message
 * @param {'is-success'|'is-danger'|'is-warning'|'is-info'} type
 */
function showToast(message, type = 'is-info') {
    const existing = document.querySelector('.notification.is-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `notification ${type} is-toast`;
    toast.style.cssText = `
        position: fixed; top: 1rem; right: 1rem; z-index: 99999;
        min-width: 280px; max-width: 420px; box-shadow: 0 4px 12px rgba(0,0,0,.15);
        animation: slideIn .25s ease-out;
    `;
    toast.innerHTML = `
        <button class="delete" onclick="this.parentElement.remove()"></button>
        ${message}
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}

/** Inject keyframe animation once */
(function injectToastCSS() {
    const id = 'verifactu-toast-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
    document.head.appendChild(style);
})();

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

/**
 * Build the shared navbar HTML.
 * @param {string} activePage - current page identifier (e.g. 'dashboard', 'companies')
 * @returns {string}
 */
function navbarHTML(activePage = '') {
    const logo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 50'%3E%3Ctext x='5' y='36' font-family='Arial sans-serif' font-size='32' font-weight='bold' fill='%23ffffff'%3EVeri%3C/tex%3E%3Ctext x='55' y='36' font-family='Arial sans-serif' font-size='32' font-weight='bold' fill='%2348c78a'%3E%2A%3C/text%3E%3Ctext x='65' y='36' font-family='Arial sans-serif' font-size='32' font-weight='bold' fill='%23ffffff'%3EFactu%3C/text%3E%3C/svg%3E";
    const pages = [
        { id: 'dashboard',     label: 'Dashboard',     href: '/' },
        { id: 'companies',     label: 'Empresas',      href: '/frontend/companies.html' },
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