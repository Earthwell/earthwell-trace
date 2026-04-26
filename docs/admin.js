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

function onProducerChange() {
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
  const processingDate = document.getElementById("processingDate").value;
  const certifications = document.getElementById("certifications").value.trim();
  const ipfsHash       = document.getElementById("ipfsHash").value.trim();

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
    document.getElementById("harvestDate").value    = "";
    document.getElementById("processingDate").value = "";
    document.getElementById("ipfsHash").value       = "";
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
