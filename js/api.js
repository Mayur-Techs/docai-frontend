/**
 * js/api.js — Backend communication layer.
 *
 * KEY FEATURE: Render wakeup ping.
 * The moment this script loads (on every page), it silently calls /health
 * on the Render backend. This wakes the container BEFORE the user clicks
 * anything. By the time they reach /demo and upload a PDF, the backend
 * is already warm. First-request latency: ~1s instead of ~45s.
 *
 * Change RENDER_URL to your actual Render service URL.
 */

const RENDER_URL = 'https://doc-intelligence-api-tubh.onrender.com';
const API_BASE   = `${RENDER_URL}/api/v1`;

let _backendReady = false;
let _wakeupPromise = null;

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
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const r = await fetch(`${RENDER_URL}/health`, {
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        });
        if (r.ok) {
          _backendReady = true;
          const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
          console.log(`[DocIntel] Backend ready in ${elapsed}s`);
          document.querySelectorAll('.js-api-status').forEach(el => {
            el.textContent = 'API Online';
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

/** Upload a PDF and return the document_id. */
async function uploadDocument(file, docType = 'invoice') {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('document_type', docType);
  const r = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
  return r.json();
}

/** Poll document status until completed or failed. */
async function pollDocument(docId, onProgress) {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2500));
    try {
      const r = await fetch(`${API_BASE}/documents/${docId}`);
      if (!r.ok) continue;
      const data = await r.json();
      if (onProgress) onProgress(data);
      if (data.status === 'completed' || data.status === 'failed') return data;
    } catch (_) {}
  }
  throw new Error('Extraction timed out after 150 seconds.');
}

/** Fetch dashboard stats. */
async function fetchStats() {
  const r = await fetch(`${API_BASE}/documents/stats/summary`);
  if (!r.ok) throw new Error('Stats fetch failed');
  return r.json();
}

/** Fetch recent documents list. */
async function fetchDocuments(limit = 10, status = null) {
  let url = `${API_BASE}/documents/?limit=${limit}`;
  if (status) url += `&status=${status}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Documents fetch failed');
  return r.json();
}

/** Delete a document by ID. */
async function deleteDocument(docId) {
  const r = await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE' });
  return r.status === 204;
}

// Auto-wakeup on every page load
wakeupBackend();

// Expose globally
window.DocAPI = {
  wakeupBackend, uploadDocument, pollDocument,
  fetchStats, fetchDocuments, deleteDocument,
  isReady: () => _backendReady,
  baseUrl: RENDER_URL,
};
