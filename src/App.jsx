import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ToastProvider'
import LoginPage from './pages/LoginPage'
import MasterEditor from './pages/MasterEditor'
import MasterDashboard from './pages/MasterDashboard'
import StudentClassroom from './pages/StudentClassroom'

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-zinc-950">
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/editor" element={<MasterEditor />} />
              <Route path="/dashboard" element={<MasterDashboard />} />
              <Route path="/classroom" element={<StudentClassroom />} />
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
