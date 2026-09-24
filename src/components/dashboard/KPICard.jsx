import { FiArrowUp, FiArrowDown } from 'react-icons/fi';

/**
 * A single top-row KPI card.
 *
 * props:
 *  - label: "Today's Sales"
 *  - value: "₱4,250"
 *  - sublines: string[]  e.g. ["18 completed", "6 active"]
 *  - trendPct: number | undefined  e.g. 12.4 or -5.1
 *  - highlight: 'urgent' | 'positive' | undefined — gives the card a colored
 *    left accent for things that need action (Ready for Release, Unpaid).
 *  - onClick: navigates to the filtered order list.
 */
export default function KPICard({ label, value, sublines = [], trendPct, highlight, onClick }) {
  const accent = {
    urgent: 'border-l-red-400',
    positive: 'border-l-green-400',
    warning: 'border-l-orange-400',
  }[highlight];

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`text-left bg-white border border-gray-200 ${accent ? `border-l-4 ${accent}` : ''} rounded-lg px-4 py-3.5 ${
        onClick ? 'hover:border-gray-300 cursor-pointer transition-colors' : ''
      }`}
    >
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>

      {typeof trendPct === 'number' && (
        <p className={`mt-1 text-xs font-medium flex items-center gap-1 ${trendPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trendPct >= 0 ? <FiArrowUp size={11} /> : <FiArrowDown size={11} />}
          {Math.abs(trendPct).toFixed(1)}% vs previous period
        </p>
      )}

      {sublines.length > 0 && (
        <p className="mt-1 text-xs text-gray-400">{sublines.join(' \u00B7 ')}</p>
      )}
    </Wrapper>
  );
}
