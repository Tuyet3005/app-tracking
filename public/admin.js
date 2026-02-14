// Admin page client-side guard: only allow username === 'tuyet'
(async function () {
  const statusEl = document.getElementById('status');
  const adminContent = document.getElementById('adminContent');
  function redirect() {
    window.location.href = '/index.html';
  }

  try {
    const resp = await fetch('/me');
    if (!resp.ok) return redirect();
    const user = await resp.json();
    const uname = (user.username || '').toString().toLowerCase();
    if (uname !== 'tuyet') return redirect();

    // allowed
    if (statusEl) statusEl.classList.add('hidden');
    if (adminContent) adminContent.style.display = '';

    // Wire up refresh button to fetch public users
    const refreshBtn = document.getElementById('refreshUsers');
    const usersPre = document.getElementById('usersPre');
    if (refreshBtn && usersPre) {
      refreshBtn.addEventListener('click', async () => {
        usersPre.classList.add('cute-pre');
        usersPre.textContent = 'Loading...';
        try {
          const r = await fetch('/admin/users/public');
          if (!r.ok) throw new Error('Failed to fetch');
          const data = await r.json();
          usersPre.textContent = JSON.stringify(data, null, 2);
        } catch (e) {
          usersPre.textContent = 'Error: ' + (e && e.message ? e.message : e);
        }
      });
    }

    // Impersonation UI
    const impersonateBody = document.getElementById('impersonateBody');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const pageSizeSelect = document.getElementById('pageSizeSelect');

    let page = 1;
    let pageSize = parseInt((pageSizeSelect && pageSizeSelect.value) || '10', 10);
    let total = 0;

    function renderUsers(users) {
      if (!impersonateBody) return;
      impersonateBody.innerHTML = '';
      if (!users || users.length === 0) {
        impersonateBody.innerHTML = '<tr><td colspan="4">No users</td></tr>';
        return;
      }
      users.forEach(u => {
        const tr = document.createElement('tr');
        tr.classList.add('impersonate-row');
        const tdAvatar = document.createElement('td');
        const span = document.createElement('span');
        span.classList.add('avatar');
        // simple color choice based on username hash
        const nameKey = (u.username || '').toLowerCase();
        const sum = nameKey.split('').reduce((s,ch)=>s+ch.charCodeAt(0),0);
        span.classList.add((sum % 2 === 0) ? 'ice' : 'pink');
        span.textContent = (u.username || 'U').slice(0,1).toUpperCase();
        tdAvatar.appendChild(span);
        const tdUser = document.createElement('td'); tdUser.textContent = u.username || '';
        const tdDisplay = document.createElement('td'); tdDisplay.textContent = u.displayName || '';
        const tdAct = document.createElement('td');
        const btn = document.createElement('button');
        btn.textContent = 'Đăng nhập';
        btn.classList.add('vocab-btn');
        btn.addEventListener('click', async () => {
          if (!confirm(`Impersonate ${u.username}?`)) return;
          try {
            const r = await fetch('/admin/impersonate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: u.id })
            });
            if (!r.ok) {
              const t = await r.text();
              throw new Error(t || ('Status ' + r.status));
            }
            // Redirect to app root after impersonation
            window.location.href = '/';
          } catch (err) {
            alert('Failed to impersonate: ' + (err && err.message ? err.message : err));
          }
        });
        tdAct.appendChild(btn);
        tr.appendChild(tdAvatar);
        tr.appendChild(tdUser);
        tr.appendChild(tdDisplay);
        tr.appendChild(tdAct);
        tdUser.style.textAlign = 'left';
        tdDisplay.style.textAlign = 'left';
        impersonateBody.appendChild(tr);
      });
    }

    async function loadImpersonatePage(p = 1) {
      page = p;
      pageSize = parseInt((pageSizeSelect && pageSizeSelect.value) || '10', 10);
      if (pageInfo) pageInfo.textContent = `Page ${page}`;
      try {
        const resp = await fetch(`/admin/impersonate?page=${page}&pageSize=${pageSize}`);
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || ('Status ' + resp.status));
        }
        const js = await resp.json();
        // Expecting { users: [...], total, page, pageSize }
        const users = js.users || js || [];
        total = js.total || (Array.isArray(users) ? users.length : 0);
        renderUsers(users);
      } catch (e) {
        if (impersonateBody) impersonateBody.innerHTML = '<tr><td colspan="4">Error loading users</td></tr>';
        console.error('Load impersonate error', e);
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { if (page > 1) loadImpersonatePage(page - 1); });
    if (nextBtn) nextBtn.addEventListener('click', () => { loadImpersonatePage(page + 1); });
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', () => loadImpersonatePage(1));

    // initial load
    loadImpersonatePage(1);
  } catch (e) {
    console.error('Admin check error', e);
    redirect();
  }
})();
