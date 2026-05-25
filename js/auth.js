const token = localStorage.getItem('token');
const invalid = !token ||
  token === 'null' ||
  token === 'undefined' ||
  token.trim() === '';
const path = window.location.pathname.toLowerCase();
const isDashboard = path.includes('dashboard');

if (isDashboard && invalid) {
  window.location.href = '/signup';
}
