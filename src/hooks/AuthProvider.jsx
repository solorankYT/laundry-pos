import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './useAuth'

export default function AuthProvider({ children }) {
  const [staff, setStaff] = useState({ user: null, role: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let revision = 0
    let pendingRoleCheck

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = ++revision
      clearTimeout(pendingRoleCheck)
      const user = session?.user ?? null

      if (!user) {
        setStaff({ user: null, role: null, loading: false, error: null })
        return
      }

      setStaff(previous => previous.user?.id === user.id && previous.role
        ? previous
        : { user, role: null, loading: true, error: null })

      // Supabase dispatches auth events while holding its session lock.
      pendingRoleCheck = setTimeout(async () => {
        const { data, error } = await supabase.rpc('get_staff_role')
        if (current !== revision) return

        const role = data === 'employee' || data === 'manager' ? data : null
        setStaff({ user, role, loading: false, error })
      }, 0)
    })

    return () => {
      revision++
      clearTimeout(pendingRoleCheck)
      subscription.unsubscribe()
    }
  }, [attempt])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      ...staff,
      retryAccess: () => setAttempt(attempt => attempt + 1),
      signIn,
      signOut,
      logout: signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
