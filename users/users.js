let currentUserId = null;

window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await window._sb.auth.getSession();
  if (!session) return;
  currentUserId = session.user.id;
  loadUsers();
});

async function loadUsers() {
  const { data, error } = await window._sb
    .from('profiles')
    .select('*')
    .order('created_at');

  if (error) {
    document.getElementById('users-tbody').innerHTML =
      `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--loam);">Could not load users: ${error.message}</td></tr>`;
    return;
  }

  document.getElementById('user-count').textContent =
    `${data.length} user${data.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('users-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--faint);font-style:italic;">No users yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(u => {
    const initial  = (u.full_name || u.email || '?')[0].toUpperCase();
    const name     = escHtml(u.full_name || '—');
    const email    = escHtml(u.email || '');
    const isYou    = u.id === currentUserId;
    const joined   = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <tr id="row-${u.id}">
        <td>
          <span class="user-avatar">${initial}</span>
          ${name}
          ${isYou ? '<span class="you-badge">You</span>' : ''}
        </td>
        <td style="color:var(--muted);">${email}</td>
        <td>
          <select class="role-select" id="role-${u.id}"
            onchange="onRoleChange('${u.id}')"
            ${isYou ? 'disabled title="You cannot change your own role"' : ''}>
            <option value="customer" ${u.role === 'customer' ? 'selected' : ''}>Customer</option>
            <option value="admin"    ${u.role === 'admin'    ? 'selected' : ''}>Admin</option>
            <option value="producer" ${u.role === 'producer' ? 'selected' : ''}>Producer</option>
          </select>
          <button class="save-role-btn" id="save-${u.id}" onclick="saveRole('${u.id}')">Save</button>
        </td>
        <td style="color:var(--faint);font-size:0.82rem;">${joined}</td>
        <td>
          <span class="role-badge role-${escHtml(u.role)}" id="badge-${u.id}">${capitalise(u.role)}</span>
        </td>
      </tr>`;
  }).join('');
}

function onRoleChange(userId) {
  const select = document.getElementById('role-' + userId);
  const saveBtn = document.getElementById('save-' + userId);
  select.classList.add('changed');
  saveBtn.classList.add('visible');
}

async function saveRole(userId) {
  const select  = document.getElementById('role-' + userId);
  const saveBtn = document.getElementById('save-' + userId);
  const newRole = select.value;

  saveBtn.textContent = 'Saving…';
  saveBtn.disabled    = true;

  const { error } = await window._sb
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    showToast('Could not update role: ' + error.message, 'error');
  } else {
    const badge = document.getElementById('badge-' + userId);
    badge.textContent  = capitalise(newRole);
    badge.className    = `role-badge role-${newRole}`;
    select.classList.remove('changed');
    saveBtn.classList.remove('visible');
    showToast(`Role updated to ${capitalise(newRole)}.`, 'success');
  }

  saveBtn.textContent = 'Save';
  saveBtn.disabled    = false;
}

function showToast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast-inline ${type}`;
  setTimeout(() => el.className = 'toast-inline', 3500);
}

function capitalise(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
