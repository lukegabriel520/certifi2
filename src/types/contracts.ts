import { BigNumber } from 'ethers';

export interface Document {
  issuer: string;
  recipient: string;
  documentHash: string;
  metadataURI: string;
  timestamp: BigNumber;
  expirationDate: BigNumber;
  isValid: boolean;
  isRevoked: boolean;
}

export interface VerificationRequest {
  documentId: string;
  requester: string;
  verifier: string;
  isVerified: boolean;
  isRejected: boolean;
  verificationNotes: string;
  timestamp: BigNumber;
}

export enum UserRole {
  NONE = 0,
  USER = 1,
  VERIFIER = 2,
  INSTITUTION = 3
}

export interface CertificationContract {
  owner: () => Promise<string>;
  documentCount: () => Promise<BigNumber>;
  
  userRoles: (address: string) => Promise<number>;
  registerUser: (user: string, role: UserRole) => Promise<any>;
  updateUserRole: (user: string, newRole: UserRole) => Promise<any>;
  
  issueDocument: (
    documentId: string,
    recipient: string,
    documentHash: string,
    metadataURI: string,
    expirationDays: number
  ) => Promise<any>;
  
  revokeDocument: (documentId: string) => Promise<any>;
  getDocument: (documentId: string) => Promise<Document>;
  isDocumentValid: (documentId: string) => Promise<boolean>;
  
  requestVerification: (documentId: string, verifier: string) => Promise<any>;
  completeVerification: (
    requestId: string,
    isVerified: boolean,
    notes: string
  ) => Promise<any>;
  
  getUserDocuments: (user: string) => Promise<string[]>;
  getInstitutionDocuments: (institution: string) => Promise<string[]>;
  getDocumentVerifications: (documentId: string) => Promise<string[]>;
  getVerificationRequest: (requestId: string) => Promise<VerificationRequest>;
  
  on: (event: string, listener: (...args: any[]) => void) => void;
  removeListener: (event: string, listener: (...args: any[]) => void) => void;
}

export interface ContractDeploymentInfo {
  network: string;
  contractAddress: string;
  deployer: string;
  timestamp: string;
}
