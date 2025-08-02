import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import { User, AuthContextType, Document } from '../types';

// Define the contract ABI with TypeScript interfaces
interface CertificationContract extends ethers.Contract {
  isInstitution: (address: string) => Promise<boolean>;
  isVerifier: (address: string) => Promise<boolean>;
  documents: (documentHash: string) => Promise<[string, string, boolean, boolean, string]>;
  issueDocument: (documentHash: string, metadataURI: string) => Promise<ethers.ContractTransactionResponse>;
  verifyDocument: (documentHash: string, verificationResult: string) => Promise<ethers.ContractTransactionResponse>;
  on: (event: string, listener: (...args: any[]) => void) => ethers.Contract;
  off: (event: string, listener: (...args: any[]) => void) => ethers.Contract;
}

declare global {
    interface Window {
        ethereum?: any;
    }
}

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const CertificationABI = [
    "function isInstitution(address) view returns (bool)",
    "function isVerifier(address) view returns (bool)",
    "function documents(bytes32) view returns (string, string, bool, bool, string)",
    "function issueDocument(bytes32, string)",
    "function verifyDocument(bytes32, string)",
    "event DocumentIssued(address indexed issuer, bytes32 indexed documentHash, string metadataURI)",
    "event DocumentVerified(bytes32 indexed documentHash, string verificationResult)",
    "event DocumentRevoked(bytes32 indexed documentHash)",
    "event RoleGranted(string role, address account)",
    "event RoleRevoked(string role, address account)"
];

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

  // Check if the connected network is the correct one (Sepolia)
  const checkNetwork = async (ethProvider: any) => {
    try {
      const network = await ethProvider.getNetwork();
      const correctChainId = parseInt(import.meta.env.VITE_DEFAULT_CHAIN_ID || '11155111');
      const isCorrectNetwork = parseInt(network.chainId) === correctChainId;
      setIsNetworkCorrect(isCorrectNetwork);
      return isCorrectNetwork;
    } catch (err) {
      console.error("Error checking network:", err);
      setIsNetworkCorrect(false);
      return false;
    }
  };

  // Switch to the correct network (Sepolia)
  const switchToCorrectNetwork = async () => {
    if (!window.ethereum) return false;
    
    const chainId = import.meta.env.VITE_DEFAULT_CHAIN_ID || '0xaa36a7'; // Sepolia chainId in hex
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId,
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'SEP',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
          setError('Failed to add Sepolia network to MetaMask');
          return false;
        }
      }
      console.error('Error switching to Sepolia network:', switchError);
      setError('Failed to switch to Sepolia network');
      return false;
    }
  };

  // Initialize contract instance
  const initContract = useCallback((signer?: ethers.Signer) => {
    if (!import.meta.env.VITE_CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }
    
    const contractInstance = new ethers.Contract(
      import.meta.env.VITE_CONTRACT_ADDRESS,
      CertificationABI,
      signer || provider
    ) as unknown as CertificationContract;
    
    setContract(contractInstance);
    return contractInstance;
  }, [provider]);

  // Updates user state based on connected account
  const updateUserState = async (ethProvider: BrowserProvider) => {
    setLoading(true);
    setError(null);
    
    try {
      const isCorrectNetwork = await checkNetwork(ethProvider);
      if (!isCorrectNetwork) {
        setError('Please switch to the Sepolia Test Network in MetaMask');
        setLoading(false);
        return;
      }
      
      const accounts = await ethProvider.listAccounts();
      if (accounts.length > 0) {
        const signer = await ethProvider.getSigner();
        const contract = initContract(signer);
        const address = await signer.getAddress();
        
        // Check if the user has any special roles
        const [isInstitution, isVerifier] = await Promise.all([
          contract.isInstitution(address),
          contract.isVerifier(address)
        ]);
        
        setCurrentUser({ 
          address, 
          isInstitution, 
          isVerifier 
        });
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Error updating user state:", error);
      setError("Failed to connect to MetaMask. Please try again.");
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Connects wallet and updates state
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask to use this application');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await ethProvider.send("eth_requestAccounts", []);
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      // Check and switch to the correct network
      const isCorrectNetwork = await checkNetwork(ethProvider);
      if (!isCorrectNetwork) {
        const switched = await switchToCorrectNetwork();
        if (!switched) {
          setError('Please switch to the Sepolia Test Network in MetaMask');
          setLoading(false);
          return;
        }
      }
      
      setProvider(ethProvider);
      await updateUserState(ethProvider);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setError("Failed to connect wallet. Please try again.");
      setLoading(false);
    }
  };

  // Logout function
  const logout = useCallback(() => {
    // Reset all auth state
    setCurrentUser(null);
    setProvider(null);
    setContract(null);
    setError(null);
    
    // Clear any stored connection state
    if (window.ethereum && window.ethereum.removeListener) {
      // This will trigger the accountsChanged listener with empty accounts
      window.ethereum.selectedAddress = null;
    }
  }, []);

  // Initialize provider and set up listeners
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(ethProvider);
        
        // Initialize contract without signer for read-only operations
        initContract();
        
        // Check if already connected
        const accounts = await ethProvider.listAccounts();
        if (accounts.length > 0) {
          await updateUserState(ethProvider);
        } else {
          setLoading(false);
        }
        
        // Set up event listeners
        const handleAccountsChanged = (accounts: string[]) => {
          if (accounts.length === 0) {
            // User disconnected all accounts
            setCurrentUser(null);
            setProvider(null);
            setContract(null);
          } else {
            // Accounts changed, update the state
            const newProvider = new ethers.BrowserProvider(window.ethereum);
            updateUserState(newProvider);
          }
        };
        
        const handleChainChanged = () => {
          window.location.reload();
        };
        
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
        return () => {
          if (window.ethereum.removeListener) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
          }
        };
      } else {
        setLoading(false);
        setError('MetaMask not detected. Please install the MetaMask extension.');
      }
    };
    
    init();
  }, []);

  // Issue a new certificate (for institutions)
  const issueCertificate = useCallback(async (documentHash: string, metadataURI: string): Promise<string> => {
    if (!provider || !currentUser) {
      throw new Error("Wallet not connected.");
    }
    
    try {
      const signer = await provider.getSigner();
      const contractWithSigner = contract?.connect(signer as any) || initContract(signer);
      const tx = await contractWithSigner.issueDocument(documentHash, metadataURI);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      return receipt.hash;
    } catch (error) {
      console.error("Error issuing certificate:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to issue certificate: ${error.message}`);
      }
      throw new Error("Failed to issue certificate. Please try again.");
    }
  }, [provider, currentUser, contract, initContract]);

  // Verify a document (for verifiers)
  const verifyDocument = useCallback(async (documentHash: string, verificationResult: string): Promise<string> => {
    if (!provider || !currentUser) {
      throw new Error("Wallet not connected.");
    }
    
    try {
      const signer = await provider.getSigner();
      const contractWithSigner = contract?.connect(signer as any) || initContract(signer);
      const tx = await contractWithSigner.verifyDocument(documentHash, verificationResult);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      return receipt.hash;
    } catch (error) {
      console.error("Error verifying document:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to verify document: ${error.message}`);
      }
      throw new Error("Failed to verify document. Please try again.");
    }
  }, [provider, currentUser, contract, initContract]);

  // Get document details (for anyone)
  const getDocument = useCallback(async (documentHash: string): Promise<Document> => {
    if (!contract) {
      throw new Error("Contract not initialized");
    }
    
    try {
      const [issuer, metadataURI, isVerified, isRevoked, verificationResult] = 
        await contract.documents(documentHash);
      
      return {
        issuer,
        metadataURI,
        isVerified,
        isRevoked,
        verificationResult
      };
    } catch (error) {
      console.error("Error fetching document:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch document: ${error.message}`);
      }
      throw new Error("Failed to fetch document details.");
    }
  }, [contract]);

  // Listen to contract events
  const setupEventListeners = useCallback(() => {
    if (!contract || !currentUser) return () => {};
    
    const onDocumentIssued = (issuer: string, documentHash: string, metadataURI: string) => {
      console.log('Document issued:', { issuer, documentHash, metadataURI });
      // You can add additional logic here, like updating UI or showing notifications
    };

    const onDocumentVerified = (documentHash: string, verificationResult: string) => {
      console.log('Document verified:', { documentHash, verificationResult });
      // You can add additional logic here
    };

    contract.on('DocumentIssued', onDocumentIssued);
    contract.on('DocumentVerified', onDocumentVerified);

    // Cleanup function
    return () => {
      contract.off('DocumentIssued', onDocumentIssued);
      contract.off('DocumentVerified', onDocumentVerified);
    };
  }, [contract, currentUser]);

  // Set up event listeners when contract and user are available
  useEffect(() => {
    if (contract && currentUser) {
      return setupEventListeners();
    }
    return () => {}; // Return empty cleanup function if no cleanup needed
  }, [contract, currentUser, setupEventListeners]);

  const value: AuthContextType = {
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
