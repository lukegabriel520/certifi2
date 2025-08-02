import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import FileUpload from './FileUpload';
import { sha256 } from 'js-sha256';
import { Certificate } from '../types';

const VerifyDocument: React.FC = () => {
  const { getCertificate, verifyDocument } = useAuth();
  const [documentHash, setDocumentHash] = useState<string>('');
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const hash = sha256(new Uint8Array(event.target.result as ArrayBuffer));
        setDocumentHash('0x' + hash);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setDocumentHash('');
    setCertificate(null);
    setFeedback(null);
  };

  const handleCheckDocument = async () => {
    if (!documentHash) {
      setFeedback({ type: 'error', message: 'Please select a document first' });
      return;
    }

    try {
      setIsLoading(true);
      setFeedback(null);
      
      const cert = await getCertificate(documentHash);
      setCertificate(cert);
      
      if (cert) {
        setFeedback({
          type: 'info',
          message: `Document found! Status: ${cert.status}`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: 'No certificate found for this document',
        });
      }
    } catch (error) {
      console.error('Error checking document:', error);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to check document',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDocument = async (isVerified: boolean) => {
    if (!documentHash || !certificate) return;
    
    try {
      setIsVerifying(true);
      await verifyDocument(documentHash, isVerified, verificationNotes);
      
      // Update local certificate state
      setCertificate({
        ...certificate,
        status: isVerified ? 'verified' : 'rejected',
        verificationNotes: verificationNotes,
      });
      
      setFeedback({
        type: 'success',
        message: `Document ${isVerified ? 'verified' : 'rejected'} successfully!`,
      });
    } catch (error) {
      console.error('Error verifying document:', error);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to verify document',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1b2a]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-[#1b263b] rounded-lg shadow-lg overflow-hidden border border-[#415a77]">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[#f9fafb] mb-6">Verify Document</h2>
            
            {feedback && (
              <div 
                className={`mb-6 p-4 rounded-md ${
                  feedback.type === 'success' 
                    ? 'bg-green-900/30 border border-green-500 text-green-100'
                    : feedback.type === 'error'
                    ? 'bg-red-900/30 border border-red-500 text-red-100'
                    : 'bg-blue-900/30 border border-blue-500 text-blue-100'
                }`}
              >
                {feedback.message}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">
                  Document to Verify
                </label>
                <FileUpload
                  onFileSelect={handleFileChange}
                  selectedFile={selectedFile}
                  onRemoveFile={handleRemoveFile}
                  accept=".pdf,.doc,.docx,.txt"
                />
                {documentHash && (
                  <p className="mt-2 text-xs text-[#94a3b8] break-all">
                    Document Hash: {documentHash}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCheckDocument}
                  disabled={!documentHash || isLoading}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                    !documentHash || isLoading
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-[#6366F1] hover:bg-[#4f46e5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6366F1]'
                  }`}
                >
                  {isLoading ? 'Checking...' : 'Check Document'}
                </button>
              </div>

              {certificate && (
                <div className="mt-6 p-4 bg-[#0d1b2a] rounded-md border border-[#415a77]">
                  <h3 className="text-lg font-medium text-[#f9fafb] mb-2">Certificate Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[#94a3b8]">Document Name</p>
                      <p className="text-[#f9fafb]">{certificate.documentName}</p>
                    </div>
                    <div>
                      <p className="text-[#94a3b8]">Status</p>
                      <p 
                        className={`font-medium ${
                          certificate.status === 'verified' 
                            ? 'text-green-400' 
                            : certificate.status === 'rejected' 
                            ? 'text-red-400' 
                            : 'text-yellow-400'
                        }`}
                      >
                        {certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#94a3b8]">Issuer</p>
                      <p className="text-[#f9fafb] break-all">{certificate.institutionAddress}</p>
                    </div>
                    {certificate.verificationNotes && (
                      <div className="col-span-2">
                        <p className="text-[#94a3b8]">Verification Notes</p>
                        <p className="text-[#f9fafb] whitespace-pre-wrap">{certificate.verificationNotes}</p>
                      </div>
                    )}
                  </div>

                  {certificate.status === 'pending' && (
                    <div className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="verificationNotes" className="block text-sm font-medium text-[#cbd5e1] mb-2">
                          Verification Notes (Optional)
                        </label>
                        <textarea
                          id="verificationNotes"
                          rows={3}
                          className="w-full px-3 py-2 bg-[#0d1b2a] border border-[#415a77] rounded-md text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                          value={verificationNotes}
                          onChange={(e) => setVerificationNotes(e.target.value)}
                          placeholder="Add any notes about this verification..."
                        />
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => handleVerifyDocument(false)}
                          disabled={isVerifying}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isVerifying ? 'Rejecting...' : 'Reject'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyDocument(true)}
                          disabled={isVerifying}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isVerifying ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyDocument;
