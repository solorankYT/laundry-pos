import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function NewOrderForm({ onClose, onCreated }) {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [selected, setSelected] = useState({})
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

const fetchServices = async () => {
  const { data: sessionData } = await supabase.auth.getSession()
  console.log('session when fetching:', sessionData.session)

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('type')

  console.log('services data:', data)
  console.log('services error:', error)
  setServices(data ?? [])
}

useEffect(() => {
  if (user) {
    fetchServices()
  }
}, [user])

  const toggleService = (service) => {
    setSelected(prev => {
      if (prev[service.id]) {
        // already selected → remove it
        const updated = { ...prev }
        delete updated[service.id]
        return updated
      } else {
        // not selected → add with quantity 1
        return { ...prev, [service.id]: { ...service, quantity: 1 } }
      }
    })
  }

  const changeQuantity = (serviceId, delta) => {
    setSelected(prev => {
      const current = prev[serviceId]
      if (!current) return prev
      const newQty = current.quantity + delta
      if (newQty <= 0) {
        const updated = { ...prev }
        delete updated[serviceId]
        return updated
      }
      return { ...prev, [serviceId]: { ...current, quantity: newQty } }
    })
  }

  const total = Object.values(selected).reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  )

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      setError('Customer name is required')
      return
    }
    if (Object.keys(selected).length === 0) {
      setError('Select at least one service')
      return
    }

    setSubmitting(true)
    setError('')

    // 1. Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName.trim(),
        customer_contact: customerContact.trim() || null,
        notes: notes.trim() || null,
        total,
        created_by: user.id,
        status: 'pending',
      })
      .select()
      .single()

    if (orderError) {
      setError('Failed to create order')
      setSubmitting(false)
      return
    }

    // 2. Insert all order items
    const items = Object.values(selected).map(item => ({
      order_id: order.id,
      service_id: item.id,
      service_name: item.name,
      price: item.price,
      quantity: item.quantity,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(items)

    if (itemsError) {
      setError('Failed to save order items')
      setSubmitting(false)
      return
    }

    onCreated()
  }

  const baseServices = services.filter(s => s.type === 'base')
  const addonServices = services.filter(s => s.type === 'addon')

  return (
    // Overlay
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      {/* Sheet — slides up from bottom on mobile */}
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">New Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">

          {/* Customer info */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer name <span className="text-red-500">*</span>
              </label>
              <input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Juan dela Cruz"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact (optional)</label>
              <input
                value={customerContact}
                onChange={e => setCustomerContact(e.target.value)}
                placeholder="09xxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Base services */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Services</p>
            <div className="space-y-2">
              {baseServices.map(service => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  selected={selected[service.id]}
                  onToggle={() => toggleService(service)}
                  onChangeQty={(delta) => changeQuantity(service.id, delta)}
                />
              ))}
            </div>
          </div>

          {/* Add-ons */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Add-ons</p>
            <div className="space-y-2">
              {addonServices.map(service => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  selected={selected[service.id]}
                  onToggle={() => toggleService(service)}
                  onChangeQty={(delta) => changeQuantity(service.id, delta)}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. delicate clothes, separate colors"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Sticky footer with total + submit */}
        <div className="border-t border-gray-100 px-4 py-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-xl font-bold text-gray-900">₱{total.toFixed(2)}</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Row for each service — tap to select, +/- for quantity
function ServiceRow({ service, selected, onToggle, onChangeQty }) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
      onClick={onToggle}
    >
      <div>
        <p className={`text-sm font-medium ${selected ? 'text-blue-700' : 'text-gray-800'}`}>
          {service.name}
        </p>
        <p className="text-xs text-gray-400">₱{Number(service.price).toFixed(2)}</p>
      </div>

      {selected ? (
        // Quantity controls
        <div
          className="flex items-center gap-3"
          onClick={e => e.stopPropagation()} // don't toggle when tapping +/-
        >
          <button
            onClick={() => onChangeQty(-1)}
            className="w-7 h-7 rounded-full border border-blue-300 text-blue-600 flex items-center justify-center text-lg leading-none"
          >
            −
          </button>
          <span className="text-sm font-semibold text-blue-700 w-4 text-center">
            {selected.quantity}
          </span>
          <button
            onClick={() => onChangeQty(1)}
            className="w-7 h-7 rounded-full border border-blue-300 text-blue-600 flex items-center justify-center text-lg leading-none"
          >
            +
          </button>
        </div>
      ) : (
        <span className="text-gray-300 text-lg">+</span>
      )}
    </div>
  )
}