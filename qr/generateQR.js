const QRCode  = require("qrcode");
const ethers  = require("ethers");
const path    = require("path");
const fs      = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const BASE_URL        = "https://earthwell.farm/trace";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL         = process.env.ALCHEMY_POLYGON_MAINNET_URL;

const ABI = [
  "function getBatchCount() external view returns (uint256)",
  "function batchIds(uint256 index) external view returns (string)",
  "function getBatch(string calldata batchId) external view returns (tuple(string batchId, string productName, string origin, string farmerName, string harvestDate, string processingDate, string certifications, string ipfsHash, uint256 timestamp, bool exists))"
];

const outputDir = path.join(__dirname, "output");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

async function generate(batchId) {
  const url      = `${BASE_URL}?batch=${encodeURIComponent(batchId)}`;
  const filePath = path.join(outputDir, `${batchId}.png`);
  await QRCode.toFile(filePath, url, {
    width:           600,
    margin:          2,
    color: { dark: "#173404", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
  console.log(`✓  ${batchId}`);
  console.log(`   File: ${filePath}`);
  console.log(`   URL:  ${url}`);
}

(async () => {
  // If a batch ID is passed as a CLI argument, use it directly
  const arg = process.argv[2];
  if (arg) {
    await generate(arg);
    return;
  }

  // Otherwise fetch the latest batch from the contract
  if (!CONTRACT_ADDRESS || !RPC_URL) {
    console.error("CONTRACT_ADDRESS and ALCHEMY_POLYGON_MAINNET_URL must be set in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  const count    = Number(await contract.getBatchCount());

  if (count === 0) {
    console.error("No batches logged yet.");
    process.exit(1);
  }

  // Generate QR for the latest batch
  const latestId = await contract.batchIds(count - 1);
  const batch    = await contract.getBatch(latestId);

  console.log(`\nLatest batch: ${latestId} — ${batch.productName} (${batch.harvestDate})`);
  await generate(latestId);

  console.log(`\nTo generate a QR for a specific batch:`);
  console.log(`  node qr/generateQR.js EW-EGGS-001`);
})();
