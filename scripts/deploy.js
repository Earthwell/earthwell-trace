const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const EarthwellTrace = await ethers.getContractFactory("EarthwellTrace");
  const contract = await EarthwellTrace.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("EarthwellTrace deployed to:", address);
  console.log("Add this to your .env as CONTRACT_ADDRESS=", address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
