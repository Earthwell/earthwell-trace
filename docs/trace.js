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
  } catch (err) {
    statusEl.textContent = "Batch not found or network error.";
    console.error(err);
  }
}

window.addEventListener("DOMContentLoaded", loadBatch);
