const STORAGE_KEY = "earthwell_producers";

// ── LOCATION AUTOCOMPLETE (OpenStreetMap Nominatim — free, no key needed) ──

let locationDebounce = null;
let locationResults  = [];
let locationConfirmed = false;

function onLocationInput() {
  locationConfirmed = false;
  const q = document.getElementById("locationSearch").value.trim();
  clearTimeout(locationDebounce);
  if (q.length < 2) { closeDropdown(); return; }
  showDropdown(`<div class="searching">Searching…</div>`);
  locationDebounce = setTimeout(() => fetchLocations(q), 350);
}

async function fetchLocations(q) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1&countrycodes=us`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    locationResults = await res.json();

    if (locationResults.length === 0) {
      showDropdown(`<div class="searching">No results — try a different city or zip.</div>`);
      return;
    }

    const html = locationResults.map((r, i) => {
      const addr    = r.address || {};
      const primary = [addr.city || addr.town || addr.village || addr.county, addr.state]
        .filter(Boolean).join(", ");
      return `
        <div class="autocomplete-item" onpointerdown="selectLocation(${i})">
          <div class="primary">${escHtml(primary || r.display_name)}</div>
          <div class="secondary">${escHtml(r.display_name)}</div>
        </div>`;
    }).join("");

    showDropdown(html);
  } catch (err) {
    showDropdown(`<div class="searching">Search unavailable — type your location manually.</div>`);
  }
}

function selectLocation(index) {
  const r    = locationResults[index];
  const addr = r.address || {};
  const formatted = [addr.city || addr.town || addr.village || addr.county, addr.state]
    .filter(Boolean).join(", ");
  document.getElementById("locationSearch").value = formatted;
  locationConfirmed = true;
  closeDropdown();
}

function showDropdown(html) {
  const dd = document.getElementById("location-dropdown");
  dd.innerHTML = html;
  dd.classList.add("open");
}

function closeDropdown() {
  document.getElementById("location-dropdown").classList.remove("open");
}

function closeDropdownDelayed() {
  setTimeout(closeDropdown, 250);
}

// ── PRODUCERS CRUD ─────────────────────────────────────────────────────────

function getProducers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveProducers(producers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(producers));
}

function generateProducerId() {
  const producers = getProducers();
  if (producers.length === 0) return "PROD-001";
  const nums = producers.map(p => parseInt(p.id.replace("PROD-", ""), 10)).filter(n => !isNaN(n));
  return `PROD-${String(Math.max(...nums) + 1).padStart(3, "0")}`;
}

function renderProducers() {
  const tbody = document.getElementById("producer-list");
  const producers = getProducers();

  if (producers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No producers registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = producers.map(p => `
    <tr>
      <td><strong>${escHtml(p.id)}</strong></td>
      <td>${escHtml(p.farmName)}</td>
      <td>${escHtml(p.ownerName)}</td>
      <td>${escHtml(p.location)}</td>
      <td>${escHtml(p.certifications || "—")}</td>
      <td style="white-space:nowrap; display:flex; gap:0.4rem;">
        <button class="btn btn-secondary" onclick="editProducer('${escHtml(p.id)}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteProducer('${escHtml(p.id)}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function saveProducer(e) {
  e.preventDefault();

  const location = document.getElementById("locationSearch").value.trim();
  if (!location) {
    showToast("Please enter a location.", "error");
    return;
  }

  const editId         = document.getElementById("editId").value;
  const producerId     = document.getElementById("producerId").value;
  const farmName       = document.getElementById("farmName").value.trim();
  const ownerName      = document.getElementById("ownerName").value.trim();
  const contact        = document.getElementById("contact").value.trim();
  const certifications = document.getElementById("certifications").value.trim();

  const producers = getProducers();

  if (editId) {
    const idx = producers.findIndex(p => p.id === editId);
    if (idx !== -1) {
      producers[idx] = { id: editId, farmName, ownerName, contact, location, certifications };
    }
  } else {
    producers.push({ id: producerId, farmName, ownerName, contact, location, certifications });
  }

  saveProducers(producers);
  renderProducers();
  resetForm();
  showToast("Producer saved.", "success");
}

function editProducer(id) {
  const producers = getProducers();
  const p = producers.find(p => p.id === id);
  if (!p) return;

  document.getElementById("editId").value           = p.id;
  document.getElementById("producerId").value       = p.id;
  document.getElementById("farmName").value         = p.farmName;
  document.getElementById("ownerName").value        = p.ownerName;
  document.getElementById("contact").value          = p.contact || "";
  document.getElementById("locationSearch").value   = p.location;
  document.getElementById("certifications").value   = p.certifications || "";
  document.getElementById("form-title").textContent = `Edit Producer — ${p.id}`;
  locationConfirmed = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteProducer(id) {
  if (!confirm(`Delete producer ${id}? This cannot be undone.`)) return;
  saveProducers(getProducers().filter(p => p.id !== id));
  renderProducers();
  showToast("Producer deleted.", "success");
}

function resetForm() {
  document.getElementById("producer-form").reset();
  document.getElementById("editId").value           = "";
  document.getElementById("producerId").value       = generateProducerId();
  document.getElementById("locationSearch").value   = "";
  document.getElementById("form-title").textContent = "Register New Producer";
  locationConfirmed = false;
  closeDropdown();
}

function showToast(msg, type) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = type;
  toast.style.display = "block";
  setTimeout(() => toast.style.display = "none", 3000);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("producerId").value = generateProducerId();
  renderProducers();
});
