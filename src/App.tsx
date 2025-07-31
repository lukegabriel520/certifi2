import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import IssueCertificatePage from './pages/IssueCertificatePage';
import VerifyDocumentPage from './pages/VerifyDocumentPage';

function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/" element={<LandingPage />} />

      {/* Protected Routes accessible to any logged-in user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      {/* Role-Specific Protected Routes */}
      <Route element={<ProtectedRoute requiredRole="Institution" />}>
        <Route path="/issue-certificate" element={<IssueCertificatePage />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole="Verifier" />}>
        <Route path="/verify-document" element={<VerifyDocumentPage />} />
      </Route>

      {/* You can add a 404 Not Found page here if you like */}
      {/* <Route path="*" element={<NotFoundPage />} /> */}
    </Routes>
  );
}

export default App;
