/**
 * js/auth.js — Client-side Session Guards for DocIntel AI
 */

(function() {
  const token = localStorage.getItem('token');
  const path = window.location.pathname;
  const isAuthPage = path.includes('login.html') || path.includes('signup.html');
  const isDemoPage = path.includes('demo.html');
  
  if (!token) {
    // If not authenticated, force redirect to login (except for auth pages and public demo.html)
    if (!isAuthPage && !isDemoPage) {
      window.location.href = 'login.html';
    }
  } else {
    // If authenticated, prevent loading auth screens and bounce to dashboard
    if (isAuthPage) {
      window.location.href = 'dashboard.html';
    }
  }
})();

/**
 * Clean up local storage token/user state and redirect.
 */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}
