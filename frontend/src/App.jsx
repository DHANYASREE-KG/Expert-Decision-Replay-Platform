import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Decisions from './pages/Decisions';
import CreateDecision from './pages/CreateDecision';
import DecisionDetail from './pages/DecisionDetail';
import Reports from './pages/Reports';

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column' }}>
        <h2 style={{ color: '#e74c3c' }}>403 - Access Forbidden</h2>
        <p>You don't have permission to access this page.</p>
        <button onClick={() => window.history.back()} style={{ padding: '10px 20px', marginTop: '16px', cursor: 'pointer' }}>
          Go Back
        </button>
      </div>
    );
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

      {/* Employee Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/decisions" element={
        <ProtectedRoute>
          <Decisions />
        </ProtectedRoute>
      } />

      <Route path="/decisions/create" element={
        <ProtectedRoute>
          <CreateDecision />
        </ProtectedRoute>
      } />

      <Route path="/decisions/:id" element={
        <ProtectedRoute>
          <DecisionDetail />
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['Administrator']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Default Routes */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column' }}>
          <h2>404 - Page Not Found</h2>
          <button onClick={() => window.location.href = '/dashboard'} style={{ padding: '10px 20px', marginTop: '16px', cursor: 'pointer' }}>
            Go to Dashboard
          </button>
        </div>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}