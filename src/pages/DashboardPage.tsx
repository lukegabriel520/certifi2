import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const { currentUser } = useAuth();

  const renderRoleSpecificContent = () => {
    if (!currentUser) {
      return <p>Loading user data...</p>;
    }

    return (
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Your Role: {
          currentUser.isInstitution ? 'Institution' : currentUser.isVerifier ? 'Verifier' : 'Standard User'
        }</h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Wallet Address: <span className="font-mono">{currentUser.address}</span></p>
        </div>

        <div className="mt-6">
          {currentUser.isInstitution && (
            <Link 
              to="/issue-certificate"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Issue a New Certificate
            </Link>
          )}
          {currentUser.isVerifier && (
            <Link 
              to="/verify-document"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Verify a Document
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
          {renderRoleSpecificContent()}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
