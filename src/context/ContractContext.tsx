import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole } from '../types/contracts';
import { initContract, getContract, getCurrentAccount, getCurrentUserRole, checkNetwork, switchNetwork } from '../utils/contractUtils';

interface ContractContextType {
  contract: any | null;
  account: string | null;
  role: UserRole | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  requiredChainId: number;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

const REQUIRED_CHAIN_ID = 31337;

export const ContractProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contract, setContract] = useState<any | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = async () => {
    if (isInitialized || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask to use this application');
      }

      const contractInstance = await initContract();
      setContract(contractInstance);

      const currentAccount = await getCurrentAccount();
      setAccount(currentAccount);

      const userRole = await getCurrentUserRole();
      setRole(userRole);

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      setIsInitialized(true);
    } catch (err: any) {
      console.error('Error initializing contract:', err);
      setError(err.message || 'Failed to initialize contract');
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await initialize();
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const refreshAccount = async () => {
    if (!contract) return;
    
    try {
      const currentAccount = await getCurrentAccount();
      const userRole = await getCurrentUserRole();
      
      setAccount(currentAccount);
      setRole(userRole);
    } catch (err) {
      console.error('Error refreshing account:', err);
      setError('Failed to refresh account information');
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null);
      setRole(UserRole.NONE);
    } else if (account !== accounts[0]) {
      setAccount(accounts[0]);
      // Refresh role when account changes
      refreshAccount();
    }
  };

  const handleChainChanged = () => {
    // Reload the page when the chain changes
    window.location.reload();
  };

  // Check network on mount and when account changes
  useEffect(() => {
    const checkNetworkConnection = async () => {
      if (!contract) return;
      
      try {
        const isCorrectNetwork = await checkNetwork(REQUIRED_CHAIN_ID);
        if (!isCorrectNetwork) {
          await switchNetwork(REQUIRED_CHAIN_ID);
        }
      } catch (err: any) {
        console.error('Network error:', err);
        setError(`Please switch to the required network (Chain ID: ${REQUIRED_CHAIN_ID})`);
      }
    };

    checkNetworkConnection();
  }, [contract, account]);

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  return (
    <ContractContext.Provider
      value={{
        contract,
        account,
        role,
        isInitialized,
        isLoading,
        error,
        connectWallet,
        refreshAccount,
        requiredChainId: REQUIRED_CHAIN_ID,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};

export const useContract = (): ContractContextType => {
  const context = useContext(ContractContext);
  if (context === undefined) {
    throw new Error('useContract must be used within a ContractProvider');
  }
  return context;
};
