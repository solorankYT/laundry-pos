import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoaderCircle, TriangleAlert } from 'lucide-react';

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
 * Renders inside <AppLayout> (sidebar on tablet+, bottom nav on phones), so
 * this file is only the page content.
 *
 * Layout strategy: the DOM order below is the MOBILE priority order
 * (KPIs → today's orders → needs attention → revenue → overview → services
 * → payments → add-ons). `md:` turns it into a 2-column grid for tablets and
 * `lg:` re-orders the same elements into a 3-column desktop grid, so there
 * is one set of elements to maintain, not one per breakpoint.
 *
 *   phone            tablet (md)          desktop (lg)
 *   ┌────────┐       ┌──────────────┐     ┌───────────────────────┐
 *   │  KPIs  │       │     KPIs     │     │         KPIs          │
 *   │ Today  │       │    Today     │     ├───────────────┬───────┤
 *   │ Needs  │       │    Needs     │     │    Revenue    │ Needs │
 *   │Revenue │       │   Revenue    │     ├───────┬───────┼───────┤
 *   │  ...   │       ├──────┬───────┤     │Overvw │Payment│Servcs │
 *   └────────┘       │ ...  │  ...  │     ├───────┴───────┼───────┤
 *                    └──────┴───────┘     │    Today      │Add-ons│
 *                                         └───────────────┴───────┘
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState('today');
  const [customRange, setCustomRange] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpi, setKpi] = useState(null);

  const range = useMemo(
    () => getRangeForPreset(preset, customRange || {}),
    [preset, customRange]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getKpiSummary(range)
      .then((data) => {
        if (!cancelled) setKpi(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        // Don't keep showing numbers that belong to a different range.
        setKpi(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start.getTime(), range.end.getTime(), reloadKey]);

  function handleRangeChange(newPreset, newCustom) {
    setPreset(newPreset);
    if (newPreset === 'custom') setCustomRange(newCustom);
  }

  function goToOrders(statusFilter) {
    navigate(statusFilter ? `/orders?status=${statusFilter}` : '/orders');
  }

  // First load shows the skeleton. Later range changes keep the current
  // content on screen (dimmed) so the page doesn't flash empty every time.
  const initialLoading = loading && !kpi;
  const refreshing = loading && !!kpi;

  return (
    <div className="min-h-full bg-stone-50">
      {/* HEADER — stays pinned while scrolling, frosted so content slides under it */}
      <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-stone-50/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-5 lg:px-6 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-stone-900 leading-tight">
                Dashboard
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-400">
                {describeRange(preset, range)}
                {refreshing && (
                  <LoaderCircle
                    size={12}
                    className="animate-spin text-teal-600"
                    aria-label="Updating"
                  />
                )}
              </p>
            </div>

            <div className="shrink-0">
              <ExportButton onClick={() => setExportOpen(true)} />
            </div>

            {/* Full width row on phones, inline from `sm` up */}
            <div className="w-full min-w-0 sm:w-auto">
              <DateRangeSelector
                preset={preset}
                customRange={customRange}
                onChange={handleRangeChange}
              />
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div
        className="mx-auto max-w-[1400px] px-4 sm:px-5 lg:px-6 py-4 sm:py-5"
        aria-busy={loading}
      >
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">We couldn't load your dashboard.</p>
              <p className="mt-0.5 text-rose-600/80">
                Check your connection and try again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="h-9 shrink-0 rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 active:scale-[0.98]"
            >
              Try again
            </button>
          </div>
        )}

        {initialLoading ? (
          <DashboardSkeleton />
        ) : kpi ? (
          <div
            className={`
              grid grid-cols-1 gap-4
              md:grid-cols-2
              lg:grid-cols-3 lg:gap-5
              transition-opacity duration-200
              ${refreshing ? 'opacity-60 pointer-events-none' : 'opacity-100'}
            `}
          >
            {/* 1. KPIs — carousel on phones, grid from `sm` up (owned by KPIRow) */}
            <section className="md:col-span-2 lg:col-span-3 lg:order-1">
              <KPIRow kpi={kpi} preset={preset} onSelect={goToOrders} />
            </section>

            {/* 2. Today's orders */}
            <section className="md:col-span-2 lg:col-span-2 lg:order-7">
              <TodaysOrders orders={kpi.orders} />
            </section>

            {/* 3. Needs attention */}
            <section className="md:col-span-2 lg:col-span-1 lg:order-3">
              <NeedsAttention orders={kpi.orders} onSelect={goToOrders} />
            </section>

            {/* 4. Revenue */}
            <section className="md:col-span-2 lg:col-span-2 lg:order-2">
              <RevenueChart orders={kpi.orders} />
            </section>

            {/* 5. Orders overview */}
            <section className="lg:order-4">
              <OrdersOverview orders={kpi.orders} onSelectStatus={goToOrders} />
            </section>

            {/* 6. Popular services */}
            <section className="lg:order-6">
              <PopularServices orders={kpi.orders} />
            </section>

            {/* 7. Payment summary */}
            <section className="lg:order-5">
              <PaymentSummary
                orders={kpi.orders}
                onSelectUnpaid={() => goToOrders('unpaid')}
              />
            </section>

            {/* 8. Add-ons */}
            <section className="lg:order-8">
              <AddonPerformance orders={kpi.orders} />
            </section>
          </div>
        ) : null}
      </div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initialPreset={preset}
        initialCustomRange={customRange}
      />
    </div>
  );
}

/** "Monday, September 28" for today, "Sep 1 – Sep 28" for anything else. */
function describeRange(preset, range) {
  if (preset === 'today') {
    return range.start.toLocaleDateString('en-PH', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  const opts = { month: 'short', day: 'numeric' };
  const start = range.start.toLocaleDateString('en-PH', opts);
  const end = range.end.toLocaleDateString('en-PH', opts);
  return start === end ? start : `${start} – ${end}`;
}

/** Mirrors the real grid so nothing jumps when data arrives. */
function DashboardSkeleton() {
  const block = 'rounded-2xl bg-stone-200/60';

  return (
    <div
      className="animate-pulse grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5"
      aria-hidden="true"
    >
      {/* KPI strip */}
      <div className="md:col-span-2 lg:col-span-3 flex gap-3 overflow-hidden sm:grid sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${block} h-24 w-[42vw] shrink-0 sm:w-auto`} />
        ))}
      </div>

      <div className={`${block} h-56 md:col-span-2`} />
      <div className={`${block} h-56 md:col-span-2 lg:col-span-1`} />
      <div className={`${block} h-64 md:col-span-2 lg:col-span-2`} />
      <div className={`${block} h-44`} />
      <div className={`${block} h-44`} />
      <div className={`${block} h-44`} />
      <div className={`${block} h-44`} />
    </div>
  );
}