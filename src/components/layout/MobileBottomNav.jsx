import { NavLink } from 'react-router-dom';

/**
 * Fixed bottom tab bar for phones. AppLayout hides the sidebar below `md`,
 * so on mobile this is the only way to move between sections — without it
 * there is no mobile navigation at all.
 *
 * Reuses the same navItems/icons AppLayout passes to its desktop sidebar so
 * the two never drift out of sync (add a nav item once, it shows up in both).
 */
export default function MobileBottomNav({ navItems }) {
  return (
    <>
      {/* Reserves space so page content doesn't sit under the fixed bar */}
      <div className="h-16 shrink-0 md:hidden" aria-hidden="true" />

      <nav
        className="
          md:hidden fixed inset-x-0 bottom-0 z-40
          bg-white border-t border-gray-200
          pb-[env(safe-area-inset-bottom)]
        "
      >
        <div className="flex items-stretch">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
