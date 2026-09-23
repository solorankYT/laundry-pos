import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { X, Pencil, Trash2, Banknote } from 'lucide-react'
import {
  MoneyLine,
  OrderConfirm,
  StageProgress,
  peso,
  orderCode,
  useOrderQuickActions,
} from './orderUi'

export default function OrderDrawer({
  order,
  onClose,
  onUpdateStatus,
  onMarkPaid,
  onEdit,
  onDelete,
}) {
  const [visible, setVisible] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const {
    updating,
    setUpdating,
    confirm,
    setConfirm,
    isPaid,
    advance,
    releaseBlocked,
    askAdvance,
    askPay,
  } = useOrderQuickActions({ order, onUpdateStatus, onMarkPaid })

  useEffect(() => {
    if (order) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [order])

  if (!order) return null

  const code = orderCode(order)

  const items = [
    ...(order.order_items ?? []).map(item => ({
      id: `item-${item.id}`,
      name: item.service_name,
      qty: item.quantity,
      unit: Number(item.price),
      subtotal: Number(item.price) * Number(item.quantity),
    })),
    ...(order.order_addons ?? []).map(addon => ({
      id: `addon-${addon.id}`,
      name: addon.addons?.name ?? 'Add-on',
      qty: addon.quantity,
      unit: Number(addon.unit_price),
      subtotal: Number(addon.total),
    })),
  ]

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  const handleEdit = () => {
    if (updating) return
    onEdit?.(order)
  }

  const handleDelete = () => {
    if (updating) return

    setDeleteConfirm({
      message:
        'Delete this order permanently? This will also remove its services and add-ons.',
      action: async () => {
        setDeleteConfirm(null)
        setUpdating(true)
        try {
          await onDelete?.(order.id)
        } finally {
          setUpdating(false)
        }
      },
    })
  }

  const snapshotTone = isPaid
    ? 'border-emerald-200 bg-emerald-50/60'
    : 'border-rose-200 bg-rose-50/70'

  return (
    <>
      <div
        onClick={handleClose}
        className={`
          fixed inset-0 z-40
          bg-stone-900/35
          transition-opacity duration-200
          ${visible ? 'opacity-100' : 'opacity-0'}
        `}
      />

      <div
        role="dialog"
        aria-label={`Order for ${order.customer_name}`}
        className={`
          fixed z-50
          bg-white
          border-l border-stone-200
          flex flex-col

          inset-x-0
          bottom-0
          rounded-t-2xl

          md:inset-y-0
          md:right-0
          md:left-auto
          md:w-[420px]
          md:rounded-none

          transition-transform
          duration-200
          ease-out

          ${
            visible
              ? 'translate-y-0 md:translate-x-0'
              : 'translate-y-full md:translate-x-full'
          }
        `}
        style={{ maxHeight: '92vh' }}
      >
        <div className="flex justify-center pt-2.5 pb-1 md:hidden">
          <div className="w-9 h-1 bg-stone-200 rounded-full" />
        </div>

        <div className="px-5 pt-3 pb-4 md:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-stone-900 text-lg truncate leading-tight">
                {order.customer_name}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {code ? `Order #${code}` : 'Order'}
                <span className="mx-1.5 text-stone-300">·</span>
                {dayjs(order.created_at).format('MMM D, h:mm A')}
              </p>
              {order.created_by_email && (
                <p className="text-xs text-stone-400 mt-0.5 truncate">
                  Logged by {order.created_by_email}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close order"
              className="
                w-11 h-11 flex items-center justify-center
                rounded-xl text-stone-600
                bg-stone-100
                hover:bg-stone-200
                active:bg-stone-200
              "
            >
              <X size={18} />
            </button>
          </div>

          <div className={`mt-4 rounded-xl border px-4 py-3 ${snapshotTone}`}>
            <MoneyLine total={order.total} paid={isPaid} size="lg" />
            <div className="mt-2.5">
              <StageProgress status={order.status} />
            </div>
          </div>
        </div>

        <div className="h-px bg-stone-100" />

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-stone-500 mb-2">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>

            <div className="rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
              {items.length > 0 ? (
                items.map(item => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center px-3.5 py-3"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="text-sm text-stone-800 truncate">{item.name}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        ×{item.qty} @ {peso(item.unit)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-stone-900 shrink-0 tabular-nums">
                      {peso(item.subtotal)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500 px-3.5 py-3">
                  No items on this order
                </p>
              )}
            </div>
          </div>

          {order.notes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Note</p>
              <p className="text-sm text-amber-950 leading-snug">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 border-t border-stone-100 bg-white space-y-2">
          {order.status !== 'released' && (
            <>
              {!isPaid && (
                <button
                  type="button"
                  onClick={askPay}
                  disabled={updating}
                  className="
                    w-full min-h-12 rounded-xl
                    font-semibold text-sm
                    flex items-center justify-center gap-2
                    bg-rose-50 text-rose-700
                    hover:bg-rose-100
                    disabled:opacity-50
                  "
                >
                  <Banknote size={17} />
                  {updating ? 'Saving…' : 'Mark as paid'}
                </button>
              )}

              {advance && (
                <button
                  type="button"
                  onClick={askAdvance}
                  disabled={updating || releaseBlocked}
                  className={`
                    w-full min-h-12 rounded-xl
                    font-semibold text-sm
                    flex items-center justify-center
                    disabled:opacity-50

                    ${
                      releaseBlocked
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                    }
                  `}
                >
                  {updating ? 'Saving…' : advance.label}
                </button>
              )}

              {releaseBlocked && (
                <p className="text-center text-xs text-stone-500">
                  Mark as paid before releasing
                </p>
              )}
            </>
          )}

          {order.status === 'released' && (
            <p className="text-center text-sm font-medium text-stone-500 py-2">
              This order has been released
            </p>
          )}

          {(onEdit || onDelete) && (
            <div className="flex gap-2 pt-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={handleEdit}
                  disabled={updating}
                  className="
                    flex-1 min-h-11 rounded-xl
                    text-sm font-semibold
                    text-stone-700 bg-stone-100
                    hover:bg-stone-200
                    disabled:opacity-40
                    flex items-center justify-center gap-1.5
                  "
                >
                  <Pencil size={15} />
                  Edit order
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={updating}
                  className="
                    flex-1 min-h-11 rounded-xl
                    text-sm font-semibold
                    text-rose-700 bg-rose-50
                    hover:bg-rose-100
                    disabled:opacity-40
                    flex items-center justify-center gap-1.5
                  "
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <OrderConfirm confirm={confirm} onCancel={() => setConfirm(null)} />
      <OrderConfirm confirm={deleteConfirm} onCancel={() => setDeleteConfirm(null)} />
    </>
  )
}
