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
  const [filter, setFilter] = useState('all')

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
    setOrders(prevOrders =>
      prevOrders.map(o =>
        o.id === orderId ? { ...o, status: newStatus } : o
      )
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

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      setError('Failed to sign out')
    }
  }

  const grouped = {
    pending:  orders.filter(o => o.status === 'pending'),
    done:     orders.filter(o => o.status === 'done'),
    released: orders.filter(o => o.status === 'released'),
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Orders</h1>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-sm px-3 py-2 border rounded-lg outline-none"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
            <option value="released">Released</option>
          </select>

          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + New Order
          </button>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            title="Sign Out"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-400">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-gray-400 text-sm">No orders yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 text-sm underline"
            >
              Create the first one
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([status, statusOrders]) =>
              statusOrders.length > 0 && (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={status} />
                    <span className="text-xs text-gray-400">{statusOrders.length}</span>
                  </div>
                  <div className="space-y-2">
                    {statusOrders.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onUpdateStatus={updateStatus}
                        showPaymentStatus={true}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* New Order modal */}
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

function StatusBadge({ status }) {
  const styles = {
    pending:  'bg-yellow-100 text-yellow-800',
    done:     'bg-green-100 text-green-800',
    released: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${styles[status]}`}>
      {status}
    </span>
  )
}