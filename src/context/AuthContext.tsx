import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  ethers, 
  BrowserProvider, 
  JsonRpcSigner, 
  ContractTransactionResponse, 
  Contract, 
  BaseContract,
  EventFilter,
  ContractInterface,
  TransactionReceipt
} from 'ethers';
import { User } from '../types';

type IEthereumProvider = {
  request: (request: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  chainId?: string;
  networkVersion?: string;
  selectedAddress?: string | null;
  isConnected: () => boolean;
  enable?: () => Promise<string[]>;
};

declare global {
  interface Window {
    ethereum?: IEthereumProvider & {
      isMetaMask?: boolean;
      chainId?: string;
      networkVersion?: string;
      selectedAddress?: string | null;
      isConnected: () => boolean;
    };
  }
}

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

type ContractFilters = {
  DocumentIssued: (issuer?: string, documentHash?: string) => EventFilter;
  DocumentVerified: (documentHash?: string, verifier?: string) => EventFilter;
  DocumentRevoked: (documentHash?: string) => EventFilter;
  RoleGranted: (role?: string, account?: string) => EventFilter;
  RoleRevoked: (role?: string, account?: string) => EventFilter;
};

type ICertificationContract = Contract & {
  isInstitution: (address: string) => Promise<boolean>;
  isVerifier: (address: string) => Promise<boolean>;
  issueDocument: (documentHash: string, metadataURI: string) => Promise<ContractTransactionResponse>;
  verifyDocument: (documentHash: string, verificationResult: string) => Promise<ContractTransactionResponse>;
  documents: (hash: string) => Promise<{
    issuer: string;
    recipient: string;
    metadataURI: string;
    timestamp: BigInt;
    isRevoked: boolean;
  }>;
  on: (event: string, listener: (...args: any[]) => void) => void;
  removeListener: (event: string, listener: (...args: any[]) => void) => void;
  filters: {
    DocumentIssued: (issuer?: string, recipient?: string, documentHash?: string) => EventFilter;
    DocumentVerified: (verifier?: string, documentHash?: string, result?: string) => EventFilter;
  };
};

type AuthContextValue = {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isNetworkCorrect: boolean;
  contract: ethers.Contract | null;
  connectWallet: () => Promise<boolean>;
  logout: () => void;
  issueCertificate: (documentHash: string, metadataURI: string) => Promise<void>;
  verifyDocument: (documentHash: string, verificationResult: string) => Promise<void>;
  getDocument: (documentHash: string) => Promise<[string, string, boolean, boolean, string]>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkCorrect, setIsNetworkCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [certificationContract, setCertificationContract] = useState<Contract | null>(null);
  
  const checkIfSepolia = useCallback(async (provider: BrowserProvider): Promise<boolean> => {
    try {
      const network = await provider.getNetwork();
      return network.chainId === BigInt(11155111); 
    } catch (err) {
      console.error('Error checking network:', err);
      return false;
    }
  }, []);
  
  const logout = useCallback(async () => {
    setCurrentUser(null);
    setProvider(null);
    setCertificationContract(null);
    setError(null);
    
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (err) {
        console.error('Error disconnecting wallet:', err);
      }
    }
  }, []);
  
  const updateUserState = useCallback(async (address: string) => {
    if (!certificationContract) return;
    
    try {
      const contract = certificationContract as unknown as {
        isInstitution: (address: string) => Promise<boolean>;
        isVerifier: (address: string) => Promise<boolean>;
      };
      
      const [isInstitution, isVerifier] = await Promise.all([
        contract.isInstitution(address),
        contract.isVerifier(address)
      ]);
      
      setCurrentUser({
        address,
        isInstitution,
        isVerifier
      });
      
      return { isInstitution, isVerifier };
    } catch (err) {
      console.error('Error updating user state:', err);
      setError('Failed to fetch user role');
      throw err;
    }
  }, [certificationContract]);

  const checkNetwork = useCallback(async (provider: BrowserProvider): Promise<boolean> => {
    try {
      const network = await provider.getNetwork();
      const isCorrectNetwork = network.chainId === BigInt(11155111); // Sepolia testnet
      
      if (!isCorrectNetwork) {
        setError('Please connect to Sepolia testnet');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error checking network:', err);
      setError('Failed to check network');
      return false;
    }
  }, []);

  const initContract = useCallback((signer: JsonRpcSigner): Contract => {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }
    
    const contract = new Contract(
      CONTRACT_ADDRESS,
      CERTIFICATION_ABI as ContractInterface,
      signer
    );
    
    setCertificationContract(contract);
    return contract;
  }, []);

  const initProvider = useCallback(async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask');
      setLoading(false);
      return null;
    }

    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
      return web3Provider;
    } catch (err) {
      console.error('Error initializing provider:', err);
      setError('Failed to initialize Web3 provider');
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const web3Provider = await initProvider();
        if (!web3Provider) return;

        const ethProvider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
        const signer = await ethProvider.getSigner();
        const address = await signer.getAddress();
        
        const isCorrectNetwork = await checkNetwork(ethProvider);
        if (!isCorrectNetwork) {
          const switched = await switchToCorrectNetwork();
          if (!switched) return false;
        }

        const contract = initContract(signer);
        await updateUserState(address);
        
        setProvider(ethProvider);
        setIsNetworkCorrect(true);
        
        if (window.ethereum) {
          window.ethereum.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length === 0) {
              setCurrentUser(null);
            } else {
              updateUserState(accounts[0]);
            }
          });

          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to connect to wallet');
        setLoading(false);
      }
    };

    initialize();
  }, [initProvider]);

  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const connectWallet = useCallback(async (): Promise<boolean> => {
    if (!window.ethereum) {
      setError('Please install MetaMask');
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (!accounts || accounts.length === 0) {
        setError('No accounts found');
        return false;
      }
  
      const web3Provider = new BrowserProvider(window.ethereum as any);
      const signer = await web3Provider.getSigner();
 
      const isSepolia = await checkIfSepolia(web3Provider);
      if (!isSepolia) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], 
          });
          window.location.reload();
          return true;
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            setError('Please add Sepolia testnet to your MetaMask');
          } else {
            setError('Failed to switch to Sepolia testnet');
          }
          return false;
        }
      }

      const contractInstance = initContract(signer);
      const address = await signer.getAddress();
      const [isInstitution, isVerifier] = await Promise.all([
        (contractInstance as any).isInstitution(address),
        (contractInstance as any).isVerifier(address)
      ]);
      
      setCurrentUser({
        address,
        isInstitution,
        isVerifier
      });
      
      setProvider(web3Provider);
      setCertificationContract(contractInstance);
      
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setCurrentUser(null);
        } else {
          updateUserState(accounts[0]);
        }
      };
      
      const handleChainChanged = () => {
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
   
      const cleanup = () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
      

      return true;
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      return false;
    } finally {
      setLoading(false);
    }
  }, [initContract, updateUserState]);

  const disconnectWallet = useCallback(async () => {
    setCurrentUser(null);
    setProvider(null);
    setCertificationContract(null);
    setError(null);

    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{
            eth_accounts: {}
          }]
        });
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }
  }, []);

  const switchToCorrectNetwork = async (): Promise<boolean> => {
    if (!window.ethereum) return false;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(DEFAULT_CHAIN_ID).toString(16)}` }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        setError('Please add this network to your MetaMask');
      } else if (switchError.code === 4001) {
        setError('User rejected the network switch');
      } else {
        setError('Failed to switch network');
      }
      return false;
    }
  };

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

  const issueCertificate = useCallback(async (documentHash: string, metadataURI: string) => {
    if (!certificationContract || !currentUser) {
      throw new Error('Contract not initialized or user not connected');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const tx = await certificationContract.issueDocument(documentHash, metadataURI);
      const receipt = await tx.wait() as ContractReceipt;
      
      if (!receipt) throw new Error('No receipt received');
      
      if (receipt.status === 1) {
        return receipt;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err: any) {
      console.error('Error issuing certificate:', err);
      setError(err instanceof Error ? err.message : 'Failed to issue certificate');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [certificationContract, currentUser]);

  const checkIfInstitution = useCallback(async (address: string) => {
    if (!certificationContract) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      
      const isInstitution = await (certificationContract as any).isInstitution(address);
      return isInstitution;
    } catch (err: any) {
      console.error('Error checking institution status:', err);
      setError(err.message || 'Failed to check institution status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [certificationContract]);

  const verifyDocument = useCallback(async (documentHash: string, verificationResult: string) => {
    if (!certificationContract || !currentUser) {
      throw new Error('Contract not initialized or user not connected');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const tx = await certificationContract.verifyDocument(documentHash, verificationResult);
      const receipt = await tx.wait() as ContractReceipt;
      
      if (!receipt) throw new Error('No receipt received');
      
      if (receipt.status === 1) {
        return receipt;
      } else {
        throw new Error('Verification failed');
      }
    } catch (err: any) {
      console.error('Error verifying document:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [certificationContract, currentUser]);

  const getDocument = useCallback(async (documentHash: string) => {
    if (!certificationContract) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      
      const document = await (certificationContract as any).documents(documentHash);
      return document;
    } catch (err: any) {
      console.error('Error getting document:', err);
      setError(err.message || 'Failed to get document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [certificationContract]);

// ...
  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      error,
      isNetworkCorrect,
      contract,
      connectWallet,
      logout: () => {
        setCurrentUser(null);
        setProvider(null);
        setContract(null);
        setError(null);
        setIsNetworkCorrect(false);
        setLoading(false);
      },
      issueCertificate,
      verifyDocument,
      getDocument,
      setError: (error: string | null) => setError(error),
      setLoading: (loading: boolean) => setLoading(loading)
    }}>
      {children}
    </AuthContext.Provider>
  );
};
