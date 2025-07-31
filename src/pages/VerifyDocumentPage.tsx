import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import FileUpload from '../components/FileUpload';
import { sha256 } from 'js-sha256';
import { Certificate } from '../types';

const VerifyDocumentPage = () => {
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
  };

  const handleSearch = async () => {
    if (!documentHash) {
      setFeedback({ type: 'error', message: 'Please provide a document hash.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    setCertificate(null);

    try {
      const cert = await getCertificate(documentHash);
      if (cert) {
        setCertificate(cert);
        setFeedback({ type: 'success', message: 'Certificate found.' });
      } else {
        setFeedback({ type: 'info', message: 'No certificate found for this hash.' });
      }
    } catch (error: any) {
      console.error('Error fetching certificate:', error);
      setFeedback({ type: 'error', message: error.message || 'An error occurred while fetching the certificate.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!documentHash) return;
    setIsVerifying(true);
    setFeedback(null);

    try {
        await verifyDocument(documentHash, verificationNotes || 'Verified');
        setFeedback({ type: 'success', message: 'Document successfully marked as verified!' });
        // Re-fetch certificate to show updated status
        handleSearch();
    } catch (error: any) {
        console.error('Error verifying document:', error);
        setFeedback({ type: 'error', message: error.message || 'An error occurred during verification.' });
    } finally {
        setIsVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Verify a Document</h1>
          <div className="bg-white shadow sm:rounded-lg p-6 space-y-6">
            <FileUpload 
              onFileSelect={handleFileChange} 
              selectedFile={selectedFile}
              onRemoveFile={handleRemoveFile}
            />
            <div className="relative">
              <label htmlFor="hash-input" className="block text-sm font-medium text-gray-700">Or enter Document Hash (SHA-256)</label>
              <input
                id="hash-input"
                type="text"
                value={documentHash}
                onChange={(e) => setDocumentHash(e.target.value)}
                placeholder="0x..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!documentHash || isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {isLoading ? 'Searching...' : 'Search for Certificate'}
            </button>
            {feedback && (
              <div className={`p-4 rounded-md ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : feedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                <p>{feedback.message}</p>
              </div>
            )}
            {certificate && (
              <div className="p-4 border-t border-gray-200 space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Certificate Details</h3>
                <div><p className="text-sm text-gray-600">Issuer: <span className="font-mono">{certificate.issuer}</span></p></div>
                <div><p className="text-sm text-gray-600">File Name: <span className="font-medium">{certificate.fileName}</span></p></div>
                <div><p className="text-sm text-gray-600">Status: 
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${certificate.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {certificate.isVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </p></div>
                {certificate.isVerified && certificate.verificationNotes && (
                    <div><p className="text-sm text-gray-600">Notes: <span className="italic">{`\"${certificate.verificationNotes}\"`}</span></p></div>
                )}
                {!certificate.isVerified && (
                    <div className="space-y-2 pt-4">
                        <input 
                            type="text"
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            placeholder="Add verification notes (optional)"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        <button
                            onClick={handleVerify}
                            disabled={isVerifying}
                            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
                        >
                            {isVerifying ? 'Verifying...' : 'Mark as Verified'}
                        </button>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyDocumentPage;
