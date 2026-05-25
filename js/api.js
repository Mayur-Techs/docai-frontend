/**
 * js/api.js — API Client for DocIntel AI
 *
 * Rules:
 *  - uploadDocument: NO auth header (anonymous uploads allowed)
 *  - All read/write document endpoints: Authorization: Bearer {token}
 *  - fetchStats: no auth (public)
 *  - getStats: auth required
 */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/api/v1'
  : 'https://doc-intelligence-api-tubh.onrender.com/api/v1';

const AUTH_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/auth'
  : 'https://doc-intelligence-api-tubh.onrender.com/auth';

let _backendReady = false;
let _wakeupPromise = null;

/* ── Token helper ──────────────────────────────────────────────────────────── */
function _getToken() {
  const t = localStorage.getItem('token');
  return (t && t !== 'null' && t !== 'undefined' && t.trim() !== '') ? t : null;
}

/* ── Authenticated fetch (only used for protected endpoints) ───────────────── */
async function authFetch(url, options = {}) {
  const token = _getToken();
  options.headers = options.headers || {};
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const path = window.location.pathname.toLowerCase();
      const isAuthPage = path.includes('login') || path.includes('signup');
      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }
    return res;
  } catch (err) {
    console.error('[DocIntel] API error:', err);
    throw err;
  }
}

/* ── Backend wakeup (Render cold-start) ────────────────────────────────────── */
async function wakeupBackend() {
  if (_backendReady) return true;
  if (_wakeupPromise) return _wakeupPromise;

  _wakeupPromise = (async () => {
    const rootUrl = API_BASE.replace('/api/v1', '');
    const start = Date.now();
    for (let i = 0; i < 12; i++) {
      try {
        const r = await fetch(`${rootUrl}/health`, {
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        });
        if (r.ok) {
          _backendReady = true;
          console.log(`[DocIntel] Backend ready in ${((Date.now() - start) / 1000).toFixed(1)}s`);
          document.querySelectorAll('.js-api-status').forEach(el => {
            el.textContent = '● API Live';
            el.style.color = 'var(--green-500, #10b981)';
          });
          document.querySelectorAll('.js-status-dot').forEach(el => {
            el.style.background = 'var(--green-500, #10b981)';
          });
          return true;
        }
      } catch (_) { /* still waking up */ }
      await new Promise(r => setTimeout(r, 5000));
    }
    console.warn('[DocIntel] Backend did not respond in time.');
    return false;
  })();

  return _wakeupPromise;
}

/* ── DocAPI ────────────────────────────────────────────────────────────────── */
const DocAPI = {

  /* Auth */
  async register(email, password, fullName) {
    const res = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw Object.assign(new Error(data.detail || 'Registration failed'), { status: res.status, data });
    }
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Login failed');
    }
    const data = await res.json();
    // Backend returns access_token at top level; user object may be nested or flat
    const token = data.access_token || data.token;
    const user = data.user || { email, plan: 'free' };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return data;
  },

  async getProfile() {
    const res = await authFetch(`${AUTH_BASE}/me`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    const data = await res.json();
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  /* Documents */

  /**
   * uploadDocument — NO Authorization header.
   * Anonymous uploads are allowed by the backend for the demo.
   */
  async uploadDocument(file, documentType) {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${API_BASE}/documents/upload?document_type=${encodeURIComponent(documentType)}`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      // Deliberately NO Authorization header — backend accepts anonymous uploads
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw Object.assign(new Error(data.detail || 'Upload failed'), { status: res.status });
    }
    return res.json();
  },

  async pollDocument(docId, onInterim) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const iv = setInterval(async () => {
        attempts++;
        if (attempts > 35) {
          clearInterval(iv);
          reject(new Error('Document processing timed out'));
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/documents/${docId}/status`);
          if (!res.ok) throw new Error('Status check failed');
          const data = await res.json();
          if (onInterim) onInterim(data);
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(iv);
            const full = await fetch(`${API_BASE}/documents/${docId}`);
            if (!full.ok) throw new Error('Failed to fetch result');
            resolve(full.json());
          }
        } catch (err) {
          clearInterval(iv);
          reject(err);
        }
      }, 2000);
    });
  },

  async listDocuments() {
    const res = await authFetch(`${API_BASE}/documents/`);
    if (!res.ok) throw new Error('Failed to list documents');
    return res.json();
  },

  async deleteDocument(id) {
    const res = await authFetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    return true;
  },

  async reprocessDocument(id) {
    const res = await authFetch(`${API_BASE}/documents/${id}/reprocess`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reprocess document');
    return res.json();
  },

  /* Stats */
  async getStats() {
    // Authenticated — GET /api/v1/stats
    const res = await authFetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async fetchStats() {
    // Public — GET /api/v1/stats (no auth)
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  /* Feedback */
  async submitFeedback(documentId, rating) {
    // rating: 1 for positive, -1 for negative
    const res = await authFetch(`${API_BASE}/documents/${documentId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Feedback submission failed');
    }
    return res.json().catch(() => ({}));
  },

  /* Exports — fetch as blob then trigger download */
  async downloadExport(documentId, format) {
    // format: 'csv' or 'excel'
    const res = await authFetch(`${API_BASE}/documents/${documentId}/export/${format}`);
    if (!res.ok) {
      if (res.status === 401) return; // authFetch already redirected
      throw new Error(`Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${documentId}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  /* Email export */
  async emailExport(documentId, toEmail) {
    const res = await authFetch(
      `${API_BASE}/documents/${documentId}/export/email?to=${encodeURIComponent(toEmail)}`
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Email export failed');
    }
    return res.json();
  },

  /* Utilities */
  wakeupBackend,
  isReady: () => _backendReady,
  baseUrl: API_BASE.replace('/api/v1', ''),
  getToken: _getToken,
};

// Kick off wakeup silently on every page load
wakeupBackend();
