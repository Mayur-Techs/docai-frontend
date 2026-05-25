/**
 * js/api.js — JWT-wired API Client for DocIntel AI
 */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/api/v1'
  : 'https://doc-intelligence-api-tubh.onrender.com/api/v1'; // Replace with actual backend Render URL

const AUTH_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/auth'
  : 'https://doc-intelligence-api-tubh.onrender.com/auth';

let _backendReady = false;
let _wakeupPromise = null;

// Helper for JWT-authenticated fetch
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  options.headers = options.headers || {};
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      // Clear expired credentials and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html');
      if (!isAuthPage) {
        window.location.href = 'login.html?expired=true';
      }
    }
    return res;
  } catch (err) {
    console.error('API connection error:', err);
    throw err;
  }
}

/**
 * Wake up the Render backend silently.
 * Called automatically on every page load.
 * Resolves when backend responds 200, or after 60s timeout.
 */
async function wakeupBackend() {
  if (_backendReady) return true;
  if (_wakeupPromise) return _wakeupPromise;

  _wakeupPromise = (async () => {
    const startMs = Date.now();
    const rootUrl = API_BASE.replace('/api/v1', '');
    
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const r = await fetch(`${rootUrl}/health`, {
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        });
        if (r.ok) {
          _backendReady = true;
          const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
          console.log(`[DocIntel] Backend ready in ${elapsed}s`);
          document.querySelectorAll('.js-api-status').forEach(el => {
            el.textContent = el.textContent.startsWith('●') ? '● API Live' : 'API Live';
            el.style.color = 'var(--green-500)';
          });
          document.querySelectorAll('.js-status-dot').forEach(el => {
            el.classList.add('pulsing');
            el.style.background = 'var(--green-500)';
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

const DocAPI = {
  async register(email, password, fullName) {
    const res = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Registration failed');
    }
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async getProfile() {
    const res = await authFetch(`${AUTH_BASE}/me`);
    if (!res.ok) throw new Error('Failed to fetch user profile');
    const data = await res.json();
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  async uploadDocument(file, documentType) {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await authFetch(`${API_BASE}/documents/upload?document_type=${documentType}`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Upload failed');
    }
    return res.json();
  },

  async pollDocument(docId, onInterim) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 35) {
          clearInterval(interval);
          reject(new Error('Document processing timed out'));
          return;
        }
        
        try {
          const res = await authFetch(`${API_BASE}/documents/${docId}/status`);
          if (!res.ok) throw new Error('Failed to get processing status');
          const data = await res.json();
          
          if (onInterim) {
            onInterim(data);
          }
          
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval);
            const fullDocRes = await authFetch(`${API_BASE}/documents/${docId}`);
            if (!fullDocRes.ok) throw new Error('Failed to fetch document fields');
            resolve(fullDocRes.json());
          }
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, 2000);
    });
  },

  async listDocuments() {
    const res = await authFetch(`${API_BASE}/documents/`);
    if (!res.ok) throw new Error('Failed to retrieve documents');
    return res.json();
  },

  async deleteDocument(id) {
    const res = await authFetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return true;
  },

  async reprocessDocument(id) {
    const res = await authFetch(`${API_BASE}/documents/${id}/reprocess`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to reprocess document');
    return res.json();
  },

  async getStats() {
    const res = await authFetch(`${API_BASE}/documents/stats/summary`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async fetchStats() {
    const res = await fetch(`${API_BASE}/documents/stats/summary`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  wakeupBackend,
  isReady: () => _backendReady,
  baseUrl: API_BASE.replace('/api/v1', '')
};

// Start background wakeup
wakeupBackend();
