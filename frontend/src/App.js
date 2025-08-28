import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import CustomReportsBuilder from './components/CustomReportsBuilder';
import './App.css';

// Import real authentication components
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import DashboardPage from './components/dashboard/DashboardPage';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading, initialized } = useAuth();
  
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading, initialized } = useAuth();
  
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Landing page component
const LandingPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="max-w-2xl w-full text-center px-4">
      <div className="mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mx-auto mb-6 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">🏀</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          NBA Analytics Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Build custom NBA statistical reports and analyze player & team performance
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Get Started</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button 
            onClick={() => window.location.href = '/reports'}
            className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🚀 Start Building Reports
          </button>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔐 Login / Sign Up
          </button>
        </div>

        <p className="text-sm text-gray-500">
          No login required to use the reports builder!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white/80 backdrop-blur rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">📊 Custom Reports</h3>
          <p className="text-sm text-gray-600">
            Build unlimited custom NBA statistical reports with advanced filtering
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">🏀 Player & Team Stats</h3>
          <p className="text-sm text-gray-600">
            Access both traditional and advanced NBA statistics and analytics
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">⚡ Real-time Data</h3>
          <p className="text-sm text-gray-600">
            Get up-to-date NBA statistics and performance metrics
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Smart redirect component
const SmartRedirect = () => {
  const { user, loading, initialized } = useAuth();
  
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading NBA Analytics...</p>
        </div>
      </div>
    );
  }
  
  // If user is authenticated, go to dashboard
  // If not, show landing page
  return user ? <Navigate to="/dashboard" replace /> : <LandingPage />;
};

// Main App component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Root route - smart redirect or landing page */}
            <Route path="/" element={<SmartRedirect />} />
            
            {/* Authentication pages */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              } 
            />
            
            {/* Your existing reports app - accessible to all */}
            <Route path="/reports" element={<CustomReportsBuilder />} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard/:dashboardId" 
              element={
                <ProtectedRoute>
                  <CustomReportsBuilder />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;