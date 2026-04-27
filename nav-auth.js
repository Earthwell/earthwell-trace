// Shared nav auth state — included on every page
// Populates #nav-auth-slot based on Supabase session

async function initNavAuth() {
  const slot = document.getElementById('nav-auth-slot');
  if (!slot || !window._sb) return;

  const { data: { session } } = await window._sb.auth.getSession();

  if (!session) {
    slot.innerHTML = `<a href="/login" class="nav-auth-link">Sign in</a>`;
    return;
  }

  const { data: profile } = await window._sb
    .from('profiles')
    .select('full_name, role')
    .eq('id', session.user.id)
    .single();

  const name    = profile?.full_name || session.user.email.split('@')[0];
  const isAdmin = profile?.role === 'admin';
  const initial = name[0].toUpperCase();

  slot.innerHTML = `
    <div class="nav-user-menu" id="nav-user-menu">
      <button class="nav-user-btn" onclick="toggleUserMenu(event)">
        <span class="nav-user-avatar">${initial}</span>
        <span class="nav-user-name">${name}</span>
        <span class="nav-user-chevron">▾</span>
      </button>
      <div class="nav-user-dropdown" id="nav-user-dropdown">
        ${isAdmin ? `<a href="/admin" class="nav-user-dropdown-item">Log Batch</a>
        <a href="/flock" class="nav-user-dropdown-item">Flock Management</a>
        <a href="/producers" class="nav-user-dropdown-item">Manage Producers</a>
        <a href="/users" class="nav-user-dropdown-item">User Management</a>
        <div class="nav-user-divider"></div>` : ''}
        <a href="/account" class="nav-user-dropdown-item">My Account</a>
        <a href="#" class="nav-user-dropdown-item nav-signout" onclick="navSignOut(event)">Sign out</a>
      </div>
    </div>`;

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!document.getElementById('nav-user-menu')?.contains(e.target)) {
      document.getElementById('nav-user-dropdown')?.classList.remove('open');
    }
  });
}

function toggleUserMenu(e) {
  e.stopPropagation();
  document.getElementById('nav-user-dropdown').classList.toggle('open');
}

async function navSignOut(e) {
  e.preventDefault();
  await window._sb.auth.signOut();
  window.location.href = '/';
}

// Guard function — call on protected pages
async function requireRole(role) {
  if (!window._sb) return;
  const { data: { session } } = await window._sb.auth.getSession();
  if (!session) { window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname); return; }
  const { data: profile } = await window._sb.from('profiles').select('role').eq('id', session.user.id).single();
  if (profile?.role !== role) { window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname); }
}

window.addEventListener('DOMContentLoaded', initNavAuth);
