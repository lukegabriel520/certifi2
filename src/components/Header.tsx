// Forcing a fresh Vercel build
import React from 'react';
import { Link } from 'react-router-dom';
import { User, Building2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CertiFiLogo from '../assets/CertiFi_Logo.jpg';

const Header: React.FC = () => {
  const { currentUser, loading, connectWallet, logout } = useAuth();

  const getRoleIcon = () => {
    if (!currentUser) return <User className="w-4 h-4" />;
    if (currentUser.isInstitution) return <Building2 className="w-4 h-4" />;
    if (currentUser.isVerifier) return <CheckCircle className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const getRoleLabel = () => {
    if (!currentUser) return 'Guest';
    if (currentUser.isInstitution) return 'Institution';
    if (currentUser.isVerifier) return 'Verifier';
    return 'User';
  };

  return (
    <header className="bg-[#1b263b] border-b border-[#415a77]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img src={CertiFiLogo} alt="CertiFi Logo" className="w-8 h-8 mix-blend-screen" />
              <span className="text-2xl font-bold text-[#f9fafb]">CertiFi</span>
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-[#415a77] transition-colors">
                Home
              </Link>
              {currentUser && (
                 <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-[#415a77] transition-colors">
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 bg-[#415a77] px-3 py-2 rounded-lg">
                  {getRoleIcon()}
                  <span className="text-[#f9fafb] text-sm font-medium">
                    {getRoleLabel()}
                  </span>
                </div>
                <div className="hidden sm:block text-[#cbd5e1] text-sm">
                  {currentUser.address.slice(0, 6)}...{currentUser.address.slice(-4)}
                </div>
                <button
                  onClick={logout}
                  className="bg-[#EF4444] hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#6366F1] hover:bg-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4F46E5] disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;