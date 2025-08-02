const { ethers, network, run } = require("hardhat");
const fs = require("fs");
const path = require("path");
require('dotenv').config();

// Load environment variables
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Contract ABI for verification
const contractABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function userRoles(address) view returns (uint8)",
  "function registerUser(address, uint8) external",
  "event RoleGranted(address indexed user, uint8 role)",
  "event DocumentIssued(address indexed issuer, string documentHash, string metadataURI)",
  "event DocumentVerified(string documentHash, string verificationResult)",
  "event DocumentRevoked(string documentHash)"
];

async function main() {
  // Check if we have the required environment variables
  if (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATE_KEY) {
    throw new Error("Please set the SEPOLIA_RPC_URL and PRIVATE_KEY environment variables");
  }
  
  console.log("🚀 Starting deployment to Sepolia testnet...");
  console.log(`📡 Using RPC URL: ${process.env.SEPOLIA_RPC_URL}`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer address: ${deployer.address}`);
  console.log(`💼 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  // Deploy the contract
  console.log("\n📦 Deploying Certification contract...");
  const Certification = await ethers.getContractFactory("Certification");
  const certification = await Certification.deploy();
  await certification.waitForDeployment();
  const contractAddress = await certification.getAddress();
  
  console.log("✅ Contract deployed to:", contractAddress);
  console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);

  // Set up roles
  console.log("\n🔧 Setting up roles...");
  
  // Register deployer as VERIFIER
  console.log("🔍 Registering deployer as a Verifier...");
  const VERIFIER_ROLE = 2; // VERIFIER role from enum
  const tx = await certification.registerUser(deployer.address, VERIFIER_ROLE);
  await tx.wait();
  
  // Verify roles were set correctly
  const deployerRole = await certification.userRoles(deployer.address);
  console.log(`\n✅ Role setup complete!`);
  console.log(`   Deployer role: ${getRoleName(deployerRole)}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    rpcUrl: process.env.SEPOLIA_RPC_URL
  };

  // Create deployment directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📝 Deployment info saved to: ${deploymentFile}`);

  // Verify contract on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.error("❌ Failed to verify contract:", error);
    }
  } else {
    console.log("\n⚠️  ETHERSCAN_API_KEY not found. Skipping contract verification.");
  }

  // Update frontend .env file
  updateFrontendEnv(contractAddress);
}

function getRoleName(role) {
  switch (role) {
    case 0: return "USER";
    case 1: return "INSTITUTION";
    case 2: return "VERIFIER";
    default: return `UNKNOWN (${role})`;
  }
}

function updateFrontendEnv(contractAddress) {
  const envPath = path.join(__dirname, "../.env");
  let envContent = "";
  
  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Update or add VITE_CONTRACT_ADDRESS
    if (envContent.includes("VITE_CONTRACT_ADDRESS")) {
      envContent = envContent.replace(
        /VITE_CONTRACT_ADDRESS=.*/,
        `VITE_CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `\nVITE_CONTRACT_ADDRESS=${contractAddress}\n`;
    }
    
    // Update or add VITE_DEFAULT_CHAIN_ID
    if (envContent.includes("VITE_DEFAULT_CHAIN_ID")) {
      envContent = envContent.replace(
        /VITE_DEFAULT_CHAIN_ID=.*/,
        "VITE_DEFAULT_CHAIN_ID=11155111"
      );
    } else {
      envContent += "VITE_DEFAULT_CHAIN_ID=11155111\n";
    }
    
    // Update or add VITE_SUPPORTED_CHAINS
    if (envContent.includes("VITE_SUPPORTED_CHAINS")) {
      envContent = envContent.replace(
        /VITE_SUPPORTED_CHAINS=.*/,
        "VITE_SUPPORTED_CHAINS=11155111"
      );
    } else {
      envContent += "VITE_SUPPORTED_CHAINS=11155111\n";
    }
    
    // Update or add VITE_NETWORK_NAMES
    if (envContent.includes("VITE_NETWORK_NAMES")) {
      envContent = envContent.replace(
        /VITE_NETWORK_NAMES=.*/,
        "VITE_NETWORK_NAMES='{\"11155111\":\"Sepolia\"}'"
      );
    } else {
      envContent += "VITE_NETWORK_NAMES='{\"11155111\":\"Sepolia\"}'\n";
    }
  } else {
    // Create new .env file with default values
    envContent = `# Frontend Configuration
VITE_CONTRACT_ADDRESS=${contractAddress}
VITE_DEFAULT_CHAIN_ID=11155111
VITE_SUPPORTED_CHAINS=11155111
VITE_NETWORK_NAMES='{"11155111":"Sepolia"}'
`;
  }
  
  // Write the updated content back to .env
  fs.writeFileSync(envPath, envContent);
  console.log("\n🔄 Updated frontend .env file with contract address and network settings");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
