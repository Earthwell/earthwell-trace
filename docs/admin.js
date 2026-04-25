const CONTRACT_ADDRESS = "0xFB481c343e319BBeA64F69C8E623C7D139A29864";
const AMOY_CHAIN_ID = "0x13882";

const ABI = [
  "function logBatch(string calldata batchId, string calldata productName, string calldata origin, string calldata farmerName, string calldata harvestDate, string calldata processingDate, string calldata certifications, string calldata ipfsHash) external",
  "function owner() external view returns (address)"
];

let signer = null;

async function connectWallet() {
  if (!window.ethereum) {
    showToast("MetaMask not found. Please install it at metamask.io", "error");
    return;
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });

    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== AMOY_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: AMOY_CHAIN_ID }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: AMOY_CHAIN_ID,
              chainName: "Polygon Amoy Testnet",
              nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
              rpcUrls: ["https://rpc-amoy.polygon.technology/"],
              blockExplorerUrls: ["https://amoy.polygonscan.com/"],
            }],
          });
        } else {
          throw switchErr;
        }
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
  const harvestDate    = document.getElementById("harvestDate").value.trim();
  const processingDate = document.getElementById("processingDate").value.trim();
  const certifications = document.getElementById("certifications").value.trim();
  const ipfsHash       = document.getElementById("ipfsHash").value.trim();

  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const tx = await contract.logBatch(
      batchId, productName, origin, farmerName,
      harvestDate, processingDate, certifications, ipfsHash
    );

    showToast(`Transaction sent — waiting for confirmation…`, "success");
    await tx.wait();

    const explorerUrl = `https://amoy.polygonscan.com/tx/${tx.hash}`;
    showToast(
      `Batch <strong>${batchId}</strong> logged. <a href="${explorerUrl}" target="_blank">View on PolygonScan ↗</a>`,
      "success"
    );
    document.getElementById("batch-form").reset();

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
