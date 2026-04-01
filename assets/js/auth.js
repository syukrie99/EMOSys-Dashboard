function getUser() {
    try {
        var s = sessionStorage.getItem('emosi_user');
        if(s) return JSON.parse(s);
    } catch (e) {}
    return null;
}

function getToken() {
    try {
        return sessionStorage.getItem('emosi_token') || null;
    } catch (e) {}
    return null;
}

function requireAuth() {
    var user = getUser();
    var token = getToken();
    if (!user || !token) {
        window.location.replace('Login.html');
        return null;
    }
    return user;
}

function doLogout() {
    try { sessionStorage.removeItem('emosi_user'); } catch(e) {}
    try { sessionStorage.removeItem('emosi_token'); } catch(e) {}
    window.location.replace('Login.html');
}