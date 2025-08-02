# CertiFi - Blockchain Certificate Verification System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-9cf.svg)](https://hardhat.org/)
[![React](https://img.shields.io/badge/Frontend-React-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC.svg)](https://www.typescriptlang.org/)

CertiFi is a decentralized application (dApp) built on the Ethereum blockchain that provides a secure and transparent way to issue, verify, and manage digital certificates. The system supports three types of users: certificate issuers (Institutions), verifiers, and end-users.

## ✨ Features

- **Role-Based Access Control**: Three distinct user roles - User, Verifier, and Institution
- **Blockchain-Powered**: Immutable certificate storage on the Ethereum blockchain
- **MetaMask Integration**: Secure wallet connection and transaction signing
- **Responsive UI**: Works on desktop and mobile devices
- **Sepolia Testnet Ready**: Deploy and test with test ETH

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later) or yarn
- MetaMask browser extension
- Sepolia test ETH (get some from a [faucet](https://sepoliafaucet.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/certifi2.git
   cd certifi2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration (see [Configuration](#-configuration) section)

## 🔧 Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Required for deployment
SEPOLIA_RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_private_key

# Optional (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Frontend configuration (auto-updated during deployment)
VITE_CONTRACT_ADDRESS=0x...
VITE_DEFAULT_CHAIN_ID=11155111
VITE_SUPPORTED_CHAINS=11155111
VITE_NETWORK_NAMES='{"11155111":"Sepolia"}'
```

## 🛠 Deployment

### Deploy Smart Contract to Sepolia

1. **Fund your deployer account** with Sepolia ETH from a [faucet](https://sepoliafaucet.com/)

2. **Deploy the contract**:
   ```bash
   npx hardhat run scripts/deploy-sepolia.ts --network sepolia
   ```
   This will:
   - Deploy the Certification contract
   - Set up roles
   - Verify the contract on Etherscan (if API key is provided)
   - Update frontend environment variables

### Start the Frontend

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:5173](http://localhost:5173) in your browser

## 📱 Usage

### For Institutions
1. Connect your MetaMask wallet (Institution account)
2. Navigate to the Dashboard
3. Issue new certificates by providing recipient details and document hash
4. Track issued certificates

### For Verifiers
1. Connect your MetaMask wallet (Verifier account)
2. View verification requests
3. Verify or reject certificate authenticity

### For Users
1. Connect your MetaMask wallet
2. View your certificates
3. Share certificate hashes for verification

## 📚 Documentation

- [Smart Contract Documentation](./docs/contracts.md)
- [Frontend Architecture](./docs/frontend.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [React](https://reactjs.org/) - Frontend library
- [Ethers.js](https://docs.ethers.org/) - Ethereum wallet implementation
- [Vite](https://vitejs.dev/) - Frontend build tool

---

<div align="center">
  Made with ❤️ by the CertiFi Team
</div>
