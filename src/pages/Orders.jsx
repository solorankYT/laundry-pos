import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import NewOrderForm from '../components/NewOrderForm'
import OrderCard from '../components/OrderCard'
import { FiLogOut } from 'react-icons/fi'


export default function Orders() {
  const { user, signOut, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('pending')

  const fetchOrders = async (statusFilter = null) => {
    setLoading(true)

    let query = supabase
      .from('orders')
      .select(`*, order_items (id, service_name, price, quantity)`)
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (error) setError('Failed to load orders')
    else setOrders(data)

    setLoading(false)
  }

  useEffect(() => {
    if (!user) return

    fetchOrders(filter)

    const channel = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchOrders(filter)
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, filter])

  const updateStatus = async (orderId, newStatus) => {
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    )

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) {
      setError('Failed to update status')
      fetchOrders(filter)
    }
  }

  if (authLoading) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">Orders</h1>
        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
      </div>

      <div className="bg-white border-b flex justify-around text-sm sticky top-[60px] z-10">
        {['pending', 'done', 'released'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 py-3 capitalize ${
              filter === tab
                ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                : 'text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {loading ? (
          <p className="text-center text-gray-400 mt-10">Loading...</p>
        ) : orders.length === 0 ? (
          <div className="text-center mt-20 text-gray-400">
            No orders
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={updateStatus}
                showPaymentStatus
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg text-xl"
      >
        +
      </button>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-between items-center">
        <span className="text-xs text-gray-400">POS Ready</span>
        <button
          onClick={signOut}
          className="text-sm text-red-500"
        >
          Logout
        </button>
      </div>


      {showForm && (
        <NewOrderForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false)
            fetchOrders(filter)
          }}
        />
      )}
    </div>
  )
}