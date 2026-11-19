import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AuthProvider from './hooks/AuthProvider'
import App from './App'
import './index.css'

// Remove the authenticated API cache left by earlier versions.
window.caches?.delete('supabase-cache').catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)