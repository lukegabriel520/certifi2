import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import FileUpload from '../components/FileUpload';
import { sha256 } from 'js-sha256';

const IssueCertificatePage = () => {
  const { issueCertificate } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [documentHash, setDocumentHash] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result;
      if (buffer) {
        const hash = sha256(new Uint8Array(buffer as ArrayBuffer));
        setDocumentHash('0x' + hash);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setDocumentHash('');
  };

  const handleSubmit = async () => {
    if (!file || !documentHash) {
      setFeedback({ type: 'error', message: 'Please select a file first.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      await issueCertificate(documentHash, file.name);
      setFeedback({ type: 'success', message: `Certificate issued successfully for ${file.name}!` });
      setFile(null);
      setDocumentHash('');
    } catch (error: any) {
      console.error("Error issuing certificate:", error);
      setFeedback({ type: 'error', message: error.message || 'An unknown error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Issue a New Certificate</h1>
          <div className="bg-white shadow sm:rounded-lg p-6 space-y-6">
            <div>
              <FileUpload 
                onFileSelect={handleFileChange}
                selectedFile={file}
                onRemoveFile={handleRemoveFile}
              />
            </div>
            {documentHash && (
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700">Document Hash (SHA-256):</p>
                <p className="text-xs font-mono text-gray-500 break-all">{documentHash}</p>
              </div>
            )}
            <div>
              <button
                onClick={handleSubmit}
                disabled={!file || isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {isLoading ? 'Issuing...' : 'Issue Certificate'}
              </button>
            </div>
            {feedback && (
              <div className={`p-4 rounded-md ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <p>{feedback.message}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default IssueCertificatePage;
