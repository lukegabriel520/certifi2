import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { verifyContractConnection, checkNetwork } from '../utils/contractVerifier';

export default function ContractTest() {
  const [isLoading, setIsLoading] = useState(true);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [contractInfo, setContractInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        if (!window.ethereum) {
          throw new Error('No Ethereum provider found. Please install MetaMask.');
        }

        // Create provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Check network
        const network = await checkNetwork(provider);
        setNetworkInfo(network);

        // Check contract
        const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
        if (!contractAddress) {
          throw new Error('VITE_CONTRACT_ADDRESS is not set in environment variables');
        }

        const contractVerification = await verifyContractConnection(provider, contractAddress);
        setContractInfo(contractVerification);
      } catch (err) {
        console.error('Error checking connection:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    checkConnection();
  }, []);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Reload the component to re-run checks
      window.location.reload();
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 bg-blue-50 rounded-lg">Loading contract information...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Contract Connection Test</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {!window.ethereum ? (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
          <p>No Ethereum provider detected. Please install MetaMask.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <h3 className="text-lg font-semibold mb-2">Network Information</h3>
            {networkInfo ? (
              <div className="space-y-2">
                <p><span className="font-medium">Network:</span> {networkInfo.name} (Chain ID: {networkInfo.chainId})</p>
                <p className={networkInfo.isSepolia ? 'text-green-600' : 'text-red-600'}>
                  {networkInfo.isSepolia ? '✅ Connected to Sepolia' : '❌ Not connected to Sepolia'}
                </p>
              </div>
            ) : (
              <p>Could not determine network information.</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h3 className="text-lg font-semibold mb-2">Contract Information</h3>
            <p className="break-all"><span className="font-medium">Contract Address:</span> {import.meta.env.VITE_CONTRACT_ADDRESS}</p>
            
            {contractInfo ? (
              <div className="mt-2 space-y-2">
                <p><span className="font-medium">Contract Exists:</span> {contractInfo.isContract ? '✅ Yes' : '❌ No'}</p>
                
                {contractInfo.isContract ? (
                  <>
                    <p><span className="font-medium">Bytecode:</span> {contractInfo.code}</p>
                    <div>
                      <p className="font-medium">Detected Functions:</p>
                      {contractInfo.functions.length > 0 ? (
                        <ul className="list-disc pl-5">
                          {contractInfo.functions.map((fn: string) => (
                            <li key={fn} className="text-green-600">✓ {fn}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-yellow-600">No compatible functions detected</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-red-600">{contractInfo.error || 'Contract not found at the specified address'}</p>
                )}
              </div>
            ) : (
              <p>Could not verify contract information.</p>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Connect Wallet & Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}
