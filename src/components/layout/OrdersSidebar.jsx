import { FiHome, FiLogOut, FiBox } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

export default function OrdersSidebar({ isOpen, toggleSidebar }) {
  const { user, logout, role } = useAuth();

  const isAdmin = role === 'manager';

  return (
    <aside
      className={`bg-gray-900 text-white w-64 p-4 h-screen fixed transition-transform z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
    >

      <h1 className="text-2xl font-bold mb-6">Laundry POS</h1>

      <div className="mb-6">
        <p className="text-sm text-gray-400">Logged in as:</p>
        <p className="font-semibold">{user?.email || user?.name}</p>
      </div>

      <nav className="flex flex-col gap-2 mb-6">
        <a
          href="/orders"
          className="flex items-center gap-3 p-3 rounded-lg bg-blue-600 font-semibold"
        >
          <FiBox /> Orders
        </a>

        {isAdmin && (
          <a
            href="/dashboard"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition"
          >
            <FiHome /> Admin Dashboard
          </a>
        )}
      </nav>

      <button
        onClick={logout}
        className="mt-auto flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition w-full text-left"
      >
        <FiLogOut /> Logout
      </button>
    </aside>
  );
}