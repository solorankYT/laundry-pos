import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiPackage, FiRefreshCw } from 'react-icons/fi';

import DateRangeSelector from '../components/dashboard/DateRangeSelector';
import ExportButton from '../components/dashboard/ExportButton';
import ExportDialog from '../components/dashboard/ExportDialog';
import PaymentSummary from '../components/dashboard/PaymentSummary';
import TodaysOrders from '../components/dashboard/TodaysOrders';

import { formatRangeLabel, getRangeForPreset } from '../lib/dateRanges';
import { fetchReportData, fetchReadyOrderCount, getPaymentStats } from '../lib/dashboardData';

export default function Dashboard() {
  const [preset, setPreset] = useState('today');
  const [customRange, setCustomRange] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());

  function refresh() {
    setRefreshedAt(new Date());
  }
  // Re-resolve the Manila calendar day when the owner refreshes after midnight.
  const range = useMemo(
    () => getRangeForPreset(preset, customRange ?? {}, refreshedAt),
    [preset, customRange, refreshedAt],
  );

  function handleRangeChange(nextPreset, nextCustom) {
    setPreset(nextPreset);
    if (nextPreset === 'custom') setCustomRange(nextCustom);
    refresh();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatRangeLabel(range.start, range.end)} · Philippine time
          </p>
        </div>
        <DateRangeSelector preset={preset} customRange={customRange} onChange={handleRangeChange} />
      </div>
      <DashboardResults
        key={`${range.start.getTime()}-${range.end.getTime()}-${refreshedAt.getTime()}`}
        range={range}
        preset={preset}
        customRange={customRange}
        onRefresh={refresh}
      />
    </div>
  );
}

function DashboardResults({ range, preset, customRange, onRefresh }) {
  const [result, setResult] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetchReportData(range)
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

  const { orders, payments } = result.data;
  const collections = getPaymentStats(orders, payments);

  return (
    <div className="space-y-5">
      <div className="grid items-stretch gap-4 lg:grid-cols-[2fr_1fr]">
        <PaymentSummary stats={collections} />
        <ReadyForPickup />
      </div>
      <TodaysOrders orders={orders} title="Recent orders" limit={3} />
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={onRefresh}
        >
          <FiRefreshCw aria-hidden="true" size={14} />
          Refresh dashboard
        </button>
        <ExportButton onClick={() => setExportOpen(true)} />
      </div>
      {exportOpen && (
        <ExportDialog
          open
          onClose={() => setExportOpen(false)}
          initialPreset={preset}
          initialCustomRange={customRange}
          snapshot={{ range, data: result.data }}
        />
      )}
    </div>
  );
}

function ReadyForPickup() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchReadyOrderCount(controller.signal)
      .then((count) => { if (!controller.signal.aborted) setResult({ count }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ count: null }); });
    return () => controller.abort();
  }, []);

  return (
    <section className="flex flex-col justify-between gap-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div>
        <FiPackage aria-hidden="true" className="mb-3 text-teal-700" size={22} />
        <h2 className="text-sm font-semibold text-stone-700">Ready for pickup</h2>
        <div className="mt-1" aria-live="polite">
          {result === null ? <p className="text-sm text-stone-600">Checking ready orders…</p>
            : result.count === null ? <p className="text-sm text-stone-600">Ready count unavailable.</p>
              : <>
                <p className="text-4xl font-semibold tabular-nums text-stone-900">{result.count}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {result.count === 1 ? 'Order waiting' : 'Orders waiting'} across all dates
                </p>
              </>}
        </div>
      </div>
      <Link to="/orders?status=done" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-teal-700 hover:underline">
        View ready orders <FiArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-5 animate-pulse">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="h-56 rounded-2xl bg-stone-200" />
        <div className="h-44 rounded-2xl bg-stone-200 lg:h-full" />
      </div>
      <div className="h-40 rounded-2xl bg-stone-200" />
    </div>
  );
}
