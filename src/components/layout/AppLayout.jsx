import { createElement, useState, useSyncExternalStore } from 'react'
import { FiHome, FiList, FiUsers, FiLogOut } from 'react-icons/fi'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import MobileNav from './MobileNav'

function subscribeToConnection(onChange) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

const isOnline = () => navigator.onLine

export default function AppLayout() {
  const online = useSyncExternalStore(subscribeToConnection, isOnline)
  const { user, role, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError('')
    try {
      await signOut()
    } catch {
      setSignOutError('Could not sign out. Check your connection and try again.')
      setSigningOut(false)
    }
  }

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: FiHome,
      admin: true,
    },
    {
      label: 'Orders',
      path: '/orders',
      icon: FiList,
    },
    {
      label: 'Staff',
      path: '/users',
      icon: FiUsers,
      admin: true,
    },
  ]

  const visibleNavItems = navItems.filter(
    (item) => !item.admin || role === 'manager'
  )

  return (
    <div className="min-h-screen bg-stone-50 flex">

      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col shrink-0 md:w-[72px] lg:w-60 h-screen sticky top-0 bg-white border-r border-stone-200 px-3 py-4">

        <div className="mb-6 flex h-10 items-center gap-2.5 px-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-semibold text-white">
            L
          </span>

          <span className="hidden lg:block truncate text-[15px] font-semibold text-stone-900">
            {import.meta.env.VITE_SHOP_NAME?.trim() || 'Laundry POS'}
          </span>
        </div>

        <nav className="flex flex-col gap-1" aria-label="Main">
          {visibleNavItems.map(({ label, path, icon }) => (
            <NavLink
              key={path}
              to={path}
              title={label}
              aria-label={label}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors md:justify-center lg:justify-start ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                }`
              }
            >
              {createElement(icon, { size: 18, className: 'shrink-0', 'aria-hidden': true })}

              <span className="hidden lg:inline">
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-stone-100 pt-3">
          <p className="hidden lg:block truncate px-1.5 pb-1 text-xs text-stone-400">
            {user?.email}
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            title="Logout"
            aria-label="Logout"
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-600 md:justify-center lg:justify-start"
          >
            <FiLogOut size={18} className="shrink-0" />

            <span className="hidden lg:inline">
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {!online && (
          <p className="shrink-0 bg-amber-100 px-4 py-2 text-sm text-amber-900" role="status">
            You’re offline. Use the paper log until the connection returns.
          </p>
        )}
        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {signOutError && <p className="bg-rose-50 px-4 py-2 text-sm text-rose-800" role="alert">{signOutError}</p>}
          <div className="flex-1">
            <Outlet />
          </div>

          {/* MOBILE NAV */}
          <MobileNav items={visibleNavItems} onSignOut={handleSignOut} signingOut={signingOut} />
        </main>
      </div>
    </div>
  )
}