import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ChevronRight, Banknote } from 'lucide-react'
import ConfirmModal from '../ui/ConfirmModal'

dayjs.extend(relativeTime)

/*
 * Same three-stage sequence as the drawer and the row, shown as
 * a compact dot rail instead of a colored status pill.
 */
const STAGES = ['pending', 'done', 'released']

const STAGE_LABEL = {
  pending: 'Pending',
  done: 'Done',
  released: 'Released',
}

const NEXT_ACTION = {
  pending: { next: 'done', label: 'Mark as done' },
  done: { next: 'released', label: 'Release order' },
  released: null,
}

function formatServices(items) {
  if (!items || items.length === 0) return '—'

  return items
    .map(item =>
      item.quantity > 1
        ? `${item.service_name} ×${item.quantity}`
        : item.service_name
    )
    .join(' · ')
}

function orderCode(order) {
  if (order.order_number) return order.order_number
  if (order.id) return order.id.toString().slice(-4).toUpperCase()
  return null
}

function StageRail({ status }) {
  const stageIndex = STAGES.indexOf(status)

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => (
          <span
            key={stage}
            className={`
              w-1.5 h-1.5 rounded-full
              ${i <= stageIndex ? 'bg-teal-600' : 'bg-stone-200'}
            `}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-stone-500">
        {STAGE_LABEL[status]}
      </span>
    </div>
  )
}

export default function OrderCard({
  order,
  onUpdateStatus,
  onMarkPaid,
  onClick,
  onEdit,
  onDelete,
  isActive,
}) {
  const [updating, setUpdating] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const advance = NEXT_ACTION[order.status]
  const isPaid = !!order.payment_status
  const releaseBlocked = advance?.next === 'released' && !isPaid
  const code = orderCode(order)

  const runAdvance = async () => {
    setConfirm(null)
    if (!advance || updating || releaseBlocked) return

    setUpdating(true)
    try {
      await onUpdateStatus(order.id, advance.next)
    } finally {
      setUpdating(false)
    }
  }

  const runPay = async () => {
    setConfirm(null)
    if (updating) return

    setUpdating(true)
    try {
      await onMarkPaid(order.id)
    } finally {
      setUpdating(false)
    }
  }

  const askAdvance = e => {
    e.stopPropagation()
    if (!advance || releaseBlocked) return

    setConfirm({
      message:
        advance.next === 'released'
          ? 'Release this order to the customer?'
          : 'Mark this order as done?',
      action: runAdvance,
    })
  }

  const askPay = e => {
    e.stopPropagation()

    setConfirm({
      message: 'Mark this order as paid?',
      action: runPay,
    })
  }

  return (
    <>
      <div
        onClick={onClick}
        className={`
          bg-white
          rounded-2xl
          border
          overflow-hidden
          cursor-pointer
          transition-colors

          ${isActive ? 'border-teal-300 bg-teal-50/30' : 'border-stone-200 active:bg-stone-50'}
        `}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[15px] font-semibold text-stone-900 truncate leading-tight">
                {order.customer_name}
              </p>
              <ChevronRight size={15} className="shrink-0 text-stone-300" />
            </div>

            <p className="text-xs text-stone-400 mt-1">
              {code ? `#${code} · ` : ''}
              {dayjs(order.created_at).fromNow()}
            </p>
          </div>

          <p className="text-[17px] font-semibold text-stone-900 shrink-0 tabular-nums">
            ₱{Number(order.total).toFixed(2)}
          </p>
        </div>

        {/* SERVICES */}
        <p className="px-4 mt-2 text-[13px] text-stone-500 truncate">
          {formatServices(order.order_items)}
        </p>

        {/* STAGE + PAYMENT */}
        <div className="flex items-center justify-between px-4 mt-3">
          <StageRail status={order.status} />

          <span
            className={`
              text-xs font-medium px-2 py-0.5 rounded-full
              ${isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}
            `}
          >
            {isPaid ? 'Paid' : 'Unpaid'}
          </span>
        </div>

        {/* QUICK ACTIONS */}
        <div className="px-3 mt-3 pb-3" onClick={e => e.stopPropagation()}>
          {order.status === 'released' ? (
            <p className="text-center text-xs text-stone-400 py-2">Completed</p>
          ) : (
            <>
              <div className="flex gap-2">
                {!isPaid && (
                  <button
                    type="button"
                    onClick={askPay}
                    disabled={updating}
                    className="
                      flex-1 h-11 rounded-xl
                      text-sm font-semibold
                      bg-rose-50 text-rose-600
                      flex items-center justify-center gap-1.5
                      active:scale-[0.98]
                      disabled:opacity-50
                      transition-transform
                    "
                  >
                    <Banknote size={15} />
                    {updating ? '…' : 'Mark as paid'}
                  </button>
                )}

                {advance && (
                  <button
                    type="button"
                    onClick={askAdvance}
                    disabled={updating || releaseBlocked}
                    title={releaseBlocked ? 'Payment required before release' : undefined}
                    className={`
                      flex-1 h-11 rounded-xl
                      text-sm font-semibold
                      transition-transform
                      active:scale-[0.98]
                      disabled:opacity-50

                      ${
                        releaseBlocked
                          ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                          : 'bg-teal-600 text-white hover:bg-teal-700'
                      }
                    `}
                  >
                    {updating ? '…' : advance.label}
                  </button>
                )}
              </div>

              {releaseBlocked && (
                <p className="text-center text-[11px] text-stone-400 mt-1.5">
                  Payment required before release
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          isOpen={true}
          message={confirm.message}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}