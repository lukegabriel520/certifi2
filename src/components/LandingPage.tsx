import React, { useState } from 'react';
import { Plus, CheckCircle, Bell, Shield, Users, Lock, FileText, Building2, Briefcase } from 'lucide-react';
import FileUpload from './FileUpload';
import Footer from './Footer';
import { useApp } from '../context/AppContext';

interface LandingPageProps {
  currentSection: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ currentSection }) => {
  const { user, certificates, connectMetaMask, addCertificate, addNotification } = useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [institutionAddress, setInstitutionAddress] = useState('');
  const [verifierAddress, setVerifierAddress] = useState('');
  const [showMetaMaskModal, setShowMetaMaskModal] = useState(false);

  const getUserCertificates = () => {
    if (!user) return [];
    return certificates.filter(cert => cert.userAddress === user.address);
  };

  const userCerts = getUserCertificates();
  const totalCertificates = userCerts.length;
  const verifiedCertificates = userCerts.filter(cert => cert.status === 'verified' || cert.status === 'completed').length;

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleSendCertificate = async () => {
    if (!user) {
      setShowMetaMaskModal(true);
      return;
    }

    if (!selectedFile || !institutionAddress || !verifierAddress) {
      alert('Please fill in all required fields: PDF file, institution address, and verifier address.');
      return;
    }

    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(institutionAddress)) {
      alert('Please enter a valid institution Ethereum address.');
      return;
    }
    
    if (!ethAddressRegex.test(verifierAddress)) {
      alert('Please enter a valid verifier Ethereum address.');
      return;
    }

    if (institutionAddress === user.address || verifierAddress === user.address) {
      alert('You cannot assign yourself as the institution or verifier.');
      return;
    }

    if (institutionAddress === verifierAddress) {
      alert('Institution and verifier addresses must be different.');
      return;
    }
    const mockHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    const certificate = {
      id: Date.now().toString(),
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      uploadDate: new Date().toISOString(),
      status: 'pending' as const,
      hash: mockHash,
      userAddress: user.address,
      institutionAddress,
      verifierAddress,
    };

    addCertificate(certificate);
    
    addNotification({
      id: Date.now().toString(),
      type: 'verification',
      title: 'New Verification Request',
      message: `A new certificate "${selectedFile.name}" requires verification.`,
      certificateId: certificate.id,
      timestamp: new Date().toISOString(),
    });

    setSelectedFile(null);
    setInstitutionAddress('');
    setVerifierAddress('');
    
    // Show success message with better UX
    const successMessage = `Certificate "${selectedFile.name}" has been sent for verification! You can track its progress in your dashboard.`;
    alert(successMessage);
  };

  const handleMetaMaskConnect = async () => {
    try {
      await connectMetaMask();
      setShowMetaMaskModal(false);
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
      alert('Failed to connect MetaMask. Please make sure MetaMask is installed and try again.');
    }
  };

  const renderHeroSection = () => (
    <section id="home" className="min-h-screen bg-[#0d1b2a] py-20 flex items-center">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#f9fafb] mb-6">
              Welcome,
              <br />
              <span className="text-[#6366F1]">
                {user ? 'Valued User!' : 'Guest!'}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-[#cbd5e1] mb-8 leading-relaxed max-w-2xl mx-auto md:mx-0">
              Manage and issue your academic certificates with ease.
              <br className="hidden sm:block" />
              Oversee all verification requests in one place.
            </p>
            <div className="flex justify-center md:justify-start">
              <button 
                onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-[#6366F1] hover:bg-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg transition-colors text-base sm:text-lg font-medium w-full sm:w-auto text-center"
              >
                View All Certificates
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-8 sm:mt-12 max-w-md mx-auto md:mx-0">
              <div className="bg-[#1b263b] p-6 rounded-lg border border-[#415a77]">
                <h3 className="text-[#cbd5e1] text-sm font-medium mb-2">Total Certificate Entries</h3>
                <p className="text-3xl font-bold text-[#6366F1]">{totalCertificates}</p>
              </div>
              <div className="bg-[#1b263b] p-6 rounded-lg border border-[#415a77]">
                <h3 className="text-[#cbd5e1] text-sm font-medium mb-2">Total Certificates Verified</h3>
                <p className="text-3xl font-bold text-[#778da9]">{verifiedCertificates}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1b263b] p-6 sm:p-8 rounded-lg border-2 border-dashed border-[#415a77] max-w-2xl mx-auto md:mx-0 w-full">
            {selectedFile ? (
              <div className="space-y-6">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  onRemoveFile={handleRemoveFile}
                />
                
                <div className="space-y-4">
                  <h3 className="text-[#f9fafb] text-lg font-medium">Send Certificate</h3>
                  
                  <div>
                    <label className="block text-[#cbd5e1] text-sm font-medium mb-2">
                      Institution Address
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 w-5 h-5 text-[#778da9]" />
                      <input
                        type="text"
                        value={institutionAddress}
                        onChange={(e) => setInstitutionAddress(e.target.value)}
                        placeholder="0x... (Institution wallet address)"
                        className="w-full bg-[#415a77] border border-[#778da9] rounded-lg pl-12 pr-4 py-3 text-[#f9fafb] placeholder-[#cbd5e1] focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#cbd5e1] text-sm font-medium mb-2">
                      Verifier Address
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 w-5 h-5 text-[#778da9]" />
                      <input
                        type="text"
                        value={verifierAddress}
                        onChange={(e) => setVerifierAddress(e.target.value)}
                        placeholder="0x... (Verifier wallet address)"
                        className="w-full bg-[#415a77] border border-[#778da9] rounded-lg pl-12 pr-4 py-3 text-[#f9fafb] placeholder-[#cbd5e1] focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSendCertificate}
                    disabled={!selectedFile || !institutionAddress || !verifierAddress}
                    className="w-full bg-[#6366F1] hover:bg-indigo-600 disabled:bg-[#778da9] disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium"
                  >
                    Send File
                  </button>
                </div>
              </div>
            ) : (
              <FileUpload
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onRemoveFile={handleRemoveFile}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const renderHowItWorks = () => (
    <section id="how-it-works" className="py-20 bg-[#1b263b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-[#f9fafb] mb-16">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#0d1b2a] p-8 rounded-lg border border-[#415a77] text-center">
            <div className="bg-[#6366F1] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#f9fafb] mb-4">1. Insert</h3>
            <p className="text-[#cbd5e1] leading-relaxed">
              Drag and drop your certificate file into the add file section.
            </p>
          </div>
          <div className="bg-[#0d1b2a] p-8 rounded-lg border border-[#415a77] text-center">
            <div className="bg-[#6366F1] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#f9fafb] mb-4">2. Verify</h3>
            <p className="text-[#cbd5e1] leading-relaxed">
              Verify document legitimacy against institutional databases using a hashcode.
            </p>
          </div>
          <div className="bg-[#0d1b2a] p-8 rounded-lg border border-[#415a77] text-center">
            <div className="bg-[#10B981] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#f9fafb] mb-4">3. Check</h3>
            <p className="text-[#cbd5e1] leading-relaxed">
              Validate submitted data to confirm it's an authentic institutional document.
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  const renderFAQ = () => (
    <section id="faq" className="py-20 bg-[#0d1b2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-[#f9fafb] mb-16">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#1b263b] p-8 rounded-lg border border-[#415a77]">
            <h3 className="text-xl font-bold text-[#f9fafb] mb-4">What is CertiFi?</h3>
            <p className="text-[#cbd5e1] leading-relaxed">
              CertiFi is a blockchain-based platform designed to help individuals and employers easily verify the authenticity of certificates issued by various institutions using decentralized technology.
            </p>
          </div>
          <div className="bg-[#1b263b] p-8 rounded-lg border border-[#415a77]">
            <h3 className="text-xl font-bold text-[#f9fafb] mb-4">How does CertiFi ensure authenticity?</h3>
            <p className="text-[#cbd5e1] leading-relaxed">
              We utilize blockchain technology! Each document is stored with a unique hash to provide an immutable and verifiable record based on the institution's database of hashes.
            </p>
          </div>
          <div className="bg-[#1b263b] p-8 rounded-lg border border-[#415a77]">
            <h3 className="text-xl font-bold text-[#f9fafb] mb-4">Who can use CertiFi?</h3>
            <p className="text-[#cbd5e1] leading-relaxed">
              Anyone with a MetaMask wallet! Students can verify their certificates, employers can confirm document authenticity, and institutions can manage their certificate databases.
            </p>
          </div>
          <div className="bg-[#1b263b] p-8 rounded-lg border border-[#415a77]">
            <h3 className="text-xl font-bold text-[#f9fafb] mb-4">What documents does CertiFi accept?</h3>
            <p className="text-[#cbd5e1] leading-relaxed">
              Currently, we support PDF format certificates issued by registered institutions. This includes academic degrees, professional certifications, and other official documents.
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  const renderContact = () => (
    <section id="contact" className="py-20 bg-[#1b263b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-[#f9fafb] mb-16">Contact Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#0d1b2a] p-8 rounded-lg border border-[#415a77] text-center">
            <div className="bg-[#6366F1] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#f9fafb] mb-6">Are you a Verifier?</h3>
            <p className="text-[#cbd5e1] mb-4">Email: verifiers@certifi.com</p>
            <p className="text-[#cbd5e1] mb-6">Phone: +63 (960) 292-7133</p>
            <p className="text-[#cbd5e1] text-sm">
              For inquiries regarding verification processes and account setup.
            </p>
          </div>
          <div className="bg-[#0d1b2a] p-8 rounded-lg border border-[#415a77] text-center">
            <div className="bg-[#10B981] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#f9fafb] mb-6">Are you an Institution?</h3>
            <p className="text-[#cbd5e1] mb-4">Email: institutions@certifi.com</p>
            <p className="text-[#cbd5e1] mb-6">Phone: +63 (960) 292-7133</p>
            <p className="text-[#cbd5e1] text-sm">
              For inquiries regarding potential partnerships, overall orientation, and account creation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  // MetaMask Connection Modal
  const renderMetaMaskModal = () => {
    if (!showMetaMaskModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#1b263b] rounded-lg border-2 border-[#6366F1] max-w-md w-full p-6">
          <div className="text-center">
            <Shield className="w-16 h-16 text-[#6366F1] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#f9fafb] mb-4">Connect MetaMask Required</h3>
            <p className="text-[#cbd5e1] mb-6">
              You need to connect your MetaMask wallet to send certificates for verification.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowMetaMaskModal(false)}
                className="flex-1 bg-[#415a77] hover:bg-[#778da9] text-white py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMetaMaskConnect}
                className="flex-1 bg-[#6366F1] hover:bg-indigo-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Connect MetaMask
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render appropriate section based on currentSection
  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">
      <main className="flex-grow">
        {renderHeroSection()}
        {renderHowItWorks()}
        {renderFAQ()}
        {renderContact()}
        {renderMetaMaskModal()}
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;