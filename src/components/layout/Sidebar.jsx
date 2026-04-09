import { FiHome, FiUsers, FiBox, FiCreditCard, FiLogOut } from 'react-icons/fi';
import { useState } from 'react';

export default function Sidebar({ isOpen, toggleSidebar, activePage }) {
  const links = [
    { name: 'Dashboard', icon: <FiHome />, href: '/dashboard' },
    { name: 'Orders', icon: <FiBox />, href: '/orders' },
    { name: 'Users', icon: <FiUsers />, href: '/users' },
    { name: 'Services', icon: <FiBox />, href: '/services' },
    { name: 'Payments', icon: <FiCreditCard />, href: '/payments' },
  ];

  return (
   <aside
        className={`bg-gray-900 text-white w-64 p-4 h-screen fixed md:static transition-transform z-50 justify-end
            ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        >
      <h1 className="text-2xl font-bold mb-6">Laundry POS</h1>
      <nav className="flex flex-col gap-2">
        {links.map(link => (
          <a
            key={link.name}
            href={link.href}
            className={`flex items-center gap-3 p-3 rounded-lg text-sm transition 
              ${activePage === link.name ? 'bg-blue-600 font-semibold' : 'hover:bg-gray-800'}`}
          >
            <span className="text-lg">{link.icon}</span>
            <span>{link.name}</span>
          </a>
        ))}
      </nav>

      {/* Logout */}
      <button className="mt-auto flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 text-sm transition">
        <FiLogOut /> Logout
      </button>
    </aside>
  );
}