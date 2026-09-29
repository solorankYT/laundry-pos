const STATUS = {
  pending: {
    label: 'Pending',
    color: 'bg-orange-400',
    text: 'text-orange-600',
  },
  ready: {
    label: 'Ready',
    color: 'bg-green-500',
    text: 'text-green-600',
  },
  released: {
    label: 'Released',
    color: 'bg-gray-400',
    text: 'text-gray-500',
  },
};

export default function OrderStatusSummary({
  pendingCount,
  readyCount,
  releasedCount,
  onSelect,
}) {
  const statuses = [
    {
      key: 'pending',
      count: pendingCount,
    },
    {
      key: 'ready',
      count: readyCount,
    },
    {
      key: 'released',
      count: releasedCount,
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-3 gap-3">

        {statuses.map(({ key, count }) => {
          const status = STATUS[key];

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect?.(key)}
              className="
                bg-white
                border border-gray-200
                rounded-xl
                p-4
                text-left
                transition-colors
                hover:border-gray-300
                active:bg-gray-50
              "
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${status.color}`}
                />

                <span className="text-sm text-gray-500">
                  {status.label}
                </span>
              </div>

              <p
                className={`mt-2 text-2xl font-semibold tabular-nums ${status.text}`}
              >
                {count}
              </p>

              <p className="mt-0.5 text-xs text-gray-400">
                orders
              </p>
            </button>
          );
        })}

      </div>
    </section>
  );
}