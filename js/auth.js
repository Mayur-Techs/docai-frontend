(async function() {
    const path = window.location.pathname.toLowerCase();
    const isDashboard = path.includes('dashboard');
    const isAuthPage = path.includes('login') ||
                       path.includes('signup');

    if (!isDashboard) return; // only protect dashboard

    try {
        const res = await fetch(
            'https://doc-intelligence-api-tubh.onrender.com/auth/me',
            { credentials: 'include' }
        );
        if (!res.ok) {
            window.location.href = '/signup';
        }
    } catch(e) {
        window.location.href = '/signup';
    }
})();
