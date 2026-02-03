import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BiometricLogin } from './components/auth/BiometricLogin';
import { InitialSetup } from './components/auth/InitialSetup';
import { AlternativeLogin } from './components/auth/AlternativeLogin';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { ClientDashboard } from './components/dashboard/ClientDashboard';
import authService from './services/authService';
import { User } from './types';
import './index.css';

/**
 * Aplicación Principal
 * Gestiona el enrutamiento y estado global de autenticación
 */

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // Solo intentar obtener usuario si hay un token almacenado
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error: any) {
      // Ignorar errores 429 y de autenticación
      if (error?.response?.status !== 429) {
        console.error('No authenticated user');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-800">
                  🔐 Biometric Auth System
                </h1>
              </div>
              {user && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {user.email} ({user.role})
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route
              path="/setup"
              element={<InitialSetup onSetupComplete={() => window.location.href = '/login'} />}
            />
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <BiometricLogin onLoginSuccess={handleLoginSuccess} />
                )
              }
            />
            <Route
              path="/alternative"
              element={
                user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <AlternativeLogin onLoginSuccess={handleLoginSuccess} />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                user ? (
                  user.role === 'admin' ? (
                    <AdminDashboard currentUser={user} />
                  ) : (
                    <ClientDashboard currentUser={user} onProfileUpdate={handleProfileUpdate} />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
