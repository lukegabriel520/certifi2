import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

const LandingPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Decentralized</span>
              <span className="block text-blue-600">Credential Verification</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              CertiFi provides a secure, transparent, and tamper-proof way to issue and verify credentials using blockchain technology.
            </p>
            <div className="mt-8">
              <p className="text-lg text-gray-700">Please connect your wallet using the button in the header to get started.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
