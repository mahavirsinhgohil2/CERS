// ==========================================================
// admin-portal/js/auth.js
// Login, logout, and protecting the dashboard page.
// Used by BOTH index.html (login) and dashboard.html.
// ==========================================================

// ----------------------------------------------------------
// Is the admin logged in?
// ----------------------------------------------------------
function isAdminLoggedIn() {
  return Boolean(localStorage.getItem('adminToken'));
}

// ----------------------------------------------------------
// LOGOUT: clear the login flag and go back to the login page
// (the dashboard's Logout button will call this)
// ----------------------------------------------------------
function logout() {
  localStorage.removeItem('adminToken');
  window.location.href = 'index.html';
}

function adminFetch(url, options) {
  const request = options || {};
  request.headers = Object.assign({}, request.headers, {
    Authorization: 'Bearer ' + localStorage.getItem('adminToken')
  });
  return fetch(url, request).then(function (response) {
    if (response.status === 401) {
      logout();
    }
    return response;
  });
}

// ----------------------------------------------------------
// PROTECTED PAGE CHECK
// A page with <body data-protected="true"> can only be opened
// by a logged-in admin. Everyone else is sent to the login page.
// ----------------------------------------------------------
if (document.body.dataset.protected === 'true' && !isAdminLoggedIn()) {
  window.location.href = 'index.html';
}

// ----------------------------------------------------------
// LOGIN FORM (only exists on index.html)
// ----------------------------------------------------------
const loginForm = document.getElementById('login-form');

if (loginForm) {
  const loginError = document.getElementById('login-error');

  // If already logged in, skip the login page
  if (isAdminLoggedIn()) {
    window.location.href = 'dashboard.html';
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();   // stop the page from reloading

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    }).then(async function (response) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Invalid username or password');
      }
      localStorage.setItem('adminToken', data.token);
      window.location.href = 'dashboard.html';
    }).catch(function () {
      // Wrong: show the red error message
      loginError.textContent = '❌ Invalid username or password';
      loginError.classList.remove('hidden');
    });
  });
}