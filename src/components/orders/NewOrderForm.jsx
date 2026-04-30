import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function NewOrderForm({ onClose, onCreated }) {
  const { user } = useAuth()
  const nameRef = useRef(null)

  const [services, setServices] = useState([])
  const [addons, setAddons] = useState([])
  const [selectedServices, setSelectedServices] = useState({})
  const [selectedAddons, setSelectedAddons] = useState({})
  const [customerName, setCustomerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(true)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!user) return
    fetchData()
    setTimeout(() => nameRef.current?.focus(), 120)
  }, [user])

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
        return { ...prev, [service.id]: { ...prev[service.id], quantity: qty + 1 } }
      }
      return { ...prev, [service.id]: { ...service, quantity: 1 } }
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
      return { ...prev, [id]: { ...item, quantity: Math.min(qty, 8) } }
    })
  }

  // ── Addon helpers ────────────────────────────────────
  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      if (prev[addon.id]) {
        const qty = prev[addon.id].quantity
        if (qty >= 8) return prev
        return { ...prev, [addon.id]: { ...prev[addon.id], quantity: qty + 1 } }
      }
      return { ...prev, [addon.id]: { ...addon, quantity: 1 } }
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
      return { ...prev, [id]: { ...item, quantity: Math.min(qty, 8) } }
    })
  }

  // ── Full service preset ─────────────────────────────
  // Finds services whose name contains wash, dry, or fold and adds 1 of each
  const applyPreset = () => {
    const keywords = ['wash', 'dry', 'fold']
    setSelectedServices(prev => {
      const updated = { ...prev }
      keywords.forEach(keyword => {
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

  // ── Totals ───────────────────────────────────────────
  const serviceTotal = Object.values(selectedServices).reduce(
    (sum, i) => sum + i.price * i.quantity, 0
  )
  const addonTotal = Object.values(selectedAddons).reduce(
    (sum, i) => sum + i.price * i.quantity, 0
  )
  const total = serviceTotal + addonTotal

  const serviceCount = Object.values(selectedServices).reduce((sum, i) => sum + i.quantity, 0)
  const addonCount = Object.values(selectedAddons).reduce((sum, i) => sum + i.quantity, 0)
  const itemCount = serviceCount + addonCount

  // ── Submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = {}
    if (!customerName.trim()) errs.name = 'Enter customer name'
    if (!itemCount) errs.services = 'Select at least one service'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    setErrors({})

    try {
      // 1. Create the order
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

      // 2. Insert order_items (services)
      if (serviceCount > 0) {
        const items = Object.values(selectedServices).map(i => ({
          order_id: order.id,
          service_id: i.id,
          service_name: i.name,
          price: i.price,
          quantity: i.quantity,
        }))
        const { error: itemsErr } = await supabase.from('order_items').insert(items)
        if (itemsErr) throw itemsErr
      }

      // 3. Insert order_addons (addons)
      if (addonCount > 0) {
        const addonRows = Object.values(selectedAddons).map(i => ({
          order_id: order.id,
          addon_id: i.id,
          quantity: i.quantity,
          unit_price: i.price,
          total: i.price * i.quantity,
        }))
        const { error: addonsErr } = await supabase.from('order_addons').insert(addonRows)
        if (addonsErr) throw addonsErr
      }

      onCreated()
    } catch (err) {
      console.error(err)
      setErrors({ submit: 'Failed to create order. Try again.' })
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">

      {/* HEADER */}
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

      {/* STICKY TOP — customer + payment */}
      <div className="bg-white border-b px-4 py-3 space-y-2.5">
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
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

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

      {/* SCROLLABLE — services + addons */}
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

        {/* Services */}
        {services.length > 0 && (
          <Section title="Services" error={errors.services}>
            <div className="grid grid-cols-2 gap-2.5">
              {services.map(s => (
                <ServiceTile
                  key={s.id}
                  service={s}
                  qty={selectedServices[s.id]?.quantity ?? 0}
                  onTap={() => toggleService(s)}
                  onMinus={e => { e.stopPropagation(); changeServiceQty(s.id, -1) }}
                  onPlus={e => { e.stopPropagation(); changeServiceQty(s.id, 1) }}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Add-ons */}
        {addons.length > 0 && (
          <Section title="Add-ons">
            <div className="grid grid-cols-2 gap-2.5">
              {addons.map(a => (
                <ServiceTile
                  key={a.id}
                  service={a}
                  qty={selectedAddons[a.id]?.quantity ?? 0}
                  onTap={() => toggleAddon(a)}
                  onMinus={e => { e.stopPropagation(); changeAddonQty(a.id, -1) }}
                  onPlus={e => { e.stopPropagation(); changeAddonQty(a.id, 1) }}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Notes */}
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
                text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none resize-none
              "
            />
          )}
        </div>

        <div className="h-4" />
      </div>

      {/* STICKY BOTTOM — cart + submit */}
      <div className="bg-white border-t px-4 pt-3 pb-5 shadow-lg">

        {itemCount > 0 && (
          <div className="mb-3 max-h-40 overflow-y-auto space-y-1.5">

            {/* Service rows */}
            {Object.values(selectedServices).map(item => (
              <CartRow
                key={item.id}
                item={item}
                onMinus={() => changeServiceQty(item.id, -1)}
                onPlus={() => changeServiceQty(item.id, 1)}
              />
            ))}

            {/* Addon rows — with a subtle separator if both lists are non-empty */}
            {addonCount > 0 && serviceCount > 0 && (
              <p className="text-[10px] text-gray-400 uppercase tracking-wide pt-1">Add-ons</p>
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
        )}

        {errors.submit && (
          <p className="text-red-500 text-xs mb-2 text-center">{errors.submit}</p>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-xl font-bold text-gray-900">₱{total.toFixed(2)}</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !itemCount || !customerName.trim()}
            className="
              h-12 px-6 rounded-xl font-semibold text-sm
              bg-blue-600 text-white
              active:scale-[0.98] disabled:opacity-40 transition-transform whitespace-nowrap
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
        relative p-3 rounded-xl border text-left transition-all active:scale-[0.97]
        ${isSelected
          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
          : 'bg-white border-gray-200 hover:border-blue-300'}
      `}
    >
      <p className="text-sm font-semibold leading-tight pr-6">{service.name}</p>
      <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
        ₱{service.price}{atMax && isSelected ? ' · max' : ''}
      </p>

      {isSelected && (
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
      )}
    </button>
  )
}

function CartRow({ item, onMinus, onPlus }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600 flex-1 truncate">{item.name}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onMinus}
          className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-base flex items-center justify-center active:bg-gray-200"
        >
          −
        </button>
        <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
        <button
          onClick={onPlus}
          disabled={item.quantity >= 8}
          className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-base flex items-center justify-center active:bg-gray-200 disabled:opacity-40"
        >
          +
        </button>
        <span className="text-xs text-gray-500 w-16 text-right">
          ₱{(item.price * item.quantity).toFixed(2)}
        </span>
      </div>
    </div>
  )
}