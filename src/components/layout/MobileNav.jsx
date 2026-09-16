import { NavLink } from 'react-router-dom'
import { LayoutDashboard, History, Plus, CreditCard } from 'lucide-react'

const links = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/accounts', label: 'Accounts', icon: CreditCard },
  { to: '/transactions', label: 'History', icon: History },
]

export function MobileNav({ onAddClick }) {
  return (
    <nav className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-2 lg:hidden">
      {/* Navigation */}
      <div className="flex flex-1 items-center gap-1 rounded-full border border-line bg-surface p-1.5 shadow-lg shadow-ink/10">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              `flex flex-1 items-center justify-center rounded-full py-2.5 transition-colors ${
                isActive
                  ? 'bg-pine-soft text-pine'
                  : 'text-ink-muted hover:text-ink'
              }`
            }
          >
            <Icon
              size={20}
              strokeWidth={2}
              aria-hidden="true"
            />
          </NavLink>
        ))}
      </div>

      {/* Add */}
      <div className="flex shrink-0 items-center rounded-full border border-line bg-surface p-1.5 shadow-lg shadow-ink/10">
        <button
          type="button"
          onClick={onAddClick}
          aria-label="Add transaction"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pine text-white transition-transform active:scale-95"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  )
}