const { ethers } = require("hardhat");
require("dotenv").config();

// Edit these fields for each new batch before running
const BATCH = {
  batchId:        "EW-2026-001",
  productName:    "Wildflower Honey",
  origin:         "Blue Ridge Mountains, VA",
  farmerName:     "Ridge Top Apiary",
  harvestDate:    "2026-04-10",
  processingDate: "2026-04-15",
  certifications: "USDA Organic, Non-GMO",
  ipfsHash:       "",   // optional: CID of supporting docs/images on IPFS
};

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("CONTRACT_ADDRESS not set in .env");

  const [admin] = await ethers.getSigners();
  console.log("Logging batch with account:", admin.address);

  const EarthwellTrace = await ethers.getContractFactory("EarthwellTrace");
  const contract = EarthwellTrace.attach(contractAddress);

  const tx = await contract.logBatch(
    BATCH.batchId,
    BATCH.productName,
    BATCH.origin,
    BATCH.farmerName,
    BATCH.harvestDate,
    BATCH.processingDate,
    BATCH.certifications,
    BATCH.ipfsHash
  );

  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Batch logged successfully:", BATCH.batchId);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
