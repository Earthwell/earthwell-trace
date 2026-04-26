const STORAGE_KEY = "earthwell_producers";

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
  const editId       = document.getElementById("editId").value;
  const producerId   = document.getElementById("producerId").value;
  const farmName     = document.getElementById("farmName").value.trim();
  const ownerName    = document.getElementById("ownerName").value.trim();
  const contact      = document.getElementById("contact").value.trim();
  const location     = document.getElementById("location").value.trim();
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

  document.getElementById("editId").value          = p.id;
  document.getElementById("producerId").value      = p.id;
  document.getElementById("farmName").value        = p.farmName;
  document.getElementById("ownerName").value       = p.ownerName;
  document.getElementById("contact").value         = p.contact || "";
  document.getElementById("location").value        = p.location;
  document.getElementById("certifications").value  = p.certifications || "";
  document.getElementById("form-title").textContent = `Edit Producer — ${p.id}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteProducer(id) {
  if (!confirm(`Delete producer ${id}? This cannot be undone.`)) return;
  const producers = getProducers().filter(p => p.id !== id);
  saveProducers(producers);
  renderProducers();
  showToast("Producer deleted.", "success");
}

function resetForm() {
  document.getElementById("producer-form").reset();
  document.getElementById("editId").value     = "";
  document.getElementById("producerId").value = generateProducerId();
  document.getElementById("form-title").textContent = "Register New Producer";
}

function showToast(msg, type) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = type;
  toast.style.display = "block";
  setTimeout(() => toast.style.display = "none", 3000);
}

function escHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("producerId").value = generateProducerId();
  renderProducers();
});
