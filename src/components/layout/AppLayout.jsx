import { FiHome, FiList, FiDollarSign, FiLogOut } from 'react-icons/fi'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import MobileNav from './MobileNav'

export default function AppLayout() {
  const { user, role, signOut } = useAuth()

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
      label: 'Payments',
      path: '/payments',
      icon: FiDollarSign,
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
            Laundry POS
          </span>
        </div>

        <nav className="flex flex-col gap-1" aria-label="Main">
          {visibleNavItems.map(({ label, path, icon: Icon }) => (
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
              <Icon size={18} className="shrink-0" />

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
            onClick={signOut}
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

   

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>

          {/* MOBILE NAV */}
          <MobileNav />
        </main>
      </div>
    </div>
  )
}