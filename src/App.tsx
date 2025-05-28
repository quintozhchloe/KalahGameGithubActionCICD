import React, { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './theme';
import { AuthProvider, useAuth } from './authContext';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import PlayerSetup from './pages/PlayerSetup';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';

// 受保护的路由组件
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route 
        path="/PlayerSetup" 
        element={
          <ProtectedRoute>
            <PlayerSetup />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/game" 
        element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } 
      />
      {/* 添加404页面 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
