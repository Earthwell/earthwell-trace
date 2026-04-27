let currentFlockId   = null;
let editingFlockId   = null;
let flocks           = [];

const FLOCK_BREEDS = {
  laying_hens:   ['Australorp','Barred Rock','Brahma','Buff Orpington','Dominique','Easter Egger / Ameraucana','Leghorn','Marans','New Hampshire Red','Rhode Island Red','Silkie','Sussex','Welsummer','Wyandotte','Other'],
  meat_chickens: ['Cornish Cross','Freedom Ranger','Jersey Giant','Plymouth Rock','Other'],
  ducks:         ['Indian Runner','Khaki Campbell','Muscovy','Pekin','Rouen','Welsh Harlequin','Other'],
  turkeys:       ['Bourbon Red','Broad Breasted Bronze','Broad Breasted White','Narragansett','Royal Palm','Other'],
  geese:         ['African','Chinese','Embden','Pilgrim','Toulouse','Other'],
  goats:         ['Alpine','Boer','Kiko','LaMancha','Nigerian Dwarf','Nubian','Pygmy','Saanen','Other'],
  pigs:          ['Berkshire','Duroc','Hampshire','Large Black','Tamworth','Yorkshire','Other'],
  cattle:        ['Angus','Dexter','Hereford','Highland','Holstein','Jersey','Other'],
  sheep:         ['Dorper','Jacob','Katahdin','Merino','Suffolk','Other'],
  rabbits:       ['Californian','Flemish Giant','Holland Lop','New Zealand White','Rex','Other'],
  vegetables:    ['Beans','Beets','Carrots','Cucumbers','Kale','Lettuce','Peppers','Squash','Tomatoes','Other'],
  fruit_trees:   ['Apple','Cherry','Fig','Mulberry','Pawpaw','Peach','Pear','Persimmon','Plum','Other'],
  herbs:         ['Basil','Chamomile','Echinacea','Lavender','Mint','Oregano','Rosemary','Sage','Thyme','Other'],
};

const BREED_LABEL = {
  vegetables: 'Variety', fruit_trees: 'Variety', herbs: 'Variety',
};

const GROUP_NAME_LABEL = {
  laying_hens:   'Flock Name',   meat_chickens: 'Flock Name',
  ducks:         'Flock Name',   turkeys:       'Flock Name',
  geese:         'Flock Name',   sheep:         'Flock Name',
  goats:         'Herd Name',    pigs:          'Herd Name',
  cattle:        'Herd Name',
  rabbits:       'Colony Name',
  vegetables:    'Crop Name',
  fruit_trees:   'Orchard Name',
  herbs:         'Garden Name',
};

const UNIT_LABEL = {
  laying_hens:   'Hen',     meat_chickens: 'Chicken',
  ducks:         'Duck',    turkeys:       'Turkey',
  geese:         'Goose',   goats:         'Goat',
  pigs:          'Pig',     cattle:        'Cow',
  sheep:         'Sheep',   rabbits:       'Rabbit',
  vegetables:    'Plant',   fruit_trees:   'Tree',
  herbs:         'Plant',
};

const GROUP_NAME_PLACEHOLDER = {
  laying_hens:   'e.g. Spring Layers',     meat_chickens: 'e.g. Broiler Batch 1',
  ducks:         'e.g. Pond Flock',        turkeys:       'e.g. Thanksgiving Flock',
  geese:         'e.g. Barnyard Geese',    sheep:         'e.g. Wool Flock',
  goats:         'e.g. Main Dairy Herd',   pigs:          'e.g. Spring Herd',
  cattle:        'e.g. Pasture Herd',
  rabbits:       'e.g. East Colony',
  vegetables:    'e.g. Summer Tomatoes',
  fruit_trees:   'e.g. Back Orchard',
  herbs:         'e.g. Herb Garden',
};

const GENDER_OPTIONS = {
  laying_hens:   ['Hen','Rooster','Unknown'],
  meat_chickens: ['Hen','Rooster','Unknown'],
  ducks:         ['Duck (female)','Drake (male)','Unknown'],
  turkeys:       ['Hen','Tom','Unknown'],
  geese:         ['Goose (female)','Gander (male)','Unknown'],
  goats:         ['Doe','Buck','Wether','Unknown'],
  pigs:          ['Sow','Boar','Barrow','Gilt','Unknown'],
  cattle:        ['Cow','Bull','Steer','Heifer','Unknown'],
  sheep:         ['Ewe','Ram','Wether','Unknown'],
  rabbits:       ['Doe','Buck','Unknown'],
};

const PLANT_TYPES = new Set(['vegetables','fruit_trees','herbs']);

function adaptMemberModal(flockType, savedBreed, savedGender, savedStatus) {
  const isPlant     = PLANT_TYPES.has(flockType);
  const breedLabel  = BREED_LABEL[flockType] || 'Breed';
  const breeds      = FLOCK_BREEDS[flockType];

  // Breed field
  document.getElementById('c-breed-label').textContent = breedLabel;
  const breedSelect = document.getElementById('c-breed-select');
  const breedText   = document.getElementById('c-breed');
  const breedOther  = document.getElementById('c-breed-other-field');
  document.getElementById('c-breed-other-label').textContent = `Specify ${breedLabel.toLowerCase()}`;

  if (breeds) {
    breedSelect.innerHTML = `<option value="">— Select ${breedLabel.toLowerCase()} —</option>` +
      breeds.map(b => `<option value="${b}">${b}</option>`).join('');
    // Pre-fill saved value
    const knownOpt = [...breedSelect.options].find(o => o.value === savedBreed);
    if (knownOpt) {
      breedSelect.value = savedBreed;
    } else if (savedBreed) {
      breedSelect.value = 'Other';
      document.getElementById('c-breed-other').value = savedBreed;
      breedOther.style.display = '';
    }
    breedSelect.style.display = '';
    breedText.style.display   = 'none';
  } else {
    breedSelect.style.display = 'none';
    breedText.style.display   = '';
    breedText.value = savedBreed || '';
  }

  // Gender field — hide for plants, adapt options for animals
  const genderField = document.getElementById('c-gender-field');
  const genderSel   = document.getElementById('c-gender');
  if (isPlant) {
    genderField.style.display = 'none';
  } else {
    genderField.style.display = '';
    const opts = GENDER_OPTIONS[flockType] || ['Male','Female','Unknown'];
    genderSel.innerHTML = opts.map(g => `<option value="${g}">${g}</option>`).join('');
    if (savedGender && [...genderSel.options].find(o => o.value === savedGender)) genderSel.value = savedGender;
  }

  // Status options
  const statusSel = document.getElementById('c-status');
  const statusOpts = isPlant
    ? ['Active','Dormant','Harvested','Removed']
    : ['Active','Retired','Deceased'];
  statusSel.innerHTML = statusOpts.map(s => `<option value="${s}">${s}</option>`).join('');
  if (savedStatus && [...statusSel.options].find(o => o.value === savedStatus)) statusSel.value = savedStatus;

  // Label tweaks for plants
  document.getElementById('c-name-label').textContent  = isPlant ? 'Plant Name'       : 'Name / Nickname';
  document.getElementById('c-birth-label').textContent = isPlant ? 'Date Planted'      : 'Birth Month & Year';
  document.getElementById('c-color-label').textContent = isPlant ? 'Appearance / Notes about appearance' : 'Color / Markings';
}

function onMemberBreedChange() {
  const val   = document.getElementById('c-breed-select').value;
  const field = document.getElementById('c-breed-other-field');
  field.style.display = val === 'Other' ? '' : 'none';
  if (val !== 'Other') document.getElementById('c-breed-other').value = '';
}

let memberRowCount = 0;

function buildMemberRowHTML(type, index) {
  const unit     = UNIT_LABEL[type] || 'Member';
  const breeds   = FLOCK_BREEDS[type];
  const isPlant  = PLANT_TYPES.has(type);
  const breedLbl = BREED_LABEL[type] || 'Breed';
  const dateLbl  = isPlant ? 'Date Planted' : 'Birth Month';

  const breedInput = breeds
    ? `<select class="member-breed" onchange="onInlineBreedChange(this)">
         <option value="">— ${breedLbl} —</option>
         ${breeds.map(b => `<option value="${b}">${b}</option>`).join('')}
       </select>
       <input type="text" class="member-breed-other" placeholder="Specify ${breedLbl.toLowerCase()}" style="display:none;" />`
    : `<input type="text" class="member-breed" placeholder="${breedLbl}" />`;

  return `
    <div class="member-row" data-idx="${index}">
      <div class="member-row-header">
        <span class="member-row-num">${unit} ${index + 1}</span>
        <button type="button" class="member-remove-btn" onclick="removeMemberRow(this)"
          style="${index === 0 ? 'display:none;' : ''}">✕ Remove</button>
      </div>
      <div class="member-field-label">${unit} Name</div>
      <input type="text" class="member-name" placeholder="e.g. Rosie" />
      <div class="member-field-label">${unit} ${breedLbl}</div>
      ${breedInput}
      <div class="member-field-label">${dateLbl}</div>
      <input type="month" class="member-birth" />
      <div class="member-field-label">${unit} Photo</div>
      <input type="file" class="member-photo" accept="image/*" style="font-size:0.78rem;" />
    </div>`;
}

function addMemberRow() {
  const type      = document.getElementById('new-flock-type').value;
  const container = document.getElementById('inline-member-rows');
  container.insertAdjacentHTML('beforeend', buildMemberRowHTML(type, memberRowCount++));
  // Show remove buttons on all rows once there are multiple
  container.querySelectorAll('.member-remove-btn').forEach(b => b.style.display = '');
}

function removeMemberRow(btn) {
  const container = document.getElementById('inline-member-rows');
  btn.closest('.member-row').remove();
  // Re-index and relabel remaining rows
  const type = document.getElementById('new-flock-type').value;
  const unit = UNIT_LABEL[type] || 'Member';
  container.querySelectorAll('.member-row').forEach((row, i) => {
    row.dataset.idx = i;
    row.querySelector('.member-row-num').textContent = `${unit} ${i + 1}`;
    const removeBtn = row.querySelector('.member-remove-btn');
    removeBtn.style.display = container.querySelectorAll('.member-row').length > 1 ? '' : 'none';
  });
  memberRowCount = container.querySelectorAll('.member-row').length;
}

function onInlineBreedChange(selectEl) {
  const otherInput = selectEl.nextElementSibling;
  otherInput.style.display = selectEl.value === 'Other' ? '' : 'none';
  if (selectEl.value !== 'Other') otherInput.value = '';
}

function onFlockTypeChange() {
  const type = document.getElementById('new-flock-type').value;

  // Update name label and placeholder
  document.getElementById('new-flock-name-label').textContent = GROUP_NAME_LABEL[type]       || 'Name';
  document.getElementById('new-flock-name').placeholder       = GROUP_NAME_PLACEHOLDER[type] || 'e.g. Spring Laying Hens';

  // Show/rebuild member rows
  const membersSection = document.getElementById('inline-members-section');
  const memberRows     = document.getElementById('inline-member-rows');
  const addBtn         = document.getElementById('add-member-row-btn');

  if (type) {
    const unit = UNIT_LABEL[type] || 'Member';
    addBtn.textContent = `+ Add another ${unit.toLowerCase()}`;
    memberRows.innerHTML = buildMemberRowHTML(type, 0);
    memberRowCount = 1;
    membersSection.style.display = '';
  } else {
    membersSection.style.display = 'none';
    memberRows.innerHTML = '';
    memberRowCount = 0;
  }
}

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
    list.innerHTML = `<div style="color:var(--faint);font-size:0.85rem;font-style:italic;padding:0.5rem 0;">Nothing added yet.</div>`;
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

  // Update active class on sidebar items without re-rendering the whole list
  document.querySelectorAll('.flock-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick') === `selectFlock('${id}')`);
  });

  const flock = flocks.find(f => f.id === id);
  if (!flock) return;

  document.getElementById('no-flock-msg').style.display = 'none';
  document.getElementById('flock-detail').style.display = 'block';

  // Name
  document.getElementById('flock-name-display').textContent = flock.name;

  // Type badge + description subtitle
  const typeLabel = flock.type ? flock.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
  const parts = [typeLabel, flock.description].filter(Boolean);
  document.getElementById('flock-desc-display').innerHTML = parts
    .map((p, i) => i === 0 && typeLabel
      ? `<span class="badge badge-pale" style="font-size:0.7rem;vertical-align:middle;">${escHtml(p)}</span>`
      : escHtml(p))
    .join(' <span style="color:var(--rule);">·</span> ');

  loadChickens(id);
}

function showAddFlock() {
  editingFlockId = null;
  document.getElementById('new-flock-type').value             = '';
  document.getElementById('new-flock-name').value             = '';
  document.getElementById('new-flock-name-label').textContent = 'Name';
  document.getElementById('new-flock-name').placeholder       = 'e.g. Spring Laying Hens';
  document.getElementById('new-flock-desc').value             = '';
  document.getElementById('inline-members-section').style.display = 'none';
  document.getElementById('inline-member-rows').innerHTML     = '';
  memberRowCount = 0;
  document.getElementById('add-flock-form').classList.add('open');
  document.getElementById('add-flock-btn').style.display      = 'none';
  document.getElementById('new-flock-type').focus();
}

function editFlock(id) {
  const flock = flocks.find(f => f.id === id);
  if (!flock) return;
  editingFlockId = id;
  document.getElementById('new-flock-type').value             = flock.type || '';
  document.getElementById('new-flock-name-label').textContent = GROUP_NAME_LABEL[flock.type] || 'Name';
  document.getElementById('new-flock-name').value             = flock.name;
  document.getElementById('new-flock-desc').value             = flock.description || '';
  // Hide member rows when editing — members are managed via the main panel
  document.getElementById('inline-members-section').style.display = 'none';
  document.getElementById('inline-member-rows').innerHTML     = '';
  memberRowCount = 0;
  document.getElementById('add-flock-form').classList.add('open');
  document.getElementById('add-flock-btn').style.display      = 'none';
  document.getElementById('new-flock-name').focus();
}

async function deleteFlock(id) {
  const flock = flocks.find(f => f.id === id);
  if (!flock) return;
  if (!confirm(`Delete "${flock.name}"? All members will also be deleted.`)) return;
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
  const type = document.getElementById('new-flock-type').value || null;

  if (!name) { document.getElementById('new-flock-name').focus(); return; }

  const payload = { name, description: desc, type };
  let savedId;

  if (editingFlockId) {
    await window._sb.from('flocks').update(payload).eq('id', editingFlockId);
    savedId = editingFlockId;
  } else {
    const { data } = await window._sb.from('flocks').insert(payload).select('id').single();
    savedId = data?.id;
  }

  // Save inline members only when creating a new group
  if (!editingFlockId && savedId && type) {
    await saveInlineMembers(savedId, type);
  }

  cancelFlock();
  await loadFlocks();
  if (savedId) selectFlock(savedId);
}

async function saveInlineMembers(flockId, flockType) {
  const rows    = document.querySelectorAll('#inline-member-rows .member-row');
  const isPlant = PLANT_TYPES.has(flockType);

  for (const row of rows) {
    const name  = row.querySelector('.member-name')?.value.trim() || '';
    const breedSel   = row.querySelector('select.member-breed');
    const breedTxt   = row.querySelector('input.member-breed');
    const breedOther = row.querySelector('.member-breed-other');
    const breed = breedSel
      ? (breedSel.value === 'Other' ? (breedOther?.value.trim() || 'Other') : breedSel.value)
      : (breedTxt?.value.trim() || '');
    const birth = row.querySelector('.member-birth')?.value || null;
    const photoFile = row.querySelector('.member-photo')?.files[0];

    if (!name && !breed && !birth && !photoFile) continue;

    let photo_url = null;
    if (photoFile) {
      const ext  = photoFile.name.split('.').pop();
      const path = `${flockId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await window._sb.storage
        .from('chicken-photos').upload(path, photoFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = window._sb.storage.from('chicken-photos').getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }
    }

    await window._sb.from('chickens').insert({
      flock_id:    flockId,
      name:        name  || null,
      breed:       breed || null,
      birth_month: birth,
      status:      'Active',
      gender:      isPlant ? null : (GENDER_OPTIONS[flockType]?.[0] || null),
      photo_url,
    });
  }
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
    grid.innerHTML = `<div class="empty-flock">No members added yet.<br>Click "Add member" to get started.</div>`;
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
  document.getElementById('modal-msg').style.display        = 'none';
  document.getElementById('photo-preview').style.display    = 'none';
  document.getElementById('photo-upload-label').textContent = 'Click to upload a photo';
  document.getElementById('c-photo-input').value            = '';
  document.getElementById('c-breed-other-field').style.display = 'none';
  document.getElementById('c-breed-other').value            = '';

  const flockType = flocks.find(f => f.id === currentFlockId)?.type || '';

  if (chickenId) {
    window._sb.from('chickens').select('*').eq('id', chickenId).single()
      .then(({ data }) => {
        if (!data) return;
        document.getElementById('modal-title').textContent  = 'Edit Member';
        document.getElementById('editing-chicken-id').value = data.id;
        document.getElementById('c-name').value  = data.name  || '';
        document.getElementById('c-birth').value = data.birth_month || '';
        document.getElementById('c-color').value = data.color || '';
        document.getElementById('c-notes').value = data.notes || '';
        adaptMemberModal(flockType, data.breed || '', data.gender || '', data.status || 'Active');
        if (data.photo_url) {
          const prev = document.getElementById('photo-preview');
          prev.src = data.photo_url; prev.style.display = 'block';
          document.getElementById('photo-upload-label').textContent = 'Click to change photo';
        }
        document.getElementById('modal-delete-btn').style.display = 'inline-flex';
        document.getElementById('chicken-modal').classList.add('open');
      });
  } else {
    document.getElementById('modal-title').textContent  = 'Add Member';
    document.getElementById('editing-chicken-id').value = '';
    document.getElementById('c-name').value  = '';
    document.getElementById('c-birth').value = '';
    document.getElementById('c-color').value = '';
    document.getElementById('c-notes').value = '';
    adaptMemberModal(flockType, '', '', 'Active');
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

  const breedSelect = document.getElementById('c-breed-select');
  const breedVal = breedSelect.style.display !== 'none'
    ? (breedSelect.value === 'Other'
        ? document.getElementById('c-breed-other').value.trim()
        : breedSelect.value)
    : document.getElementById('c-breed').value.trim();

  const genderField = document.getElementById('c-gender-field');
  const payload = {
    flock_id:    currentFlockId,
    name:        document.getElementById('c-name').value.trim(),
    breed:       breedVal || null,
    birth_month: document.getElementById('c-birth').value || null,
    gender:      genderField.style.display !== 'none' ? document.getElementById('c-gender').value : null,
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
