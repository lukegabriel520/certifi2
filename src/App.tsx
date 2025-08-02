import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import { AuthProvider } from './context/AuthContext';

const IssueCertificate = React.lazy(() => import('./components/IssueCertificate'));
const VerifyDocument = React.lazy(() => import('./components/VerifyDocument'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6366F1]"></div>
  </div>
);

const LandingPageWithDefaultProps = (props: { currentSection?: string }) => (
  <LandingPage currentSection={props.currentSection || 'home'} />
);

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0d1b2a] text-[#f9fafb]">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<LandingPageWithDefaultProps />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
              <Route element={<ProtectedRoute requiredRole="Institution" />}>
                <Route path="/issue-certificate" element={<IssueCertificate />} />
              </Route>
              <Route element={<ProtectedRoute requiredRole="Verifier" />}>
                <Route path="/verify-document" element={<VerifyDocument />} />
              </Route>
            </Routes>
          </Suspense>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
