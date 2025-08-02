import { ethers } from 'ethers';
import CertificationArtifact from '../artifacts/contracts/Certification.sol/Certification.json';
import { CertificationContract, ContractDeploymentInfo, UserRole } from '../types/contracts';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  console.error('VITE_CONTRACT_ADDRESS is not set in environment variables');
  throw new Error('Contract address not configured. Please set VITE_CONTRACT_ADDRESS in your .env file.');
}

let contractInstance: CertificationContract | null = null;
let provider: ethers.BrowserProvider | null = null;
let signer: ethers.JsonRpcSigner | null = null;

export const initContract = async (): Promise<CertificationContract> => {
  if (contractInstance) {
    return contractInstance;
  }

  if (typeof window.ethereum === 'undefined') {
    throw new Error('Ethereum provider not found. Please install MetaMask.');
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    
    contractInstance = new ethers.Contract(
      CONTRACT_ADDRESS,
      CertificationArtifact.abi,
      signer
    ) as unknown as CertificationContract;

    return contractInstance;
  } catch (error) {
    console.error('Error initializing contract:', error);
    throw new Error('Failed to initialize contract. Please check your connection and try again.');
  }
};


export const getContract = async (): Promise<CertificationContract> => {
  if (!contractInstance) {
    return await initContract();
  }
  return contractInstance;
};


export const getCurrentAccount = async (): Promise<string> => {
  if (!signer) {
    throw new Error('Signer not initialized. Call initContract() first.');
  }
  return await signer.getAddress();
};


export const getCurrentUserRole = async (): Promise<UserRole> => {
  try {
    const contract = await getContract();
    const address = await getCurrentAccount();
    return await contract.userRoles(address);
  } catch (error) {
    console.error('Error getting user role:', error);
    throw new Error('Failed to get user role. Please ensure you are connected to the correct network.');
  }
};


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
