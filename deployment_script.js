// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  
  // Deploy the contract
  console.log("Deploying LandRegistry...");
  const landRegistry = await LandRegistry.deploy();
  
  // Wait for deployment to finish
  await landRegistry.deployed();
  
  console.log("LandRegistry deployed to:", landRegistry.address);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });