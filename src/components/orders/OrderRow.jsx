import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const STATUS_META = {
  pending:  { badge: 'bg-amber-50 text-amber-700',   label: 'Pending' },
  done:     { badge: 'bg-blue-50 text-blue-700',     label: 'Done' },
  released: { badge: 'bg-neutral-100 text-neutral-500', label: 'Released' },
}

const NEXT_ACTION = {
  pending:  { next: 'done',     label: 'Mark Done' },
  done:     { next: 'released', label: 'Release' },
  released: null,
}

function formatServices(items) {
  if (!items || items.length === 0) return '—'
  return items
    .map(i => (i.quantity > 1 ? `${i.service_name} ×${i.quantity}` : i.service_name))
    .join(', ')
}

function orderCode(order) {
  if (order.order_number) return order.order_number
  if (order.id) return order.id.toString().slice(-4).toUpperCase()
  return null
}

export default function OrderRow({ order, onClick, onUpdateStatus, onMarkPaid, isActive }) {
  const [updating, setUpdating] = useState(false)

  const status = STATUS_META[order.status] ?? STATUS_META.pending
  const advance = NEXT_ACTION[order.status]
  const isPaid = !!order.payment_status
  const releaseBlocked = advance?.next === 'released' && !isPaid
  const servicesSummary = formatServices(order.order_items)
  const code = orderCode(order)

  const handleAdvance = async (e) => {
    e.stopPropagation()
    if (!advance || updating || releaseBlocked) return
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
        grid grid-cols-[1fr_1.6fr_90px_80px_90px_150px]
        px-4 py-3.5 text-sm border-t items-center cursor-pointer transition-colors
        ${isActive ? 'bg-blue-50/60 border-l-4 border-l-blue-500' : 'hover:bg-neutral-50'}
      `}
    >
      <div className="min-w-0">
        <p className="font-semibold text-neutral-900 truncate">{order.customer_name}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {code ? `#${code} · ` : ''}{dayjs(order.created_at).fromNow()}
        </p>
      </div>

      <div className="text-neutral-500 text-xs truncate pr-4" title={servicesSummary}>
        {servicesSummary}
      </div>

      <div className="font-semibold text-neutral-900 tabular-nums">
        ₱{Number(order.total).toFixed(2)}
      </div>

      <div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          isPaid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {isPaid ? 'Paid' : 'Unpaid'}
        </span>
      </div>

      <div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status.badge}`}>
          {status.label}
        </span>
      </div>

      <div className="flex gap-1.5 items-center" onClick={e => e.stopPropagation()}>
        {order.status === 'released' ? (
          <span className="text-xs text-neutral-400">Completed</span>
        ) : (
          <>
            {!isPaid && (
              <ActionBtn
                label={updating ? '…' : 'Pay'}
                disabled={updating}
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={handlePay}
              />
            )}
            {advance && (
              <ActionBtn
                label={updating ? '…' : advance.label}
                disabled={updating || releaseBlocked}
                title={releaseBlocked ? 'Payment required before release' : undefined}
                className={releaseBlocked
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'}
                onClick={handleAdvance}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ label, onClick, disabled, className, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        h-8 px-3 rounded-lg text-xs font-semibold transition
        disabled:opacity-100 active:scale-95
        ${className}
      `}
    >
      {label}
    </button>
  )
}