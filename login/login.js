function switchTab(tab) {
  document.getElementById('form-signin').style.display = tab === 'signin' ? 'block' : 'none';
  document.getElementById('form-signup').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = `auth-msg ${type}`;
  el.style.display = 'block';
}

async function signIn() {
  const email    = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const btn      = document.getElementById('signin-btn');
  if (!email || !password) { showMsg('signin-msg', 'Please enter your email and password.', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const { data, error } = await window._sb.auth.signInWithPassword({ email, password });

  if (error) {
    showMsg('signin-msg', error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Sign in';
    return;
  }

  // Redirect based on role
  const { data: profile } = await window._sb.from('profiles').select('role').eq('id', data.user.id).single();
  const next = new URLSearchParams(window.location.search).get('next');
  if (next) { window.location.href = next; return; }
  window.location.href = profile?.role === 'admin' ? '/admin' : '/account';
}

async function signUp() {
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const btn      = document.getElementById('signup-btn');

  if (!name || !email || !password) { showMsg('signup-msg', 'Please fill in all fields.', 'error'); return; }
  if (password.length < 8) { showMsg('signup-msg', 'Password must be at least 8 characters.', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Creating account…';

  const { data, error } = await window._sb.auth.signUp({ email, password });

  if (error) {
    showMsg('signup-msg', error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Create account';
    return;
  }

  // Save full name to profile
  if (data.user) {
    await window._sb.from('profiles').update({ full_name: name }).eq('id', data.user.id);
  }

  showMsg('signup-msg', 'Account created! Check your email to confirm, then sign in.', 'success');
  btn.disabled = false;
  btn.textContent = 'Create account';
}

// If already logged in, redirect to ?next or role-based default
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await window._sb.auth.getSession();
  if (!session) return;
  const next = new URLSearchParams(window.location.search).get('next');
  if (next) { window.location.href = next; return; }
  const { data: profile } = await window._sb.from('profiles').select('role').eq('id', session.user.id).single();
  window.location.href = profile?.role === 'admin' ? '/admin' : '/account';
});

// Allow Enter key to submit
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const active = document.getElementById('tab-signin').classList.contains('active');
  if (active) signIn(); else signUp();
});
