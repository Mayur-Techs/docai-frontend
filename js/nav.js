/**
 * js/nav.js — Injects the shared navigation bar into every page.
 * Call initNav() at the top of each page's script.
 * Automatically marks the current page link as active.
 */

function initNav() {
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  const isActive = (href) => {
    const hrefPath = href.replace(/\/$/, '') || '/';
    return currentPath === hrefPath || currentPath.endsWith(hrefPath);
  };

  const navHTML = `
    <nav class="nav">
      <div class="nav-inner">
        <a href="/" class="nav-logo">
          <div class="nav-logo-icon">📄</div>
          <div>
            <div class="nav-logo-name">DocIntel AI</div>
            <div class="nav-logo-tag">Document Intelligence</div>
          </div>
        </a>

        <div class="nav-links">
          <a href="/" class="nav-link ${isActive('/') && currentPath === '/' ? 'active' : ''}">Home</a>
          <a href="/demo.html" class="nav-link ${isActive('/demo') ? 'active' : ''}">Live Demo</a>
          <a href="/pricing.html" class="nav-link ${isActive('/pricing') ? 'active' : ''}">Pricing</a>
          <a href="${window.DocAPI?.baseUrl || '#'}/docs" class="nav-link" target="_blank">API Docs ↗</a>
        </div>

        <div style="display:flex;align-items:center;gap:1rem;">
          <div class="nav-status">
            <div class="status-dot js-status-dot"></div>
            <span class="js-api-status" style="color:var(--text-600)">Connecting...</span>
          </div>
          <a href="/demo.html" class="nav-cta">Try Free Demo</a>
        </div>
      </div>
    </nav>
  `;

  document.body.insertAdjacentHTML('afterbegin', navHTML);
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const colors = { info: 'var(--blue-500)', success: 'var(--green-500)', error: 'var(--red-500)' };
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.borderLeft = `3px solid ${colors[type] || colors.info}`;
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.classList.add('show'); });
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4000);
}

window.initNav = initNav;
window.showToast = showToast;
