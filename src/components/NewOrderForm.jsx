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
        customer_name: customerName,
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
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-center p-2">
      <div className="bg-gray-50 w-full max-w-3xl flex flex-col rounded-2xl shadow-lg overflow-hidden">

        {/* HEADER */}
        <div className="bg-white px-4 py-3 flex justify-between items-center border-b sticky top-0 z-10">
          <h2 className="font-semibold text-lg">POS Order</h2>
          <button onClick={onClose} className="text-xl hover:text-red-500">✕</button>
        </div>

        {/* ERROR */}
        {error && <div className="text-center text-red-500 p-2">{error}</div>}

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

          {/* SERVICES */}
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

          {/* CART */}
          <div className="md:w-[320px] bg-white border-t md:border-t-0 md:border-l flex flex-col">
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
              type="text"
              name="customer"
              placeholder="Customer Name"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full mb-2 px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />

              <div className="flex justify-between mb-2 text-base font-medium">
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 active:scale-[0.97] transition"
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
function ServiceTile({ service, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-2xl border bg-white text-left active:scale-[0.97] transition hover:shadow-md"
    >
      <p className="text-sm font-medium">{service.name}</p>
      <p className="text-xs text-gray-400">₱{service.price}</p>
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