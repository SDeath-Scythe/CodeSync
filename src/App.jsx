import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ToastProvider'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CollaborationProvider } from './context/CollaborationContext'
import LoginPage from './pages/LoginPage'
import AuthCallback from './pages/AuthCallback'
import SessionHub from './pages/SessionHub'
import MasterEditor from './pages/MasterEditor'
import MasterDashboard from './pages/MasterDashboard'
import StudentClassroom from './pages/StudentClassroom'

// Protected route wrapper for teachers
const TeacherRoute = ({ children }) => {
  const { isAuthenticated, isTeacher, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">Loading...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (!isTeacher) {
    return <Navigate to="/classroom" replace />;
  }
  
  return children;
};

// Protected route wrapper for students
const StudentRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">Loading...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Protected route for authenticated users (both roles)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">Loading...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Public route - redirect if already authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">Loading...</div>
    </div>;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/session" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Routes>
        <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/session" element={<ProtectedRoute><SessionHub /></ProtectedRoute>} />
        <Route path="/editor" element={<TeacherRoute><MasterEditor /></TeacherRoute>} />
        <Route path="/dashboard" element={<TeacherRoute><MasterDashboard /></TeacherRoute>} />
        <Route path="/classroom" element={<StudentRoute><StudentClassroom /></StudentRoute>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <AuthProvider>
            <CollaborationProvider>
              <AppRoutes />
            </CollaborationProvider>
          </AuthProvider>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
