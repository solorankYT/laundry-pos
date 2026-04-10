import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function NewOrderForm({ onClose, onCreated }) {
  const { user } = useAuth()
  const nameRef = useRef(null)

  const [services, setServices] = useState([])
  const [selected, setSelected] = useState({})
  const [customerName, setCustomerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(true)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!user) return
    fetchServices()
    // Auto-focus customer name on open
    setTimeout(() => nameRef.current?.focus(), 120)
  }, [user])

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('type')
      .order('name')
    setServices(data ?? [])
  }

  const toggleService = (service) => {
    setSelected(prev => {
      if (prev[service.id]) {
        const qty = prev[service.id].quantity
        if (qty >= 8) return prev
        return { ...prev, [service.id]: { ...prev[service.id], quantity: qty + 1 } }
      }
      return { ...prev, [service.id]: { ...service, quantity: 1 } }
    })
  }

  const changeQty = (id, delta) => {
    setSelected(prev => {
      const item = prev[id]
      if (!item) return prev
      const qty = item.quantity + delta
      if (qty <= 0) {
        const copy = { ...prev }
        delete copy[id]
        return copy
      }
      return { ...prev, [id]: { ...item, quantity: Math.min(qty, 8) } }
    })
  }

  const applyPreset = () => {
    const targets = ['wash', 'dry', 'fold']
    setSelected(prev => {
      const updated = { ...prev }
      targets.forEach(keyword => {
        const svc = services.find(s => s.name.toLowerCase().includes(keyword))
        if (!svc) return
        if (updated[svc.id]) {
          updated[svc.id] = { ...updated[svc.id], quantity: Math.min(updated[svc.id].quantity + 1, 8) }
        } else {
          updated[svc.id] = { ...svc, quantity: 1 }
        }
      })
      return updated
    })
  }

  const total = Object.values(selected).reduce(
    (sum, i) => sum + i.price * i.quantity, 0
  )

  const itemCount = Object.values(selected).reduce(
    (sum, i) => sum + i.quantity, 0
  )

  const handleSubmit = async () => {
    const errs = {}
    if (!customerName.trim()) errs.name = 'Enter customer name'
    if (!itemCount) errs.services = 'Select at least one service'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    setErrors({})

    try {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_name: customerName.trim(),
          payment_status: paymentStatus,
          notes: notes.trim() || null,
          total,
          created_by: user.id,
          status: 'pending',
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      const items = Object.values(selected).map(i => ({
        order_id: order.id,
        service_id: i.id,
        service_name: i.name,
        price: i.price,
        quantity: i.quantity,
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(items)
      if (itemsErr) throw itemsErr

      onCreated()
    } catch (err) {
      console.error(err)
      setErrors({ submit: 'Failed to create order. Try again.' })
      setSubmitting(false)
    }
  }

  const base = services.filter(s => s.type === 'base')
  const addons = services.filter(s => s.type === 'addon')

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm active:bg-gray-200"
        >
          ✕
        </button>
        <h2 className="font-semibold text-base text-gray-900 flex-1">New Order</h2>
        {itemCount > 0 && (
          <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">
            {itemCount} item{itemCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── STICKY TOP — customer + payment ────────────── */}
      <div className="bg-white border-b px-4 py-3 space-y-2.5">

        {/* Customer name */}
        <div>
          <input
            ref={nameRef}
            type="text"
            placeholder="Customer name *"
            value={customerName}
            onChange={e => { setCustomerName(e.target.value); setErrors(p => ({ ...p, name: null })) }}
            className={`
              w-full h-11 px-3 rounded-xl border text-sm bg-gray-50
              focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition
              ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'}
            `}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>

        {/* Payment toggle */}
        <div className="flex gap-2">
          <PayToggle
            label="Paid"
            active={paymentStatus === true}
            activeClass="bg-green-600 text-white border-green-600"
            onClick={() => setPaymentStatus(true)}
          />
          <PayToggle
            label="Unpaid"
            active={paymentStatus === false}
            activeClass="bg-red-500 text-white border-red-500"
            onClick={() => setPaymentStatus(false)}
          />
        </div>
      </div>

      {/* ── SCROLLABLE — services ──────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Quick preset */}
        <button
          onClick={applyPreset}
          className="
            w-full h-12 rounded-xl
            bg-blue-50 border border-blue-200 text-blue-700
            text-sm font-semibold
            active:scale-[0.98] transition-transform
          "
        >
          ⚡ Full Service — Wash + Dry + Fold
        </button>

        {/* Base services */}
        {base.length > 0 && (
          <Section title="Services" error={errors.services}>
            <div className="grid grid-cols-2 gap-2.5">
              {base.map(s => (
                <ServiceTile
                  key={s.id}
                  service={s}
                  qty={selected[s.id]?.quantity ?? 0}
                  onTap={() => toggleService(s)}
                  onMinus={e => { e.stopPropagation(); changeQty(s.id, -1) }}
                  onPlus={e => { e.stopPropagation(); changeQty(s.id, 1) }}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Add-ons */}
        {addons.length > 0 && (
          <Section title="Add-ons">
            <div className="grid grid-cols-2 gap-2.5">
              {addons.map(s => (
                <ServiceTile
                  key={s.id}
                  service={s}
                  qty={selected[s.id]?.quantity ?? 0}
                  onTap={() => toggleService(s)}
                  onMinus={e => { e.stopPropagation(); changeQty(s.id, -1) }}
                  onPlus={e => { e.stopPropagation(); changeQty(s.id, 1) }}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Notes (collapsible) */}
        <div>
          <button
            onClick={() => setShowNotes(p => !p)}
            className="text-xs text-blue-600 font-medium"
          >
            {showNotes ? '− Hide notes' : '+ Add note'}
          </button>
          {showNotes && (
            <textarea
              placeholder="Special instructions…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="
                mt-2 w-full px-3 py-2 rounded-xl border border-gray-200
                text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none
                resize-none
              "
            />
          )}
        </div>

        {/* Bottom padding so FAB doesn't hide last item */}
        <div className="h-4" />
      </div>

      {/* ── STICKY BOTTOM — cart + submit ─────────────── */}
      <div className="bg-white border-t px-4 pt-3 pb-5 shadow-lg">

        {/* Selected items summary */}
        {itemCount > 0 && (
          <div className="mb-3 max-h-32 overflow-y-auto space-y-1.5">
            {Object.values(selected).map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-xs text-gray-600 flex-1 truncate">
                  {item.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => changeQty(item.id, -1)}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-base flex items-center justify-center active:bg-gray-200"
                  >
                    −
                  </button>
                  <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => changeQty(item.id, 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-base flex items-center justify-center active:bg-gray-200"
                    disabled={item.quantity >= 8}
                  >
                    +
                  </button>
                  <span className="text-xs text-gray-500 w-16 text-right">
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {errors.submit && (
          <p className="text-red-500 text-xs mb-2 text-center">{errors.submit}</p>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-xl font-bold text-gray-900">
              ₱{total.toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !itemCount || !customerName.trim()}
            className="
              h-12 px-6 rounded-xl font-semibold text-sm
              bg-blue-600 text-white
              active:scale-[0.98] disabled:opacity-40 transition-transform
              whitespace-nowrap
            "
          >
            {submitting ? 'Creating…' : 'Complete Order'}
          </button>
        </div>

        {!itemCount && (
          <p className="text-center text-xs text-gray-400 mt-2">
            Tap a service above to add it
          </p>
        )}
      </div>
    </div>
  )
}

/* ── SUB-COMPONENTS ─────────────────────────────────── */

function Section({ title, error, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>
      {children}
    </div>
  )
}

function PayToggle({ label, active, activeClass, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 h-10 rounded-xl border text-sm font-semibold transition
        ${active ? activeClass : 'bg-white text-gray-600 border-gray-200'}
      `}
    >
      {label}
    </button>
  )
}

function ServiceTile({ service, qty, onTap, onMinus, onPlus }) {
  const isSelected = qty > 0
  const atMax = qty >= 8

  return (
    <button
      onClick={onTap}
      className={`
        relative p-3 rounded-xl border text-left transition-all
        active:scale-[0.97]
        ${isSelected
          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
          : 'bg-white border-gray-200 hover:border-blue-300'}
      `}
    >
      <p className="text-sm font-semibold leading-tight pr-6">{service.name}</p>
      <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
        ₱{service.price}
        {atMax && isSelected ? ' · max' : ''}
      </p>

      {/* Quantity badge / stepper */}
      {isSelected ? (
        <div
          className="absolute top-2 right-2 flex items-center gap-1"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onMinus}
            className="w-5 h-5 rounded-full bg-white/30 text-white text-xs flex items-center justify-center"
          >
            −
          </button>
          <span className="text-xs font-bold text-white w-3 text-center">{qty}</span>
          <button
            onClick={onPlus}
            disabled={atMax}
            className="w-5 h-5 rounded-full bg-white/30 text-white text-xs flex items-center justify-center disabled:opacity-40"
          >
            +
          </button>
        </div>
      ) : null}
    </button>
  )
}