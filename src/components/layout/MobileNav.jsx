import { NavLink } from 'react-router-dom'
import { ClipboardList, History, Plus, Users } from 'lucide-react'

const links = [
  { to: '/', label: 'Queue', icon: ClipboardList, end: true },
  { to: '/accounts', label: 'Accounts', icon: Users },
  { to: '/transactions', label: 'History', icon: History },
]

export function MobileNav({ onAddClick }) {
  return (
    <>
      {/* Reserved space for the fixed mobile navigation */}
      <div
        className="
          lg:hidden
          h-24
          shrink-0
        "
        aria-hidden="true"
      />

      <nav
        className="
          fixed
          inset-x-4
          bottom-[calc(1rem+env(safe-area-inset-bottom))]
          z-50
          flex
          items-center
          gap-2
          lg:hidden
        "
      >
        {/* Navigation */}
        <div
          className="
            flex
            flex-1
            items-center
            gap-1
            rounded-full
            border
            border-line/60
            bg-surface/90
            p-1.5
            shadow-lg
            shadow-ink/10
            backdrop-blur-xl
            backdrop-saturate-150
            supports-[backdrop-filter]:bg-surface/75
          "
        >
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 transition-colors ${
                  isActive
                    ? 'bg-pine-soft text-pine'
                    : 'text-ink/65 active:bg-black/5'
                }`
              }
            >
              <Icon
                size={19}
                strokeWidth={2.25}
                aria-hidden="true"
              />

              <span className="text-[10px] font-semibold leading-none">
                {label}
              </span>
            </NavLink>
          ))}
        </div>

        {/* New Order */}
        <button
          type="button"
          onClick={onAddClick}
          aria-label="New Order"
          className="
            flex
            h-14
            w-14
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-pine
            text-black
            shadow-lg
            shadow-pine/30
            transition-transform
            active:scale-95
          "
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </nav>
    </>
  )
}