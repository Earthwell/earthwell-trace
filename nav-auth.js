// Shared nav auth state — included on every page
// Populates #nav-auth-slot based on Supabase session

async function initNavAuth() {
  const slot = document.getElementById('nav-auth-slot');
  if (!slot || !window._sb) return;

  const { data: { session } } = await window._sb.auth.getSession();

  if (!session) {
    if (slot.dataset.variant === 'public') {
      slot.innerHTML = `<a href="https://earthwell.farm#csa-waitlist" class="nav-cta">Join CSA Waitlist</a>`;
    } else {
      slot.innerHTML = `<a href="/login" class="nav-auth-link">Sign in</a>`;
    }
    return;
  }

  // Logged in — hide any standalone CSA waitlist buttons on this page
  document.querySelectorAll('.nav-cta, .nav-mobile-cta').forEach(el => el.style.display = 'none');

  const { data: profile } = await window._sb
    .from('profiles')
    .select('full_name, role')
    .eq('id', session.user.id)
    .single();

  const name    = profile?.full_name || session.user.email.split('@')[0];
  const isAdmin = profile?.role === 'admin';
  const initial = name[0].toUpperCase();

  slot.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <a href="/shop" id="nav-cart-btn" style="
        display:none;align-items:center;gap:6px;
        font-size:0.82rem;font-weight:500;
        color:var(--earth-darkest);text-decoration:none;
        padding:5px 12px;border-radius:20px;
        border:1px solid var(--rule);background:var(--white);
        transition:background 0.15s,border-color 0.15s;
        font-family:var(--font-sans);
      ">
        My Cart
        <span id="nav-cart-badge" style="
          background:var(--earth-darkest);color:var(--earth-light);
          font-size:0.68rem;font-weight:600;
          padding:1px 6px;border-radius:20px;
          display:none;
        ">0</span>
      </a>
      <div class="nav-user-menu" id="nav-user-menu">
        <button class="nav-user-btn" onclick="toggleUserMenu(event)">
          <span class="nav-user-avatar">${initial}</span>
          <span class="nav-user-name">${name}</span>
          <span class="nav-user-chevron">▾</span>
        </button>
        <div class="nav-user-dropdown" id="nav-user-dropdown">
          ${isAdmin ? `<a href="/admin" class="nav-user-dropdown-item">Log Batch</a>
          <a href="/flock" class="nav-user-dropdown-item">My Farmyard</a>
          <div class="nav-user-divider"></div>
          <a href="/producers" class="nav-user-dropdown-item">Manage Producers</a>
          <a href="/users" class="nav-user-dropdown-item">User Management</a>
          <div class="nav-user-divider"></div>` : ''}
          <a href="/account" class="nav-user-dropdown-item">My Account</a>
          <a href="#" class="nav-user-dropdown-item nav-signout" onclick="navSignOut(event)">Sign out</a>
        </div>
      </div>
    </div>`;

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!document.getElementById('nav-user-menu')?.contains(e.target)) {
      document.getElementById('nav-user-dropdown')?.classList.remove('open');
    }
  });

  // Load cart count asynchronously
  loadNavCartCount(session.user.id);
}

async function loadNavCartCount(userId) {
  const { count } = await window._sb
    .from('cart_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const badge = document.getElementById('nav-cart-badge');
  if (!badge) return;
  const btn = document.getElementById('nav-cart-btn');
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline';
    if (btn) btn.style.display = 'inline-flex';
  } else {
    if (btn) btn.style.display = 'none';
  }
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
