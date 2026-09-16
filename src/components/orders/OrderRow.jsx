
import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Edit3,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'

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
    .map(i =>
      i.quantity > 1
        ? `${i.service_name} ×${i.quantity}`
        : i.service_name
    )
    .join(', ')
}

function orderCode(order) {
  if (order.order_number) return order.order_number
  if (order.id) return order.id.toString().slice(-4).toUpperCase()
  return null
}

export default function OrderRow({
  order,
  onClick,
  onUpdateStatus,
  onMarkPaid,
  onEdit,
  onDelete,
  isActive,
}) {
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const status = STATUS_META[order.status] ?? STATUS_META.pending
  const advance = NEXT_ACTION[order.status]

  const isPaid = !!order.payment_status
  const releaseBlocked =
    advance?.next === 'released' && !isPaid

  const servicesSummary = formatServices(order.order_items)
  const code = orderCode(order)

  const handleAdvance = async e => {
    e.stopPropagation()

    if (!advance || updating || releaseBlocked) return

    setUpdating(true)

    try {
      await onUpdateStatus(order.id, advance.next)
    } finally {
      setUpdating(false)
    }
  }

  const handlePay = async e => {
    e.stopPropagation()

    if (updating) return

    setUpdating(true)

    try {
      await onMarkPaid(order.id)
    } finally {
      setUpdating(false)
    }
  }

  const handleEdit = e => {
    e.stopPropagation()

    if (updating || deleting) return

    onEdit?.(order)
  }

  const handleDelete = async e => {
    e.stopPropagation()

    if (updating || deleting) return

    const confirmed = window.confirm(
      `Delete order #${code ?? ''} for ${order.customer_name}?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    setDeleting(true)

    try {
      await onDelete?.(order.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      onClick={onClick}
      className={`
        group
        grid grid-cols-[1fr_1.6fr_90px_80px_90px_220px]
        px-4 py-3.5 text-sm border-t items-center
        cursor-pointer transition-colors
        ${isActive
          ? 'bg-blue-50/60 border-l-4 border-l-blue-500'
          : 'hover:bg-neutral-50'
        }
      `}
    >
      {/* Customer */}
      <div className="min-w-0 pr-3">
        <p className="font-semibold text-neutral-900 truncate">
          {order.customer_name}
        </p>

        <p className="text-xs text-neutral-400 mt-0.5">
          {code ? `#${code} · ` : ''}
          {dayjs(order.created_at).fromNow()}
        </p>
      </div>

      {/* Services */}
      <div
        className="text-neutral-500 text-xs truncate pr-4"
        title={servicesSummary}
      >
        {servicesSummary}
      </div>

      {/* Total */}
      <div className="font-semibold text-neutral-900 tabular-nums">
        ₱{Number(order.total).toFixed(2)}
      </div>

      {/* Payment */}
      <div>
        <span
          className={`
            inline-flex items-center gap-1
            px-2 py-1 rounded-full text-xs font-semibold
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

      {/* Status */}
      <div>
        <span
          className={`
            inline-flex
            px-2 py-1 rounded-full border
            text-xs font-semibold
            ${status.badge}
          `}
        >
          {status.label}
        </span>
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-end gap-1.5"
        onClick={e => e.stopPropagation()}
      >
        {order.status === 'released' ? (
          <>
            <span className="text-xs text-neutral-400 mr-1">
              Completed
            </span>

            {/* Edit still available, but secondary */}
            <IconBtn
              label="Edit order"
              icon={Edit3}
              onClick={handleEdit}
              disabled={updating || deleting}
            />

            <IconBtn
              label="Delete order"
              icon={Trash2}
              onClick={handleDelete}
              disabled={updating || deleting}
              destructive
            />
          </>
        ) : (
          <>
            {/* Pay */}
            {!isPaid && (
              <ActionBtn
                label={updating ? '…' : 'Pay'}
                icon={CreditCard}
                disabled={updating || deleting}
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={handlePay}
              />
            )}

            {/* Main workflow action */}
            {advance && (
              <ActionBtn
                label={updating ? '…' : advance.label}
                icon={advance.icon}
                disabled={
                  updating ||
                  deleting ||
                  releaseBlocked
                }
                title={
                  releaseBlocked
                    ? 'Payment required before release'
                    : undefined
                }
                className={
                  releaseBlocked
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }
                onClick={handleAdvance}
              />
            )}

            {/* Secondary actions */}
            <div className="relative flex items-center">
              <IconBtn
                label="More actions"
                icon={MoreHorizontal}
                disabled={updating || deleting}
                onClick={e => {
                  e.stopPropagation()

                  const menu =
                    e.currentTarget.nextElementSibling

                  if (menu) {
                    menu.classList.toggle('hidden')
                  }
                }}
              />

              <div
                className="
                  hidden absolute right-0 top-10 z-20
                  w-40 bg-white border border-neutral-200
                  rounded-xl shadow-lg p-1
                "
                onClick={e => e.stopPropagation()}
              >
                <MenuBtn
                  icon={Edit3}
                  label="Edit order"
                  onClick={handleEdit}
                />

                <MenuBtn
                  icon={Trash2}
                  label="Delete order"
                  destructive
                  onClick={handleDelete}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
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
        inline-flex items-center justify-center gap-1.5
        h-9 px-3 rounded-lg
        text-xs font-semibold
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

function IconBtn({
  label,
  icon: Icon,
  onClick,
  disabled,
  destructive = false,
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`
        w-9 h-9
        rounded-lg
        flex items-center justify-center
        border
        transition
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-500
        disabled:opacity-50
        disabled:cursor-not-allowed
        active:scale-[0.95]
        ${
          destructive
            ? 'border-transparent text-neutral-400 hover:bg-red-50 hover:text-red-600'
            : 'border-transparent text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
        }
      `}
    >
      <Icon size={16} />
    </button>
  )
}

function MenuBtn({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full
        h-10
        px-3
        rounded-lg
        flex items-center gap-2
        text-xs font-medium
        text-left
        ${
          destructive
            ? 'text-red-600 hover:bg-red-50'
            : 'text-neutral-700 hover:bg-neutral-100'
        }
      `}
    >
      <Icon size={15} />
      {label}
    </button>
  )
}

