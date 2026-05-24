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

  // Check login state
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  let user = null;
  if (token && userString) {
    try {
      user = JSON.parse(userString);
    } catch (e) {}
  }

  // Inject CSS styles for the profile elements dynamically
  const styleId = 'nav-dynamic-styles';
  if (!document.getElementById(styleId)) {
    const styles = `
      .nav-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }
      .nav-profile-block {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .profile-info {
        text-align: right;
      }
      .profile-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-200);
      }
      .plan-badge {
        display: inline-block;
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 1px 6px;
        border-radius: 4px;
        margin-top: 2px;
      }
      .plan-badge.free { background: rgba(255,255,255,0.05); color: var(--text-400); border: 1px solid var(--border); }
      .plan-badge.starter { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
      .plan-badge.business { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }
      .plan-badge.enterprise { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
      .logout-btn {
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-400);
        font-size: 12px;
        padding: 6px 12px;
        border-radius: var(--r-sm);
        cursor: pointer;
        transition: all 0.2s;
      }
      .logout-btn:hover {
        border-color: rgba(239, 68, 68, 0.4);
        color: var(--red-500);
        background: rgba(239, 68, 68, 0.02);
      }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  // Determine auth section HTML
  let authHTML = '';
  let navLinksHTML = `
    <a href="/" class="nav-link ${isActive('/') && currentPath === '/' ? 'active' : ''}">Home</a>
    <a href="/demo.html" class="nav-link ${isActive('/demo') ? 'active' : ''}">Live Demo</a>
  `;

  if (user) {
    navLinksHTML += `<a href="/dashboard.html" class="nav-link ${isActive('/dashboard') ? 'active' : ''}">Dashboard</a>`;
    authHTML = `
      <div class="nav-profile-block">
        <div class="profile-info">
          <div class="profile-name">${user.email}</div>
          <div class="plan-badge ${user.plan || 'free'}">${user.plan || 'free'} Plan</div>
        </div>
        <button class="logout-btn" onclick="logout()">Sign Out</button>
      </div>
    `;
  } else {
    authHTML = `
      <div class="nav-profile-block">
        <a href="/login.html" class="nav-link" style="border:1px solid var(--border)">Sign In</a>
        <a href="/demo.html" class="nav-cta">Try Free Demo</a>
      </div>
    `;
  }

  navLinksHTML += `<a href="/pricing.html" class="nav-link ${isActive('/pricing') ? 'active' : ''}">Pricing</a>`;
  navLinksHTML += `<a href="${window.DocAPI?.baseUrl || 'https://ai-document-intelligence.onrender.com/api/v1'}/docs" class="nav-link" target="_blank">API Docs ↗</a>`;

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
          ${navLinksHTML}
        </div>

        <div style="display:flex;align-items:center;gap:1.5rem;">
          <div class="nav-status">
            <div class="status-dot js-status-dot"></div>
            <span class="js-api-status" style="color:var(--text-600)">Connecting...</span>
          </div>
          ${authHTML}
        </div>
      </div>
    </nav>
  `;

  document.body.insertAdjacentHTML('afterbegin', navHTML);
}

// Global logout helper if not already defined
if (typeof window.logout !== 'function') {
  window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  };
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
