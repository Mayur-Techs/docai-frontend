/**
 * js/auth.js — Client-side Session Guards for DocIntel AI
 */

(function() {
  const token = localStorage.getItem('token');
  const hasToken = token && token !== 'null' && token !== 'undefined' && token.trim() !== '';
  const path = window.location.pathname.toLowerCase();
  
  const isDashboard = path.includes('dashboard');
  const isAuthPage = path.includes('login') || path.includes('signup');
  
  if (!hasToken) {
    // If not authenticated, redirect to signup.html only if trying to access protected dashboard
    if (isDashboard) {
      window.location.href = 'signup.html';
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
