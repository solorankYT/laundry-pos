import { NavLink } from 'react-router-dom';

/**
 * Fixed bottom tab bar for phones. AppLayout hides the sidebar below `md`,
 * so on mobile this is the only way to move between sections.
 *
 * Reuses the navItems AppLayout passes to its sidebar, so the two never
 * drift out of sync.
 */
export default function MobileBottomNav({ navItems }) {
  return (
    <>
      {/* Reserves space so content never sits under the bar (includes the
          home-indicator inset on notched phones) */}
      <div
        className="h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 md:hidden"
        aria-hidden="true"
      />

      <nav
        aria-label="Main"
        className="
          md:hidden fixed inset-x-0 bottom-0 z-40
          border-t border-stone-200/70
          bg-white/90 supports-[backdrop-filter]:bg-white/75
          backdrop-blur-xl backdrop-saturate-150
          pb-[env(safe-area-inset-bottom)]
        "
      >
        <div className="flex items-stretch px-2">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-teal-700' : 'text-stone-500 active:text-stone-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-teal-100/80' : ''
                    }`}
                  >
                    <Icon size={20} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}