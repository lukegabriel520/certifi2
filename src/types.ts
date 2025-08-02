import { Contract } from 'ethers';

export interface User {
  address: string;
  isInstitution: boolean;
  isVerifier: boolean;
  role?: 'user' | 'institution' | 'verifier';
  name?: string;
  email?: string;
}

export interface Document {
  issuer: string;
  metadataURI: string;
  isVerified: boolean;
  isRevoked: boolean;
  verificationResult: string;
}

export interface Certificate {
  id: string;
  issuer: string;
  recipient: string;
  documentHash: string;
  timestamp: number;
  metadataURI?: string;
  isVerified?: boolean;
  isRevoked?: boolean;
  verificationResult?: string;
  status?: 'pending' | 'verified' | 'completed' | 'rejected';
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  userAddress?: string;
  institutionAddress?: string;
  institutionName?: string;
  verifierAddress?: string;
  verifierName?: string;
  uploadDate?: Date | string;
  verificationDate?: Date | string;
  verificationNotes?: string;
  hash?: string;
}

export interface AuthContextType {
  // User state
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isNetworkCorrect: boolean;
  contract: Contract | null;
  
  // Auth methods
  connectWallet: () => Promise<void>;
  logout: () => void;
  switchToCorrectNetwork: () => Promise<boolean>;
  
  // Contract interaction methods
  issueCertificate: (documentHash: string, metadataURI: string) => Promise<string>;
  verifyDocument: (documentHash: string, verificationResult: string) => Promise<string>;
  getDocument: (documentHash: string) => Promise<Document>;
  
  // Utility methods
  // Add any additional methods that might be needed
}

export interface DocumentIssuedEvent {
  issuer: string;
  documentHash: string;
  metadataURI: string;
  blockNumber: number;
  transactionHash: string;
}

export interface DocumentVerifiedEvent {
  documentHash: string;
  verificationResult: string;
  blockNumber: number;
  transactionHash: string;
}

export interface DocumentRevokedEvent {
  documentHash: string;
  blockNumber: number;
  transactionHash: string;
}

export enum AuthError {
  NETWORK_NOT_SUPPORTED = 'NETWORK_NOT_SUPPORTED',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  USER_REJECTED = 'USER_REJECTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  INVALID_DOCUMENT = 'INVALID_DOCUMENT',
}
