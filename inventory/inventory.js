
// Display name corrections — maps legacy on-chain names to current brand names
const PRODUCT_DISPLAY_NAMES = { 'Eggs': 'Pasture-raised Eggs' };
function displayName(name) { return PRODUCT_DISPLAY_NAMES[name] || name; }
const CONTRACT_ADDRESS = "0xA5f865Ace3417C2Edf2D61911758188F5AD9AAD6";
const RPC_URL = "https://polygon-mainnet.g.alchemy.com/v2/4pkP6JiK4JM2aez2rtSgT";

const ABI = [
  "function getBatchCount() external view returns (uint256)",
  "function batchIds(uint256 index) external view returns (string)",
  "function getBatch(string calldata batchId) external view returns (tuple(string batchId, string productName, string origin, string farmerName, string harvestDate, string processingDate, string certifications, string ipfsHash, uint256 timestamp, bool exists))"
];

let allRows = [];

async function loadInventory() {
  const statusEl = document.getElementById("status");
  const tbody = document.getElementById("table-body");

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    const count = await contract.getBatchCount();
    document.getElementById("count-badge").textContent = `${count} batch${count === 1n ? "" : "es"}`;

    if (count === 0n) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No batches logged yet.</td></tr>`;
      return;
    }

    const fetches = [];
    for (let i = 0; i < count; i++) {
      fetches.push(
        contract.batchIds(i).then(id => contract.getBatch(id))
      );
    }

    const batches = await Promise.all(fetches);
    allRows = batches;
    renderTable(batches);
    statusEl.textContent = "";

  } catch (err) {
    statusEl.textContent = "Failed to load inventory. Check network connection.";
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Could not connect to blockchain.</td></tr>`;
    console.error(err);
  }
}

function renderTable(batches) {
  const tbody = document.getElementById("table-body");

  if (batches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No matching batches.</td></tr>`;
    return;
  }

  tbody.innerHTML = batches.map(b => {
    const certs = b.certifications
      ? b.certifications.split(",").map(c =>
          `<span class="cert-badge">${c.trim()}</span>`
        ).join("")
      : "—";

    const traceUrl = `/trace?batch=${encodeURIComponent(b.batchId)}&network=polygon`;

    return `
      <tr>
        <td><strong>${escHtml(b.batchId)}</strong></td>
        <td>${escHtml(b.productName)}</td>
        <td class="hide-mobile">${escHtml(b.origin)}</td>
        <td class="hide-mobile">${escHtml(b.farmerName)}</td>
        <td class="hide-mobile">${escHtml(b.harvestDate)}</td>
        <td class="hide-mobile">${certs}</td>
        <td><a class="trace-link" href="${traceUrl}">View →</a></td>
      </tr>`;
  }).join("");
}

function filterTable() {
  const q = document.getElementById("search").value.toLowerCase();
  if (!q) { renderTable(allRows); return; }

  const filtered = allRows.filter(b =>
    b.batchId.toLowerCase().includes(q) ||
    b.productName.toLowerCase().includes(q) ||
    b.origin.toLowerCase().includes(q) ||
    b.farmerName.toLowerCase().includes(q)
  );
  renderTable(filtered);
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

window.addEventListener("DOMContentLoaded", loadInventory);
