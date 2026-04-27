window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await window._sb.auth.getSession();
  if (!session) { window.location.href = '/login?next=/account'; return; }

  const { data: profile } = await window._sb
    .from('profiles')
    .select('full_name, role')
    .eq('id', session.user.id)
    .single();

  const name   = profile?.full_name || '';
  const email  = session.user.email;
  const role   = profile?.role || 'customer';
  const initials = (name || email)[0].toUpperCase();

  document.getElementById('account-status').style.display   = 'none';
  document.getElementById('account-card').style.display     = 'block';
  document.getElementById('orders-section').style.display   = 'block';
  document.getElementById('account-greeting').textContent   = `Hi, ${name || email.split('@')[0]}`;
  document.getElementById('account-avatar').textContent     = initials;
  document.getElementById('account-name').textContent       = name || '—';
  document.getElementById('account-email').textContent      = email;
  document.getElementById('edit-name').value                = name;

  const badge = document.getElementById('account-role-badge');
  if (role === 'admin') {
    badge.textContent = 'Admin';
    badge.style.cssText = 'background:var(--earth-darkest);color:var(--earth-light);margin-left:auto;font-size:0.72rem;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:20px;';
  } else if (role === 'producer') {
    badge.textContent = 'Producer';
    badge.style.cssText = 'background:var(--loam-light);color:var(--loam);border:1px solid var(--loam-warm);margin-left:auto;font-size:0.72rem;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:20px;';
  } else {
    badge.textContent = 'Customer';
    badge.style.cssText = 'background:var(--earth-pale);color:var(--earth-mid);border:1px solid var(--earth-light);margin-left:auto;font-size:0.72rem;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:20px;';
  }
});

async function saveName() {
  const name = document.getElementById('edit-name').value.trim();
  const { data: { session } } = await window._sb.auth.getSession();
  if (!session) return;

  const { error } = await window._sb.from('profiles').update({ full_name: name }).eq('id', session.user.id);
  const msg = document.getElementById('account-msg');
  msg.style.display = 'block';
  if (error) {
    msg.textContent = 'Could not save — try again.';
    msg.style.background = 'var(--loam-light)'; msg.style.color = 'var(--loam)';
  } else {
    msg.textContent = 'Changes saved.';
    msg.style.background = 'var(--earth-pale)'; msg.style.color = 'var(--earth-dark)';
    document.getElementById('account-name').textContent = name || '—';
    document.getElementById('account-greeting').textContent = `Hi, ${name || 'there'}`;
    setTimeout(() => msg.style.display = 'none', 2500);
  }
}

async function accountSignOut() {
  await window._sb.auth.signOut();
  window.location.href = '/';
}
