import React, { useState } from 'react';
import { Calendar, FileText, Clock, CheckCircle, XCircle, Archive } from 'lucide-react';
import { Certificate } from '../types';
import { useApp } from '../context/AppContext';

interface DashboardProps {
  onCertificateClick?: (certificate: Certificate) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onCertificateClick }) => {
  const { user, certificates } = useApp();
  const [showCompleted, setShowCompleted] = useState(false);

  const getUserCertificates = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'user':
        return certificates.filter(cert => cert.userAddress === user.address);
      case 'verifier':
        return certificates.filter(cert => cert.verifierAddress === user.address);
      case 'institution':
        return certificates.filter(cert => cert.institutionAddress === user.address);
      default:
        return [];
    }
  };

  const userCerts = getUserCertificates();
  const pendingCerts = userCerts.filter(cert => cert.status === 'pending' || cert.status === 'verified');
  const completedCerts = userCerts.filter(cert => cert.status === 'completed');
  const displayCerts = showCompleted ? completedCerts : pendingCerts;

  const getStatusIcon = (status: Certificate['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-[#6366F1]" />;
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-[#10B981]" />;
      case 'invalid':
        return <XCircle className="w-4 h-4 text-[#EF4444]" />;
      case 'completed':
        return <Archive className="w-4 h-4 text-[#778da9]" />;
      default:
        return <Clock className="w-4 h-4 text-[#6366F1]" />;
    }
  };

  const getStatusColor = (status: Certificate['status']) => {
    switch (status) {
      case 'pending':
        return 'text-[#6366F1] bg-[#6366F1]/10';
      case 'verified':
        return 'text-[#10B981] bg-[#10B981]/10';
      case 'invalid':
        return 'text-[#EF4444] bg-[#EF4444]/10';
      case 'completed':
        return 'text-[#778da9] bg-[#778da9]/10';
      default:
        return 'text-[#6366F1] bg-[#6366F1]/10';
    }
  };

  const getColumnHeaders = () => {
    switch (user?.role) {
      case 'user':
        return ['Certificate', 'Institution', 'Verifier', 'Status', 'Date'];
      case 'verifier':
        return ['Certificate', 'User', 'Institution', 'Status', 'Date'];
      case 'institution':
        return ['Certificate', 'User', 'Verifier', 'Hash', 'Date'];
      default:
        return ['Certificate', 'Status', 'Date'];
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!user || user.role === 'guest') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-[#f9fafb]">
              {user.role === 'user' ? 'My Certificates' : 
               user.role === 'verifier' ? 'Verification Requests' : 
               'Certificate Database'}
            </h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowCompleted(false)}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  !showCompleted
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#415a77] text-[#cbd5e1] hover:bg-[#778da9]'
                }`}
              >
                Active ({pendingCerts.length})
              </button>
              <button
                onClick={() => setShowCompleted(true)}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  showCompleted
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#415a77] text-[#cbd5e1] hover:bg-[#778da9]'
                }`}
              >
                <Archive className="w-4 h-4 inline mr-2" />
                Archive ({completedCerts.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#1b263b] p-6 rounded-lg border border-[#415a77]">
              <h3 className="text-[#cbd5e1] text-sm font-medium mb-2">Total Certificates</h3>
              <p className="text-3xl font-bold text-[#6366F1]">{userCerts.length}</p>
            </div>
            <div className="bg-[#1b263b] p-6 rounded-lg border border-[#415a77]">
              <h3 className="text-[#cbd5e1] text-sm font-medium mb-2">Pending Verification</h3>
              <p className="text-3xl font-bold text-[#778da9]">{pendingCerts.length}</p>
            </div>
            <div className="bg-[#1b263b] p-6 rounded-lg border border-[#415a77]">
              <h3 className="text-[#cbd5e1] text-sm font-medium mb-2">Completed</h3>
              <p className="text-3xl font-bold text-[#10B981]">{completedCerts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1b263b] rounded-lg border border-[#415a77] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#415a77]">
                <tr>
                  {getColumnHeaders().map((header) => (
                    <th key={header} className="px-6 py-4 text-left text-sm font-medium text-[#f9fafb]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#415a77]">
                {displayCerts.length === 0 ? (
                  <tr>
                    <td colSpan={getColumnHeaders().length} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 text-[#778da9] mb-4" />
                        <p className="text-[#cbd5e1] text-lg">
                          {showCompleted ? 'No completed certificates yet' : 'No active certificates yet'}
                        </p>
                        {!showCompleted && user?.role === 'user' && (
                          <p className="text-[#778da9] text-sm mt-2">
                            Upload your first certificate to get started
                          </p>
                        )}
                        {!showCompleted && user?.role === 'verifier' && (
                          <p className="text-[#778da9] text-sm mt-2">
                            No verification requests at the moment
                          </p>
                        )}
                        {!showCompleted && user?.role === 'institution' && (
                          <p className="text-[#778da9] text-sm mt-2">
                            No certificates in your database yet
                          </p>
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayCerts.map((cert) => (
                    <tr
                      key={cert.id}
                      className="hover:bg-[#415a77]/20 cursor-pointer transition-colors"
                      onClick={() => onCertificateClick?.(cert)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-[#6366F1] mr-3" />
                          <div>
                            <div className="text-[#f9fafb] font-medium">{cert.fileName}</div>
                            <div className="text-[#cbd5e1] text-sm">{formatFileSize(cert.fileSize)}</div>
                          </div>
                        </div>
                      </td>
                      
                      {user.role === 'user' && (
                        <>
                          <td className="px-6 py-4 text-[#cbd5e1]">
                            {cert.institutionName || `${cert.institutionAddress.slice(0, 6)}...${cert.institutionAddress.slice(-4)}`}
                          </td>
                          <td className="px-6 py-4 text-[#cbd5e1]">
                            {cert.verifierName || `${cert.verifierAddress.slice(0, 6)}...${cert.verifierAddress.slice(-4)}`}
                          </td>
                        </>
                      )}
                      
                      {user.role === 'verifier' && (
                        <>
                          <td className="px-6 py-4 text-[#cbd5e1]">
                            {cert.userAddress.slice(0, 6)}...{cert.userAddress.slice(-4)}
                          </td>
                          <td className="px-6 py-4 text-[#cbd5e1]">
                            {cert.institutionName || `${cert.institutionAddress.slice(0, 6)}...${cert.institutionAddress.slice(-4)}`}
                          </td>
                        </>
                      )}
                      
                      {user.role === 'institution' && (
                        <>
                          <td className="px-6 py-4 text-[#cbd5e1]">
                            {cert.userAddress.slice(0, 6)}...{cert.userAddress.slice(-4)}
                          </td>
                          <td className="px-6 py-4 text-[#cbd5e1]">
                            {cert.verifierName || `${cert.verifierAddress.slice(0, 6)}...${cert.verifierAddress.slice(-4)}`}
                          </td>
                          <td className="px-6 py-4 text-[#cbd5e1] font-mono text-sm">
                            {cert.hash.slice(0, 8)}...{cert.hash.slice(-8)}
                          </td>
                        </>
                      )}
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(cert.status)}`}>
                          {getStatusIcon(cert.status)}
                          <span className="ml-2 capitalize">{cert.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#cbd5e1]">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(cert.uploadDate).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;