import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying Certification contract...");

  // Deploy the contract
  const Certification = await ethers.getContractFactory("Certification");
  const certification = await Certification.deploy();
  await certification.waitForDeployment();
  const contractAddress = await certification.getAddress();

  console.log("✅ Certification contract deployed to:", contractAddress);

  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deployer address: ${deployer.address}`);

  // Set up roles
  console.log("\n🔧 Setting up roles...");
  
  // Register deployer as INSTITUTION (owner is already set as INSTITUTION in constructor)
  console.log("🏛️  Deployer is registered as an Institution by default");
  
  // Register deployer as VERIFIER
  console.log("🔍 Registering deployer as a Verifier...");
  const verifierRole = 2; // VERIFIER role from enum
  let tx = await certification.registerUser(deployer.address, verifierRole);
  await tx.wait();
  
  // Verify roles were set correctly
  const deployerRole = await certification.userRoles(deployer.address);
  console.log(`\n✅ Role setup complete!`);
  console.log(`   Deployer role: ${getRoleName(deployerRole)}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  // Create deployment directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to a JSON file
  const deploymentFile = path.join(deploymentsDir, `deployment-${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n📝 Deployment info saved to: ${deploymentFile}`);
  console.log("\n✨ Deployment and setup complete!");
  console.log("   Contract address:", contractAddress);
  console.log("   Deployer is now registered with INSTITUTION and VERIFIER roles");
}

// Helper function to convert role number to role name
function getRoleName(role: number): string {
  const roles = ["NONE", "USER", "VERIFIER", "INSTITUTION"];
  return roles[role] || `UNKNOWN (${role})`;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
