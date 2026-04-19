const apiBaseUrl = window.location.origin.includes('localhost:8080') ? 'http://localhost:3000' : window.location.origin;

const state = { token: localStorage.getItem('adminPortalToken') || '' };

const el = {
  loginForm: document.getElementById('admin-login-form'),
  loginStatus: document.getElementById('admin-login-status'),
  content: document.getElementById('admin-content'),
  clientForm: document.getElementById('client-form'),
  clientStatus: document.getElementById('client-form-status'),
  list: document.getElementById('clients-list'),
  refresh: document.getElementById('refresh-clients'),
  logout: document.getElementById('logout-admin'),
  postLogoutActions: document.getElementById('admin-post-logout-actions')
};

function setStatus(node, msg, isError = false) {
  node.textContent = msg;
  node.style.color = isError ? '#ff9cb0' : '#9fb1d6';
}

function setAuthVisibility(isAuthenticated) {
  el.loginForm.classList.toggle('hidden', isAuthenticated);
  el.content.classList.toggle('hidden', !isAuthenticated);
  el.postLogoutActions.classList.toggle('hidden', isAuthenticated);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro na requisição.');
  return data;
}

function renderClients(clients = []) {
  if (!clients.length) {
    el.list.innerHTML = '<p>Nenhum cliente cadastrado.</p>';
    return;
  }

  el.list.innerHTML = clients.map((client) => `
    <article class="client-card">
      <h3>${client.displayName}</h3>
      <p><strong>Empresa:</strong> ${client.companyId}</p>
      <p><strong>Usuário:</strong> ${client.username}</p>
      <p><strong>Status:</strong> ${client.status}</p>
      <div class="client-actions">
        <button data-action="toggle" data-id="${client.id}" data-status="${client.status}">${client.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}</button>
      </div>
    </article>
  `).join('');
}

async function loadClients() {
  const data = await request('/api/admin/clients');
  renderClients(data.clients || []);
}

el.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(el.loginForm);

  try {
    const data = await request('/api/client-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'admin',
        username: (form.get('username') || '').toString().trim(),
        password: (form.get('password') || '').toString()
      })
    });

    state.token = data.token;
    localStorage.setItem('adminPortalToken', state.token);
    setAuthVisibility(true);
    setStatus(el.loginStatus, 'Sessão admin iniciada.');
    await loadClients();
  } catch (error) {
    setStatus(el.loginStatus, error.message, true);
  }
});

el.clientForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(el.clientForm);

  try {
    await request('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: form.get('companyId'),
        displayName: form.get('displayName'),
        username: form.get('username'),
        password: form.get('password')
      })
    });

    setStatus(el.clientStatus, 'Cliente salvo com sucesso.');
    el.clientForm.reset();
    await loadClients();
  } catch (error) {
    setStatus(el.clientStatus, error.message, true);
  }
});

el.refresh.addEventListener('click', () => loadClients().catch((error) => setStatus(el.clientStatus, error.message, true)));

el.logout.addEventListener('click', async () => {
  try { await request('/api/client-auth/logout', { method: 'POST' }); } catch (_) {}
  state.token = '';
  localStorage.removeItem('adminPortalToken');
  setAuthVisibility(false);
  setStatus(el.loginStatus, 'Sessão encerrada.');
});

el.list.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="toggle"]');
  if (!button) return;

  const accountId = button.dataset.id;
  const nextStatus = button.dataset.status === 'blocked' ? 'active' : 'blocked';

  try {
    await request(`/api/admin/clients/${accountId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    await loadClients();
  } catch (error) {
    setStatus(el.clientStatus, error.message, true);
  }
});

setAuthVisibility(Boolean(state.token));

(async function restore() {
  if (!state.token) return;
  try {
    await request('/api/admin/clients');
    setAuthVisibility(true);
    setStatus(el.loginStatus, 'Sessão restaurada.');
    await loadClients();
  } catch (_error) {
    localStorage.removeItem('adminPortalToken');
    state.token = '';
    setAuthVisibility(false);
  }
})();
