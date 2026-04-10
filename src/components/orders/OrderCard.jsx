import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const STATUS_META = {
  pending: { border: 'border-l-yellow-400', label: 'Pending', next: 'done', nextLabel: 'Mark Done' },
  done:    { border: 'border-l-blue-500',   label: 'Done',    next: 'released', nextLabel: 'Release' },
  released:{ border: 'border-l-gray-300',   label: 'Released', next: null, nextLabel: null },
}

export default function OrderCard({ order, onUpdateStatus, onMarkPaid, onClick }) {
  const [updating, setUpdating] = useState(false)

  const meta = STATUS_META[order.status] ?? STATUS_META.pending
  const isPaid = order.payment_status

  const servicesSummary = order.order_items
    ?.map(i => i.quantity > 1 ? `${i.service_name} ×${i.quantity}` : i.service_name)
    .join(' · ') || '—'

  const handleAdvance = async (e) => {
    e.stopPropagation()
    if (!meta.next || updating) return
    setUpdating(true)
    await onUpdateStatus(order.id, meta.next)
    setUpdating(false)
  }

  const handlePay = async (e) => {
    e.stopPropagation()
    if (updating) return
    setUpdating(true)
    await onMarkPaid(order.id)
    setUpdating(false)
  }

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-l-4 ${meta.border}
        shadow-sm active:shadow-md cursor-pointer transition-shadow
        flex flex-col gap-0 overflow-hidden
      `}
    >
      {/* TOP ROW — customer + payment badge */}
      <div className="flex justify-between items-start px-4 pt-3 pb-1">
        <div className="flex-1 min-w-0 mr-3">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {order.customer_name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {dayjs(order.created_at).fromNow()}
          </p>
        </div>

        <span className={`
          shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full
          ${isPaid
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'}
        `}>
          {isPaid ? 'Paid' : 'Unpaid'}
        </span>
      </div>

      {/* MIDDLE ROW — services summary + total */}
      <div className="flex justify-between items-center px-4 py-1.5">
        <p className="text-xs text-gray-500 truncate flex-1 mr-3">
          {servicesSummary}
        </p>
        <p className="text-sm font-bold text-gray-900 shrink-0">
          ₱{Number(order.total).toFixed(2)}
        </p>
      </div>

      {/* BOTTOM ROW — actions */}
      {order.status !== 'released' && (
        <div
          className="flex gap-2 px-3 pb-3 pt-1"
          onClick={e => e.stopPropagation()}
        >
          {/* Pay button — only when unpaid */}
          {!isPaid && (
            <button
              onClick={handlePay}
              disabled={updating}
              className="
                flex-1 h-11 rounded-lg text-xs font-semibold
                bg-green-600 text-white
                active:scale-95 disabled:opacity-50 transition-transform
              "
            >
              {updating ? '…' : 'Mark Paid'}
            </button>
          )}

          {/* Advance status — primary CTA */}
          {meta.next && (
            <button
              onClick={handleAdvance}
              disabled={updating}
              className="
                flex-1 h-11 rounded-lg text-xs font-semibold
                bg-blue-600 text-white
                active:scale-95 disabled:opacity-50 transition-transform
              "
            >
              {updating ? '…' : meta.nextLabel}
            </button>
          )}
        </div>
      )}

      {order.status === 'released' && (
        <p className="text-center text-xs text-gray-400 pb-3 pt-1">
          ✓ Completed
        </p>
      )}
    </div>
  )
}