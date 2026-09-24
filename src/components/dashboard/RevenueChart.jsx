import { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getRevenueSeries } from '../../lib/dashboardData';
import { formatDateShort, formatPeso } from '../../lib/dateRanges';

const GROUPINGS = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
];

export default function RevenueChart({ orders }) {
  const [groupBy, setGroupBy] = useState('day');

  const series = useMemo(() => getRevenueSeries(orders, groupBy), [orders, groupBy]);
  const totalRevenue = series.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = series.reduce((s, r) => s + r.orders, 0);
  const avgPerDay = series.length ? totalRevenue / series.length : 0;

  const chartData = series.map((s) => ({
    label: groupBy === 'month' ? s.key : formatDateShort(s.key),
    revenue: s.revenue,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Revenue</h3>
        <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
          {GROUPINGS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGroupBy(g.key)}
              className={`text-xs px-2.5 py-1 rounded ${groupBy === g.key ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500'}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">Not enough data yet</div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `\u20B1${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                width={44}
              />
              <Tooltip
                formatter={(v) => [formatPeso(v), 'Revenue']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#revFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex gap-6 mt-4 pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-400">Total Revenue</p>
          <p className="text-sm font-semibold text-gray-800">{formatPeso(totalRevenue)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Avg / Day</p>
          <p className="text-sm font-semibold text-gray-800">{formatPeso(avgPerDay)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Orders</p>
          <p className="text-sm font-semibold text-gray-800">{totalOrders}</p>
        </div>
      </div>
    </div>
  );
}
