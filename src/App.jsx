import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Orders from './pages/Orders'
import Dashboard from './pages/Dashboard'
import User from './pages/User'

function ProtectedRoute({ children }) {
  const { user, role, loading, error, retryAccess, signOut } = useAuth()
  const [signOutError, setSignOutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  if (loading) {
    return <div className="grid min-h-screen place-items-center" role="status">Checking staff access…</div>
  }

  if (!user) return <Navigate to="/login" replace />

  if (!role) {
    async function leave() {
      setSigningOut(true)
      setSignOutError('')
      try {
        await signOut()
      } catch {
        setSignOutError('Could not sign out. Check your connection and try again.')
        setSigningOut(false)
      }
    }

    return (
      <main className="grid min-h-screen place-items-center p-4">
        <section className="max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Staff access</h1>
          <p>{error
            ? 'Could not check staff access. Check your connection and retry.'
            : 'This account does not have active staff access. Ask the shop manager to enable it.'}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="rounded-lg bg-blue-700 px-4 py-2 text-white" onClick={retryAccess}>
              Check again
            </button>
            <button type="button" className="rounded-lg border px-4 py-2" onClick={leave} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
          {signOutError && <p role="alert" className="text-red-700">{signOutError}</p>}
        </section>
      </main>
    )
  }

  return children
}

function ManagerRoute({ children }) {
  const { role } = useAuth()
  return role === 'manager' ? children : <Navigate to="/orders" replace />
}

function StaffHome() {
  const { role } = useAuth()
  return <Navigate to={role === 'manager' ? '/dashboard' : '/orders'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<StaffHome />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/users" element={<ManagerRoute><User /></ManagerRoute>} />
          <Route path="/dashboard" element={<ManagerRoute><Dashboard /></ManagerRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
