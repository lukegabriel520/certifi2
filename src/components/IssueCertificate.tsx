import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import FileUpload from './FileUpload';
import { sha256 } from 'js-sha256';

const IssueCertificate: React.FC = () => {
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
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !documentHash) {
      setFeedback({ type: 'error', message: 'Please select a file first' });
      return;
    }

    try {
      setIsLoading(true);
      setFeedback(null);
      
      await issueCertificate(documentHash, file.name, file.size, file.type);
      
      setFeedback({
        type: 'success',
        message: 'Certificate issued successfully!',
      });
      setFile(null);
      setDocumentHash('');
    } catch (error) {
      console.error('Error issuing certificate:', error);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to issue certificate',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1b2a]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-[#1b263b] rounded-lg shadow-lg overflow-hidden border border-[#415a77]">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[#f9fafb] mb-6">Issue New Certificate</h2>
            
            {feedback && (
              <div 
                className={`mb-6 p-4 rounded-md ${
                  feedback.type === 'success' 
                    ? 'bg-green-900/30 border border-green-500 text-green-100' 
                    : 'bg-red-900/30 border border-red-500 text-red-100'
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">
                  Document to Certify
                </label>
                <FileUpload
                  onFileSelect={handleFileChange}
                  selectedFile={file}
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
                  type="submit"
                  disabled={!file || isLoading}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                    !file || isLoading
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-[#6366F1] hover:bg-[#4f46e5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6366F1]'
                  }`}
                >
                  {isLoading ? 'Issuing...' : 'Issue Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueCertificate;
