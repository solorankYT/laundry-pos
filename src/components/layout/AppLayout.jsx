import { FiHome, FiList, FiDollarSign, FiLogOut } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AppLayout({ children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: FiHome, admin: true },
    { label: 'Orders', path: '/orders', icon: FiList },
    { label: 'Payments', path: '/payments', icon: FiDollarSign },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* SIDEBAR (desktop/tablet) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r p-4">

        {/* LOGO / TITLE */}
        <h1 className="text-lg font-semibold mb-6">Laundry POS</h1>

        {/* NAV */}
        <nav className="flex flex-col gap-2">
          {navItems.map(item => {
            if (item.admin && !user?.is_admin) return null

            const Icon = item.icon
            const active = pathname === item.path

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                  ${active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <Icon />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* USER + LOGOUT */}
        <div className="mt-auto border-t pt-4">
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>

          <button
            onClick={signOut}
            className="mt-2 flex items-center gap-2 text-sm text-red-500 hover:text-red-600"
          >
            <FiLogOut />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-screen">

        {/* TOP BAR (mobile) */}
        <div className="md:hidden bg-white border-b px-4 py-3">
          <h1 className="font-semibold">Laundry POS</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

      </main>
    </div>
  )
}