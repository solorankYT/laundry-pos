import { Banknote, CircleCheck } from 'lucide-react'
import ConfirmModal from '../ui/ConfirmModal'
import { STAGES, STAGE_LABEL, peso } from './orderData'

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
    cancelled: 'bg-stone-100 text-stone-600',
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
  if (status === 'cancelled') return <OrderStatus status={status} />

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
