import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ClipboardMinus, ChartLine, Plus } from 'lucide-react'

const links = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: Home,
    end: true,
  },
  {
    to: '/orders',
    label: 'Orders',
    icon: ClipboardMinus,
  },
  {
    to: '/',
    label: 'Reports',
    icon: ChartLine,
  },
]

export default function MobileNav() {
  const navigate = useNavigate()

  const handleAddOrder = () => {
    navigate('/orders?action=new')
  }

  return (
    <>
      {/* Reserved space for fixed mobile navigation */}
      <div
        className="lg:hidden h-24 shrink-0"
        aria-hidden="true"
      />

      <nav
        aria-label="Mobile navigation"
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
            border-stone-200
            bg-white/95
            p-1.5
            shadow-lg
            shadow-black/10
            backdrop-blur-xl
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
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-stone-500 active:bg-stone-100 active:text-stone-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2.4 : 2.1}
                    aria-hidden="true"
                  />

                  <span className="text-[10px] font-semibold leading-none">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* ADD ORDER */}
        <button
          type="button"
          onClick={handleAddOrder}
          aria-label="Add Order"
          className="
            flex
            h-14
            w-14
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-blue-600
            text-white
            shadow-lg
            shadow-blue-600/30
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