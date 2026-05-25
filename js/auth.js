/**
 * js/auth.js — Session Guard for DocIntel AI
 * ONLY fires on /dashboard. Never redirects demo, index, pricing, login, or signup.
 */

(function () {
  const token = localStorage.getItem('token');
  const invalidToken = !token || token === 'null' || token === 'undefined' || token.trim() === '';
  const isDashboard = window.location.pathname.toLowerCase().includes('dashboard');

  if (isDashboard && invalidToken) {
    window.location.href = '/signup';
  }
})();

/**
 * logout() — clears session and returns to homepage.
 * Called from dashboard Sign Out button.
 */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}
