import { Link } from 'react-router-dom';
import { ORDER_STATUS_LABELS } from '../../lib/dashboardData';
import { formatPeso } from '../../lib/dateRanges';

const STATUS_PILL = {
  pending: 'bg-orange-50 text-orange-600',
  done: 'bg-green-50 text-green-700',
  released: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-500',
};

export default function TodaysOrders({ orders, title, limit = 8 }) {
  const rows = orders.slice(0, limit);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <Link to="/orders?status=all" className="text-xs font-medium text-blue-600 hover:underline">
          View All Orders
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No orders in this period.
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
                    {(o.order_items || []).map((item) => item.service_name).join(', ')}
                  </td>
                  <td className="py-2 px-1 text-right text-gray-800 tabular-nums">{formatPeso(o.total)}</td>
                  <td className="py-2 px-1 text-right">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_PILL[o.status]}`}>
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
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
