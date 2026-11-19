import { PAYMENT_METHOD_LABELS } from '../../lib/dashboardData';
import { formatPeso } from '../../lib/dateRanges';

export default function PaymentSummary({ stats, adjustments }) {
  const methods = stats.byMethod.filter(({ method, amount }) => method !== 'other' || amount !== 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="bg-teal-950 p-5 text-white sm:p-6">
        <h2 className="text-sm font-medium text-teal-100">Money collected</h2>
        <p className="mt-2 break-words text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">
          {formatPeso(stats.paidAmount)}
        </p>
        <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-3 border-t border-teal-700 pt-4">
          {methods.map(({ method, amount }) => (
            <div key={method}>
              <dt className="text-xs text-teal-100">{PAYMENT_METHOD_LABELS[method]}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">{formatPeso(amount)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <dl className="p-5 sm:px-6 sm:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4">
          <dt className="text-sm font-semibold text-stone-800">Still unpaid</dt>
          <dd className="text-right text-xl font-semibold tabular-nums text-amber-800">{formatPeso(stats.unpaidAmount)}</dd>
          <dd className="col-span-2 mt-0.5 text-xs text-stone-600">
            {stats.unpaidCount} unpaid {stats.unpaidCount === 1 ? 'order' : 'orders'} opened in this period
          </dd>
        </div>
      </dl>
      <div className="border-t border-stone-200 p-5 sm:px-6 sm:py-4">
        <h3 className="text-sm font-semibold text-stone-800">Order adjustments</h3>
        <p className="mt-0.5 text-xs text-stone-600">Current adjustments on orders opened in this period.</p>
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="text-xs text-stone-600">Discounts ({adjustments.discountedCount})</dt>
            <dd className="text-base font-semibold tabular-nums text-stone-900">{formatPeso(adjustments.discountAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-600">Complimentary ({adjustments.complimentaryCount})</dt>
            <dd className="text-base font-semibold tabular-nums text-stone-900">{formatPeso(adjustments.complimentaryAmount)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
