import { PAYMENT_METHOD_LABELS } from '../../lib/dashboardData';
import { formatPeso } from '../../lib/dateRanges';

export default function PaymentSummary({ stats }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">Payment summary</h2>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.byMethod.map(({ method, amount }) => (
          <div key={method}>
            <dt className="text-xs text-gray-600">{PAYMENT_METHOD_LABELS[method]} collected</dt>
            <dd className="text-lg font-semibold text-gray-900">{formatPeso(amount)}</dd>
          </div>
        ))}
        <div>
          <dt className="text-xs text-gray-600">Outstanding</dt>
          <dd className="text-lg font-semibold text-amber-700">{formatPeso(stats.unpaidAmount)}</dd>
          <dd className="text-xs text-gray-600">
            {stats.unpaidCount} unpaid {stats.unpaidCount === 1 ? 'order' : 'orders'} opened in this period
          </dd>
        </div>
      </dl>
    </section>
  );
}
