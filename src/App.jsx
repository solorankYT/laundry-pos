import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/login'
import Orders from './pages/Orders'
import Dashboard from './pages/Dashboard'

// Blocks access if not logged in
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Blocks access if not manager
function ManagerRoute({ children }) {
  const { user, role, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role !== 'manager') return <Navigate to="/orders" replace />
  return children
}

export default function App() {
  const { user, role } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root based on role */}
        <Route
          path="/"
          element={
            user
              ? role === 'manager'
                ? <Navigate to="/dashboard" replace />
                : <Navigate to="/orders" replace />
              : <Navigate to="/login" replace />
          }
        />

        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Employee + Manager */}
        <Route path="/orders" element={
          <ProtectedRoute><Orders /></ProtectedRoute>
        } />

        {/* Manager only */}
        <Route path="/dashboard" element={
          <ManagerRoute><Dashboard /></ManagerRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}