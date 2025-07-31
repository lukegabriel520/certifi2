export interface User {
  address: string;
  isInstitution: boolean;
  isVerifier: boolean;
}

export interface Certificate {
  issuer: string;
  recipient: string;
  documentHash: string;
  timestamp: number;
}

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  connectWallet: () => Promise<void>;
  logout: () => void;
  issueCertificate: (recipient: string, documentHash: string) => Promise<any>;
  getCertificateByHash: (documentHash: string) => Promise<Certificate | null>;
  verifyDocument: (documentHash: string) => Promise<boolean>;
}
