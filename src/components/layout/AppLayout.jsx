import { FiHome, FiList, FiDollarSign, FiLogOut } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import MobileBottomNav from './MobileBottomNav';

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: FiHome, admin: true },
    { label: 'Orders', path: '/orders', icon: FiList },
    { label: 'Payments', path: '/payments', icon: FiDollarSign },
  ];

  const visibleNavItems = navItems.filter((item) => !item.admin || user?.is_admin);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* SIDEBAR (tablet + desktop) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r p-4 h-screen sticky top-0">
        <h1 className="text-lg font-semibold mb-6">Laundry POS</h1>

        <nav className="flex flex-col gap-2">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition
                  ${active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Icon />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t pt-4">
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          <button onClick={signOut} className="mt-2 flex items-center gap-2 text-sm text-red-500 hover:text-red-600">
            <FiLogOut />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TOP BAR (mobile only) — sticky + safe-area aware so it sits below the
            phone's status bar / notch when the app runs standalone as a PWA */}
        <div
          className="
            md:hidden sticky top-0 z-30 bg-white border-b px-4
            pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3
          "
        >
          <h1 className="font-semibold">Laundry POS</h1>
        </div>

        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">{children}</div>
          <MobileBottomNav navItems={visibleNavItems} />
        </main>
      </div>
    </div>
  );
}
