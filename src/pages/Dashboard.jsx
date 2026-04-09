import { FiMenu, FiUsers, FiBox } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import KPICard from '../components/dashboard/KPICard';
import OrdersOverview from '../components/dashboard/OrdersOverview';
import UsersTable from '../components/dashboard/UsersTable';
import { useState } from 'react';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">

      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

     <main className="flex-1 flex flex-col ml-0 p-4 overflow-y-auto">
            <div className="flex justify-end mb-4 md:hidden">
                <button
                className="p-2 rounded bg-gray-900 text-white"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                <FiMenu size={20} />
                </button>
            </div>

            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <KPICard title="Total Revenue" value="₱45,000" />
                <KPICard title="Total Orders" value="120" icon={<FiBox />} />
                <KPICard title="Users" value="15" icon={<FiUsers />} />
            </div>

            <OrdersOverview />
            </main>
    </div>
  );
}