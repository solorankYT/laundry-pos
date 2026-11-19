import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import CheckoutFields from './CheckoutFields'
import { checkoutDraft, checkoutQuote, orderActionError, isRejectedOrderWrite, peso } from './orderData'
import {
  X,
  Zap,
  Plus,
  Minus,
  NotebookPen,
} from 'lucide-react'

function orderLines(rows, type) {
  const items = {}

  for (const row of rows ?? []) {
    const isService = type === 'service'
    const id = isService ? row.service_id : row.addon_id
    const quantity = Number(row.quantity)
    items[id] = {
      id,
      name: isService ? row.service_name : row.addon_name ?? row.addons?.name ?? 'Add-on',
      price: Number(isService ? row.price : row.unit_price),
      quantity: (items[id]?.quantity ?? 0) + quantity,
    }
  }

  return items
}

function toManilaInput(value) {
  if (!value) return ''
  return new Date(Date.parse(value) + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

export default function NewOrderForm({ order, onClose, onCreated }) {
  const nameRef = useRef(null)
  const request = useRef(null)
  const submittingRef = useRef(false)
  const isEditing = !!order

  const [services, setServices] = useState([])
  const [addons, setAddons] = useState([])
  const [catalogState, setCatalogState] = useState('loading')
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [selectedServices, setSelectedServices] = useState(() => orderLines(order?.order_items, 'service'))
  const [selectedAddons, setSelectedAddons] = useState(() => orderLines(order?.order_addons, 'addon'))
  const [customerName, setCustomerName] = useState(order?.customer_name ?? '')
  const [customerPhone, setCustomerPhone] = useState(order?.customer_phone ?? '')
  const [pickupTime, setPickupTime] = useState(toManilaInput(order?.pickup_at))
  const [checkout, setCheckout] = useState(() => checkoutDraft('full', order, 'later'))
  const [notes, setNotes] = useState(order?.notes ?? '')
  const [showNotes, setShowNotes] = useState(Boolean(order?.notes))
  const [submitting, setSubmitting] = useState(false)
  const [retryLocked, setRetryLocked] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const controller = new AbortController()

    async function loadCatalog() {
      const [serviceResult, addonResult] = await Promise.all([
        supabase.from('services').select('id,name,price').eq('is_active', true).order('name').abortSignal(controller.signal),
        supabase.from('addons').select('id,name,price').eq('is_active', true).order('name').abortSignal(controller.signal),
      ])

      if (controller.signal.aborted) return
      if (serviceResult.error || addonResult.error) {
        setCatalogState('failed')
        return
      }

      setServices(serviceResult.data)
      setAddons(addonResult.data)
      setCatalogState('ready')
    }

    void loadCatalog()
    return () => controller.abort()
  }, [catalogVersion])

  useEffect(() => {
    if (!isEditing) nameRef.current?.focus()
  }, [isEditing])

  // ── Service helpers ──────────────────────────────────
  const toggleService = (service) => {
    setSelectedServices(prev => {
      if (prev[service.id]) {
        const qty = prev[service.id].quantity
        if (qty >= 8) return prev

        return {
          ...prev,
          [service.id]: {
            ...prev[service.id],
            quantity: qty + 1,
          },
        }
      }

      return {
        ...prev,
        [service.id]: {
          ...service,
          quantity: 1,
        },
      }
    })
  }

  const changeServiceQty = (id, delta) => {
    setSelectedServices(prev => {
      const item = prev[id]
      if (!item) return prev

      const qty = item.quantity + delta

      if (qty <= 0) {
        const copy = { ...prev }
        delete copy[id]
        return copy
      }

      return {
        ...prev,
        [id]: {
          ...item,
          quantity: Math.min(qty, 8),
        },
      }
    })
  }

  // ── Addon helpers ─────────────────────────────────────
  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      if (prev[addon.id]) {
        const qty = prev[addon.id].quantity
        if (qty >= 8) return prev

        return {
          ...prev,
          [addon.id]: {
            ...prev[addon.id],
            quantity: qty + 1,
          },
        }
      }

      return {
        ...prev,
        [addon.id]: {
          ...addon,
          quantity: 1,
        },
      }
    })
  }

  const changeAddonQty = (id, delta) => {
    setSelectedAddons(prev => {
      const item = prev[id]
      if (!item) return prev

      const qty = item.quantity + delta

      if (qty <= 0) {
        const copy = { ...prev }
        delete copy[id]
        return copy
      }

      return {
        ...prev,
        [id]: {
          ...item,
          quantity: Math.min(qty, 8),
        },
      }
    })
  }

  // ── Full service preset ──────────────────────────────
  const applyPreset = () => {
    const keywords = ['wash', 'dry', 'fold']

    const bundle = new Map()
    for (const keyword of keywords) {
      const service = services.find(item => item.name.toLowerCase().includes(keyword))
      if (service) bundle.set(service.id, service)
    }

    setSelectedServices(prev => {
      const updated = { ...prev }

      for (const svc of bundle.values()) {

        if (updated[svc.id]) {
          updated[svc.id] = {
            ...updated[svc.id],
            quantity: Math.min(updated[svc.id].quantity + 1, 8),
          }
        } else {
          updated[svc.id] = {
            ...svc,
            quantity: 1,
          }
        }
      }

      return updated
    })
  }

  // ── Totals ────────────────────────────────────────────
  const serviceTotal = Object.values(selectedServices).reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  )

  const addonTotal = Object.values(selectedAddons).reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  )

  const total = serviceTotal + addonTotal

  const serviceCount = Object.values(selectedServices).reduce(
    (sum, i) => sum + i.quantity,
    0
  )

  const addonCount = Object.values(selectedAddons).reduce(
    (sum, i) => sum + i.quantity,
    0
  )

  const itemCount = serviceCount + addonCount
  const quote = checkoutQuote(checkout, total)

  const handleSubmit = async () => {
    if (submittingRef.current || catalogState !== 'ready' || !quote.canSubmit) return
    const errors = {}

    if (!customerName.trim()) errors.name = 'Enter customer name'
    if (!serviceCount) errors.services = 'Select at least one service'

    if (Object.keys(errors).length) {
      setErrors(errors)
      return
    }

    request.current ??= {
      p_request_id: crypto.randomUUID(),
      p_order_id: order?.id ?? null,
      p_customer_name: customerName.trim(),
      p_customer_phone: customerPhone.trim() || null,
      p_pickup_at: pickupTime ? new Date(`${pickupTime}:00+08:00`).toISOString() : null,
      p_notes: notes.trim() || null,
      p_items: Object.values(selectedServices).map(({ id, quantity }) => ({ id, quantity })),
      p_addons: Object.values(selectedAddons).map(({ id, quantity }) => ({ id, quantity })),
      p_payment_method: quote.method,
      p_expected_total: quote.subtotal,
      p_expected_updated_at: order?.updated_at ?? null,
      p_discount_amount: quote.complimentary ? null : quote.discountAmount,
      p_adjustment_reason: quote.reason,
      p_complimentary: quote.complimentary,
    }

    submittingRef.current = true
    setSubmitting(true)
    setErrors({})
    try {
      const { data: orderId, error, status } = await supabase.rpc('save_order', request.current)
      if (error) {
        if (isRejectedOrderWrite(error, status)) {
          request.current = null
          setRetryLocked(false)
          setErrors({ submit: orderActionError(error, 'Order was not saved. Check the details and try again.') })
        } else {
          setRetryLocked(true)
          setErrors({ submit: 'The save could not be confirmed. Retry this same order before entering it again.' })
        }
        return
      }

      onCreated(orderId)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submittingRef.current) return
    if (retryLocked && !window.confirm('This order may have been saved. Close and check the order list before registering it again?')) return
    onClose()
  }

  return (
   <div className="fixed inset-0 z-[60] flex flex-col bg-neutral-50">

      {/* HEADER */}
      <header className="shrink-0 bg-white border-b border-neutral-200 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            aria-label={isEditing ? 'Close edit order' : 'Close new order'}
            className="
              w-10 h-10 shrink-0
              flex items-center justify-center
              rounded-lg
              bg-neutral-100 text-neutral-600
              hover:bg-neutral-200
              focus:outline-none focus:ring-2 focus:ring-blue-200
              active:scale-95
              transition
            "
          >
            <X size={19} strokeWidth={2} />
          </button>

          <h2 className="flex-1 text-lg font-semibold text-neutral-900">
            {isEditing ? 'Edit Order' : 'New Order'}
          </h2>

          {itemCount > 0 && (
            <span className="
              shrink-0
              rounded-full
              bg-blue-50
              border border-blue-100
              px-2.5 py-1
              text-xs font-semibold text-blue-700
              tabular-nums
            ">
              {itemCount} item{itemCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {/* CUSTOMER AND PICKUP */}
      <section className="shrink-0 bg-white border-b border-neutral-200 px-4 py-4">
        <fieldset disabled={submitting || retryLocked} className="space-y-3">

          {/* Customer */}
          <div>
            <label
              htmlFor="customer-name"
              className="block mb-2 text-xs font-semibold text-neutral-500"
            >
              CUSTOMER NAME
            </label>

            <input
              id="customer-name"
              ref={nameRef}
              type="text"
              placeholder="Enter customer name"
              value={customerName}
              maxLength={120}
              onChange={e => {
                setCustomerName(e.target.value)
                setErrors(p => ({ ...p, name: null }))
              }}
              className={`
                w-full h-12 px-4
                rounded-lg
                border
                text-sm
                text-neutral-900
                placeholder:text-neutral-400
                bg-neutral-50
                outline-none
                transition
                focus:bg-white
                focus:ring-2
                focus:ring-blue-100
                focus:border-blue-400
                ${errors.name
                  ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100'
                  : 'border-neutral-200'}
              `}
            />

            {errors.name && (
              <p className="mt-1.5 text-xs text-red-500">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-neutral-700">
              Phone (optional)
              <input
                className="mt-1 block h-10 w-full rounded-lg border border-neutral-200 px-3"
                type="tel"
                maxLength={40}
                value={customerPhone}
                onChange={event => setCustomerPhone(event.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Pickup date and time (Manila)
              <input
                className="mt-1 block h-10 w-full rounded-lg border border-neutral-200 px-3"
                type="datetime-local"
                value={pickupTime}
                onChange={event => setPickupTime(event.target.value)}
              />
            </label>
          </div>
        </fieldset>
      </section>

      {/* SCROLLABLE CONTENT */}
      <main className="
        flex-1
        min-h-0
        overflow-y-auto
        overscroll-contain
        px-4
        py-5
        space-y-5
        pb-8
      ">

        <fieldset
          disabled={submitting || retryLocked}
          inert={submitting || retryLocked ? true : undefined}
          className="min-w-0 space-y-5"
        >
        {catalogState === 'loading' && <p role="status">Loading services…</p>}
        {catalogState === 'failed' && (
          <p role="alert" className="text-sm text-red-700">
            Services could not be loaded.{' '}
            <button type="button" className="underline" onClick={() => {
              setCatalogState('loading')
              setCatalogVersion(version => version + 1)
            }}>Retry</button>
          </p>
        )}
        {catalogState === 'ready' && services.length === 0 && (
          <p role="status" className="text-sm text-neutral-600">Add at least one active service in the shop catalog to take orders.</p>
        )}

      {/* SERVICES */}
        {services.length > 0 && (
          <Section
            title="Services"
            error={errors.services}
          >
            <div className="grid grid-cols-2 gap-3">

              {/* QUICK PRESET */}
              <button
                type="button"
                onClick={applyPreset}
                className="
                  relative
                  min-h-[100px]
                  px-3
                  py-3
                  rounded-xl
                  border
                  border-blue-200
                  bg-blue-50
                  text-blue-700
                  flex
                  items-center
                  justify-center
                  text-center
                  cursor-pointer
                  select-none
                  hover:bg-blue-100
                  hover:border-blue-300
                  focus:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-300
                  active:scale-[0.98]
                  transition
                "
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div
                    className="
                      w-11
                      h-11
                      rounded-lg
                      bg-blue-100
                      flex
                      items-center
                      justify-center
                    "
                  >
                    <Zap
                      size={22}
                      strokeWidth={2.2}
                    />
                  </div>

                  <span className="text-sm font-semibold leading-tight">
                    Quick Add
                  </span>
                </div>
              </button>

              {services.map(s => (
                <ServiceTile
                  key={s.id}
                  service={s}
                  qty={selectedServices[s.id]?.quantity ?? 0}
                  onTap={() => toggleService(s)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* ADD-ONS */}
        {addons.length > 0 && (
          <Section title="Add-ons">
            <div className="grid grid-cols-2 gap-3">
              {addons.map(a => (
                <ServiceTile
                  key={a.id}
                  service={a}
                  qty={selectedAddons[a.id]?.quantity ?? 0}
                  onTap={() => toggleAddon(a)}
                  onMinus={e => {
                    e.stopPropagation()
                    changeAddonQty(a.id, -1)
                  }}
                  onPlus={e => {
                    e.stopPropagation()
                    changeAddonQty(a.id, 1)
                  }}
                />
              ))}
            </div>
          </Section>
        )}

        {/* NOTES */}
        <div>
          <button
            type="button"
            onClick={() => setShowNotes(p => !p)}
            className="
              min-h-11
              flex items-center gap-2
              px-1
              text-sm
              text-blue-600
              font-semibold
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-blue-200
              rounded-md
            "
          >
            <NotebookPen size={16} />
            <span>{showNotes ? 'Hide note' : 'Add note'}</span>
          </button>

          {showNotes && (
            <textarea
              placeholder="Special instructions..."
              value={notes}
              maxLength={2000}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="
                mt-2
                w-full
                min-h-[96px]
                px-4 py-3
                rounded-lg
                border border-neutral-200
                text-sm
                text-neutral-900
                placeholder:text-neutral-400
                bg-white
                outline-none
                resize-none
                focus:ring-2
                focus:ring-blue-100
                focus:border-blue-400
                transition
              "
            />
          )}
        </div>

        <div className="h-4" />
        <CheckoutFields draft={checkout} quote={quote} onChange={setCheckout} allowLater deferOnly={isEditing} />
        </fieldset>
      </main>

      {/* STICKY BOTTOM CHECKOUT */}
      <footer className="
        shrink-0
        bg-white
        border-t border-neutral-200
        px-4
        pt-4
        pb-[max(1rem,env(safe-area-inset-bottom))]
      ">

        {itemCount > 0 && (
          <div className="mb-4">
            <div className="
              max-h-40
              overflow-y-auto
              overscroll-contain
              space-y-2
              pr-0.5
            ">
              {Object.values(selectedServices).map(item => (
                <CartRow
                  key={item.id}
                  item={item}
                  onMinus={() => changeServiceQty(item.id, -1)}
                  onPlus={() => changeServiceQty(item.id, 1)}
                />
              ))}

              {addonCount > 0 && serviceCount > 0 && (
                <p className="
                  text-[10px]
                  font-semibold
                  text-neutral-400
                  uppercase
                  tracking-wide
                  pt-1
                ">
                  Add-ons
                </p>
              )}

              {Object.values(selectedAddons).map(item => (
                <CartRow
                  key={item.id}
                  item={item}
                  onMinus={() => changeAddonQty(item.id, -1)}
                  onPlus={() => changeAddonQty(item.id, 1)}
                />
              ))}
            </div>
          </div>
        )}

        {errors.submit && (
          <p role="alert" className="
            text-red-500
            text-xs
            mb-3
            text-center
            font-medium
          ">
            {errors.submit}
          </p>
        )}

        <div className="flex items-center gap-4">

          <div className="min-w-0 flex-1">
            <p className="
              text-xs
              font-medium
              text-neutral-400
              mb-0.5
            ">
              TOTAL
            </p>

            <p className="
              text-2xl
              leading-none
              font-bold
              text-neutral-900
              tabular-nums
              tracking-tight
            ">
              {quote.validDiscount ? peso(quote.total) : '—'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              !serviceCount ||
              !customerName.trim() ||
              catalogState !== 'ready' ||
              !quote.canSubmit
            }
            className="
              min-h-[54px]
              px-5
              rounded-lg
              bg-blue-600
              text-white
              font-semibold
              text-sm
              whitespace-nowrap
              flex items-center justify-center
              focus:outline-none
              focus:ring-2
              focus:ring-blue-200
              focus:ring-offset-2
              active:scale-[0.98]
              disabled:opacity-40
              disabled:cursor-not-allowed
              transition
            "
          >
            {submitting
              ? (isEditing ? 'Saving…' : 'Creating…')
              : retryLocked ? 'Retry save' : (isEditing ? 'Save Changes' : 'Complete Order')}
          </button>
        </div>

        {!itemCount && (
          <p className="
            text-center
            text-xs
            text-neutral-400
            mt-2.5
          ">
            Tap a service above to add it
          </p>
        )}
      </footer>
    </div>
  )
}

/* ── SUB-COMPONENTS ─────────────────────────────────── */

function Section({ title, error, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <p className="
          text-xs
          font-semibold
          tracking-wide
          uppercase
          text-neutral-500
        ">
          {title}
        </p>

        {error && (
          <p className="text-xs text-red-500 font-medium">
            {error}
          </p>
        )}
      </div>

      {children}
    </section>
  )
}
//

/* ── SERVICE LOGOS ───────────────────────────────────── */

const SERVICE_LOGOS = {
  'fabric softener': '/logo/fabric.png',
  'spin dry': '/logo/spindry.png',
  detergent: '/logo/detergent.png',
  fabric: '/logo/fabric.png',
  spindry: '/logo/spindry.png',
  dry: '/logo/spindry.png',
  fold: '/logo/fold.png',
  wash: '/logo/wash.png',
}

function getServiceLogo(name) {
  const normalized = name.toLowerCase().trim()

  // Exact match first
  const exactMatch = SERVICE_LOGOS[normalized]
  if (exactMatch) return exactMatch

  // Otherwise, match the most specific/longest name first
  const match = Object.keys(SERVICE_LOGOS)
    .sort((a, b) => b.length - a.length)
    .find(key => normalized.includes(key))

  return match ? SERVICE_LOGOS[match] : null
}

function ServiceTile({
  service,
  qty,
  onTap,
}) {
  const isSelected = qty > 0
  const logo = getServiceLogo(service.name)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap()
        }
      }}
      aria-pressed={isSelected}
      className={`
        relative
        min-h-[100px]
        px-3
        py-3
        rounded-xl
        border
        text-center
        cursor-pointer
        select-none
        flex
        items-center
        justify-center
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-300
        transition-colors
        ${
          isSelected
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white border-neutral-200 text-neutral-900 hover:border-blue-300'
        }
      `}
    >
      {/* Quantity */}
      {isSelected && (
        <span
          className="
            absolute
            top-2
            right-2
            w-6
            h-6
            rounded-full
            bg-white
            text-blue-600
            text-xs
            font-bold
            flex
            items-center
            justify-center
            tabular-nums
          "
        >
          {qty}
        </span>
      )}

      {/* Icon + Title */}
      <div className="flex flex-col items-center justify-center gap-2">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="w-11 h-11 object-contain"
          />
        ) : (
          <div className="w-11 h-11" />
        )}

        <p className="text-sm font-semibold leading-tight">
          {service.name}
        </p>
      </div>
    </div>
  )
}

function CartRow({ item, onMinus, onPlus }) {
  return (
    <div className="
      min-h-9
      flex
      items-center
      justify-between
      gap-3
    ">
      <span className="
        min-w-0
        flex-1
        truncate
        text-sm
        text-neutral-700
        font-medium
      ">
        {item.name}
      </span>

      <div className="
        flex
        items-center
        gap-1.5
        shrink-0
      ">
        <button
          type="button"
          onClick={onMinus}
          aria-label={`Decrease ${item.name} quantity`}
          className="
            w-8 h-8
            rounded-md
            bg-neutral-100
            text-neutral-700
            flex items-center justify-center
            hover:bg-neutral-200
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-blue-200
            active:bg-neutral-200
            transition
          "
        >
          <Minus size={14} strokeWidth={2.3} />
        </button>

        <span className="
          w-5
          text-center
          text-sm
          font-semibold
          text-neutral-800
          tabular-nums
        ">
          {item.quantity}
        </span>

        <button
          type="button"
          onClick={onPlus}
          disabled={item.quantity >= 8}
          aria-label={`Increase ${item.name} quantity`}
          className="
            w-8 h-8
            rounded-md
            bg-neutral-100
            text-neutral-700
            flex items-center justify-center
            hover:bg-neutral-200
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-blue-200
            active:bg-neutral-200
            disabled:opacity-40
            transition
          "
        >
          <Plus size={14} strokeWidth={2.3} />
        </button>

        <span className="
          w-16
          text-right
          text-sm
          font-medium
          text-neutral-600
          tabular-nums
        ">
          ₱{(item.price * item.quantity).toFixed(2)}
        </span>
      </div>
    </div>
  )
}
