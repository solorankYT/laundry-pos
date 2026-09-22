import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  X,
  Zap,
  Plus,
  Minus,
  NotebookPen,
  CheckCircle2,
  CircleDollarSign,
} from 'lucide-react'

export default function NewOrderForm({ order, onClose, onCreated }) {
  const { user } = useAuth()
  const nameRef = useRef(null)
  const isEditing = !!order

  const [services, setServices] = useState([])
  const [addons, setAddons] = useState([])
  const [selectedServices, setSelectedServices] = useState({})
  const [selectedAddons, setSelectedAddons] = useState({})
  const [customerName, setCustomerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!user) return
    fetchData()
    if (!isEditing) {
      setTimeout(() => nameRef.current?.focus(), 120)
    }
  }, [user])

  // ── Pre-fill when editing an existing order ──────────
  useEffect(() => {
    if (!order) return

    setCustomerName(order.customer_name ?? '')
    setPaymentStatus(
      order.payment_status === true || order.payment_status === false
        ? order.payment_status
        : null
    )
    setNotes(order.notes ?? '')
    if (order.notes) setShowNotes(true)

    const svcMap = {}
    ;(order.order_items ?? []).forEach(item => {
      svcMap[item.service_id] = {
        id: item.service_id,
        name: item.service_name,
        price: Number(item.price),
        quantity: item.quantity,
      }
    })
    setSelectedServices(svcMap)

    const addonMap = {}
    ;(order.order_addons ?? []).forEach(a => {
      addonMap[a.addon_id] = {
        id: a.addon_id,
        name: a.addons?.name ?? 'Add-on',
        price: Number(a.unit_price),
        quantity: a.quantity,
      }
    })
    setSelectedAddons(addonMap)
  }, [order])

  const fetchData = async () => {
    const [{ data: svcData }, { data: addonData }] = await Promise.all([
      supabase.from('services').select('*').eq('is_active', true).order('name'),
      supabase.from('addons').select('*').eq('is_active', true).order('name'),
    ])

    setServices(svcData ?? [])
    setAddons(addonData ?? [])
  }

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

    setSelectedServices(prev => {
      const updated = { ...prev }

      keywords.forEach(keyword => {
        const svc = services.find(s =>
          s.name.toLowerCase().includes(keyword)
        )

        if (!svc) return

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
      })

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

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = {}

    if (!customerName.trim()) errs.name = 'Enter customer name'
    if (!itemCount) errs.services = 'Select at least one service'
    if (paymentStatus === null) errs.payment = 'Select payment status'

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      if (isEditing) {
        await submitEdit()
      } else {
        await submitCreate()
      }

      onCreated()
    } catch (err) {
      console.error(err)
      setErrors({
        submit: isEditing
          ? 'Failed to save changes. Try again.'
          : 'Failed to create order. Try again.',
      })
      setSubmitting(false)
    }
  }

  const submitCreate = async () => {
    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName.trim(),
        payment_status: paymentStatus,
        notes: notes.trim() || null,
        total,
        created_by: user.id,
        status: 'pending',
        created_by_email: user.email,
      })
      .select()
      .single()

    if (orderErr) throw orderErr

    await insertLineItems(newOrder.id)
  }

  const submitEdit = async () => {
    const { error: orderErr } = await supabase
      .from('orders')
      .update({
        customer_name: customerName.trim(),
        payment_status: paymentStatus,
        notes: notes.trim() || null,
        total,
      })
      .eq('id', order.id)

    if (orderErr) throw orderErr

    // Replace existing line items rather than trying to diff them.
    const { error: delItemsErr } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', order.id)

    if (delItemsErr) throw delItemsErr

    const { error: delAddonsErr } = await supabase
      .from('order_addons')
      .delete()
      .eq('order_id', order.id)

    if (delAddonsErr) throw delAddonsErr

    await insertLineItems(order.id)
  }

  const insertLineItems = async (orderId) => {
    if (serviceCount > 0) {
      const items = Object.values(selectedServices).map(i => ({
        order_id: orderId,
        service_id: i.id,
        service_name: i.name,
        price: i.price,
        quantity: i.quantity,
      }))

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(items)

      if (itemsErr) throw itemsErr
    }

    if (addonCount > 0) {
      const addonRows = Object.values(selectedAddons).map(i => ({
        order_id: orderId,
        addon_id: i.id,
        quantity: i.quantity,
        unit_price: i.price,
        total: i.price * i.quantity,
      }))

      const { error: addonsErr } = await supabase
        .from('order_addons')
        .insert(addonRows)

      if (addonsErr) throw addonsErr
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-50">

      {/* HEADER */}
      <header className="shrink-0 bg-white border-b border-neutral-200 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
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

      {/* CUSTOMER + PAYMENT */}
      <section className="shrink-0 bg-white border-b border-neutral-200 px-4 py-4">
        <div className="space-y-4">

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

          {/* Payment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold tracking-wide text-neutral-500">
                PAYMENT STATUS
              </p>

              <span className="text-[11px] text-neutral-400">
                Required
              </span>
            </div>

            <div className="flex gap-3">
              <PayToggle
                label="Paid"
                icon={CheckCircle2}
                active={paymentStatus === true}
                activeClass="bg-green-600 text-white border-green-600"
                hasError={!!errors.payment}
                onClick={() => {
                  setPaymentStatus(true)
                  setErrors(p => ({ ...p, payment: null }))
                }}
              />

              <PayToggle
                label="Unpaid"
                icon={CircleDollarSign}
                active={paymentStatus === false}
                activeClass="bg-red-500 text-white border-red-500"
                hasError={!!errors.payment}
                onClick={() => {
                  setPaymentStatus(false)
                  setErrors(p => ({ ...p, payment: null }))
                }}
              />
            </div>

            {errors.payment && (
              <p className="mt-1.5 text-xs text-red-500">
                {errors.payment}
              </p>
            )}
          </div>
        </div>
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

        {/* QUICK PRESET */}
        <button
          type="button"
          onClick={applyPreset}
          className="
            w-full
            min-h-[54px]
            px-4
            py-3
            rounded-lg
            flex items-center justify-center gap-2.5
            bg-blue-50
            border border-blue-200
            text-blue-700
            text-sm font-semibold
            hover:bg-blue-100
            focus:outline-none focus:ring-2 focus:ring-blue-200
            active:scale-[0.99]
            transition
          "
        >
          <span className="
            w-7 h-7
            rounded-md
            bg-blue-100
            flex items-center justify-center
            shrink-0
          ">
            <Zap size={16} strokeWidth={2.2} />
          </span>

          <span>Quick add: Wash, Dry &amp; Fold</span>
        </button>

        {/* SERVICES */}
        {services.length > 0 && (
          <Section
            title="Services"
            error={errors.services}
          >
            <div className="grid grid-cols-2 gap-3">
              {services.map(s => (
                <ServiceTile
                  key={s.id}
                  service={s}
                  qty={selectedServices[s.id]?.quantity ?? 0}
                  onTap={() => toggleService(s)}
                  onMinus={e => {
                    e.stopPropagation()
                    changeServiceQty(s.id, -1)
                  }}
                  onPlus={e => {
                    e.stopPropagation()
                    changeServiceQty(s.id, 1)
                  }}
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
          <p className="
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
              ₱{total.toFixed(2)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              !itemCount ||
              !customerName.trim() ||
              paymentStatus === null
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
              : (isEditing ? 'Save Changes' : 'Complete Order')}
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

function PayToggle({
  label,
  icon: Icon,
  active,
  activeClass,
  hasError,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1
        min-h-[50px]
        px-4
        rounded-lg
        border
        text-sm
        font-semibold
        flex items-center justify-center gap-2
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-200
        active:scale-[0.99]
        transition
        ${active
          ? activeClass
          : hasError
            ? 'bg-white text-neutral-600 border-red-300'
            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'}
      `}
    >
      <Icon
        size={18}
        strokeWidth={2.2}
        className={active ? '' : 'text-neutral-400'}
      />

      {label}
    </button>
  )
}

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