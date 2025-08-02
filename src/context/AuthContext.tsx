import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers';
import { User, AuthContextType, Document } from '../types';

const CERTIFICATION_ABI = [
  'function isInstitution(address) view returns (bool)',
  'function isVerifier(address) view returns (bool)',
  'function documents(bytes32) view returns (string, string, bool, bool, string)',
  'function issueDocument(bytes32, string) payable',
  'function verifyDocument(bytes32, string) payable',
  'event DocumentIssued(address indexed issuer, bytes32 indexed documentHash, string metadataURI)',
  'event DocumentVerified(bytes32 indexed documentHash, string verificationResult)',
  'event DocumentRevoked(bytes32 indexed documentHash)',
  'event RoleGranted(string role, address account)',
  'event RoleRevoked(string role, address account)'
] as const;

type CertificationContract = Omit<ethers.Contract, 'isInstitution' | 'isVerifier' | 'documents' | 'issueDocument' | 'verifyDocument'> & {
  isInstitution: (address: string) => Promise<boolean>;
  isVerifier: (address: string) => Promise<boolean>;
  documents: (documentHash: string) => Promise<[string, string, boolean, boolean, string]>;
  issueDocument: (documentHash: string, metadataURI: string) => Promise<ethers.ContractTransactionResponse>;
  verifyDocument: (documentHash: string, verificationResult: string) => Promise<ethers.ContractTransactionResponse>;
};

type EIP1193Provider = {
  request: (request: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  selectedAddress: string | null;
  networkVersion: string;
  chainId: string;
};

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const DEFAULT_CHAIN_ID = import.meta.env.VITE_DEFAULT_CHAIN_ID || '11155111';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkCorrect, setIsNetworkCorrect] = useState<boolean>(false);
  const [contract, setContract] = useState<CertificationContract | null>(null);

  const checkNetwork = async (ethProvider: BrowserProvider): Promise<boolean> => {
    try {
      const network = await ethProvider.getNetwork();
      const isCorrectNetwork = network.chainId.toString() === DEFAULT_CHAIN_ID;
      setIsNetworkCorrect(isCorrectNetwork);
      return isCorrectNetwork;
    } catch (err) {
      console.error("Error checking network:", err);
      setIsNetworkCorrect(false);
      return false;
    }
  };

  const initContract = useCallback((signer?: JsonRpcSigner): CertificationContract => {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }
    
    const signerOrProvider = signer || provider;
    if (!signerOrProvider) {
      throw new Error('No provider or signer available');
    }
    
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CERTIFICATION_ABI,
      signerOrProvider
    ) as unknown as CertificationContract;
    
    setContract(contract);
    return contract;
  }, [provider]);

  const updateUserState = useCallback(async (ethProvider: BrowserProvider) => {
    try {
      setLoading(true);
      setError(null);
      
      const accounts = await ethProvider.listAccounts();
      if (accounts.length === 0) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      
      const signer = await ethProvider.getSigner();
      const address = await signer.getAddress();
      
      const isCorrectNetwork = await checkNetwork(ethProvider);
      if (!isCorrectNetwork) {
        setError('Please connect to the correct network');
        setLoading(false);
        return;
      }
      
      const contractWithSigner = initContract(signer);
      
      const [isInstitution, isVerifier] = await Promise.all([
        contractWithSigner.isInstitution(address),
        contractWithSigner.isVerifier(address)
      ]);
      
      setCurrentUser({
        address,
        isInstitution,
        isVerifier,
        isConnected: true
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error updating user state:', err);
      setError('Failed to update user state');
      setLoading(false);
    }
  }, [initContract]);

  const connectWallet = useCallback(async (): Promise<boolean> => {
    if (!window.ethereum) {
      const errorMsg = 'Please install MetaMask to use this application';
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      return false;
    }
    
    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum as EIP1193Provider);
      const accounts = await ethProvider.send("eth_requestAccounts", []);
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found or user denied access');
      }
      
      setProvider(ethProvider);
      await updateUserState(ethProvider);
      return true;
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet');
      setLoading(false);
      return false;
    }
  }, [updateUserState]);

  const logout = useCallback((): void => {
    setCurrentUser(null);
    setProvider(null);
    setContract(null);
    setError(null);
    setIsNetworkCorrect(false);
  }, []);

  const switchToCorrectNetwork = useCallback(async (): Promise<boolean> => {
    if (!window.ethereum) return false;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(DEFAULT_CHAIN_ID).toString(16)}` }]
      });
      return true;
    } catch (switchError) {
      console.error('Error switching network:', switchError);
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!window.ethereum) {
        console.log('MetaMask not detected');
        if (isMounted) setLoading(false);
        return;
      }
      
      try {
        const ethProvider = new ethers.BrowserProvider(window.ethereum as EIP1193Provider);
        if (isMounted) setProvider(ethProvider);
        
        await initContract();
        
        const accounts = await ethProvider.listAccounts();
        if (accounts && accounts.length > 0) {
          await updateUserState(ethProvider);
        } else if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing provider:', error);
        if (isMounted) {
          setError('Failed to initialize wallet connection');
          setLoading(false);
        }
      }
    };

    init();

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        logout();
      } else if (currentUser && currentUser.address !== accounts[0]) {
        provider && updateUserState(provider);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      isMounted = false;
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [currentUser, provider, updateUserState, initContract, logout]);

  const issueCertificate = useCallback(async (documentHash: string, metadataURI: string): Promise<string> => {
    if (!provider || !currentUser) {
      throw new Error("Wallet not connected.");
    }

    if (!contract) {
      throw new Error("Contract not initialized.");
    }

    if (!currentUser.isInstitution) {
      throw new Error("Only institutions can issue certificates.");
    }

    try {
      const tx = await contract.issueDocument(documentHash, metadataURI);
      const receipt = await tx.wait();
      if (!receipt.hash) throw new Error("Transaction failed");
      return receipt.hash;
    } catch (error) {
      console.error("Error issuing certificate:", error);
      throw error;
    }
  }, [contract, currentUser, provider]);

  const verifyDocument = useCallback(async (documentHash: string, verificationResult: string): Promise<string> => {
    if (!provider || !currentUser) {
      throw new Error("Wallet not connected.");
    }

    if (!contract) {
      throw new Error("Contract not initialized.");
    }

    if (!currentUser.isVerifier) {
      throw new Error("Only verifiers can verify documents.");
    }

    try {
      const tx = await contract.verifyDocument(documentHash, verificationResult);
      const receipt = await tx.wait();
      if (!receipt.hash) throw new Error("Transaction failed");
      return receipt.hash;
    } catch (error) {
      console.error("Error verifying document:", error);
      throw error;
    }
  }, [contract, currentUser, provider]);

  const getDocument = useCallback(async (documentHash: string) => {
    if (!contract) {
      throw new Error("Contract not initialized.");
    }

    try {
      const doc = await contract.documents(documentHash);
      return {
        issuer: doc[0],
        metadataURI: doc[1],
        isRevoked: doc[2],
        isVerified: doc[3],
        verificationResult: doc[4]
      };
    } catch (error) {
      console.error("Error getting document:", error);
      throw error;
    }
  }, [contract]);

  useEffect(() => {
    if (!contract || !currentUser) return;

    const onDocumentIssued = (issuer: string, documentHash: string, metadataURI: string) => {
      console.log(`Document issued: ${documentHash} by ${issuer}`);
    };

    const onDocumentVerified = (documentHash: string, verificationResult: string) => {
      console.log(`Document verified: ${documentHash} with result: ${verificationResult}`);
    };

    contract.on('DocumentIssued', onDocumentIssued);
    contract.on('DocumentVerified', onDocumentVerified);

    return () => {
      contract.off('DocumentIssued', onDocumentIssued);
      contract.off('DocumentVerified', onDocumentVerified);
    };
  }, [contract, currentUser]);

  const value = {
    currentUser,
    loading,
    error,
    isNetworkCorrect,
    connectWallet: useCallback(async () => {
      await connectWallet();
    }, [connectWallet]),
    logout: useCallback(() => {
      logout();
    }, [logout]),
    issueCertificate: useCallback(async (documentHash: string, metadataURI: string) => {
      return issueCertificate(documentHash, metadataURI);
    }, [issueCertificate]),
    verifyDocument: useCallback(async (documentHash: string, verificationResult: string) => {
      return verifyDocument(documentHash, verificationResult);
    }, [verifyDocument]),
    getDocument: useCallback(async (documentHash: string) => {
      return getDocument(documentHash);
    }, [getDocument]),
    switchToCorrectNetwork: useCallback(async () => {
      return switchToCorrectNetwork();
    }, [switchToCorrectNetwork]),
    contract
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
