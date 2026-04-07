import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function NewOrderForm({ onClose, onCreated }) {
  const { user } = useAuth()

  const [services, setServices] = useState([])
  const [selected, setSelected] = useState({})
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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

  const toggleService = (service) => {
    setSelected(prev => {
      if (prev[service.id]) {
        return {
          ...prev,
          [service.id]: {
            ...prev[service.id],
            quantity: prev[service.id].quantity + 1
          }
        }
      }
      return { ...prev, [service.id]: { ...service, quantity: 1 } }
    })
  }

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

      return { ...prev, [id]: { ...item, quantity: qty } }
    })
  }

  const total = Object.values(selected).reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  )

  const handleSubmit = async () => {
    if (!Object.keys(selected).length) {
      setError('Select services first')
      return
    }

    setSubmitting(true)
    setError('')

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName || 'Walk-in',
        notes,
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

    const items = Object.values(selected).map(i => ({
      order_id: order.id,
      service_id: i.id,
      service_name: i.name,
      price: i.price,
      quantity: i.quantity,
    }))

    await supabase.from('order_items').insert(items)

    onCreated()
  }

  const base = services.filter(s => s.type === 'base')
  const addons = services.filter(s => s.type === 'addon')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex">

      <div className="bg-gray-50 w-full flex flex-col">

        {/* HEADER */}
        <div className="bg-white px-4 py-3 flex justify-between items-center border-b">
          <h2 className="font-semibold">POS Order</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* LEFT: SERVICES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            <Card title="Services">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {base.map(s => (
                  <ServiceTile key={s.id} service={s} onClick={() => toggleService(s)} />
                ))}
              </div>
            </Card>

            <Card title="Add-ons">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {addons.map(s => (
                  <ServiceTile key={s.id} service={s} onClick={() => toggleService(s)} />
                ))}
              </div>
            </Card>

          </div>

          {/* RIGHT: CART */}
          <div className="w-[320px] bg-white border-l flex flex-col">

            <CardHeader title="Order Summary" />

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {Object.values(selected).length === 0 && (
                <p className="text-sm text-gray-400 text-center mt-10">
                  No items yet
                </p>
              )}

              {Object.values(selected).map(item => (
                <CartItem
                  key={item.id}
                  item={item}
                  onChangeQty={changeQuantity}
                />
              ))}
            </div>

            <CardFooter>
              <input
                placeholder="Customer (optional)"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full mb-2 px-3 py-2 border rounded-xl text-sm"
              />

              <div className="flex justify-between mb-2">
                <span>Total</span>
                <span className="font-bold">₱{total.toFixed(2)}</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 bg-blue-600 text-white rounded-xl"
              >
                {submitting ? 'Processing...' : 'Charge'}
              </button>
            </CardFooter>
          </div>

        </div>
      </div>
    </div>
  )
}

/* 🔥 SHADCN STYLE CARD */
function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border">
      <div className="px-4 py-3 border-b text-sm font-medium">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function CardHeader({ title }) {
  return <div className="p-4 border-b font-medium">{title}</div>
}

function CardFooter({ children }) {
  return <div className="p-4 border-t">{children}</div>
}

/* 🔥 POS TILE */
function ServiceTile({ service, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-2xl border bg-white text-left active:scale-[0.97] transition"
    >
      <p className="text-sm font-medium">{service.name}</p>
      <p className="text-xs text-gray-400">₱{service.price}</p>
    </button>
  )
}

/* 🔥 CART ITEM */
function CartItem({ item, onChangeQty }) {
  return (
    <div className="flex justify-between items-center p-2 border rounded-xl">
      <div>
        <p className="text-sm">{item.name}</p>
        <p className="text-xs text-gray-400">₱{item.price}</p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => onChangeQty(item.id, -1)}>−</button>
        <span>{item.quantity}</span>
        <button onClick={() => onChangeQty(item.id, 1)}>+</button>
      </div>
    </div>
  )
}