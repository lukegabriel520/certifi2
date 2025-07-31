import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { User, Certificate, AuthContextType } from '../types';

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
    "function verifyDocument(bytes32, string)"
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

  // Gets contract instance. If a signer is not provided, it's a read-only instance.
  const getContract = (signer?: ethers.Signer | null) => {
    const contractProvider = signer ?? provider;
    if (!contractProvider) throw new Error("Ethereum provider not available.");
    return new Contract(CONTRACT_ADDRESS, CertificationABI, contractProvider);
  };

  // Updates user state based on connected account
  const updateUserState = async (ethProvider: BrowserProvider) => {
    setLoading(true);
    try {
      const accounts = await ethProvider.listAccounts();
      if (accounts.length > 0) {
        const signer = await ethProvider.getSigner();
        const contract = getContract(signer);
        const address = signer.address;
        const isInstitution = await contract.isInstitution(address);
        const isVerifier = await contract.isVerifier(address);
        setCurrentUser({ address, isInstitution, isVerifier });
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Error updating user state:", error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Initializes provider and sets up listeners
  useEffect(() => {
    if (window.ethereum) {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);
      updateUserState(ethProvider);

      const handleAccountsChanged = () => updateUserState(ethProvider);
      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    } else {
      console.log("MetaMask not detected.");
      setLoading(false);
    }
  }, []);

  // Connects wallet and updates state
  const connectWallet = async () => {
    if (!provider) {
      alert('MetaMask is not installed. Please install it to use this app.');
      return;
    }
    setLoading(true);
    try {
      await provider.send("eth_requestAccounts", []);
      await updateUserState(provider);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    console.log("User logged out.");
  };

  // Issues a new certificate (requires signer)
  const issueCertificate = async (recipient: string, documentHash: string) => {
    const signer = provider ? await provider.getSigner() : null;
    if (!signer) throw new Error("Wallet not connected.");
    const contract = getContract(signer);
    const tx = await contract.issueCertificate(recipient, documentHash);
    return await tx.wait();
  };

  // Verifies a document (read-only)
  const verifyDocument = async (documentHash: string): Promise<boolean> => {
    const contract = getContract(); // No signer needed
    return await contract.isVerified(documentHash);
  };

  // Gets certificate details by hash (read-only)
  const getCertificateByHash = async (documentHash: string): Promise<Certificate | null> => {
    const contract = getContract(); // No signer needed
    const cert = await contract.certificates(documentHash);
    if (cert.issuer === ethers.ZeroAddress) {
      return null;
    }
    return {
      issuer: cert.issuer,
      recipient: cert.recipient,
      documentHash: cert.documentHash,
      timestamp: Number(cert.timestamp),
    };
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    connectWallet,
    logout,
    issueCertificate,
    verifyDocument,
    getCertificateByHash,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
