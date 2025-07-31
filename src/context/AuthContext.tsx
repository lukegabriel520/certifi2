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

  const getContract = async (withSigner = false): Promise<Contract> => {
    if (!provider) throw new Error("Provider not initialized");
    if (withSigner) {
        const signer = await provider.getSigner();
        return new Contract(CONTRACT_ADDRESS, CertificationABI, signer);
    }
    return new Contract(CONTRACT_ADDRESS, CertificationABI, provider);
  }

  const checkUser = async (ethProvider: BrowserProvider) => {
    try {
      const accounts = await ethProvider.listAccounts();
      if (accounts.length > 0) {
        const address = accounts[0].address;
        const contract = await getContract();
        const isInstitution = await contract.isInstitution(address);
        const isVerifier = await contract.isVerifier(address);
        setCurrentUser({ address, isInstitution, isVerifier });
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Error checking user:", error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);
      checkUser(ethProvider);

      const handleAccountsChanged = () => checkUser(ethProvider);
      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    } else {
      setLoading(false);
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) {
      alert('MetaMask is not installed. Please install it to use this app.');
      return;
    }
    try {
      await provider.send("eth_requestAccounts", []);
      await checkUser(provider);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const issueCertificate = async (documentHash: string, documentName: string) => {
    const contract = await getContract(true);
    const tx = await contract.issueDocument(documentHash, documentName);
    return await tx.wait();
  };

  const getCertificate = async (documentHash: string): Promise<Certificate | null> => {
    const contract = await getContract();
    const certData = await contract.documents(documentHash);
    if (certData[0] === ethers.ZeroAddress) {
        return null;
    }
    return {
        issuer: certData[0],
        fileName: certData[1],
        isVerified: certData[2],
        isRevoked: certData[3],
        verificationNotes: certData[4]
    };
  };

  const verifyDocument = async (documentHash: string, notes: string) => {
    const contract = await getContract(true);
    const tx = await contract.verifyDocument(documentHash, notes);
    return await tx.wait();
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    connectWallet,
    logout,
    issueCertificate,
    getCertificate,
    verifyDocument,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
