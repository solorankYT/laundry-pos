import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default function OrderDrawer({
  order,
  onClose,
  onUpdateStatus,
  onMarkPaid
}) {
  if (!order) return null

  const isPaid = order.payment_status

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">

      {/* PANEL */}
      <div className="w-full md:w-[400px] h-full bg-white shadow-xl flex flex-col">

        {/* HEADER */}
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="font-semibold">{order.customer_name}</h2>
            <p className="text-xs text-gray-400">
              {dayjs(order.created_at).fromNow()}
            </p>
          </div>

          <button onClick={onClose} className="text-xl">✕</button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* PAYMENT + STATUS */}
          <div className="flex justify-between items-center">
            <span className={`text-xs px-2 py-1 rounded-full
              ${isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
            `}>
              {isPaid ? 'Paid' : 'Unpaid'}
            </span>

            <span className="text-xs px-2 py-1 bg-gray-100 rounded capitalize">
              {order.status}
            </span>
          </div>

          {/* SERVICES */}
          <div>
            <h3 className="text-sm font-medium mb-2">Services</h3>

            <div className="space-y-2">
              {order.order_items?.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.service_name} x{item.quantity}
                  </span>
                  <span>
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TOTAL */}
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span>₱{Number(order.total).toFixed(2)}</span>
          </div>

          {/* NOTES */}
          {order.notes && (
            <div>
              <h3 className="text-sm font-medium mb-1">Notes</h3>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}

        </div>

        {/* ACTIONS */}
        <div className="p-4 border-t space-y-2">

          {!isPaid && (
            <button
              onClick={() => onMarkPaid(order.id)}
              className="w-full py-2 bg-green-600 text-white rounded-lg"
            >
              Mark as Paid
            </button>
          )}

          {order.status === 'pending' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'done')}
              className="w-full py-2 bg-blue-600 text-white rounded-lg"
            >
              Mark as Done
            </button>
          )}

          {order.status === 'done' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'released')}
              className="w-full py-2 bg-gray-800 text-white rounded-lg"
            >
              Release Order
            </button>
          )}

        </div>
      </div>
    </div>
  )
}