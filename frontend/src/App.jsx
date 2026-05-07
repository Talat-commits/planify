import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isUserAuthenticated } from './utils/authStorage'
import KeyEntry from './pages/KeyEntry'
import GoalInput from './pages/GoalInput'
import Questions from './pages/Questions'
import Dashboard from './pages/Dashboard'
import OldPlans from './pages/OldPlans'

// Protected route component
function ProtectedRoute({ children, isAuth }) {
  return isAuth ? children : <Navigate to="/key-entry" replace />
}

export default function App() {
  const [isAuth, setIsAuth] = useState(null) // null = loading, true/false = loaded
  const [isAuthValue, setIsAuthValue] = useState(false)

  useEffect(() => {
    const auth = isUserAuthenticated()
    setIsAuthValue(!!auth)
    setIsAuth(!!auth)

    // Listen for auth changes (from KeyEntry or other components)
    const handleAuthChanged = () => {
      const updatedAuth = isUserAuthenticated()
      setIsAuthValue(!!updatedAuth)
      setIsAuth(!!updatedAuth)
    }

    window.addEventListener('planify-auth-changed', handleAuthChanged)
    return () => window.removeEventListener('planify-auth-changed', handleAuthChanged)
  }, [])

  // Show loading state while checking auth
  if (isAuth === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f1117 0%, #1a1d28 100%)'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(77, 166, 255, 0.2)',
          borderTopColor: '#4da6ff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <Routes>
        {/* Public routes */}
        <Route path="/key-entry" element={<KeyEntry />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute isAuth={isAuthValue}>
              <GoalInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/questions"
          element={
            <ProtectedRoute isAuth={isAuthValue}>
              <Questions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuth={isAuthValue}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/old-plans"
          element={
            <ProtectedRoute isAuth={isAuthValue}>
              <OldPlans />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to={isAuthValue ? "/" : "/key-entry"} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
