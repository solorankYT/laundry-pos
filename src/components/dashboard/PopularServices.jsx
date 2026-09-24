import { getServiceStats } from '../../lib/dashboardData';
import { formatPeso } from '../../lib/dateRanges';

export default function PopularServices({ orders }) {
  const stats = getServiceStats(orders).slice(0, 6);
  const maxRevenue = Math.max(...stats.map((s) => s.revenue), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Popular Services</h3>

      {stats.length === 0 ? (
        <p className="text-sm text-gray-400">Not enough data yet</p>
      ) : (
        <div className="space-y-3">
          {stats.map((s) => (
            <div key={s.name}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm text-gray-700">{s.name}</span>
                <span className="text-xs text-gray-400">
                  {s.orders} orders \u00B7 {formatPeso(s.revenue)}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(s.revenue / maxRevenue) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
