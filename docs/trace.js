const NETWORKS = {
  local:   { rpc: "http://127.0.0.1:8545",                                           address: "0x5FbDB2315678afecb367f032d93F642f64180aa3" },
  amoy:    { rpc: "https://polygon-amoy.g.alchemy.com/v2/4pkP6JiK4JM2aez2rtSgT",    address: "0xFB481c343e319BBeA64F69C8E623C7D139A29864" },
  polygon: { rpc: "https://polygon-mainnet.g.alchemy.com/v2/4pkP6JiK4JM2aez2rtSgT", address: "0x8d0968d53cF833cbcFA6eea22F188112A21D2A17" },
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

    document.getElementById("field-product").textContent    = batch.productName;
    document.getElementById("field-origin").textContent     = batch.origin;
    document.getElementById("field-farmer").textContent     = batch.farmerName;
    document.getElementById("field-harvest").textContent    = batch.harvestDate;
    document.getElementById("field-processed").textContent  = batch.processingDate;
    document.getElementById("field-certs").textContent      = batch.certifications;

    const date = new Date(Number(batch.timestamp) * 1000);
    document.getElementById("field-logged").textContent = date.toLocaleString();

    if (batch.ipfsHash) {
      const link = document.getElementById("field-ipfs");
      link.href = `https://ipfs.io/ipfs/${batch.ipfsHash}`;
      link.textContent = "View documents";
      link.style.display = "inline";
    }

    // Look up the transaction hash from the BatchLogged event
    if (explorerBase) {
      try {
        const filter = contract.filters.BatchLogged(batchId);
        const events = await contract.queryFilter(filter);
        if (events.length > 0) {
          const txHash = events[0].transactionHash;
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
  } catch (err) {
    statusEl.textContent = "Batch not found or network error.";
    console.error(err);
  }
}

window.addEventListener("DOMContentLoaded", loadBatch);
