// Represents the connected user
export interface User {
  address: string;
  isInstitution: boolean;
  isVerifier: boolean;
}

// Represents the structure of a document on the blockchain, matching the Solidity struct
export interface Certificate {
  issuer: string;
  fileName: string;
  isVerified: boolean;
  isRevoked: boolean;
  verificationNotes: string;
}

// Defines the shape of the authentication context for consumers
export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  connectWallet: () => Promise<void>;
  logout: () => void;
  issueCertificate: (documentHash: string, documentName: string) => Promise<any>; // Replace 'any' with a specific transaction response type if needed
  getCertificate: (documentHash: string) => Promise<Certificate | null>;
  verifyDocument: (documentHash: string, notes: string) => Promise<any>;
}
