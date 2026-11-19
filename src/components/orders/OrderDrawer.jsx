import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { X, Pencil, Ban, Banknote, Printer } from 'lucide-react'
import {
  MoneyLine,
  OrderConfirm,
  StageProgress,
} from './orderUi'
import { orderCode, useOrderQuickActions, peso, PAYMENT_METHODS, formatPickup, isRejectedOrderWrite, orderActionError } from './orderData'

export default function OrderDrawer({
  order,
  onClose,
  onUpdateStatus,
  onMarkPaid,
  onEdit,
  onVoid,
  startPayment,
  actionError,
}) {
  const [visible, setVisible] = useState(false)
  const [panel, setPanel] = useState(startPayment ? 'payment' : null)
  const [panelError, setPanelError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(null)
  const paymentUnconfirmed = pendingPaymentAmount !== null
  const [voidReason, setVoidReason] = useState('')
  const paymentRequest = useRef(null)
  const requestInFlight = useRef(false)

  const {
    updating,
    setUpdating,
    confirm,
    setConfirm,
    isPaid,
    advance,
    releaseBlocked,
    askAdvance,
  } = useOrderQuickActions({ order, onUpdateStatus })

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const completed = ['released', 'cancelled'].includes(order.status)
  const canChangeOrder = !completed && !isPaid
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
      name: addon.addon_name ?? addon.addons?.name ?? 'Add-on',
      qty: addon.quantity,
      unit: Number(addon.unit_price),
      subtotal: Number(addon.total),
    })),
  ]

  function handleClose() {
    if (requestInFlight.current || updating) return
    if (paymentUnconfirmed && !window.confirm('Payment may already be recorded. Close and check the order before collecting again?')) return
    onClose()
  }

  function showPanel(next) {
    setPanelError('')
    setPanel(next)
  }

  async function submitPayment(event) {
    event.preventDefault()
    if (requestInFlight.current || !paymentMethod) return

    paymentRequest.current ??= { id: crypto.randomUUID(), method: paymentMethod, amount: Number(order.total) }
    requestInFlight.current = true
    setUpdating(true)
    setPanelError('')
    try {
      const { error, status } = await onMarkPaid(order.id, paymentRequest.current)
      if (!error) {
        setPendingPaymentAmount(null)
        showPanel(null)
      } else if (isRejectedOrderWrite(error, status)) {
        paymentRequest.current = null
        setPendingPaymentAmount(null)
        setPanelError(orderActionError(error, 'Payment was rejected. Check the order before trying again.'))
      } else {
        setPendingPaymentAmount(paymentRequest.current.amount)
        setPanelError('Payment could not be confirmed. Retry this payment before collecting again.')
      }
    } finally {
      requestInFlight.current = false
      setUpdating(false)
    }
  }

  async function submitVoid(event) {
    event.preventDefault()
    if (requestInFlight.current || !voidReason.trim()) return

    requestInFlight.current = true
    setUpdating(true)
    setPanelError('')
    try {
      const error = await onVoid(order.id, voidReason.trim())
      if (error) setPanelError(error)
    } finally {
      requestInFlight.current = false
      setUpdating(false)
    }
  }

  function printClaimStub() {
    const popup = window.open('', '_blank', 'popup,width=420,height=580')
    if (!popup) {
      setPanelError('The browser blocked printing. Allow pop-ups and try again.')
      return
    }

    popup.opener = null
    const { document } = popup
    document.title = `Claim stub #${code}`
    const lines = [
      import.meta.env.VITE_SHOP_NAME?.trim() || 'Laundry POS',
      `Pickup claim #${code}`,
      order.customer_name,
      ...(order.pickup_at ? [`Pickup: ${formatPickup(order.pickup_at)}`] : []),
      ...items.map(item => `${item.name} ×${item.qty} · ${peso(item.subtotal)}`),
      `Order total: ${peso(order.total)}`,
      `Balance due: ${peso(isPaid ? 0 : order.total)}`,
    ]
    for (const [index, line] of lines.entries()) {
      const element = document.createElement(index === 0 ? 'h1' : 'p')
      element.textContent = line
      document.body.append(element)
    }
    document.body.style.fontFamily = 'system-ui, sans-serif'
    document.body.style.maxWidth = '420px'
    popup.focus()
    popup.print()
  }

  const snapshotTone = isPaid
    ? 'border-emerald-200 bg-emerald-50/60'
    : 'border-rose-200 bg-rose-50/70'

  return (
    
    <div className="fixed inset-0 z-[60] flex flex-col bg-neutral-50">
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

          {order.customer_phone && <p className="text-sm text-stone-700">Phone: {order.customer_phone}</p>}
          {order.pickup_at && <p className="text-sm text-stone-700">Pickup: {formatPickup(order.pickup_at)}</p>}
          {order.notes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Note</p>
              <p className="text-sm text-amber-950 leading-snug">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="border-t border-stone-100 bg-white px-5 py-3">
          {(panelError || actionError) && (
            <p role="alert" className="mb-2 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{panelError || actionError}</p>
          )}
          {panel === 'payment' && (
            <form className="space-y-2" onSubmit={submitPayment}>
              <label className="block text-sm font-semibold text-stone-800">
                Record payment of {peso(paymentUnconfirmed ? pendingPaymentAmount : order.total)}
                <select
                  className="mt-1 block h-11 w-full rounded-lg border border-stone-300 px-3"
                  disabled={updating || paymentUnconfirmed}
                  required
                  value={paymentMethod}
                  onChange={event => setPaymentMethod(event.target.value)}
                >
                  <option value="">Choose a payment method</option>
                  {PAYMENT_METHODS.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}
                </select>
              </label>
              <PanelActions
                label={paymentUnconfirmed ? 'Retry payment' : 'Record payment'}
                updating={updating}
                submitDisabled={!paymentMethod}
                cancelDisabled={paymentUnconfirmed}
                onCancel={() => showPanel(null)}
              />
            </form>
          )}
          {panel === 'void' && (
            <form className="space-y-2" onSubmit={submitVoid}>
              <label className="block text-sm font-semibold text-stone-800">
                Reason for voiding
                <textarea
                  className="mt-1 block w-full rounded-lg border border-stone-300 p-3"
                  disabled={updating}
                  required
                  maxLength={500}
                  rows={2}
                  value={voidReason}
                  onChange={event => setVoidReason(event.target.value)}
                />
              </label>
              <PanelActions
                label="Confirm void"
                updating={updating}
                submitDisabled={!voidReason.trim()}
                onCancel={() => showPanel(null)}
              />
            </form>
          )}
          {!panel && (
            <div className="space-y-2">
              {canChangeOrder && (
                <button
                  type="button"
                  onClick={() => showPanel('payment')}
                  disabled={updating}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 text-sm font-semibold text-rose-700 disabled:opacity-50"
                >
                  <Banknote size={17} />
                  Take payment
                </button>
              )}

              {advance && (
                <button
                  type="button"
                  onClick={askAdvance}
                  disabled={updating || releaseBlocked}
                  className="min-h-11 w-full rounded-xl bg-teal-600 px-3 text-sm font-semibold text-white disabled:bg-stone-100 disabled:text-stone-400"
                >
                  {updating ? 'Saving…' : advance.label}
                </button>
              )}
              {releaseBlocked && <p className="text-center text-xs text-stone-600">Take payment before releasing.</p>}

              <div className="flex flex-wrap gap-2">
                {order.status !== 'cancelled' && (
                  <button type="button" onClick={printClaimStub} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-stone-100 px-2 text-sm font-semibold text-stone-700">
                    <Printer size={15} />
                    Print claim stub
                  </button>
                )}
                {canChangeOrder && onEdit && (
                  <button type="button" onClick={() => onEdit(order)} disabled={updating} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-stone-100 px-2 text-sm font-semibold text-stone-700 disabled:opacity-50">
                    <Pencil size={15} />
                    Edit order
                  </button>
                )}
                {canChangeOrder && onVoid && (
                  <button type="button" onClick={() => showPanel('void')} disabled={updating} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-rose-50 px-2 text-sm font-semibold text-rose-700 disabled:opacity-50">
                    <Ban size={15} />
                    Void
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <OrderConfirm confirm={confirm} onCancel={() => setConfirm(null)} />
    </div>
  )
}


function PanelActions({ label, updating, submitDisabled, cancelDisabled, onCancel }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} disabled={updating || cancelDisabled} className="min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold disabled:opacity-50">Cancel</button>
      <button type="submit" disabled={updating || submitDisabled} className="min-h-11 flex-1 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-50">
        {updating ? 'Saving…' : label}
      </button>
    </div>
  )
}
