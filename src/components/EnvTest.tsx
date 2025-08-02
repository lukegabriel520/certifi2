import { useEffect } from 'react';

export default function EnvTest() {
  useEffect(() => {
    console.log('Environment Variables:', {
      VITE_CONTRACT_ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS,
      VITE_DEFAULT_CHAIN_ID: import.meta.env.VITE_DEFAULT_CHAIN_ID,
      NODE_ENV: import.meta.env.MODE,
    });
  }, []);

  return null;
}
