import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Certificate, NotificationData, MetaMaskWindow } from '../types';

interface AppContextType {
  user: User | null;
  certificates: Certificate[];
  notifications: NotificationData[];
  isMetaMaskConnected: boolean;
  connectMetaMask: () => Promise<void>;
  disconnectMetaMask: () => void;
  addCertificate: (cert: Certificate) => void;
  updateCertificate: (id: string, updates: Partial<Certificate>) => void;
  addNotification: (notification: NotificationData) => void;
  removeNotification: (id: string) => void;
  isAuthorizedVerifier: (address: string) => boolean;
  isAuthorizedInstitution: (address: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Authorized addresses - easily scalable
const AUTHORIZED_VERIFIERS = ['0x203C2945B811e748e669fac95584959718Fec9E0'];
const AUTHORIZED_INSTITUTIONS = ['0x481A100167E7AF51A556322F6Cf7aF63Ecb57603'];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isMetaMaskConnected, setIsMetaMaskConnected] = useState(false);

  const getUserRole = (address: string): User['role'] => {
    if (AUTHORIZED_VERIFIERS.includes(address)) return 'verifier';
    if (AUTHORIZED_INSTITUTIONS.includes(address)) return 'institution';
    return 'user';
  };

  const connectMetaMask = async () => {
    const metaMaskWindow = window as MetaMaskWindow;
    
    if (!metaMaskWindow.ethereum) {
      alert('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    try {
      const accounts = await metaMaskWindow.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        const role = getUserRole(address);
        
        setUser({
          address,
          role,
        });
        setIsMetaMaskConnected(true);
        
        // Store connection state in session
        sessionStorage.setItem('metamask_connected', 'true');

        // Remove existing listeners to prevent duplicates
        metaMaskWindow.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        
        // Listen for account changes
        metaMaskWindow.ethereum.on('accountsChanged', handleAccountsChanged);
      }
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectMetaMask();
    } else {
      const newAddress = accounts[0];
      const newRole = getUserRole(newAddress);
      setUser({ address: newAddress, role: newRole });
    }
  };

  const disconnectMetaMask = () => {
    const metaMaskWindow = window as MetaMaskWindow;
    if (metaMaskWindow.ethereum) {
      metaMaskWindow.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }
    sessionStorage.removeItem('metamask_connected');
    setUser(null);
    setIsMetaMaskConnected(false);
  };

  const addCertificate = (cert: Certificate) => {
    setCertificates(prev => [cert, ...prev]);
  };

  const updateCertificate = (id: string, updates: Partial<Certificate>) => {
    setCertificates(prev => 
      prev.map(cert => cert.id === id ? { ...cert, ...updates } : cert)
    );
  };

  const addNotification = (notification: NotificationData) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const isAuthorizedVerifier = (address: string) => {
    return AUTHORIZED_VERIFIERS.includes(address);
  };

  const isAuthorizedInstitution = (address: string) => {
    return AUTHORIZED_INSTITUTIONS.includes(address);
  };

  useEffect(() => {
    // Check if MetaMask is already connected
    const metaMaskWindow = window as MetaMaskWindow;
    if (metaMaskWindow.ethereum) {
      metaMaskWindow.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            const address = accounts[0];
            const role = getUserRole(address);
            setUser({ address, role });
            setIsMetaMaskConnected(true);
            
            // Set up account change listener for already connected accounts
            metaMaskWindow.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            metaMaskWindow.ethereum.on('accountsChanged', handleAccountsChanged);
          }
        });
    }
  }, []);

  return (
    <AppContext.Provider value={{
      user,
      certificates,
      notifications,
      isMetaMaskConnected,
      connectMetaMask,
      disconnectMetaMask,
      addCertificate,
      updateCertificate,
      addNotification,
      removeNotification,
      isAuthorizedVerifier,
      isAuthorizedInstitution,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};