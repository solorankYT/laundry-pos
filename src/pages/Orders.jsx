import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

import OrderRow from '../components/orders/OrderRow'
import OrderCard from '../components/orders/OrderCard'
import OrderDrawer from '../components/orders/OrderDrawer'
import NewOrderForm from '../components/orders/NewOrderForm'

import OrdersSidebar from '../components/layout/OrdersSidebar';
import { FiMenu } from 'react-icons/fi';

export default function Orders() {
  const { user } = useAuth()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  const [showForm, setShowForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true)

    let query = supabase
      .from('orders')
      .select(`*, order_items (id, service_name, price, quantity)`)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (!error) {
      // 🔥 PRIORITY SORTING (REAL BUSINESS LOGIC)
      const sorted = (data || []).sort((a, b) => {
        // unpaid first
        if (!a.payment_status && b.payment_status) return -1
        if (a.payment_status && !b.payment_status) return 1

        // pending first
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (a.status !== 'pending' && b.status === 'pending') return 1

        // newest
        return new Date(b.created_at) - new Date(a.created_at)
      })

      setOrders(sorted)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!user) return

    fetchOrders()

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        fetchOrders
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, filter])

  useEffect(() => {
    if (!selectedOrder) return

    const updated = orders.find(o => o.id === selectedOrder.id)
    if (updated) setSelectedOrder(updated)
  }, [orders])

  const updateStatus = async (id, status) => {
    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, status } : o))
    )

    // auto close when released
    if (status === 'released') {
      setSelectedOrder(null)
    }

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)

    if (error) fetchOrders()
  }


  const markPaid = async (id) => {
    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, payment_status: true } : o))
    )

    const { error } = await supabase
      .from('orders')
      .update({ payment_status: true })
      .eq('id', id)

    if (error) fetchOrders()
  }

  return (
  <div className="flex h-screen">
    <OrdersSidebar
      isOpen={sidebarOpen}
      toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
    />

    {sidebarOpen && (
      <div
        className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    )}

    <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 space-y-4 overflow-y-auto">
     <div className="flex justify-between items-center">

  <button
    className="md:hidden p-2 rounded-lg bg-gray-900 text-white mr-2"
    onClick={() => setSidebarOpen(!sidebarOpen)}
    >
      <FiMenu size={20} />
    </button>

    <h1 className="text-lg font-semibold flex-1">Orders</h1>

    <button
      onClick={() => setShowForm(true)}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
    >
      + New Order
    </button>
  </div>

      {/* FILTERS */}
      <div className="flex gap-2 overflow-x-auto">
        {['pending', 'done', 'released', 'all'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-2 text-xs rounded-full capitalize whitespace-nowrap transition
              ${filter === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center mt-20">
          <p className="text-gray-400 text-sm">No orders here</p>
          <p className="text-xs text-gray-300 mt-1">
            Try switching filter or create a new order
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
            <div className="grid grid-cols-6 text-xs text-gray-500 px-4 py-3 border-b">
              <span>Customer</span>
              <span>Services</span>
              <span>Total</span>
              <span>Payment</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {orders.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
                onUpdateStatus={updateStatus}
                onMarkPaid={markPaid}
                isActive={selectedOrder?.id === order.id}
              />
            ))}
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-3">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
                onUpdateStatus={updateStatus}
                onMarkPaid={markPaid}
                isActive={selectedOrder?.id === order.id}
              />
            ))}
          </div>
        </>
      )}

      {/* NEW ORDER FORM */}
      {showForm && (
        <NewOrderForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            fetchOrders();
          }}
        />
      )}

      {/* ORDER DRAWER */}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={updateStatus}
          onMarkPaid={markPaid}
        />
      )}
    </main>
  </div>
)
}