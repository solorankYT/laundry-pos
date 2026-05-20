import UsersTable from "../components/dashboard/UsersTable";
import Sidebar from "../components/layout/Sidebar";
import { useState } from "react";
import { FiMenu } from "react-icons/fi";

export default function User() {
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

            <h1 className="text-2xl font-bold mb-4">User Profile</h1>
            <UsersTable />
        </main>
    </div>
    );
}