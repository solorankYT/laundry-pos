import { useState } from 'react'

const STATUS_FLOW = ['pending', 'done', 'released']

export default function OrderCard({ order, onUpdateStatus }) {
  const [updating, setUpdating] = useState(false)

  const currentIndex = STATUS_FLOW.indexOf(order.status)
  const nextStatus = STATUS_FLOW[currentIndex + 1] ?? null
  const prevStatus = STATUS_FLOW[currentIndex - 1] ?? null

  const handleUpdate = async (newStatus) => {
    setUpdating(true)
    await onUpdateStatus(order.id, newStatus)
    setUpdating(false)
  }

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">

      {/* Top row — customer + time */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{order.customer_name}</p>
          {order.customer_contact && (
            <p className="text-xs text-gray-500">{order.customer_contact}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
          <p className="text-xs text-gray-400">{formatTime(order.created_at)}</p>
        </div>
      </div>

      {/* Services list */}
      {order.order_items?.length > 0 && (
        <div className="space-y-1">
          {order.order_items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.service_name}
                {item.quantity > 1 && (
                  <span className="text-gray-400 ml-1">x{item.quantity}</span>
                )}
              </span>
              <span className="text-gray-700">
                ₱{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Divider + total */}
      <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
        <span className="text-sm text-gray-500">Total</span>
        <span className="font-semibold text-gray-900">₱{Number(order.total).toFixed(2)}</span>
      </div>

      {/* Notes */}
      {order.notes && (
        <p className="text-xs text-gray-400 italic">{order.notes}</p>
      )}

      {/* Status action buttons */}
      {order.status !== 'released' && (
        <div className="flex gap-2 pt-1">
          {prevStatus && (
            <button
              onClick={() => handleUpdate(prevStatus)}
              disabled={updating}
              className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              ← {prevStatus}
            </button>
          )}
          {nextStatus && (
            <button
              onClick={() => handleUpdate(nextStatus)}
              disabled={updating}
              className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 capitalize"
            >
              {nextStatus} →
            </button>
          )}
        </div>
      )}

      {order.status === 'released' && (
        <p className="text-center text-xs text-gray-400 py-1">Order completed</p>
      )}
    </div>
  )
}