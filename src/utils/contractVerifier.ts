import { ethers } from 'ethers';

// Contract ABI with minimal functions needed for verification
const MINIMAL_ABI = [
  'function isInstitution(address) view returns (bool)',
  'function isVerifier(address) view returns (bool)',
  'function getUserRole(address) view returns (uint8)'
];

export async function verifyContractConnection(
  provider: ethers.BrowserProvider,
  contractAddress: string
): Promise<{
  isContract: boolean;
  code: string;
  functions: string[];
  error?: string;
}> {
  try {
    // Check if the address contains code
    const code = await provider.getCode(contractAddress);
    const isContract = code !== '0x';
    
    if (!isContract) {
      return {
        isContract: false,
        code,
        functions: [],
        error: 'No contract code at the specified address'
      };
    }

    // Try to create a contract instance and call a function
    const contract = new ethers.Contract(contractAddress, MINIMAL_ABI, provider);
    
    // Test a view function
    const testAddress = '0x0000000000000000000000000000000000000000';
    const functions: string[] = [];
    
    try {
      await contract.isInstitution(testAddress);
      functions.push('isInstitution');
    } catch (e) {
      console.warn('isInstitution call failed:', e);
    }
    
    try {
      await contract.isVerifier(testAddress);
      functions.push('isVerifier');
    } catch (e) {
      console.warn('isVerifier call failed:', e);
    }
    
    try {
      await contract.getUserRole(testAddress);
      functions.push('getUserRole');
    } catch (e) {
      console.warn('getUserRole call failed:', e);
    }

    return {
      isContract: true,
      code: code.slice(0, 20) + '...', // Just show first 20 chars of bytecode
      functions
    };
  } catch (error) {
    console.error('Error verifying contract:', error);
    return {
      isContract: false,
      code: '',
      functions: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function checkNetwork(provider: ethers.BrowserProvider): Promise<{
  chainId: number;
  name: string;
  isSepolia: boolean;
}> {
  try {
    const network = await provider.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: network.name,
      isSepolia: network.chainId === BigInt(11155111) // Sepolia chain ID
    };
  } catch (error) {
    console.error('Error checking network:', error);
    throw error;
  }
}
