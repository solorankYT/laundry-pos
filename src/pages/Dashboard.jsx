import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DateRangeSelector from '../components/dashboard/DateRangeSelector';
import ExportButton from '../components/dashboard/ExportButton';
import ExportDialog from '../components/dashboard/ExportDialog';
import OrderStatusSummary from '../components/dashboard/OrderStatusSummary';
import PaymentSummary from '../components/dashboard/PaymentSummary';
import SalesCard from '../components/dashboard/SalesCard';
import TodaysOrders from '../components/dashboard/TodaysOrders';

import { formatRangeLabel, getRangeForPreset } from '../lib/dateRanges';
import { getKpiSummary } from '../lib/dashboardData';

export default function Dashboard() {
  const [preset, setPreset] = useState('today');
  const [customRange, setCustomRange] = useState(null);
  const [refresh, setRefresh] = useState(0);
  // Re-resolve the Manila calendar day when the owner refreshes after midnight.
  const range = getRangeForPreset(preset, customRange ?? {});

  function handleRangeChange(nextPreset, nextCustom) {
    setPreset(nextPreset);
    if (nextPreset === 'custom') setCustomRange(nextCustom);
    setRefresh((current) => current + 1);
  }

  return (
    <div className="p-4 sm:p-5 lg:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatRangeLabel(range.start, range.end)} · Philippine time
          </p>
        </div>
        <DateRangeSelector preset={preset} customRange={customRange} onChange={handleRangeChange} />
      </div>
      <DashboardResults
        key={`${range.start.getTime()}-${range.end.getTime()}-${refresh}`}
        range={range}
        preset={preset}
        customRange={customRange}
        onRefresh={() => setRefresh((current) => current + 1)}
      />
    </div>
  );
}

function DashboardResults({ range, preset, customRange, onRefresh }) {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getKpiSummary(range)
      .then((data) => { if (active) setResult({ data }); })
      .catch(() => { if (active) setResult({ error: true }); });
    return () => { active = false; };
  }, [range]);

  if (!result) return <DashboardSkeleton />;
  if (result.error) {
    return (
      <div role="alert" className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg p-4">
        We couldn't load your dashboard.
        <button type="button" className="ml-2 underline" onClick={onRefresh}>Try again</button>
      </div>
    );
  }

  const kpi = result.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
          onClick={onRefresh}
        >
          Refresh totals
        </button>
        <ExportButton onClick={() => setExportOpen(true)} />
      </div>
      <SalesCard revenue={kpi.revenue} trendPct={kpi.trend.revenue} preset={preset} />
      <PaymentSummary stats={kpi.collections} />
      <OrderStatusSummary
        pendingCount={kpi.pendingCount}
        readyCount={kpi.readyCount}
        releasedCount={kpi.releasedCount}
        onSelect={(status) => navigate(`/orders?status=${status}`)}
      />
      <TodaysOrders orders={kpi.orders} title={preset === 'today' ? "Today's Orders" : 'Orders in this period'} />
      {exportOpen && (
        <ExportDialog
          open
          onClose={() => setExportOpen(false)}
          initialPreset={preset}
          initialCustomRange={customRange}
          snapshot={{ range, data: kpi }}
        />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-5 animate-pulse">
      <div className="h-44 bg-gray-100 rounded-xl" />
      <div className="h-24 bg-gray-100 rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {['pending', 'done', 'released'].map((status) => (
          <div key={status} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
