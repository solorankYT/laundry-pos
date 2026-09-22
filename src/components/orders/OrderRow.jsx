import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Check, ArrowRight, Banknote, CircleCheck } from 'lucide-react'
import ConfirmModal from '../ui/ConfirmModal'

dayjs.extend(relativeTime)

/*
 * Same three-stage sequence as the drawer, shown as a compact
 * dot rail instead of a colored status pill.
 */
const STAGES = ['pending', 'done', 'released']

const STAGE_LABEL = {
  pending: 'Pending',
  done: 'Done',
  released: 'Released',
}

const NEXT_ACTION = {
  pending: { next: 'done', label: 'Mark done', icon: Check },
  done: { next: 'released', label: 'Release', icon: ArrowRight },
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
    .join(', ')
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

export default function OrderRow({
  order,
  onClick,
  onUpdateStatus,
  onMarkPaid,
  isActive,
}) {
  const [updating, setUpdating] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const advance = NEXT_ACTION[order.status]
  const isPaid = !!order.payment_status
  const releaseBlocked = advance?.next === 'released' && !isPaid

  const servicesSummary = formatServices(order.order_items)
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
    if (updating) return

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
          group
          grid
          grid-cols-[1fr_1.6fr_90px_130px_150px_190px]
          px-4
          py-3.5
          text-sm
          border-t border-stone-100
          items-center
          cursor-pointer
          transition-colors

          ${isActive ? 'bg-teal-50/50 border-l-2 border-l-teal-600' : 'hover:bg-stone-50'}
        `}
      >
        {/* CUSTOMER */}
        <div className="min-w-0 pr-3">
          <p className="font-medium text-stone-900 truncate">
            {order.customer_name}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            {code ? `#${code} · ` : ''}
            {dayjs(order.created_at).fromNow()}
          </p>
        </div>

        {/* SERVICES */}
        <div className="text-stone-500 text-xs truncate pr-4" title={servicesSummary}>
          {servicesSummary}
        </div>

        {/* TOTAL */}
        <div className="font-medium text-stone-900 tabular-nums">
          ₱{Number(order.total).toFixed(2)}
        </div>

        {/* PAYMENT */}
        <div>
          <span
            className={`
              inline-flex items-center gap-1
              px-2 py-1 rounded-full
              text-xs font-medium

              ${isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}
            `}
          >
            {isPaid ? <CircleCheck size={12} /> : <Banknote size={12} />}
            {isPaid ? 'Paid' : 'Unpaid'}
          </span>
        </div>

        {/* STAGE */}
        <StageRail status={order.status} />

        {/* ACTIONS */}
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={e => e.stopPropagation()}
        >
          {order.status === 'released' ? (
            <span className="text-xs text-stone-400 pr-2">Completed</span>
          ) : (
            <>
              {!isPaid && (
                <ActionBtn
                  label={updating ? '…' : 'Pay'}
                  icon={Banknote}
                  disabled={updating}
                  className="bg-rose-50 text-rose-600 hover:bg-rose-100"
                  onClick={askPay}
                />
              )}

              {advance && (
                <ActionBtn
                  label={updating ? '…' : advance.label}
                  icon={advance.icon}
                  disabled={updating || releaseBlocked}
                  title={releaseBlocked ? 'Payment required before release' : undefined}
                  className={
                    releaseBlocked
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }
                  onClick={askAdvance}
                />
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

function ActionBtn({ label, icon: Icon, onClick, disabled, className, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        inline-flex items-center justify-center gap-1.5
        h-9 px-3 rounded-lg
        text-xs font-medium
        whitespace-nowrap
        transition

        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-teal-500

        disabled:opacity-50
        disabled:cursor-not-allowed

        active:scale-[0.97]

        ${className}
      `}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}