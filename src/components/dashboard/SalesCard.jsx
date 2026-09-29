import { FiArrowDown, FiArrowUp } from 'react-icons/fi';
import { formatPeso } from '../../lib/dateRanges';

export default function SalesCard({
  revenue,
  trendPct,
  preset,
}) {
  const title = {
    today: "Today's Sales",
    yesterday: "Yesterday's Sales",
    '7days': 'Sales — Last 7 Days',
    '30days': 'Sales — Last 30 Days',
    custom: 'Sales — Custom Range',
  }[preset] || 'Sales';

  const hasTrend = typeof trendPct === 'number';
  const positive = trendPct >= 0;

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">

      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <div className="mt-2">
        <p className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight tabular-nums">
          {formatPeso(revenue)}
        </p>

        {hasTrend && (
          <div
            className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${
              positive ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {positive ? (
              <FiArrowUp size={14} />
            ) : (
              <FiArrowDown size={14} />
            )}

            <span>
              {Math.abs(trendPct).toFixed(1)}%
            </span>

            <span className="font-normal text-gray-400">
              vs previous period
            </span>
          </div>
        )}
      </div>
    </section>
  );
}