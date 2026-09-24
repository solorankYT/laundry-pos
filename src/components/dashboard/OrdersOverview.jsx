import { getOrdersByStatus } from '../../lib/dashboardData';

const STATUS_META = {
  pending: { label: 'Pending', color: 'bg-orange-400' },
  processing: { label: 'Processing', color: 'bg-blue-400' },
  ready: { label: 'Ready', color: 'bg-green-500' },
  released: { label: 'Released', color: 'bg-gray-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-400' },
};

export default function OrdersOverview({ orders, onSelectStatus }) {
  const rows = getOrdersByStatus(orders);
  const max = Math.max(...rows.map((r) => r.count), 1);

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Orders Overview</h3>
        <p className="text-sm text-gray-400">No orders yet for this period.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Orders Overview</h3>
      <div className="space-y-2.5">
        {rows.map((r) => {
          const meta = STATUS_META[r.status];
          return (
            <button
              key={r.status}
              onClick={() => onSelectStatus?.(r.status)}
              className="w-full flex items-center gap-3 text-left group"
            >
              <span className="text-xs text-gray-500 w-20 shrink-0">{meta.label}</span>
              <span className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <span
                  className={`block h-full ${meta.color} rounded-full`}
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </span>
              <span className="text-sm font-medium text-gray-800 w-6 text-right tabular-nums">{r.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
