const CONTRACT_ADDRESS = "0xA5f865Ace3417C2Edf2D61911758188F5AD9AAD6";
const CHAIN_ID = "0x89"; // Polygon mainnet

const ABI = [
  "function logBatch(string calldata batchId, string calldata productName, string calldata origin, string calldata farmerName, string calldata harvestDate, string calldata processingDate, string calldata certifications, string calldata ipfsHash) external",
  "function owner() external view returns (address)",
  "function getBatchCount() external view returns (uint256)",
  "function batchIds(uint256 index) external view returns (string)"
];

const PRODUCT_CODES = { "Eggs": "EGGS" };

let signer = null;
let readProvider = null;

window.addEventListener("DOMContentLoaded", () => {
  readProvider = new ethers.JsonRpcProvider(
    "https://polygon-mainnet.g.alchemy.com/v2/4pkP6JiK4JM2aez2rtSgT"
  );
  loadProducerDropdown();
});

// ── PRODUCERS ──────────────────────────────────────────────────────────────

function getProducers() {
  return JSON.parse(localStorage.getItem("earthwell_producers") || "[]");
}

function loadProducerDropdown() {
  const select = document.getElementById("producerSelect");
  const producers = getProducers();
  select.innerHTML = `<option value="">— Select producer —</option>`;
  producers.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.farmName} (${p.id})`;
    select.appendChild(opt);
  });
}

async function onProducerChange() {
  const id = document.getElementById("producerSelect").value;
  const producers = getProducers();
  const producer = producers.find(p => p.id === id);
  if (producer) {
    document.getElementById("origin").value    = producer.location;
    document.getElementById("farmerName").value = producer.farmName;
    document.getElementById("certifications").value = producer.certifications || "";
  } else {
    document.getElementById("origin").value     = "";
    document.getElementById("farmerName").value  = "";
  }
  weatherCoords = null;
  await checkAndFetchWeather();
}

// ── BATCH ID ───────────────────────────────────────────────────────────────

async function onProductChange() {
  const product = document.getElementById("productName").value;
  if (!product) { document.getElementById("batchId").value = ""; return; }
  document.getElementById("batchId").value = "Generating…";
  try {
    const batchId = await generateBatchId(product);
    document.getElementById("batchId").value = batchId;
  } catch {
    document.getElementById("batchId").value = "";
  }
}

async function generateBatchId(product) {
  const code = PRODUCT_CODES[product] || product.toUpperCase().replace(/\s+/g, "");
  const prefix = `EW-${code}-`;
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, readProvider);
  const count = Number(await contract.getBatchCount());

  let next = 1;
  if (count > 0) {
    const ids = await Promise.all(
      Array.from({ length: count }, (_, i) => contract.batchIds(i))
    );
    const matching = ids.filter(id => id.startsWith(prefix));
    // Find highest number used for this product prefix
    const nums = matching.map(id => parseInt(id.replace(prefix, ""), 10)).filter(n => !isNaN(n));
    if (nums.length > 0) next = Math.max(...nums) + 1;
  }

  return `${prefix}${String(next).padStart(3, "0")}`;
}

// ── WEATHER ────────────────────────────────────────────────────────────────

let weatherCoords = null;

async function onHarvestDateChange() {
  await checkAndFetchWeather();
}

async function checkAndFetchWeather() {
  const location    = document.getElementById("origin").value.trim();
  const harvestDate = document.getElementById("harvestDate").value;
  if (!location || !harvestDate) return;

  const panel = document.getElementById("weather-panel");
  const status = document.getElementById("weather-status");
  panel.classList.add("visible");
  status.textContent = "Locating…";
  document.getElementById("weather-table").style.display  = "none";
  document.getElementById("weather-summary").style.display = "none";

  try {
    // Geocode the location string if we don't already have coords for it
    if (!weatherCoords || weatherCoords.label !== location) {
      const geo = await geocodeLocation(location);
      if (!geo) { status.textContent = "Could not locate address."; return; }
      weatherCoords = { ...geo, label: location };
    }

    status.textContent = "Fetching weather…";
    const end   = new Date(harvestDate);
    const start = new Date(harvestDate);
    start.setDate(start.getDate() - 9);
    const fmt   = d => d.toISOString().split("T")[0];

    const url = `https://archive-api.open-meteo.com/v1/archive`
      + `?latitude=${weatherCoords.lat}&longitude=${weatherCoords.lon}`
      + `&start_date=${fmt(start)}&end_date=${fmt(end)}`
      + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max`
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;

    const res  = await fetch(url);
    const data = await res.json();
    if (!data.daily) { status.textContent = "Weather data unavailable."; return; }

    renderWeather(data.daily);
    status.textContent = "";
  } catch {
    status.textContent = "Weather unavailable.";
  }
}

async function geocodeLocation(location) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=us`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const results = await res.json();
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
}

function renderWeather(daily) {
  const tbody = document.getElementById("weather-body");
  const days  = daily.time.length;

  let totalRain = 0, totalHigh = 0, totalLow = 0, totalWind = 0;

  tbody.innerHTML = daily.time.map((date, i) => {
    const high  = daily.temperature_2m_max[i]?.toFixed(1) ?? "—";
    const low   = daily.temperature_2m_min[i]?.toFixed(1) ?? "—";
    const rain  = daily.precipitation_sum[i]?.toFixed(2) ?? "0.00";
    const wind  = daily.wind_speed_10m_max[i]?.toFixed(1) ?? "—";
    const label = new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

    totalRain += daily.precipitation_sum[i] || 0;
    totalHigh += daily.temperature_2m_max[i] || 0;
    totalLow  += daily.temperature_2m_min[i] || 0;
    totalWind += daily.wind_speed_10m_max[i] || 0;

    const rainCell = parseFloat(rain) > 0
      ? `<span class="rain-dot">🌧 ${rain}</span>`
      : rain;

    return `<tr>
      <td>${label}</td>
      <td>${high}°</td>
      <td>${low}°</td>
      <td>${rainCell}</td>
      <td>${wind}</td>
    </tr>`;
  }).join("");

  const summary = document.getElementById("weather-summary");
  summary.innerHTML = `
    Avg high <strong>${(totalHigh / days).toFixed(1)}°F</strong> &nbsp;·&nbsp;
    Avg low <strong>${(totalLow / days).toFixed(1)}°F</strong> &nbsp;·&nbsp;
    Total rain <strong>${totalRain.toFixed(2)} in</strong> &nbsp;·&nbsp;
    Avg wind <strong>${(totalWind / days).toFixed(1)} mph</strong>
  `;

  document.getElementById("weather-table").style.display  = "table";
  document.getElementById("weather-summary").style.display = "block";
}

// ── WALLET ─────────────────────────────────────────────────────────────────

async function connectWallet() {
  if (!window.ethereum) {
    showToast("MetaMask not found. Please install it at metamask.io", "error");
    return;
  }
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_ID }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: CHAIN_ID,
              chainName: "Polygon Mainnet",
              nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
              rpcUrls: ["https://polygon-rpc.com/"],
              blockExplorerUrls: ["https://polygonscan.com/"],
            }],
          });
        } else throw switchErr;
      }
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const address = await signer.getAddress();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const owner = await contract.owner();

    if (address.toLowerCase() !== owner.toLowerCase()) {
      showToast("This wallet is not the contract owner and cannot log batches.", "error");
      signer = null;
      return;
    }

    document.getElementById("wallet-status").innerHTML =
      `Connected: <span class="wallet-address">${address.slice(0, 6)}…${address.slice(-4)}</span>`;
    document.getElementById("connect-btn").textContent = "Connected";
    document.getElementById("connect-btn").disabled = true;
    document.getElementById("submit-btn").disabled = false;

  } catch (err) {
    showToast("Wallet connection failed: " + err.message, "error");
  }
}

// ── SUBMIT ─────────────────────────────────────────────────────────────────

async function submitBatch(e) {
  e.preventDefault();
  if (!signer) { showToast("Connect your wallet first.", "error"); return; }

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "Submitting…";

  const batchId        = document.getElementById("batchId").value.trim();
  const productName    = document.getElementById("productName").value.trim();
  const origin         = document.getElementById("origin").value.trim();
  const farmerName     = document.getElementById("farmerName").value.trim();
  const harvestDate    = document.getElementById("harvestDate").value;
  const processingDate = "";
  const certifications = document.getElementById("certifications").value.trim();
  const ipfsHash       = "";

  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const tx = await contract.logBatch(
      batchId, productName, origin, farmerName,
      harvestDate, processingDate, certifications, ipfsHash
    );
    showToast("Transaction sent — waiting for confirmation…", "success");
    await tx.wait();

    const explorerUrl = `https://polygonscan.com/tx/${tx.hash}`;
    showToast(
      `Batch <strong>${batchId}</strong> logged. <a href="${explorerUrl}" target="_blank">View on PolygonScan ↗</a>`,
      "success"
    );

    // Refresh batch ID for next entry, keep product + producer selected
    document.getElementById("harvestDate").value = "";
    await onProductChange();

  } catch (err) {
    const msg = err?.reason || err?.message || "Transaction failed.";
    showToast(msg, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Log Batch on Blockchain";
  }
}

function showToast(msg, type) {
  const toast = document.getElementById("toast");
  toast.innerHTML = msg;
  toast.className = type;
  toast.style.display = "block";
}
