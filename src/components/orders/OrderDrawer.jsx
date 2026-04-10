import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  dot: 'bg-yellow-400', next: 'done',     nextLabel: 'Mark as Done' },
  done:     { label: 'Done',     dot: 'bg-blue-500',   next: 'released', nextLabel: 'Release to Customer' },
  released: { label: 'Released', dot: 'bg-gray-400',   next: null,       nextLabel: null },
}

export default function OrderDrawer({ order, onClose, onUpdateStatus, onMarkPaid }) {
  const [updating, setUpdating] = useState(false)
  const [visible, setVisible] = useState(false)

  // Animate in
  useEffect(() => {
    if (order) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [order])

  if (!order) return null

  const meta = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
  const isPaid = order.payment_status

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 260) // wait for slide-out
  }

  const handleAdvance = async () => {
    if (!meta.next || updating) return
    setUpdating(true)
    await onUpdateStatus(order.id, meta.next)
    setUpdating(false)
  }

  const handlePay = async () => {
    if (updating) return
    setUpdating(true)
    await onMarkPaid(order.id)
    setUpdating(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`
          fixed inset-0 z-40 bg-black/40
          transition-opacity duration-250
          ${visible ? 'opacity-100' : 'opacity-0'}
        `}
      />

      {/* Drawer — bottom sheet on mobile, right panel on md+ */}
      <div
        className={`
          fixed z-50 bg-white shadow-2xl flex flex-col

          /* Mobile: bottom sheet */
          inset-x-0 bottom-0 rounded-t-2xl
          md:inset-y-0 md:right-0 md:left-auto md:w-[400px] md:rounded-none

          transition-transform duration-260 ease-out
          ${visible
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-x-full'}
        `}
        style={{ maxHeight: '90vh' }}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* HEADER */}
        <div className="px-5 py-3 flex justify-between items-start border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <span className="text-xs font-medium text-gray-500">{meta.label}</span>
            </div>
            <h2 className="font-semibold text-gray-900 text-base mt-0.5">
              {order.customer_name}
            </h2>
            <p className="text-xs text-gray-400">
              {dayjs(order.created_at).format('MMM D, h:mm A')}
              <span className="mx-1">·</span>
              {dayjs(order.created_at).fromNow()}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 text-sm"
          >
            ✕
          </button>
        </div>

        {/* CONTENT — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Payment status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">Payment</span>
            <span className={`
              text-xs font-semibold px-3 py-1 rounded-full
              ${isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
            `}>
              {isPaid ? '✓ Paid' : '✗ Unpaid'}
            </span>
          </div>

          {/* Order items */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Services
            </p>
            <div className="space-y-2">
              {order.order_items?.map(item => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm text-gray-900">{item.service_name}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-gray-400">×{item.quantity} @ ₱{item.price}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-gray-900">
              ₱{Number(order.total).toFixed(2)}
            </span>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Note</p>
              <p className="text-sm text-yellow-800">{order.notes}</p>
            </div>
          )}
        </div>

        {/* ACTIONS — sticky bottom */}
        <div className="px-5 pb-6 pt-3 border-t border-gray-100 space-y-2">
          {/* Pay — show only if unpaid */}
          {!isPaid && (
            <button
              onClick={handlePay}
              disabled={updating}
              className="
                w-full h-12 rounded-xl font-semibold text-sm
                bg-green-600 text-white
                active:scale-[0.98] disabled:opacity-50 transition-transform
              "
            >
              {updating ? 'Updating…' : 'Mark as Paid'}
            </button>
          )}

          {/* Advance status */}
          {meta.next && (
            <button
              onClick={handleAdvance}
              disabled={updating}
              className="
                w-full h-12 rounded-xl font-semibold text-sm
                bg-blue-600 text-white
                active:scale-[0.98] disabled:opacity-50 transition-transform
              "
            >
              {updating ? 'Updating…' : meta.nextLabel}
            </button>
          )}

          {order.status === 'released' && (
            <div className="text-center text-sm text-gray-400 py-1">
              ✓ Order completed & released
            </div>
          )}
        </div>
      </div>
    </>
  )
}