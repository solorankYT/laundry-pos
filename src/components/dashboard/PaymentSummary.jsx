import { getPaymentStats } from '../../lib/dashboardData';
import { formatPeso } from '../../lib/dateRanges';

const METHOD_LABEL = { cash: 'Cash', gcash: 'GCash', other: 'Other' };

export default function PaymentSummary({ orders, onSelectUnpaid }) {
  const stats = getPaymentStats(orders);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Payment Summary</h3>

      <div className="flex gap-6 mb-4">
        <div>
          <p className="text-xs text-gray-400">Paid</p>
          <p className="text-lg font-semibold text-green-600">{formatPeso(stats.paidAmount)}</p>
        </div>
        <button className="text-left" onClick={onSelectUnpaid}>
          <p className="text-xs text-gray-400">Unpaid</p>
          <p className="text-lg font-semibold text-red-500">{formatPeso(stats.unpaidAmount)}</p>
        </button>
      </div>

      {stats.byMethod.length > 0 && (
        <div className="space-y-1.5 pt-3 border-t border-gray-100">
          {stats.byMethod.map((m) => (
            <div key={m.method} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{METHOD_LABEL[m.method] || m.method}</span>
              <span className="font-medium text-gray-800">{formatPeso(m.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
