import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const STATUS_FLOW = ['pending', 'done', 'released']

export default function OrderCard({ order, onUpdateStatus, onMarkPaid, onClick }) {
  const [updating, setUpdating] = useState(false)

  const nextStatus =
    STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] || null
  const prevStatus =
    STATUS_FLOW[STATUS_FLOW.indexOf(order.status) - 1] || null

  const handleUpdate = async (status) => {
    setUpdating(true)
    await onUpdateStatus(order.id, status)
    setUpdating(false)
  }

  const handlePay = async () => {
    setUpdating(true)
    await onMarkPaid(order.id)
    setUpdating(false)
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border shadow-sm p-4 space-y-2 hover:shadow-md cursor-pointer transition relative"
    >
      {/* CUSTOMER + TIME */}
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-gray-900">{order.customer_name}</p>
          <p className="text-xs text-gray-400">{dayjs(order.created_at).fromNow()}</p>
        </div>

        <div className="text-right">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              order.payment_status
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {order.payment_status ? 'Paid' : 'Unpaid'}
          </span>
        </div>
      </div>

      {/* SERVICES */}
      <div className="space-y-1">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm text-gray-700">
            <span>
              {item.service_name}
              {item.quantity > 1 && <span className="text-gray-400 ml-1">x{item.quantity}</span>}
            </span>
            <span>₱{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* TOTAL */}
      <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
        <span className="text-sm text-gray-500">Total</span>
        <span className="font-semibold text-gray-900">₱{Number(order.total).toFixed(2)}</span>
      </div>

      {/* NOTES */}
      {order.notes && <p className="text-xs text-gray-400 italic">{order.notes}</p>}

      {/* ACTIONS */}
      <div className="flex gap-2 pt-2">
        {!order.payment_status && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePay()
            }}
            disabled={updating}
            className="flex-1 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
          >
            Mark Paid
          </button>
        )}

        {prevStatus && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleUpdate(prevStatus)
            }}
            disabled={updating}
            className="flex-1 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            ← {prevStatus}
          </button>
        )}

        {nextStatus && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleUpdate(nextStatus)
            }}
            disabled={updating}
            className="flex-1 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition capitalize"
          >
            {nextStatus} →
          </button>
        )}
      </div>


      {order.status === 'released' && (
        <p className="text-center text-xs text-gray-400 py-1">Order completed</p>
      )}
    </div>
  )
}