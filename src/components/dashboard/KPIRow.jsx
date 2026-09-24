import KPICard from './KPICard';
import { formatPeso } from '../../lib/dateRanges';

/**
 * Mobile/small tablet: horizontal scroll-snap carousel (thumb-swipeable,
 * standard PWA pattern — 5 cards side by side would be cramped otherwise).
 * md and up: switches to a proper grid, no scrolling needed.
 */
export default function KPIRow({ kpi, preset, onSelect }) {
  return (
    <div
      className="
        flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1
        sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible
        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
      "
    >
      <KPICard label={preset === 'today' ? "Today's Sales" : 'Sales'} value={formatPeso(kpi.revenue)} trendPct={kpi.trend.revenue} />
      <KPICard
        label="Orders"
        value={String(kpi.totalOrders)}
        sublines={[`${kpi.releasedCount} completed`, `${kpi.pendingCount + kpi.readyCount} active`]}
      />
      <KPICard
        label="Pending Orders"
        value={String(kpi.pendingCount)}
        sublines={[`${kpi.pendingWashing} washing`, `${kpi.pendingProcessing} drying/folding`]}
        onClick={() => onSelect('pending')}
      />
      <KPICard
        label="Ready for Release"
        value={`${kpi.readyCount} Orders`}
        sublines={['Customers can pick these up']}
        highlight="positive"
        onClick={() => onSelect('ready')}
      />
      <KPICard
        label="Unpaid Orders"
        value={formatPeso(kpi.unpaidAmount)}
        sublines={[`${kpi.unpaidCount} unpaid orders`]}
        highlight="urgent"
        onClick={() => onSelect('unpaid')}
      />
    </div>
  );
}
