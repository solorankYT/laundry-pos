import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default function OrderRow({
  order,
  onClick,
  onUpdateStatus,
  onMarkPaid,
  isActive
}) {
  const isPaid = order.payment_status
  const timeAgo = dayjs(order.created_at).fromNow()

  const servicesSummary = order.order_items
    ?.map(i => i.service_name)
    .join(', ')

  return (
    <div
      onClick={onClick}
      className={`grid grid-cols-6 px-4 py-3 text-sm border-t items-center cursor-pointer transition
        ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}
      `}
    >

      {/* CUSTOMER */}
      <div>
        <p className="font-medium text-gray-900">
          {order.customer_name}
        </p>
        <p className="text-xs text-gray-400">{timeAgo}</p>
      </div>

      {/* SERVICES */}
      <div className="text-gray-500 truncate">
        {servicesSummary || '-'}
      </div>

      {/* TOTAL */}
      <div className="font-semibold">
        ₱{Number(order.total).toFixed(2)}
      </div>

      {/* PAYMENT */}
      <div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium
            ${isPaid
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'}
          `}
        >
          {isPaid ? 'Paid' : 'Unpaid'}
        </span>
      </div>

      {/* STATUS */}
      <div>
        <span
          className={`px-2 py-1 rounded text-xs capitalize font-medium
            ${
              order.status === 'pending' && 'bg-yellow-100 text-yellow-700'
            }
            ${
              order.status === 'done' && 'bg-blue-100 text-blue-700'
            }
            ${
              order.status === 'released' && 'bg-gray-200 text-gray-600'
            }
          `}
        >
          {order.status}
        </span>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-1">

        {/* PAY */}
        {!isPaid && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMarkPaid(order.id)
            }}
            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition"
          >
            Pay
          </button>
        )}

        {/* DONE */}
        {order.status === 'pending' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onUpdateStatus(order.id, 'done')
            }}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
          >
            Done
          </button>
        )}

        {/* RELEASE */}
        {order.status === 'done' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onUpdateStatus(order.id, 'released')
            }}
            className="text-xs bg-gray-800 text-white px-2 py-1 rounded hover:bg-black transition"
          >
            Release
          </button>
        )}

      </div>
    </div>
  )
}