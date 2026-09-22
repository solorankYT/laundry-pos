  import { useEffect, useState } from 'react'
  import dayjs from 'dayjs'
  import relativeTime from 'dayjs/plugin/relativeTime'
  import {
    X,
    Pencil,
    Trash2,
    Check,
    Banknote,
    ArrowRight,
  } from 'lucide-react'
  import ConfirmModal from '../ui/ConfirmModal'

  dayjs.extend(relativeTime)

  /*
  * Order lifecycle is a real sequence, so it's shown as a
  * three-step progress rail rather than a status pill.
  */
  const STAGES = ['pending', 'done', 'released']

  const STAGE_LABEL = {
    pending: 'Pending',
    done: 'Done',
    released: 'Released',
  }

  const NEXT_STAGE = {
    pending: { next: 'done', cta: 'Mark as done' },
    done: { next: 'released', cta: 'Release to customer' },
    released: null,
  }

  function orderCode(order) {
    if (order.order_number) return order.order_number
    if (order.id) return order.id.toString().slice(-4).toUpperCase()
    return null
  }

  function peso(n) {
    return `₱${Number(n).toFixed(2)}`
  }

  export default function OrderDrawer({
    order,
    onClose,
    onUpdateStatus,
    onMarkPaid,
    onEdit,
    onDelete,
  }) {
    const [updating, setUpdating] = useState(false)
    const [visible, setVisible] = useState(false)
    const [confirm, setConfirm] = useState(null)
    const [editingOrder, setEditingOrder] = useState(null)
    const [showForm, setShowForm] = useState(false)
    // { message, action }

    useEffect(() => {
      if (order) {
        requestAnimationFrame(() => setVisible(true))
      } else {
        setVisible(false)
      }
    }, [order])

    if (!order) return null

    const isPaid = !!order.payment_status
    const advance = NEXT_STAGE[order.status]
    const releaseBlocked = advance?.next === 'released' && !isPaid
    const stageIndex = STAGES.indexOf(order.status)
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

    /* ---------------- status / payment ---------------- */

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

    const askAdvance = () => {
      if (!advance || updating || releaseBlocked) return

      setConfirm({
        message:
          advance.next === 'released'
            ? 'Release this order to the customer?'
            : 'Mark this order as done?',
        action: runAdvance,
      })
    }

    const askPay = () => {
      if (updating) return

      setConfirm({
        message: 'Mark this order as paid?',
        action: runPay,
      })
    }

    /* ---------------- edit / delete ---------------- */

    const handleEdit = () => {
      if (updating) return
      onEdit?.(order)
    }

    const handleDelete = () => {
      if (updating) return

      setConfirm({
        message:
          'Delete this order permanently? This will also remove its services and add-ons.',
        action: async () => {
          setConfirm(null)
          setUpdating(true)
          try {
            await onDelete?.(order.id)
          } finally {
            setUpdating(false)
          }
        },
      })
    }

    return (
      <>
        {/* BACKDROP */}
        <div
          onClick={handleClose}
          className={`
            fixed inset-0 z-40
            bg-stone-900/35
            transition-opacity duration-200
            ${visible ? 'opacity-100' : 'opacity-0'}
          `}
        />

        {/* DRAWER */}
        <div
          className={`
            fixed z-50
            bg-white
            shadow-xl
            flex flex-col

            inset-x-0
            bottom-0
            rounded-t-3xl

            md:inset-y-0
            md:right-0
            md:left-auto
            md:w-[420px]
            md:rounded-none

            transition-transform
            duration-220
            ease-out

            ${
              visible
                ? 'translate-y-0 md:translate-x-0'
                : 'translate-y-full md:translate-x-full'
            }
          `}
          style={{ maxHeight: '92vh' }}
        >
          {/* MOBILE DRAG HANDLE */}
          <div className="flex justify-center pt-2.5 pb-1 md:hidden">
            <div className="w-9 h-1 bg-stone-200 rounded-full" />
          </div>

          {/* HEADER */}
          <div className="px-5 pt-3 pb-4 md:pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-stone-900 text-lg truncate leading-tight">
                  {order.customer_name}
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  {code ? `Order #${code}` : 'Order'}
                  <span className="mx-1.5">·</span>
                  {dayjs(order.created_at).format('MMM D, h:mm A')}
                </p>
                {order.created_by_email && (
                  <p className="text-[11px] text-stone-350 text-stone-400/80 mt-0.5 truncate">
                    Logged by {order.created_by_email}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {onEdit && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    disabled={updating}
                    aria-label="Edit order"
                    className="
                      w-9 h-9 flex items-center justify-center
                      rounded-full text-stone-400
                      hover:bg-stone-100 hover:text-stone-600
                      active:bg-stone-100
                      disabled:opacity-40
                      transition
                    "
                  >
                    <Pencil size={16} />
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={updating}
                    aria-label="Delete order"
                    className="
                      w-9 h-9 flex items-center justify-center
                      rounded-full text-stone-400
                      hover:bg-rose-50 hover:text-rose-600
                      active:bg-rose-50
                      disabled:opacity-40
                      transition
                    "
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close order"
                  className="
                    w-9 h-9 flex items-center justify-center
                    rounded-full text-stone-500
                    bg-stone-100
                    hover:bg-stone-200
                    active:bg-stone-200
                    transition
                  "
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* STAGE RAIL */}
            <div className="flex items-center mt-5">
              {STAGES.map((stage, i) => {
                const reached = i <= stageIndex
                const isLast = i === STAGES.length - 1

                return (
                  <div key={stage} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`
                          w-2.5 h-2.5 rounded-full transition-colors
                          ${reached ? 'bg-teal-600' : 'bg-stone-200'}
                        `}
                      />
                      <span
                        className={`
                          text-[11px] font-medium whitespace-nowrap
                          ${reached ? 'text-stone-700' : 'text-stone-350 text-stone-400'}
                        `}
                      >
                        {STAGE_LABEL[stage]}
                      </span>
                    </div>

                    {!isLast && (
                      <div
                        className={`
                          h-px flex-1 mx-2 -mt-4
                          ${i < stageIndex ? 'bg-teal-600' : 'bg-stone-200'}
                        `}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-stone-100" />

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* PAYMENT */}
            <button
              type="button"
              onClick={isPaid ? undefined : askPay}
              disabled={isPaid || updating}
              className={`
                w-full flex items-center justify-between
                rounded-2xl px-4 py-3.5
                text-left transition

                ${
                  isPaid
                    ? 'bg-emerald-50 cursor-default'
                    : 'bg-rose-50 hover:bg-rose-100 active:bg-rose-100'
                }
              `}
            >
              <div className="flex items-center gap-2.5">
                <Banknote
                  size={18}
                  className={isPaid ? 'text-emerald-600' : 'text-rose-500'}
                />
                <span
                  className={`text-sm font-medium ${
                    isPaid ? 'text-emerald-800' : 'text-rose-700'
                  }`}
                >
                  {isPaid ? 'Paid' : 'Unpaid'}
                </span>
              </div>

              {!isPaid && (
                <span className="text-xs font-semibold text-rose-600">
                  {updating ? 'Updating…' : 'Tap to mark paid'}
                </span>
              )}
            </button>

            {/* ITEMS */}
            <div>
              <p className="text-xs font-medium text-stone-400 mb-2">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </p>

              <div className="rounded-2xl border border-stone-100 divide-y divide-stone-100 overflow-hidden">
                {items.length > 0 ? (
                  items.map(item => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center px-4 py-3"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="text-sm text-stone-800 truncate">{item.name}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          ×{item.qty} @ {peso(item.unit)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-stone-900 shrink-0 tabular-nums">
                        {peso(item.subtotal)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-400 px-4 py-3">No items added</p>
                )}
              </div>
            </div>

            {/* NOTES */}
            {order.notes && (
              <div className="bg-amber-50 rounded-2xl px-4 py-3">
                <p className="text-xs font-medium text-amber-700 mb-1">Note</p>
                <p className="text-sm text-amber-900 leading-snug">{order.notes}</p>
              </div>
            )}

            {/* TOTAL */}
            <div className="flex justify-between items-center px-1 pt-1">
              <span className="text-sm font-medium text-stone-500">Total</span>
              <span className="text-2xl font-semibold text-stone-900 tabular-nums">
                {peso(order.total)}
              </span>
            </div>
          </div>

          {/* PRIMARY ACTION */}
          <div className="px-5 pb-6 pt-3 border-t border-stone-100 bg-white">
            {order.status === 'released' ? (
              <p className="text-center text-sm text-stone-400 py-3">
                Order completed
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={askAdvance}
                  disabled={updating || releaseBlocked}
                  className={`
                    w-full h-12 rounded-2xl
                    font-semibold text-sm
                    flex items-center justify-center gap-2
                    active:scale-[0.98] transition-transform
                    disabled:opacity-50

                    ${
                      releaseBlocked
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                    }
                  `}
                >
                  {advance?.next === 'released' ? (
                    <ArrowRight size={17} />
                  ) : (
                    <Check size={17} />
                  )}
                  {updating ? 'Updating…' : advance?.cta}
                </button>

                {releaseBlocked && (
                  <p className="text-center text-xs text-stone-400 mt-2">
                    Mark this order as paid before releasing it.
                  </p>
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