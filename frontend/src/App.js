import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomReportsBuilder from './components/CustomReportsBuilder';
import './App.css';

// Temporary placeholder components until we create the real ones
const LoginPage = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <h1 className="text-2xl font-bold text-center mb-6">NBA Analytics Login</h1>
      <p className="text-gray-600 text-center mb-6">
        Authentication system coming soon!
      </p>
      <div className="space-y-4">
        <button 
          onClick={() => window.location.href = '/reports'}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Continue to Reports (No Login Required)
        </button>
        <div className="text-center">
          <a href="/signup" className="text-blue-600 hover:underline">
            Don't have an account? Sign up
          </a>
        </div>
      </div>
    </div>
  </div>
);

const SignupPage = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <h1 className="text-2xl font-bold text-center mb-6">NBA Analytics Signup</h1>
      <p className="text-gray-600 text-center mb-6">
        Authentication system coming soon!
      </p>
      <div className="space-y-4">
        <button 
          onClick={() => window.location.href = '/reports'}
          className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
        >
          Continue to Reports (No Signup Required)
        </button>
        <div className="text-center">
          <a href="/login" className="text-blue-600 hover:underline">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  </div>
);

const DashboardPage = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
      <h1 className="text-2xl font-bold text-center mb-6">NBA Analytics Dashboard</h1>
      <p className="text-gray-600 text-center mb-6">
        Dashboard features coming soon!
      </p>
      <div className="text-center">
        <button 
          onClick={() => window.location.href = '/reports'}
          className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700"
        >
          Go to Reports Builder
        </button>
      </div>
    </div>
  </div>
);

// Simple landing page component
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
            🔐 Login (Coming Soon)
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

// Main App component
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Authentication pages (placeholders) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          
          {/* Your existing reports app */}
          <Route path="/reports" element={<CustomReportsBuilder />} />
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;