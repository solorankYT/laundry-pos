import { useState } from 'react'
import { Banknote, CircleCheck } from 'lucide-react'
import ConfirmModal from '../ui/ConfirmModal'

export const STAGES = ['pending', 'done', 'released']

export const STAGE_LABEL = {
  pending: 'Pending',
  done: 'Done',
  released: 'Released',
}

export const NEXT_ACTION = {
  pending: { next: 'done', label: 'Mark as done' },
  done: { next: 'released', label: 'Release order' },
  released: null,
}

export const ORDER_ROW_GRID =
  'grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(148px,0.9fr)_112px_minmax(220px,auto)]'

export function peso(n) {
  return `₱${Number(n).toFixed(2)}`
}

export function orderCode(order) {
  if (order.order_number) return order.order_number
  if (order.id) return order.id.toString().slice(-4).toUpperCase()
  return null
}

export function formatServices(items) {
  if (!items || items.length === 0) return '—'

  return items
    .map(item =>
      item.quantity > 1
        ? `${item.service_name} ×${item.quantity}`
        : item.service_name
    )
    .join(' · ')
}

export function isOrderPaid(order) {
  return !!order.payment_status
}

export function PaymentStatus({ paid, emphasis = false }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        rounded-md px-1.5 py-0.5
        font-semibold uppercase tracking-wide
        ${emphasis ? 'text-sm' : 'text-[11px]'}
        ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}
      `}
    >
      {paid ? <CircleCheck size={emphasis ? 14 : 12} /> : <Banknote size={emphasis ? 14 : 12} />}
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  )
}

export function OrderStatus({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-800',
    done: 'bg-sky-50 text-sky-800',
    released: 'bg-emerald-50 text-emerald-800',
  }

  return (
    <span
      className={`
        inline-flex items-center
        rounded-md px-1.5 py-0.5
        text-[11px] font-semibold
        ${styles[status] ?? 'bg-stone-100 text-stone-600'}
      `}
    >
      {STAGE_LABEL[status] ?? status}
    </span>
  )
}

export function MoneyLine({ total, paid, size = 'md' }) {
  if (size === 'sm') {
    return (
      <div className="min-w-0">
        <p className="text-base font-semibold text-stone-900 tabular-nums leading-tight">
          {peso(total)}
        </p>
        <div className="mt-1">
          <PaymentStatus paid={paid} />
        </div>
      </div>
    )
  }

  const amountClass =
    size === 'lg'
      ? 'text-[28px] leading-none font-semibold'
      : 'text-xl leading-tight font-semibold'

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
      <span className={`${amountClass} text-stone-900 tabular-nums`}>
        {peso(total)}
      </span>
      <PaymentStatus paid={paid} emphasis />
    </div>
  )
}

export function StageProgress({ status }) {
  const stageIndex = STAGES.indexOf(status)

  return (
    <p className="text-xs text-stone-500">
      {STAGES.map((stage, i) => {
        const current = i === stageIndex
        const passed = i < stageIndex

        return (
          <span key={stage}>
            <span
              className={
                current
                  ? 'font-semibold text-stone-900'
                  : passed
                    ? 'text-stone-500'
                    : 'text-stone-300'
              }
            >
              {STAGE_LABEL[stage]}
            </span>
            {i < STAGES.length - 1 && (
              <span className="mx-1 text-stone-300">→</span>
            )}
          </span>
        )
      })}
    </p>
  )
}

export function OrderConfirm({ confirm, onCancel }) {
  if (!confirm) return null

  return (
    <ConfirmModal
      isOpen={true}
      message={confirm.message}
      onConfirm={confirm.action}
      onCancel={onCancel}
    />
  )
}

export function useOrderQuickActions({ order, onUpdateStatus, onMarkPaid }) {
  const [updating, setUpdating] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const isPaid = isOrderPaid(order)
  const advance = NEXT_ACTION[order.status]
  const releaseBlocked = advance?.next === 'released' && !isPaid

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
    e?.stopPropagation?.()
    if (!advance || updating || releaseBlocked) return

    setConfirm({
      message:
        advance.next === 'released'
          ? 'Release this order to the customer?'
          : 'Mark this order as done?',
      action: runAdvance,
    })
  }

  const askPay = e => {
    e?.stopPropagation?.()
    if (updating) return

    setConfirm({
      message: 'Mark this order as paid?',
      action: runPay,
    })
  }

  return {
    updating,
    setUpdating,
    confirm,
    setConfirm,
    isPaid,
    advance,
    releaseBlocked,
    askAdvance,
    askPay,
  }
}

export function activateOnEnter(handler) {
  return e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handler(e)
    }
  }
}
