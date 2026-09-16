import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import ConfirmModal from '../ui/ConfirmModal'

dayjs.extend(relativeTime)

const STATUS_META = {
  pending:  { dot: 'bg-amber-500',    text: 'text-amber-700',   label: 'Pending' },
  done:     { dot: 'bg-blue-500',     text: 'text-blue-700',    label: 'Done' },
  released: { dot: 'bg-neutral-400',  text: 'text-neutral-500', label: 'Released' },
}

const NEXT_ACTION = {
  pending:  { next: 'done',     label: 'Mark as Done' },
  done:     { next: 'released', label: 'Release Order' },
  released: null,
}

function formatServices(items) {
  if (!items || items.length === 0) return '—'
  return items
    .map(i => (i.quantity > 1 ? `${i.service_name} ×${i.quantity}` : i.service_name))
    .join(' · ')
}

function orderCode(order) {
  if (order.order_number) return order.order_number
  if (order.id) return order.id.toString().slice(-4).toUpperCase()
  return null
}

export default function OrderCard({ order, onUpdateStatus, onMarkPaid, onClick }) {
  const [updating, setUpdating] = useState(false)
  const [confirm, setConfirm] = useState(null) // { message, action }

  const status = STATUS_META[order.status] ?? STATUS_META.pending
  const advance = NEXT_ACTION[order.status]
  const isPaid = !!order.payment_status
  const releaseBlocked = advance?.next === 'released' && !isPaid
  const code = orderCode(order)

  const runAdvance = async () => {
    setConfirm(null)
    if (!advance || updating || releaseBlocked) return
    setUpdating(true)
    await onUpdateStatus(order.id, advance.next)
    setUpdating(false)
  }

  const runPay = async () => {
    setConfirm(null)
    if (updating) return
    setUpdating(true)
    await onMarkPaid(order.id)
    setUpdating(false)
  }

  const askAdvance = (e) => {
    e.stopPropagation()
    setConfirm({
      message: advance?.next === 'released' ? 'Release this order to the customer?' : 'Mark this order as done?',
      action: runAdvance,
    })
  }

  const askPay = (e) => {
    e.stopPropagation()
    setConfirm({ message: 'Mark this order as paid?', action: runPay })
  }

  return (
    <>
      <div
        onClick={onClick}
        className="bg-white rounded-xl border border-neutral-200 active:bg-neutral-50 transition-colors cursor-pointer overflow-hidden"
      >
        {/* Customer + total — strongest hierarchy */}
        <div className="flex items-start justify-between gap-3 px-4 pt-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-neutral-900 truncate leading-tight">
              {order.customer_name}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {code ? `#${code} · ` : ''}{dayjs(order.created_at).fromNow()}
            </p>
          </div>
          <p className="text-[17px] font-bold text-neutral-900 shrink-0 tabular-nums">
            ₱{Number(order.total).toFixed(2)}
          </p>
        </div>

        {/* Services */}
        <p className="px-4 mt-1.5 text-[13px] text-neutral-500 truncate">
          {formatServices(order.order_items)}
        </p>

        {/* Order status vs payment status — visually distinct */}
        <div className="flex items-center justify-between px-4 mt-2.5">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${status.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPaid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {isPaid ? 'Paid' : 'Unpaid'}
          </span>
        </div>

        {/* Actions */}
        <div className="px-3 mt-3 pb-3" onClick={e => e.stopPropagation()}>
          {order.status === 'released' ? (
            <p className="text-center text-xs text-neutral-400 py-2">Completed</p>
          ) : (
            <>
              <div className="flex gap-2">
                {!isPaid && (
                  <button
                    onClick={askPay}
                    disabled={updating}
                    className="flex-1 h-11 rounded-lg text-sm font-semibold bg-green-600 text-white active:scale-[0.98] disabled:opacity-50 transition-transform"
                  >
                    {updating ? '…' : 'Mark as Paid'}
                  </button>
                )}
                {advance && (
                  <button
                    onClick={askAdvance}
                    disabled={updating || releaseBlocked}
                    title={releaseBlocked ? 'Payment required before release' : undefined}
                    className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-transform active:scale-[0.98] ${
                      releaseBlocked
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white disabled:opacity-50'
                    }`}
                  >
                    {updating ? '…' : advance.label}
                  </button>
                )}
              </div>
              {releaseBlocked && (
                <p className="text-center text-[11px] text-neutral-400 mt-1.5">
                  Payment required before release
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          isOpen={!!confirm}
          message={confirm.message}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}