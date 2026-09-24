import { getAddonStats } from '../../lib/dashboardData';
import { formatPeso } from '../../lib/dateRanges';
import type { Order } from '../../lib/types';

interface Props {
  orders: Order[];
}

export default function AddonPerformance({ orders }: Props) {
  const stats = getAddonStats(orders);
  const totalRevenue = stats.reduce((s, a) => s + a.revenue, 0);

  if (stats.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Popular Add-ons</h3>
        <span className="text-xs text-gray-400">{formatPeso(totalRevenue)} total</span>
      </div>
      <div className="space-y-2">
        {stats.map((a) => (
          <div key={a.name} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{a.name}</span>
            <span className="text-gray-800 font-medium">{a.sold} sold</span>
          </div>
        ))}
      </div>
    </div>
  );
}
