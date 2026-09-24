import { FiPackage, FiAlertCircle, FiClock, FiXCircle } from 'react-icons/fi';
import { getNeedsAttention } from '../../lib/dashboardData';

const ICONS = { ready: FiPackage, unpaid: FiAlertCircle, delayed: FiClock, cancelled: FiXCircle };
const STYLES = {
  positive: { icon: 'text-green-600 bg-green-50', },
  urgent: { icon: 'text-red-600 bg-red-50' },
  warning: { icon: 'text-orange-600 bg-orange-50' },
  neutral: { icon: 'text-gray-500 bg-gray-100' },
};

export default function NeedsAttention({ orders, onSelect }) {
  const items = getNeedsAttention(orders);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Needs Attention</h3>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing needs your attention right now.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = ICONS[item.key];
            const style = STYLES[item.severity];
            return (
              <button
                key={item.key}
                onClick={() => onSelect?.(item.key)}
                className="w-full flex items-center gap-3 text-left px-2.5 py-2 rounded-md hover:bg-gray-50"
              >
                <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.icon}`}>
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
