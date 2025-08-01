import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  ethers, 
  BrowserProvider, 
  JsonRpcSigner, 
  Contract,
  ContractTransactionResponse,
  EventFilter
} from 'ethers';
import { User } from '../types';

// Contract ABI - Updated to match the actual contract interface
const CERTIFICATION_ABI = [
  // Functions
  'function isInstitution(address) view returns (bool)',
  'function isVerifier(address) view returns (bool)',
  'function issueDocument(string memory documentHash, string memory metadataURI) external',
  'function verifyDocument(string memory documentHash, string memory verificationResult) external',
  'function documents(string memory) view returns (string memory, string memory, bool, bool, string memory)',
  'function getUserRole(address) view returns (uint8)',
  
  // Events
  'event DocumentIssued(bytes32 indexed documentId, address indexed issuer, address indexed recipient, string documentHash)',
  'event DocumentVerified(bytes32 indexed documentId, address indexed verifier, string documentHash, string result)',
  'event DocumentRevoked(bytes32 indexed documentId, address indexed issuer)',
  'event RoleUpdated(address indexed user, uint8 newRole)',
  'event UserRegistered(address indexed user, uint8 role)'
] as const;

// Contract interface
export interface ICertificationContract extends ethers.Contract {
  isInstitution: (address: string) => Promise<boolean>;
  isVerifier: (address: string) => Promise<boolean>;
  issueDocument: (documentHash: string, metadataURI: string) => Promise<ContractTransactionResponse>;
  verifyDocument: (documentHash: string, verificationResult: string) => Promise<ContractTransactionResponse>;
  documents: (hash: string) => Promise<[string, string, boolean, boolean, string]>;
  filters: {
    DocumentIssued: (issuer?: string, recipient?: string, documentHash?: string) => EventFilter;
    DocumentVerified: (verifier?: string, documentHash?: string, result?: string) => EventFilter;
  };
}

// Context value type
type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isNetworkCorrect: boolean;
  contract: ICertificationContract | null;
  connectWallet: () => Promise<boolean>;
  logout: () => void;
  issueCertificate: (documentHash: string, metadataURI: string) => Promise<ethers.ContractTransactionReceipt | null>;
  verifyDocument: (documentHash: string, verificationResult: string) => Promise<ethers.ContractTransactionReceipt | null>;
  getDocument: (documentHash: string) => Promise<[string, string, boolean, boolean, string]>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Environment variables
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const DEFAULT_CHAIN_ID = import.meta.env.VITE_DEFAULT_CHAIN_ID || '11155111';

if (!CONTRACT_ADDRESS) {
  console.error('VITE_CONTRACT_ADDRESS is not set in environment variables');
  throw new Error('Contract address not configured. Please set VITE_CONTRACT_ADDRESS in your .env file.');
}

// Provider props
type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkCorrect, setIsNetworkCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ICertificationContract | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  // Check if connected to Sepolia
  const checkIfSepolia = useCallback(async (provider: BrowserProvider): Promise<boolean> => {
    try {
      const network = await provider.getNetwork();
      return network.chainId === BigInt(parseInt(DEFAULT_CHAIN_ID, 10));
    } catch (err) {
      console.error('Error checking network:', err);
      return false;
    }
  }, []);

  // Initialize contract
  const initContract = useCallback(async (signer: JsonRpcSigner): Promise<ICertificationContract> => {
    try {
      // Create the contract instance
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CERTIFICATION_ABI,
        signer
      ) as unknown as ICertificationContract;

      // Test the contract is accessible with a simple view function
      try {
        await contract.getUserRole(await signer.getAddress());
      } catch (err) {
        console.warn('getUserRole call failed, trying isInstitution...');
        // Fallback to isInstitution if getUserRole fails
        await contract.isInstitution(await signer.getAddress());
      }
      
      return contract;
    } catch (error) {
      console.error('Error initializing contract:', error);
      throw new Error('Failed to initialize contract. Make sure you are connected to the correct network and the contract address is correct.');
    }
  }, []);

  // Update user state
  const updateUserState = useCallback(async (address: string) => {
    if (!contract) return null;
    
    try {
      const [isInstitution, isVerifier] = await Promise.all([
        contract.isInstitution(address).catch(() => false),
        contract.isVerifier(address).catch(() => false)
      ]);
      
      const user = { address, isInstitution, isVerifier };
      setCurrentUser(user);
      return user;
    } catch (err) {
      console.error('Error updating user state:', err);
      setError('Failed to fetch user role');
      return null;
    }
  }, [contract]);

  // Connect wallet
  const connectWallet = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Please install MetaMask');
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Requesting accounts...');
      // Request accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (!accounts || accounts.length === 0) {
        setError('No accounts found. Please unlock MetaMask and try again.');
        return false;
      }

      console.log('Initializing provider and signer...');
      // Initialize provider and signer
      const web3Provider = new BrowserProvider(window.ethereum);
      const signer = await web3Provider.getSigner();
      
      console.log('Checking network...');
      // Check network
      const isSepolia = await checkIfSepolia(web3Provider);
      if (!isSepolia) {
        try {
          console.log('Switching to Sepolia network...');
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${parseInt(DEFAULT_CHAIN_ID, 10).toString(16)}` }],
          });
          console.log('Network switched, reloading page...');
          window.location.reload();
          return true;
        } catch (switchError: any) {
          console.error('Failed to switch network:', switchError);
          setError('Please switch to the Sepolia testnet');
          return false;
        }
      }

      console.log('Initializing contract...');
      // Initialize contract
      let contractInstance;
      try {
        contractInstance = await initContract(signer);
        console.log('Contract initialized successfully');
      } catch (err) {
        console.error('Contract initialization failed:', err);
        throw new Error(`Contract initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      
      // Update state
      console.log('Updating application state...');
      setProvider(web3Provider);
      setContract(contractInstance);
      await updateUserState(accounts[0]);
      setIsNetworkCorrect(true);
      
      console.log('Setting up event listeners...');
      // Set up event listeners
      const handleAccountsChanged = (accounts: string[]) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length === 0) {
          setCurrentUser(null);
          setContract(null);
        } else {
          updateUserState(accounts[0]);
        }
      };
      
      const handleChainChanged = () => {
        console.log('Chain changed, reloading...');
        window.location.reload();
      };
      
      // Remove any existing listeners to prevent duplicates
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      
      // Add new listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      console.log('Wallet connection successful');
      return true;
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
      return false;
    } finally {
      setLoading(false);
    }
  }, [checkIfSepolia, initContract, updateUserState]);

  // Logout
  const logout = useCallback(() => {
    setCurrentUser(null);
    setContract(null);
    setProvider(null);
    setError(null);
  }, []);

  // Issue certificate
  const issueCertificate = useCallback(async (documentHash: string, metadataURI: string) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      setLoading(true);
      const tx = await contract.issueDocument(documentHash, metadataURI);
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Error issuing certificate:', err);
      setError('Failed to issue certificate');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // Verify document
  const verifyDocument = useCallback(async (documentHash: string, verificationResult: string) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      setLoading(true);
      const tx = await contract.verifyDocument(documentHash, verificationResult);
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      console.error('Error verifying document:', err);
      setError('Failed to verify document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // Get document
  const getDocument = useCallback(async (documentHash: string) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      setLoading(true);
      const document = await contract.documents(documentHash);
      return document;
    } catch (err) {
      console.error('Error getting document:', err);
      setError('Failed to get document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined' || !window.ethereum) {
        setLoading(false);
        return;
      }

      try {
        const web3Provider = new BrowserProvider(window.ethereum);
        const accounts = await web3Provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = await web3Provider.getSigner();
          const contract = await initContract(signer);
          
          setProvider(web3Provider);
          setContract(contract);
          await updateUserState(await signer.getAddress());
          setIsNetworkCorrect(await checkIfSepolia(web3Provider));
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [checkIfSepolia, initContract, updateUserState]);

  // Context value
  const contextValue: AuthContextType = {
    currentUser,
    loading,
    error,
    isNetworkCorrect,
    contract,
    connectWallet,
    logout,
    issueCertificate,
    verifyDocument,
    getDocument,
    setError,
    setLoading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
