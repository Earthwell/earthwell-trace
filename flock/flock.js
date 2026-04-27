let currentFlockId   = null;
let editingFlockId   = null;
let flocks           = [];

// ── INIT ──────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await window._sb.auth.getSession();
  if (!session) return; // requireRole handles redirect
  loadFlocks();
});

// ── FLOCKS ────────────────────────────────────────────────────────────────

async function loadFlocks() {
  const { data, error } = await window._sb
    .from('flocks').select('*').order('created_at');
  if (error) { console.error(error); return; }
  flocks = data || [];
  renderFlockList();
}

function renderFlockList() {
  const list = document.getElementById('flock-list');
  if (!flocks.length) {
    list.innerHTML = `<div style="color:var(--faint);font-size:0.85rem;font-style:italic;padding:0.5rem 0;">No flocks yet.</div>`;
    return;
  }
  list.innerHTML = flocks.map(f => `
    <div class="flock-item ${f.id === currentFlockId ? 'active' : ''}"
         onclick="selectFlock('${f.id}')">
      <span>${escHtml(f.name)}</span>
      <span style="display:flex;align-items:center;gap:0;">
        <span class="flock-item-count" id="count-${f.id}"></span>
        <span class="flock-actions" onclick="event.stopPropagation()">
          <button class="flock-action-btn" title="Edit flock" onclick="editFlock('${f.id}')">✏</button>
          <button class="flock-action-btn" title="Delete flock" onclick="deleteFlock('${f.id}')">✕</button>
        </span>
      </span>
    </div>`).join('');
  flocks.forEach(f => loadChickenCount(f.id));
  if (currentFlockId) selectFlock(currentFlockId);
}

async function loadChickenCount(flockId) {
  const { count } = await window._sb
    .from('chickens').select('*', { count: 'exact', head: true })
    .eq('flock_id', flockId);
  const el = document.getElementById('count-' + flockId);
  if (el) el.textContent = count > 0 ? count : '';
}

function selectFlock(id) {
  currentFlockId = id;
  renderFlockList();
  const flock = flocks.find(f => f.id === id);
  if (!flock) return;
  document.getElementById('no-flock-msg').style.display    = 'none';
  document.getElementById('flock-detail').style.display    = 'block';
  document.getElementById('flock-name-display').textContent = flock.name;
  document.getElementById('flock-desc-display').textContent = flock.description || '';
  loadChickens(id);
}

function showAddFlock() {
  editingFlockId = null;
  document.getElementById('new-flock-name').value = '';
  document.getElementById('new-flock-desc').value = '';
  document.getElementById('add-flock-form').classList.add('open');
  document.getElementById('add-flock-btn').style.display = 'none';
  document.getElementById('new-flock-name').focus();
}

function editFlock(id) {
  const flock = flocks.find(f => f.id === id);
  if (!flock) return;
  editingFlockId = id;
  document.getElementById('new-flock-name').value = flock.name;
  document.getElementById('new-flock-desc').value = flock.description || '';
  document.getElementById('add-flock-form').classList.add('open');
  document.getElementById('add-flock-btn').style.display = 'none';
  document.getElementById('new-flock-name').focus();
}

async function deleteFlock(id) {
  const flock = flocks.find(f => f.id === id);
  if (!flock) return;
  if (!confirm(`Delete "${flock.name}"? All chickens in this flock will also be deleted.`)) return;
  await window._sb.from('chickens').delete().eq('flock_id', id);
  await window._sb.from('flocks').delete().eq('id', id);
  if (currentFlockId === id) {
    currentFlockId = null;
    document.getElementById('flock-detail').style.display = 'none';
    document.getElementById('no-flock-msg').style.display = '';
  }
  await loadFlocks();
}

function cancelFlock() {
  document.getElementById('add-flock-form').classList.remove('open');
  document.getElementById('add-flock-btn').style.display = '';
  editingFlockId = null;
}

async function saveFlock() {
  const name = document.getElementById('new-flock-name').value.trim();
  const desc = document.getElementById('new-flock-desc').value.trim();
  if (!name) { document.getElementById('new-flock-name').focus(); return; }

  if (editingFlockId) {
    await window._sb.from('flocks').update({ name, description: desc }).eq('id', editingFlockId);
  } else {
    await window._sb.from('flocks').insert({ name, description: desc });
  }
  cancelFlock();
  await loadFlocks();
}

// ── CHICKENS ──────────────────────────────────────────────────────────────

async function loadChickens(flockId) {
  const grid = document.getElementById('chicken-grid');
  grid.innerHTML = `<div class="empty-flock">Loading…</div>`;
  const { data, error } = await window._sb
    .from('chickens').select('*').eq('flock_id', flockId).order('created_at');
  if (error) { console.error(error); return; }
  renderChickenGrid(data || []);
  loadChickenCount(flockId);
}

function renderChickenGrid(chickens) {
  const grid = document.getElementById('chicken-grid');
  if (!chickens.length) {
    grid.innerHTML = `<div class="empty-flock">No chickens in this flock yet.<br>Click "Add chicken" to get started.</div>`;
    return;
  }
  grid.innerHTML = chickens.map(c => {
    const photo = c.photo_url
      ? `<img class="chicken-photo" src="${escHtml(c.photo_url)}" alt="${escHtml(c.name || 'Chicken')}" loading="lazy" style="cursor:pointer;" onclick="openChickenModal('${c.id}')" />`
      : `<div class="chicken-photo-placeholder" style="cursor:pointer;" onclick="openChickenModal('${c.id}')">🐔</div>`;
    const birth = c.birth_month
      ? new Date(c.birth_month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : '';
    const age = c.birth_month ? chickenAge(c.birth_month) : '';
    const meta = [c.gender, age].filter(Boolean).join(' · ');
    const colorLine = c.color ? `<div class="chicken-meta" style="margin-top:2px;">${escHtml(c.color)}</div>` : '';
    const notesLine = c.notes ? `<div class="chicken-notes">${escHtml(c.notes)}</div>` : '';
    return `
      <div class="chicken-card">
        ${photo}
        <div class="chicken-body">
          <div class="chicken-name" style="cursor:pointer;" onclick="openChickenModal('${c.id}')">${escHtml(c.name || 'Unnamed')}</div>
          <div class="chicken-breed">${escHtml(c.breed || '—')}</div>
          <div class="chicken-meta">${meta}</div>
          ${colorLine}
          ${notesLine}
          <span class="status-badge status-${escHtml(c.status || 'Active')}" style="margin-top:6px;display:inline-block;">${escHtml(c.status || 'Active')}</span>
          <div class="chicken-card-actions">
            <button class="btn-edit-chicken" onclick="openChickenModal('${c.id}')">Edit</button>
            <button class="btn-delete-chicken" onclick="confirmDeleteChicken('${c.id}')">Delete</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── CHICKEN MODAL ─────────────────────────────────────────────────────────

let pendingPhotoFile = null;

function openChickenModal(chickenId) {
  pendingPhotoFile = null;
  document.getElementById('modal-msg').style.display = 'none';
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-upload-label').textContent = 'Click to upload a photo';
  document.getElementById('c-photo-input').value = '';

  if (chickenId) {
    // Edit mode — load existing data
    window._sb.from('chickens').select('*').eq('id', chickenId).single()
      .then(({ data }) => {
        if (!data) return;
        document.getElementById('modal-title').textContent   = 'Edit Chicken';
        document.getElementById('editing-chicken-id').value  = data.id;
        document.getElementById('c-name').value    = data.name    || '';
        document.getElementById('c-breed').value   = data.breed   || '';
        document.getElementById('c-birth').value   = data.birth_month || '';
        document.getElementById('c-gender').value  = data.gender  || 'Hen';
        document.getElementById('c-status').value  = data.status  || 'Active';
        document.getElementById('c-color').value   = data.color   || '';
        document.getElementById('c-notes').value   = data.notes   || '';
        if (data.photo_url) {
          const prev = document.getElementById('photo-preview');
          prev.src = data.photo_url;
          prev.style.display = 'block';
          document.getElementById('photo-upload-label').textContent = 'Click to change photo';
        }
        document.getElementById('modal-delete-btn').style.display = 'inline-flex';
        document.getElementById('chicken-modal').classList.add('open');
      });
  } else {
    document.getElementById('modal-title').textContent  = 'Add Chicken';
    document.getElementById('editing-chicken-id').value = '';
    document.getElementById('c-name').value    = '';
    document.getElementById('c-breed').value   = '';
    document.getElementById('c-birth').value   = '';
    document.getElementById('c-gender').value  = 'Hen';
    document.getElementById('c-status').value  = 'Active';
    document.getElementById('c-color').value   = '';
    document.getElementById('c-notes').value   = '';
    document.getElementById('modal-delete-btn').style.display = 'none';
    document.getElementById('chicken-modal').classList.add('open');
  }
}

function closeChickenModal() {
  document.getElementById('chicken-modal').classList.remove('open');
}

function previewPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  pendingPhotoFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    const prev = document.getElementById('photo-preview');
    prev.src = ev.target.result;
    prev.style.display = 'block';
    document.getElementById('photo-upload-label').textContent = file.name;
  };
  reader.readAsDataURL(file);
}

function showModalMsg(text, type) {
  const el = document.getElementById('modal-msg');
  el.textContent = text;
  el.className = `modal-msg ${type}`;
  el.style.display = 'block';
}

async function saveChicken() {
  const btn       = document.getElementById('modal-save-btn');
  const editingId = document.getElementById('editing-chicken-id').value;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  let photo_url = null;

  // Upload photo if a new file was selected
  if (pendingPhotoFile) {
    const ext      = pendingPhotoFile.name.split('.').pop();
    const path     = `${currentFlockId}/${Date.now()}.${ext}`;
    const { error: upErr } = await window._sb.storage
      .from('chicken-photos').upload(path, pendingPhotoFile, { upsert: true });
    if (upErr) { showModalMsg('Photo upload failed: ' + upErr.message, 'error'); btn.disabled = false; btn.textContent = 'Save chicken'; return; }
    const { data: urlData } = window._sb.storage.from('chicken-photos').getPublicUrl(path);
    photo_url = urlData.publicUrl;
  }

  const payload = {
    flock_id:    currentFlockId,
    name:        document.getElementById('c-name').value.trim(),
    breed:       document.getElementById('c-breed').value.trim(),
    birth_month: document.getElementById('c-birth').value || null,
    gender:      document.getElementById('c-gender').value,
    status:      document.getElementById('c-status').value,
    color:       document.getElementById('c-color').value.trim(),
    notes:       document.getElementById('c-notes').value.trim(),
  };
  if (photo_url) payload.photo_url = photo_url;

  let error;
  if (editingId) {
    ({ error } = await window._sb.from('chickens').update(payload).eq('id', editingId));
  } else {
    ({ error } = await window._sb.from('chickens').insert(payload));
  }

  if (error) {
    showModalMsg('Save failed: ' + error.message, 'error');
  } else {
    closeChickenModal();
    loadChickens(currentFlockId);
  }

  btn.disabled = false;
  btn.textContent = 'Save chicken';
}

async function confirmDeleteChicken(id) {
  if (!confirm('Delete this chicken? This cannot be undone.')) return;
  await window._sb.from('chickens').delete().eq('id', id);
  loadChickens(currentFlockId);
}

async function deleteChicken() {
  const id = document.getElementById('editing-chicken-id').value;
  if (!id || !confirm('Delete this chicken? This cannot be undone.')) return;
  await window._sb.from('chickens').delete().eq('id', id);
  closeChickenModal();
  loadChickens(currentFlockId);
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function chickenAge(birthMonth) {
  const birth = new Date(birthMonth + '-01');
  const now   = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return months + (months === 1 ? ' mo' : ' mos');
  const yrs = Math.floor(months / 12);
  return yrs + (yrs === 1 ? ' yr' : ' yrs');
}
