
// Display name corrections — maps legacy on-chain names to current brand names
const PRODUCT_DISPLAY_NAMES = { 'Eggs': 'Pasture-raised Eggs' };
function displayName(name) { return PRODUCT_DISPLAY_NAMES[name] || name; }
const NETWORKS = {
  local:   { rpc: "http://127.0.0.1:8545",                                           address: "0x5FbDB2315678afecb367f032d93F642f64180aa3" },
  amoy:    { rpc: "https://polygon-amoy.g.alchemy.com/v2/4pkP6JiK4JM2aez2rtSgT",    address: "0xFB481c343e319BBeA64F69C8E623C7D139A29864" },
  polygon: { rpc: "https://polygon-mainnet.g.alchemy.com/v2/4pkP6JiK4JM2aez2rtSgT", address: "0xA5f865Ace3417C2Edf2D61911758188F5AD9AAD6" },
};

const ABI = [
  "function getBatch(string calldata batchId) external view returns (tuple(string batchId, string productName, string origin, string farmerName, string harvestDate, string processingDate, string certifications, string ipfsHash, uint256 timestamp, bool exists))",
  "event BatchLogged(string indexed batchId, string productName, uint256 timestamp)"
];

const EXPLORERS = {
  local:   null,
  amoy:    "https://amoy.polygonscan.com",
  polygon: "https://polygonscan.com",
};

async function loadBatch() {
  const params = new URLSearchParams(window.location.search);
  const batchId = params.get("batch");
  const networkKey = params.get("network") || "polygon";
  const network = NETWORKS[networkKey] || NETWORKS.polygon;
  const explorerBase = EXPLORERS[networkKey] || null;
  const CONTRACT_ADDRESS = params.get("contract") || network.address;

  const statusEl = document.getElementById("status");
  const cardEl = document.getElementById("batch-card");

  if (!batchId) {
    statusEl.textContent = "No batch ID provided in URL.";
    return;
  }

  document.getElementById("batch-id-display").textContent = batchId;
  statusEl.textContent = "Looking up batch on blockchain...";

  try {
    const provider = new ethers.JsonRpcProvider(network.rpc);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const batch = await contract.getBatch(batchId);

    document.getElementById("field-product").textContent    = displayName(batch.productName);
    document.getElementById("field-origin").textContent     = batch.origin;
    document.getElementById("field-farmer").textContent     = batch.farmerName;
    document.getElementById("field-harvest").textContent    = batch.harvestDate;
    document.getElementById("field-certs").textContent      = batch.certifications;

    const date = new Date(Number(batch.timestamp) * 1000);
    document.getElementById("field-logged").textContent = date.toLocaleString();

    if (batch.ipfsHash) {
      const link = document.getElementById("field-ipfs");
      link.href = `https://ipfs.io/ipfs/${batch.ipfsHash}`;
      link.textContent = "View documents";
      document.getElementById("field-ipfs-row").style.display = "flex";
    }

    // Look up the transaction hash from the BatchLogged event
    if (explorerBase) {
      try {
        // Estimate the block number from the batch timestamp.
        // Anchor: block 86050251 = new contract deployment block, ~2s Polygon block time.
        // Alchemy free tier allows max 10-block range for eth_getLogs.
        const ANCHOR_BLOCK = 86050251;
        const ANCHOR_TS    = 1777220546;
        const batchTs      = Number(batch.timestamp);
        const estimated    = ANCHOR_BLOCK + Math.round((batchTs - ANCHOR_TS) / 2);
        const fromBlock    = Math.max(ANCHOR_BLOCK, estimated - 4);
        const toBlock      = fromBlock + 9;

        const events = await contract.queryFilter(
          contract.filters.BatchLogged(), fromBlock, toBlock
        );
        const match = events.find(
          e => Number(e.args.timestamp) === batchTs
        );
        if (match) {
          const txHash = match.transactionHash;
          const txLink = document.getElementById("field-tx");
          txLink.href = `${explorerBase}/tx/${txHash}`;
          txLink.textContent = `${txHash.slice(0, 12)}…${txHash.slice(-8)} ↗`;
          txLink.style.display = "inline";
        }
      } catch (e) {
        // Non-critical — silently skip if event lookup fails
      }
    }

    statusEl.textContent = "";
    cardEl.style.display = "block";

    // Fetch weather and flock source in parallel
    fetchHarvestWeather(batch.origin, batch.harvestDate);
    loadFlockSource(batchId);

  } catch (err) {
    statusEl.textContent = "Batch not found or network error.";
    console.error(err);
  }
}

// ── HARVEST WEATHER ────────────────────────────────────────────────────────

async function fetchHarvestWeather(location, harvestDate) {
  if (!location || !harvestDate) return;
  const panel = document.getElementById("weather-panel");
  const statusEl = document.getElementById("weather-status");
  panel.classList.add("visible");

  try {
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=us`;
    const geoRes = await fetch(geoUrl, { headers: { "Accept-Language": "en" } });
    const geoData = await geoRes.json();
    if (!geoData.length) { statusEl.textContent = "Location not found."; return; }

    const { lat, lon } = geoData[0];
    const end   = new Date(harvestDate);
    const start = new Date(harvestDate);
    start.setDate(start.getDate() - 9);
    const fmt = d => d.toISOString().split("T")[0];

    const wxUrl = `https://archive-api.open-meteo.com/v1/archive`
      + `?latitude=${lat}&longitude=${lon}`
      + `&start_date=${fmt(start)}&end_date=${fmt(end)}`
      + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max`
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;

    const wxRes  = await fetch(wxUrl);
    const wxData = await wxRes.json();
    if (!wxData.daily) { statusEl.textContent = "Weather data unavailable."; return; }

    renderWeather(wxData.daily);
    statusEl.textContent = "";
  } catch {
    statusEl.textContent = "Weather unavailable.";
  }
}

function renderWeather(daily) {
  const tbody = document.getElementById("weather-body");
  const days  = daily.time.length;
  let totalRain = 0, totalHigh = 0, totalLow = 0, totalWind = 0;

  tbody.innerHTML = daily.time.map((date, i) => {
    const high = daily.temperature_2m_max[i]?.toFixed(1) ?? "—";
    const low  = daily.temperature_2m_min[i]?.toFixed(1) ?? "—";
    const rain = daily.precipitation_sum[i]?.toFixed(2) ?? "0.00";
    const wind = daily.wind_speed_10m_max[i]?.toFixed(1) ?? "—";
    const label = new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

    totalRain += daily.precipitation_sum[i] || 0;
    totalHigh += daily.temperature_2m_max[i] || 0;
    totalLow  += daily.temperature_2m_min[i] || 0;
    totalWind += daily.wind_speed_10m_max[i] || 0;

    return `<tr>
      <td>${label}</td>
      <td>${high}°</td>
      <td>${low}°</td>
      <td>${parseFloat(rain) > 0 ? `<span class="rain-dot">🌧 ${rain}</span>` : rain}</td>
      <td>${wind}</td>
    </tr>`;
  }).join("");

  const summary = document.getElementById("weather-summary");
  summary.innerHTML = `Avg high <strong>${(totalHigh/days).toFixed(1)}°F</strong> &nbsp;·&nbsp; Avg low <strong>${(totalLow/days).toFixed(1)}°F</strong> &nbsp;·&nbsp; Total rain <strong>${totalRain.toFixed(2)} in</strong> &nbsp;·&nbsp; Avg wind <strong>${(totalWind/days).toFixed(1)} mph</strong>`;

  document.getElementById("weather-table").style.display  = "table";
  document.getElementById("weather-summary").style.display = "block";
}

// ── FLORA & FAUNA SOURCE ───────────────────────────────────────────────────

let flockDetailsVisible = false;

async function loadFlockSource(batchId) {
  if (!window._sb) return;

  // Look up the Supabase batch record for the flock link
  const { data: batchRecord } = await window._sb
    .from('batches').select('source_flock_id').eq('batch_id', batchId).maybeSingle();
  if (!batchRecord?.source_flock_id) return;

  // Fetch the flock and its members
  const [{ data: flock }, { data: members }] = await Promise.all([
    window._sb.from('flocks').select('*').eq('id', batchRecord.source_flock_id).single(),
    window._sb.from('chickens').select('*').eq('flock_id', batchRecord.source_flock_id).order('created_at'),
  ]);
  if (!flock) return;

  const typeLabel = flock.type
    ? flock.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '';

  document.getElementById('flock-source-name').textContent  = flock.name;
  document.getElementById('flock-source-badge').textContent = typeLabel;
  document.getElementById('flock-source-badge').style.display = typeLabel ? '' : 'none';
  document.getElementById('flock-source-row').style.display = '';

  // Pre-render the details panel
  const memberCount = (members || []).length;
  const metaParts   = [typeLabel, memberCount ? `${memberCount} member${memberCount !== 1 ? 's' : ''}` : ''].filter(Boolean);

  const memberCards = (members || []).map(m => {
    const photo = m.photo_url
      ? `<img class="flock-member-photo" src="${escHtml(m.photo_url)}" alt="${escHtml(m.name || '')}" loading="lazy" />`
      : `<div class="flock-member-placeholder">🐔</div>`;
    const age = m.birth_month ? memberAge(m.birth_month) : '';
    const meta = [m.gender, age].filter(Boolean).join(' · ');
    return `
      <div class="flock-member-card">
        ${photo}
        <div class="flock-member-body">
          <div class="flock-member-name">${escHtml(m.name || 'Unnamed')}</div>
          <div class="flock-member-breed">${escHtml(m.breed || '—')}</div>
          ${meta ? `<div class="flock-member-meta">${escHtml(meta)}</div>` : ''}
          ${m.color ? `<div class="flock-member-meta">${escHtml(m.color)}</div>` : ''}
          ${m.notes ? `<div class="flock-member-meta" style="font-style:italic;">${escHtml(m.notes)}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  document.getElementById('flock-details-panel').innerHTML = `
    <div class="flock-details-header">${escHtml(flock.name)}</div>
    <div class="flock-details-meta">${metaParts.join(' · ')}${flock.description ? ' — ' + escHtml(flock.description) : ''}</div>
    ${memberCards ? `<div class="flock-member-grid">${memberCards}</div>` : '<p style="font-size:0.85rem;color:var(--faint);font-style:italic;">No individual member records.</p>'}
  `;
}

function toggleFlockDetails() {
  flockDetailsVisible = !flockDetailsVisible;
  const panel = document.getElementById('flock-details-panel');
  const btn   = document.getElementById('flock-expand-btn');
  panel.style.display    = flockDetailsVisible ? '' : 'none';
  btn.textContent        = flockDetailsVisible ? 'Hide details ▴' : 'Show details ▾';
}

function memberAge(birthMonth) {
  const birth  = new Date(birthMonth + '-01');
  const months = (new Date().getFullYear() - birth.getFullYear()) * 12
               + (new Date().getMonth() - birth.getMonth());
  if (months < 12) return months + (months === 1 ? ' mo' : ' mos');
  const yrs = Math.floor(months / 12);
  return yrs + (yrs === 1 ? ' yr' : ' yrs');
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.addEventListener("DOMContentLoaded", loadBatch);
