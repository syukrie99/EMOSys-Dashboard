var TARGET_PAGE = 'Dashboard.html';

function showError (msg) {
    var bar = document.getElementById('errorBar');
    bar.textContent = msg;
    bar.style.display = 'block';
}

function hideError() {
    var bar = document.getElementById('errorBar');
    bar.style.display = 'none';
}

async function doLogin() {
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var btn = document.getElementById('loginBtn');


hideError();

if (!email || !password) {
    showError('Please enter both email and password.');
    return;
}

btn.textContent = 'Authenticanting...';
btn.disabled = true;

try {
    var response = await fetch('api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    });

    var data = await response.json();

    if (!response.ok) {
        showError(data.error || 'Invalid credentials. Please try again.');
        btn.textContent = 'Sign In';
        btn.disabled = false;
        return;
    }

    sessionStorage.setItem('emosi_token', data.token);
    sessionStorage.setItem('emosi_user', JSON.stringify(data.user));

    btn.textContent = 'Redirecting...';
    window.location.replace(TARGET_PAGE);

} catch (err) {
    showError('Cannot connect to server. Make sure the PHP server is running. ');
    btn.textContent = 'Sign In';
    btn.disabled = false;
    }
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doLogin();
});