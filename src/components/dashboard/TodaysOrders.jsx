import { Link } from 'react-router-dom';
import { formatPeso } from '../../lib/dateRanges';

const STATUS_PILL = {
  pending: 'bg-orange-50 text-orange-600',
  processing: 'bg-blue-50 text-blue-600',
  ready: 'bg-green-50 text-green-700',
  released: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-500',
};

export default function TodaysOrders({ orders, limit = 8 }) {
  const rows = orders.slice(0, limit);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Today's Orders</h3>
        <Link to="/orders" className="text-xs font-medium text-blue-600 hover:underline">
          View All Orders
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No orders yet
          <p className="text-xs text-gray-300 mt-1">Orders will appear here once customers start placing them.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="font-medium py-2 px-1">Order</th>
                <th className="font-medium py-2 px-1">Customer</th>
                <th className="font-medium py-2 px-1 hidden sm:table-cell">Service</th>
                <th className="font-medium py-2 px-1 text-right">Total</th>
                <th className="font-medium py-2 px-1 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 px-1 text-gray-500">#{o.order_number ?? o.id}</td>
                  <td className="py-2 px-1 text-gray-800">{o.customer_name}</td>
                  <td className="py-2 px-1 text-gray-500 hidden sm:table-cell">
                    {(o.order_items || []).filter((i) => i.item_type === 'service').map((i) => i.name).join(', ')}
                  </td>
                  <td className="py-2 px-1 text-right text-gray-800 tabular-nums">{formatPeso(o.total)}</td>
                  <td className="py-2 px-1 text-right">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_PILL[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
