import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const STATUS_STYLE = {
  pending:  'bg-yellow-100 text-yellow-800',
  done:     'bg-blue-100 text-blue-800',
  released: 'bg-gray-100 text-gray-500',
}

const STATUS_NEXT = {
  pending:  { label: 'Done',    next: 'done' },
  done:     { label: 'Release', next: 'released' },
  released: null,
}

export default function OrderRow({ order, onClick, onUpdateStatus, onMarkPaid, isActive }) {
  const [updating, setUpdating] = useState(false)

  const isPaid = order.payment_status
  const advance = STATUS_NEXT[order.status]

  const servicesSummary = order.order_items
    ?.map(i => i.quantity > 1 ? `${i.service_name} ×${i.quantity}` : i.service_name)
    .join(', ') || '—'

  const handleAdvance = async (e) => {
    e.stopPropagation()
    if (!advance || updating) return
    setUpdating(true)
    await onUpdateStatus(order.id, advance.next)
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
        grid grid-cols-[1fr_1.6fr_90px_80px_90px_140px]
        px-4 py-3 text-sm border-t items-center cursor-pointer transition
        ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}
      `}
    >
      {/* Customer */}
      <div>
        <p className="font-semibold text-gray-900 truncate">{order.customer_name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{dayjs(order.created_at).fromNow()}</p>
      </div>

      {/* Services — truncated, title attr shows full on hover */}
      <div
        className="text-gray-500 text-xs truncate pr-4"
        title={servicesSummary}
      >
        {servicesSummary}
      </div>

      {/* Total */}
      <div className="font-semibold text-gray-900">
        ₱{Number(order.total).toFixed(2)}
      </div>

      {/* Payment */}
      <div>
        <span className={`
          px-2 py-0.5 rounded-full text-xs font-semibold
          ${isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
        `}>
          {isPaid ? 'Paid' : 'Unpaid'}
        </span>
      </div>

      {/* Status */}
      <div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[order.status] ?? ''}`}>
          {order.status}
        </span>
      </div>

      {/* Actions — max 2 buttons, sized for desktop */}
      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
        {!isPaid && (
          <ActionBtn
            label="Pay"
            disabled={updating}
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={handlePay}
          />
        )}
        {advance && (
          <ActionBtn
            label={updating ? '…' : advance.label}
            disabled={updating}
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleAdvance}
          />
        )}
        {order.status === 'released' && isPaid && (
          <span className="text-xs text-gray-400">Done</span>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ label, onClick, disabled, className }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        h-8 px-3 rounded-lg text-xs font-semibold transition
        disabled:opacity-50 active:scale-95
        ${className}
      `}
    >
      {label}
    </button>
  )
}