import { FiArrowDown, FiArrowUp, FiTrendingUp } from 'react-icons/fi';
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
    <section className="
      relative
      overflow-hidden
      bg-blue-600
      rounded-xl
      p-5 sm:p-6
      text-white
    ">

      {/* Decorative background */}
      <div className="
        absolute
        -right-10
        -top-10
        w-32
        h-32
        rounded-full
        bg-blue-500/40
      " />

      <div className="
        absolute
        -right-16
        -bottom-16
        w-40
        h-40
        rounded-full
        bg-blue-700/20
      " />

      <div className="relative">

        <div className="flex items-center gap-2">
          <div className="
            w-8 h-8
            rounded-lg
            bg-white/15
            flex items-center justify-center
          ">
            <FiTrendingUp size={16} />
          </div>

          <p className="text-sm font-medium text-blue-100">
            {title}
          </p>
        </div>

        <p className="
            flex
          mt-4
          text-3xl sm:text-4xl
          font-semibold
          tracking-tight
          tabular-nums
        ">
          {formatPeso(revenue)}
        </p>

        {hasTrend && (
          <div className="mt-2 flex items-center gap-1.5 text-sm">
            {positive ? (
              <FiArrowUp size={14} />
            ) : (
              <FiArrowDown size={14} />
            )}

            <span className="font-medium">
              {Math.abs(trendPct).toFixed(1)}%
            </span>

            <span className="text-blue-100">
              vs previous period
            </span>
          </div>
        )}

      </div>
    </section>
  );
}