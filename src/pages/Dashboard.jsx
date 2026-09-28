import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DateRangeSelector from '../components/dashboard/DateRangeSelector';
import ExportButton from '../components/dashboard/ExportButton';
import ExportDialog from '../components/dashboard/ExportDialog';
import KPIRow from '../components/dashboard/KPIRow';
import RevenueChart from '../components/dashboard/RevenueChart';
import OrdersOverview from '../components/dashboard/OrdersOverview';
import NeedsAttention from '../components/dashboard/NeedsAttention';
import PopularServices from '../components/dashboard/PopularServices';
import PaymentSummary from '../components/dashboard/PaymentSummary';
import AddonPerformance from '../components/dashboard/AddonPerformance';
import TodaysOrders from '../components/dashboard/TodaysOrders';

import { getRangeForPreset } from '../lib/dateRanges';
import { getKpiSummary } from '../lib/dashboardData';

/**
 * Renders inside <AppLayout>, which already provides the sidebar (tablet+),
 * mobile top bar, and mobile bottom nav — this component is just the page
 * content, so it doesn't manage its own nav/sidebar state.
 *
 * Section order below is authored mobile-first (matches the brief's
 * recommended mobile priority: KPIs → today's orders → needs attention →
 * revenue → overview → services → payments → add-ons). `lg:order-*` then
 * rearranges the same elements into the desktop grid — nothing is
 * duplicated, so there's one layout to maintain, not two.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState('today');
  const [customRange, setCustomRange] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpi, setKpi] = useState(null);

  const range = useMemo(() => getRangeForPreset(preset, customRange || {}), [preset, customRange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getKpiSummary(range)
      .then((data) => !cancelled && setKpi(data))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start.getTime(), range.end.getTime()]);

  function handleRangeChange(newPreset, newCustom) {
    setPreset(newPreset);
    if (newPreset === 'custom') setCustomRange(newCustom);
  }

  function goToOrders(statusFilter) {
    navigate(statusFilter ? `/orders?status=${statusFilter}` : '/orders');
  }

  const today = new Date();

  return (
    <div className="p-4 sm:p-5 lg:p-6 max-w-[1400px] mx-auto">
      {/* Header — stacks on the smallest phones, row from `sm` up */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {today.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton onClick={() => setExportOpen(true)} />
          <DateRangeSelector preset={preset} customRange={customRange} onChange={handleRangeChange} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg p-4 mb-4">
          We couldn't load your dashboard.{' '}
          <button className="underline" onClick={() => setPreset((p) => p)}>
            Try again.
          </button>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : kpi ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. KPI row — swipeable carousel on phones, grid from sm up */}
          <div className="lg:order-1 lg:col-span-3">
            <KPIRow kpi={kpi} preset={preset} onSelect={goToOrders} />
          </div>

          {/* 2. Today's orders — high mobile priority, full width everywhere */}
          <div className="lg:order-8 lg:col-span-3">
            <TodaysOrders orders={kpi.orders} />
          </div>

          {/* 3. Needs attention */}
          <div className="lg:order-4 lg:col-span-1">
            <NeedsAttention orders={kpi.orders} onSelect={goToOrders} />
          </div>

          {/* 4. Revenue chart */}
          <div className="lg:order-2 lg:col-span-2">
            <RevenueChart orders={kpi.orders} />
          </div>

          {/* 5. Orders overview (compact status bars) */}
          <div className="lg:order-3 lg:col-span-1">
            <OrdersOverview orders={kpi.orders} onSelectStatus={goToOrders} />
          </div>

          {/* 6. Popular services */}
          <div className="lg:order-5 lg:col-span-1">
            <PopularServices orders={kpi.orders} />
          </div>

          {/* 7. Payment summary */}
          <div className="lg:order-6 lg:col-span-1">
            <PaymentSummary orders={kpi.orders} onSelectUnpaid={() => goToOrders('unpaid')} />
          </div>

          {/* 8. Add-ons */}
          <div className="lg:order-7 lg:col-span-1">
            <AddonPerformance orders={kpi.orders} />
          </div>
        </div>
      ) : null}

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initialPreset={preset}
        initialCustomRange={customRange}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-3 overflow-x-auto sm:grid sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 w-[42vw] sm:w-auto shrink-0 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-64 bg-gray-100 rounded-lg" />
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}
