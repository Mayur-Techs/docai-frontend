/**
 * js/auth.js — Client-side Session Guards for DocIntel AI
 */

(function() {
  const token = localStorage.getItem('token');
  const path = window.location.pathname.toLowerCase();
  
  const isDashboard = path.includes('dashboard.html') || path.endsWith('/dashboard');
  const isAuthPage = path.includes('login.html') || path.includes('signup.html') || path.endsWith('/login') || path.endsWith('/signup');
  
  if (!token) {
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
