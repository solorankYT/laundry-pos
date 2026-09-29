import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DateRangeSelector from '../components/dashboard/DateRangeSelector';
import SalesCard from '../components/dashboard/SalesCard';
import OrderStatusSummary from '../components/dashboard/OrderStatusSummary';
import TodaysOrders from '../components/dashboard/TodaysOrders';

import { getRangeForPreset } from '../lib/dateRanges';
import { getKpiSummary } from '../lib/dashboardData';

export default function Dashboard() {
  const navigate = useNavigate();

  const [preset, setPreset] = useState('today');
  const [customRange, setCustomRange] = useState(null);

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
        if (!cancelled) {
          setKpi(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime()]);

  function handleRangeChange(newPreset, newCustom) {
    setPreset(newPreset);

    if (newPreset === 'custom') {
      setCustomRange(newCustom);
    }
  }

  function goToOrders(status) {
    navigate(status ? `/orders?status=${status}` : '/orders');
  }

  const today = new Date();

  return (
    <div className="p-4 sm:p-5 lg:p-6 max-w-[1400px] mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Dashboard
          </p>

          <p className="text-sm text-gray-400 mt-0.5">
            {today.toLocaleDateString('en-PH', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <DateRangeSelector
          preset={preset}
          customRange={customRange}
          onChange={handleRangeChange}
        />
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg p-4 mb-4">
          We couldn't load your dashboard.

          <button
            className="ml-1 underline"
            onClick={() => {
              setError(null);
              setLoading(true);

              getKpiSummary(range)
                .then((data) => setKpi(data))
                .catch((err) => setError(err))
                .finally(() => setLoading(false));
            }}
          >
            Try again.
          </button>
        </div>
      )}

      {/* DASHBOARD */}
      {loading ? (
        <DashboardSkeleton />
      ) : kpi ? (
        <div className="space-y-5">

          {/* SALES */}
          <SalesCard
            revenue={kpi.revenue}
            trendPct={kpi.trend?.revenue}
            preset={preset}
          />

          {/* ORDER STATUS */}
          <OrderStatusSummary
            pendingCount={kpi.pendingCount}
            readyCount={kpi.readyCount}
            releasedCount={kpi.releasedCount}
            onSelect={goToOrders}
          />

          {/* TODAY'S ORDERS */}
          <TodaysOrders
            orders={kpi.orders}
            onViewAll={() => goToOrders()}
          />

        </div>
      ) : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">

      {/* Sales */}
      <div className="h-44 bg-gray-100 rounded-xl" />

      {/* Status */}
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>

      {/* Orders */}
      <div>
        <div className="h-5 w-40 bg-gray-100 rounded mb-3" />

        <div className="h-20 bg-gray-100 rounded-xl mb-2" />
        <div className="h-20 bg-gray-100 rounded-xl mb-2" />
        <div className="h-20 bg-gray-100 rounded-xl" />
      </div>

    </div>
  );
}