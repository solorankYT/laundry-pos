import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function NewOrderForm({ onClose, onCreated }) {
  const { user } = useAuth()

  const [services, setServices] = useState([])
  const [selected, setSelected] = useState({})
  const [customerName, setCustomerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(true) // default Paid
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!user) return
    fetchServices()
  }, [user])

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)

    setServices(data ?? [])
  }

  // Toggle individual service
  const toggleService = (service) => {
    setSelected(prev => {
      if (prev[service.id]) {
        // Increase quantity but max 8
        return {
          ...prev,
          [service.id]: {
            ...prev[service.id],
            quantity: Math.min(prev[service.id].quantity + 1, 8)
          }
        }
      }
      return { ...prev, [service.id]: { ...service, quantity: 1 } }
    })
  }

  // Change quantity manually
  const changeQuantity = (id, delta) => {
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

  // Full Service preset
  const handlePreset = () => {
    const wash = services.find(s => s.name.toLowerCase().includes('wash'))
    const dry = services.find(s => s.name.toLowerCase().includes('dry'))
    const fold = services.find(s => s.name.toLowerCase().includes('fold'))
    const preset = [wash, dry, fold].filter(Boolean)

    setSelected(prev => {
      const updated = { ...prev }
      preset.forEach(service => {
        if (updated[service.id]) {
          updated[service.id].quantity = Math.min(updated[service.id].quantity + 1, 8)
        } else {
          updated[service.id] = { ...service, quantity: 1 }
        }
      })
      return updated
    })
  }

  const total = Object.values(selected).reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  )

  const handleSubmit = async () => {
    let validationErrors = {}
    if (!customerName.trim()) validationErrors.customerName = 'Customer name is required'
    if (paymentStatus === null) validationErrors.paymentStatus = 'Select payment status'
    if (!Object.keys(selected).length) validationErrors.services = 'Select at least one service'

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customerName.trim(),
          payment_status: paymentStatus,
          notes,
          total,
          created_by: user.id,
          status: 'pending',
        })
        .select()
        .single()

      if (orderError) throw orderError

      const items = Object.values(selected).map(i => ({
        order_id: order.id,
        service_id: i.id,
        service_name: i.name,
        price: i.price,
        quantity: i.quantity,
      }))

      await supabase.from('order_items').insert(items)
      onCreated()
    } catch (err) {
      console.error(err)
      setErrors({ submit: 'Failed to create order' })
      setSubmitting(false)
    }
  }

  const base = services.filter(s => s.type === 'base')
  const addons = services.filter(s => s.type === 'addon')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-end p-2">
  <div className="bg-gray-50 w-full max-w-3xl flex flex-col rounded-t-2xl shadow-lg overflow-hidden h-[90vh]">

    {/* HEADER */}
    <div className="bg-white px-4 py-3 flex justify-between items-center border-b sticky top-0 z-10">
      <h2 className="font-semibold text-lg">POS Order</h2>
      <button onClick={onClose} className="text-xl hover:text-red-500">✕</button>
    </div>

    {/* SERVICES SCROLL */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">

      {/* Quick Preset */}
      <Card title="Quick Actions">
        <button
          onClick={handlePreset}
          className="p-4 rounded-2xl bg-blue-600 text-white shadow w-full active:scale-95"
        >
          <p className="font-medium">Full Service</p>
          <p className="text-xs opacity-80">Wash + Dry + Fold</p>
        </button>
      </Card>

      {/* Base Services */}
      <Card title="Services">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {base.map(s => (
            <ServiceTile
              key={s.id}
              service={s}
              onClick={() => toggleService(s)}
              selected={!!selected[s.id]}
              quantity={selected[s.id]?.quantity}
            />
          ))}
        </div>
      </Card>

      {/* Add-ons */}
      <Card title="Add-ons">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {addons.map(s => (
            <ServiceTile
              key={s.id}
              service={s}
              onClick={() => toggleService(s)}
              selected={!!selected[s.id]}
              quantity={selected[s.id]?.quantity}
            />
          ))}
        </div>
      </Card>

    </div>

    {/* BOTTOM CART (sticky) */}
    <div className="bg-white border-t p-4 sticky bottom-0 z-20 shadow-md">
      {/* Customer */}
      <input
        type="text"
        placeholder="Customer Name"
        value={customerName}
        onChange={e => setCustomerName(e.target.value)}
        className="w-full mb-2 px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
      />

      {/* Payment */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setPaymentStatus(true)}
          className={`flex-1 py-2 rounded-xl border text-sm font-medium transition ${
            paymentStatus === true
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Paid
        </button>
        <button
          type="button"
          onClick={() => setPaymentStatus(false)}
          className={`flex-1 py-2 rounded-xl border text-sm font-medium transition ${
            paymentStatus === false
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Unpaid
        </button>
      </div>

      {/* Cart Items */}
      <div className="max-h-40 overflow-y-auto mb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 space-y-2">
        {Object.values(selected).length === 0 ? (
          <p className="text-sm text-gray-400 text-center">No items yet</p>
        ) : (
          Object.values(selected).map(item => (
            <CartItem key={item.id} item={item} onChangeQty={changeQuantity} />
          ))
        )}
      </div>

      {/* Total + Submit */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-base">Total: ₱{total.toFixed(2)}</span>
        <button
          onClick={handleSubmit}
          disabled={submitting || !Object.keys(selected).length}
          className="ml-2 py-2 px-4 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 active:scale-[0.97] transition disabled:opacity-50"
        >
          {submitting ? 'Processing...' : 'Complete Order'}
        </button>
      </div>
    </div>
  </div>
</div>
  )
}

/* CARD COMPONENTS */
function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="px-4 py-3 border-b text-sm font-medium bg-gray-50">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function CardHeader({ title }) {
  return <div className="p-4 border-b font-medium sticky top-0 bg-white z-10">{title}</div>
}

function CardFooter({ children }) {
  return <div className="p-4 border-t bg-white sticky bottom-0 z-10">{children}</div>
}

/* SERVICE TILE */
function ServiceTile({ service, onClick, selected, quantity }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border text-left transition relative
        ${selected 
          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
          : 'bg-white hover:shadow-md'}
      `}
    >
      <p className="text-sm font-medium">{service.name}</p>
      <p className={`text-xs ${selected ? 'opacity-70' : 'text-gray-400'}`}>₱{service.price}</p>
      {quantity && <span className="absolute top-2 right-2 text-xs bg-white text-black px-2 py-1 rounded-full">{quantity}</span>}
    </button>
  )
}

/* CART ITEM */
function CartItem({ item, onChangeQty }) {
  return (
    <div className="flex justify-between items-center p-3 border rounded-xl bg-gray-50">
      <div>
        <p className="text-sm font-medium">{item.name}</p>
        <p className="text-xs text-gray-500">₱{item.price}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onChangeQty(item.id, -1)}
          className="w-8 h-8 rounded-full bg-gray-200 flex justify-center items-center active:scale-95"
        >
          −
        </button>
        <span className="min-w-[20px] text-center">{item.quantity}</span>
        <button
          onClick={() => onChangeQty(item.id, 1)}
          className="w-8 h-8 rounded-full bg-gray-200 flex justify-center items-center active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  )
}