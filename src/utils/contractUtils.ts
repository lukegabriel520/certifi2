import { ethers } from 'ethers';
import CertificationArtifact from '../artifacts/contracts/Certification.sol/Certification.json';
import { CertificationContract, ContractDeploymentInfo, UserRole } from '../types/contracts';

const DEPLOYMENT_FILE = '/deployments/deployment-hardhat.json'; // Update this for different networks

let contractInstance: CertificationContract | null = null;
let provider: ethers.BrowserProvider | null = null;
let signer: ethers.JsonRpcSigner | null = null;

/**
 * Initialize the contract instance with a provider and signer
 */
export const initContract = async (): Promise<CertificationContract> => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('Ethereum provider not found. Please install MetaMask.');
  }

  // Initialize provider and signer
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();

  // Get the network
  const network = await provider.getNetwork();
  
  // Load deployment info
  let deploymentInfo: ContractDeploymentInfo;
  try {
    const response = await fetch(DEPLOYMENT_FILE);
    const deployments = await response.json();
    deploymentInfo = deployments[network.chainId];
    
    if (!deploymentInfo) {
      throw new Error(`No deployment found for network ${network.name} (${network.chainId})`);
    }
  } catch (error) {
    console.error('Error loading deployment info:', error);
    throw new Error('Failed to load contract deployment information');
  }

  // Create contract instance
  contractInstance = new ethers.Contract(
    deploymentInfo.contractAddress,
    CertificationArtifact.abi,
    signer
  ) as unknown as CertificationContract;

  return contractInstance;
};

/**
 * Get the contract instance
 * @throws {Error} If the contract is not initialized
 */
export const getContract = (): CertificationContract => {
  if (!contractInstance) {
    throw new Error('Contract not initialized. Call initContract() first.');
  }
  return contractInstance;
};

/**
 * Get the current user's address
 */
export const getCurrentAccount = async (): Promise<string> => {
  if (!signer) {
    throw new Error('Signer not initialized. Call initContract() first.');
  }
  return await signer.getAddress();
};

/**
 * Get the current user's role
 */
export const getCurrentUserRole = async (): Promise<UserRole> => {
  const contract = getContract();
  const address = await getCurrentAccount();
  return contract.userRoles(address);
};

/**
 * Format a role number to a human-readable string
 */
export const formatRole = (role: UserRole): string => {
  switch (role) {
    case UserRole.USER:
      return 'User';
    case UserRole.VERIFIER:
      return 'Verifier';
    case UserRole.INSTITUTION:
      return 'Institution';
    case UserRole.NONE:
    default:
      return 'None';
  }
};

/**
 * Generate a document ID from the document hash and recipient address
 */
export const generateDocumentId = (documentHash: string, recipientAddress: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(`${documentHash}:${recipientAddress.toLowerCase()}`));
};

/**
 * Format a timestamp to a human-readable date string
 */
export const formatTimestamp = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleString();
};

/**
 * Check if the current user is connected to the correct network
 * @param requiredChainId The required chain ID
 */
export const checkNetwork = async (requiredChainId: number): Promise<boolean> => {
  if (!provider) {
    throw new Error('Provider not initialized');
  }
  const network = await provider.getNetwork();
  return network.chainId === BigInt(requiredChainId);
};

/**
 * Switch to the required network
 * @param chainId The chain ID to switch to
 */
export const switchNetwork = async (chainId: number): Promise<void> => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('Ethereum provider not found');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      throw new Error(`Network with chainId ${chainId} not found in MetaMask`);
    }
    throw switchError;
  }
};
