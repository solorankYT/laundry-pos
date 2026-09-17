
import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
} from 'lucide-react'
import ConfirmModal from '../ui/ConfirmModal'

dayjs.extend(relativeTime)

const STATUS_META = {
  pending: {
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
    label: 'Pending',
  },
  done: {
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
    label: 'Done',
  },
  released: {
    badge: 'bg-neutral-100 text-neutral-500 border-neutral-200',
    label: 'Released',
  },
}

const NEXT_ACTION = {
  pending: {
    next: 'done',
    label: 'Mark Done',
    icon: Check,
  },
  done: {
    next: 'released',
    label: 'Release',
    icon: ChevronRight,
  },
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

  if (order.id) {
    return order.id.toString().slice(-4).toUpperCase()
  }

  return null
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

  const status =
    STATUS_META[order.status] ?? STATUS_META.pending

  const advance = NEXT_ACTION[order.status]

  const isPaid = !!order.payment_status

  const releaseBlocked =
    advance?.next === 'released' && !isPaid

  const servicesSummary = formatServices(order.order_items)
  const code = orderCode(order)

  const runAdvance = async () => {
    setConfirm(null)

    if (
      !advance ||
      updating ||
      releaseBlocked
    ) {
      return
    }

    setUpdating(true)

    try {
      await onUpdateStatus(
        order.id,
        advance.next
      )
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
          grid-cols-[1fr_1.6fr_90px_80px_90px_220px]
          px-4
          py-3.5
          text-sm
          border-t
          items-center
          cursor-pointer
          transition-colors

          ${
            isActive
              ? 'bg-blue-50/60 border-l-4 border-l-blue-500'
              : 'hover:bg-neutral-50'
          }
        `}
      >
        {/* CUSTOMER */}
        <div className="min-w-0 pr-3">
          <p className="
            font-semibold
            text-neutral-900
            truncate
          ">
            {order.customer_name}
          </p>

          <p className="
            text-xs
            text-neutral-400
            mt-0.5
          ">
            {code ? `#${code} · ` : ''}
            {dayjs(order.created_at).fromNow()}
          </p>
        </div>

        {/* SERVICES */}
        <div
          className="
            text-neutral-500
            text-xs
            truncate
            pr-4
          "
          title={servicesSummary}
        >
          {servicesSummary}
        </div>

        {/* TOTAL */}
        <div className="
          font-semibold
          text-neutral-900
          tabular-nums
        ">
          ₱{Number(order.total).toFixed(2)}
        </div>

        {/* PAYMENT */}
        <div>
          <span
            className={`
              inline-flex
              items-center
              gap-1
              px-2
              py-1
              rounded-full
              text-xs
              font-semibold

              ${
                isPaid
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }
            `}
          >
            {isPaid ? (
              <CheckCircle2 size={12} />
            ) : (
              <CreditCard size={12} />
            )}

            {isPaid ? 'Paid' : 'Unpaid'}
          </span>
        </div>

        {/* STATUS */}
        <div>
          <span
            className={`
              inline-flex
              px-2
              py-1
              rounded-full
              border
              text-xs
              font-semibold
              ${status.badge}
            `}
          >
            {status.label}
          </span>
        </div>

        {/* ACTIONS */}
        <div
          className="
            flex
            items-center
            justify-end
            gap-1.5
          "
          onClick={e => e.stopPropagation()}
        >
          {order.status === 'released' ? (

            <span className="
              text-xs
              text-neutral-400
              pr-2
            ">
              Completed
            </span>

          ) : (

            <>
              {/* PAY */}
              {!isPaid && (
                <ActionBtn
                  label={
                    updating
                      ? '…'
                      : 'Pay'
                  }
                  icon={CreditCard}
                  disabled={updating}
                  className="
                    bg-green-600
                    text-white
                    hover:bg-green-700
                  "
                  onClick={askPay}
                />
              )}

              {/* NEXT WORKFLOW ACTION */}
              {advance && (
                <ActionBtn
                  label={
                    updating
                      ? '…'
                      : advance.label
                  }
                  icon={advance.icon}
                  disabled={
                    updating ||
                    releaseBlocked
                  }
                  title={
                    releaseBlocked
                      ? 'Payment required before release'
                      : undefined
                  }
                  className={
                    releaseBlocked
                      ? `
                        bg-neutral-100
                        text-neutral-400
                        cursor-not-allowed
                      `
                      : `
                        bg-blue-600
                        text-white
                        hover:bg-blue-700
                      `
                  }
                  onClick={askAdvance}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* CONFIRM MODAL */}
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

function ActionBtn({
  label,
  icon: Icon,
  onClick,
  disabled,
  className,
  title,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        inline-flex
        items-center
        justify-center
        gap-1.5
        h-9
        px-3
        rounded-lg
        text-xs
        font-semibold
        whitespace-nowrap
        transition

        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-500

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
