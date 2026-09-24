import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu } from 'react-icons/fi';
import OrdersSidebar from '../components/layout/OrdersSidebar';

import DateRangeSelector from '../components/dashboard/DateRangeSelector';
import ExportButton from '../components/dashboard/ExportButton';
import ExportDialog from '../components/dashboard/ExportDialog';
import KPICard from '../components/dashboard/KPICard';
import RevenueChart from '../components/dashboard/RevenueChart';
import OrdersOverview from '../components/dashboard/OrdersOverview';
import NeedsAttention from '../components/dashboard/NeedsAttention';
import PopularServices from '../components/dashboard/PopularServices';
import PaymentSummary from '../components/dashboard/PaymentSummary';
import AddonPerformance from '../components/dashboard/AddonPerformance';
import TodaysOrders from '../components/dashboard/TodaysOrders';

import { getRangeForPreset, formatRangeLabel, formatPeso } from '../lib/dateRanges';
import { getKpiSummary } from '../lib/dashboardData';

export default function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <OrdersSidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 flex flex-col ml-0 p-4 md:p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 md:hidden mb-2">
              <button className="p-2 rounded bg-gray-900 text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <FiMenu size={18} />
              </button>
            </div>
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
          <>
            {/* Level 1 — KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
              <KPICard
                label={preset === 'today' ? "Today's Sales" : 'Sales'}
                value={formatPeso(kpi.revenue)}
                trendPct={kpi.trend.revenue}
              />
              <KPICard
                label="Orders"
                value={String(kpi.totalOrders)}
                sublines={[`${kpi.releasedCount} completed`, `${kpi.pendingCount + kpi.readyCount} active`]}
              />
              <KPICard
                label="Pending Orders"
                value={String(kpi.pendingCount)}
                sublines={[`${kpi.pendingWashing} washing`, `${kpi.pendingProcessing} drying/folding`]}
                onClick={() => goToOrders('pending')}
              />
              <KPICard
                label="Ready for Release"
                value={`${kpi.readyCount} Orders`}
                sublines={['Customers can pick these up']}
                highlight="positive"
                onClick={() => goToOrders('ready')}
              />
              <KPICard
                label="Unpaid Orders"
                value={formatPeso(kpi.unpaidAmount)}
                sublines={[`${kpi.unpaidCount} unpaid orders`]}
                highlight="urgent"
                onClick={() => goToOrders('unpaid')}
              />
            </div>

            {/* Level 2 — Revenue + Orders overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="lg:col-span-2">
                <RevenueChart orders={kpi.orders} />
              </div>
              <OrdersOverview orders={kpi.orders} onSelectStatus={goToOrders} />
            </div>

            {/* Needs Attention + Popular Services */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <NeedsAttention orders={kpi.orders} onSelect={goToOrders} />
              <PopularServices orders={kpi.orders} />
            </div>

            {/* Today's orders */}
            <div className="mb-4">
              <TodaysOrders orders={kpi.orders} />
            </div>

            {/* Level 3 — supporting */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <PaymentSummary orders={kpi.orders} onSelectUnpaid={() => goToOrders('unpaid')} />
              <AddonPerformance orders={kpi.orders} />
            </div>
          </>
        ) : null}
      </main>

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-64 bg-gray-100 rounded-lg" />
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}
