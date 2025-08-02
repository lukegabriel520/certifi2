import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  User, 
  Building2, 
  CheckCircle, 
  HelpCircle, 
  Mail, 
  Home as HomeIcon, 
  LayoutDashboard, 
  Menu, 
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CertiFiLogo from '@/assets/CertiFi_Logo.png';

const Header: React.FC = () => {
  const { currentUser, loading, connectWallet, logout } = useAuth();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsMobileMenuOpen(false);
    };

    const unlisten = () => {
      window.addEventListener('popstate', handleRouteChange);
      return () => window.removeEventListener('popstate', handleRouteChange);
    };

    return unlisten();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setIsScrolled(offset > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent, sectionId: string) => {
    if (location.pathname !== '/') {
      window.location.href = `/#${sectionId}`;
      return;
    }
    
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

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

  const navItems = [
    { id: 'home', label: 'Home', icon: HomeIcon, href: '/', sectionId: 'hero' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', sectionId: null },
    { id: 'how-it-works', label: 'How It Works', icon: CheckCircle, href: '/', sectionId: 'how-it-works' },
    { id: 'faq', label: 'FAQs', icon: HelpCircle, href: '/', sectionId: 'faq' },
    { id: 'contact', label: 'Contact Us', icon: Mail, href: '/', sectionId: 'contact' },
  ];

  const renderNavItems = (isMobile = false) => (
    <div className={`flex ${isMobile ? 'flex-col space-y-4 p-4' : 'items-center space-x-2'}`}>
      {navItems.map((item) => {
        const content = (
          <>
            <item.icon className="w-5 h-5 md:w-4 md:h-4" />
            {isMobile && <span className="ml-3">{item.label}</span>}
          </>
        );

        return item.sectionId ? (
          <button
            key={item.id}
            onClick={(e) => {
              scrollToSection(e, item.sectionId!);
              if (isMobile) setIsMobileMenuOpen(false);
            }}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-[#415a77] transition-colors ${
              isMobile ? 'w-full justify-start' : ''
            }`}
          >
            {content}
          </button>
        ) : (
          <Link
            key={item.id}
            to={item.href}
            onClick={() => isMobile && setIsMobileMenuOpen(false)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-[#415a77] transition-colors ${
              isMobile ? 'w-full justify-start' : ''
            }`}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );

  return (
    <header 
      className={`bg-[#1b263b] border-b border-[#415a77] sticky top-0 z-50 transition-shadow duration-300 ${
        isScrolled ? 'shadow-lg' : ''
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
              <img 
                src={CertiFiLogo} 
                alt="CertiFi Logo" 
                className="w-12 h-12 md:w-16 md:h-16"
                style={{ objectFit: 'contain' }} 
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block" ref={navRef}>
            {renderNavItems()}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-[#cbd5e1] hover:text-white hover:bg-[#415a77] focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-4">
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
      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          isMobileMenuOpen ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#1b263b] border-t border-[#415a77]">
          {renderNavItems(true)}
          <div className="pt-4 pb-3 border-t border-[#415a77] mt-2">
            {currentUser ? (
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  {getRoleIcon()}
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-white">
                    {getRoleLabel()}
                  </div>
                  <div className="text-xs text-[#cbd5e1]">
                    {currentUser.address.slice(0, 6)}...{currentUser.address.slice(-4)}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="ml-auto flex-shrink-0 bg-[#EF4444] hover:bg-red-600 p-1 rounded-full text-white focus:outline-none"
                >
                  <span className="sr-only">Sign out</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1h7a1 1 0 110 2H3zm14 1a1 1 0 01.993.883L18 5v10a1 1 0 01-1.993.117L16 15V6h-3a1 1 0 110-2h3z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#6366F1] hover:bg-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;