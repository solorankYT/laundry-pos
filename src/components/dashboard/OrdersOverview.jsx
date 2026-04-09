
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FiBox, FiCheckCircle, FiDollarSign } from 'react-icons/fi';

export default function OrdersOverview() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    done: 0,
    revenue: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const { data: orders } = await supabase.from('orders').select('*');
      if (orders) {
        const total = orders.length;
        const pending = orders.filter(o => o.status === 'pending').length;
        const done = orders.filter(o => o.status === 'done').length;
        const revenue = orders.reduce((sum, o) => sum + o.total, 0);
        setStats({ total, pending, done, revenue });
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded shadow flex items-center justify-between">
        <div>
          <h3 className="text-gray-500 text-sm">Total Orders</h3>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <FiBox className="text-2xl text-blue-500" />
      </div>
      <div className="bg-yellow-100 p-4 rounded shadow flex items-center justify-between">
        <div>
          <h3 className="text-gray-500 text-sm">Pending</h3>
          <p className="text-xl font-bold">{stats.pending}</p>
        </div>
        <FiCheckCircle className="text-2xl text-yellow-500" />
      </div>
      <div className="bg-green-100 p-4 rounded shadow flex items-center justify-between">
        <div>
          <h3 className="text-gray-500 text-sm">Done</h3>
          <p className="text-xl font-bold">{stats.done}</p>
        </div>
        <FiCheckCircle className="text-2xl text-green-500" />
      </div>
      <div className="bg-white p-4 rounded shadow flex items-center justify-between">
        <div>
          <h3 className="text-gray-500 text-sm">Revenue</h3>
          <p className="text-xl font-bold">₱{stats.revenue}</p>
        </div>
      </div>
    </div>
  );
}