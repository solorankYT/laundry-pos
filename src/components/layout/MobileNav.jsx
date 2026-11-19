import { createElement } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Plus } from 'lucide-react'

export default function MobileNav({ items, onSignOut, signingOut }) {
  const navigate = useNavigate()

  return (
    <>
      <div className="h-24 shrink-0 md:hidden" aria-hidden="true" />
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-2 md:hidden"
      >
        <div className="flex flex-1 items-center gap-1 rounded-full border border-stone-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-xl">
          {items.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 ${isActive ? 'bg-blue-50 text-blue-700' : 'text-stone-600'}`
              }
            >
              {createElement(icon, { size: 18, 'aria-hidden': true })}
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-stone-600 disabled:opacity-50"
          >
            <LogOut size={18} aria-hidden="true" />
            <span className="text-[10px] font-semibold leading-none">Sign out</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/orders?action=new')}
          aria-label="Add order"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-lg"
        >
          <Plus size={24} aria-hidden="true" />
        </button>
      </nav>
    </>
  )
}
