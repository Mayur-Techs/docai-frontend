(async function() {
    const path = window.location.pathname.toLowerCase();
    if (!path.includes('dashboard')) return;

    async function checkAuth(retries) {
        try {
            const res = await fetch(
                'https://doc-intelligence-api-tubh.onrender.com/auth/me',
                { credentials: 'include' }
            );
            if (res.ok) return true;
            if (res.status === 401) return false;
            // 5xx errors — server waking up
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 5000));
                return checkAuth(retries - 1);
            }
            return false;
        } catch(e) {
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 5000));
                return checkAuth(retries - 1);
            }
            return false;
        }
    }

    const authenticated = await checkAuth(3);
    if (!authenticated) {
        window.location.href = '/signup';
    }
})();
