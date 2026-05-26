/**
 * js/api.js — API Client for DocIntel AI
 *
 * Rules:
 *  - Every fetch call must include credentials: 'include' to automatically send cookies.
 *  - No localStorage for tokens or user details.
 *  - No Authorization: Bearer headers.
 */

const API_BASE = 'https://doc-intelligence-api-tubh.onrender.com/api/v1';
const AUTH_BASE = 'https://doc-intelligence-api-tubh.onrender.com/auth';

let _backendReady = false;
let _wakeupPromise = null;

/* ── Standard Fetch Helper with Credentials ────────────────────────────────── */
async function authFetch(url, options = {}) {
  options.credentials = 'include';
  try {
    return await fetch(url, options);
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
          credentials: 'include',
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
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    return res.json();
  },

  async getProfile() {
    const res = await authFetch(`${AUTH_BASE}/me`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    return res.json();
  },

  /* Documents */
  async uploadDocument(file, documentType) {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${API_BASE}/documents/upload?document_type=${encodeURIComponent(documentType)}`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
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
          const res = await fetch(`${API_BASE}/documents/${docId}/status`, {
            credentials: 'include'
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || err.message || 'Request failed');
          }
          const data = await res.json();
          if (onInterim) onInterim(data);
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(iv);
            const full = await fetch(`${API_BASE}/documents/${docId}`, {
              credentials: 'include'
            });
            if (!full.ok) {
              const err = await full.json().catch(() => ({}));
              throw new Error(err.detail || err.message || 'Request failed');
            }
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    return res.json();
  },

  async getDocuments() {
    return this.listDocuments();
  },

  async deleteDocument(id) {
    const res = await authFetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    return true;
  },

  async reprocessDocument(id) {
    const res = await authFetch(`${API_BASE}/documents/${id}/reprocess`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    return res.json();
  },

  /* Stats */
  async getStats() {
    const res = await authFetch(`${API_BASE}/stats`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    return res.json();
  },

  async fetchStats() {
    const res = await fetch(`${API_BASE}/stats`, { credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    return res.json();
  },

  /* Feedback */
  async submitFeedback(documentId, rating) {
    const res = await authFetch(`${API_BASE}/documents/${documentId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    return res.json().catch(() => ({}));
  },

  /* Exports */
  async downloadCSV(docId) {
    const res = await fetch(`${API_BASE}/documents/${docId}/export/csv`, {
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${docId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  async downloadExcel(docId) {
    const res = await fetch(`${API_BASE}/documents/${docId}/export/excel`, {
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${docId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  async downloadExport(documentId, format) {
    if (format === 'csv') {
      return this.downloadCSV(documentId);
    } else if (format === 'excel') {
      return this.downloadExcel(documentId);
    }
  },

  /* Email export */
  async emailExport(documentId, toEmail) {
    const res = await authFetch(
      `${API_BASE}/documents/${documentId}/export/email?to=${encodeURIComponent(toEmail)}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Request failed');
    }
    return res.json();
  },

  /* Utilities */
  wakeupBackend,
  isReady: () => _backendReady,
  baseUrl: API_BASE.replace('/api/v1', ''),
};

// Kick off wakeup silently on every page load
wakeupBackend();
