import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

import OrderRow from '../components/orders/OrderRow'
import OrderCard from '../components/orders/OrderCard'
import OrderDrawer from '../components/orders/OrderDrawer'
import NewOrderForm from '../components/orders/NewOrderForm'
import OrdersSidebar from '../components/layout/OrdersSidebar'

import { FiMenu, FiPlus, FiSearch, FiX } from 'react-icons/fi'

const TABS = [
  { key: 'pending',  label: 'Pending' },
  { key: 'done',     label: 'Done' },
  { key: 'released', label: 'Released' },
  { key: 'all',      label: 'All' },
]

const SORT_PRIORITY = (a, b) => {
  if (!a.payment_status && b.payment_status) return -1
  if (a.payment_status && !b.payment_status) return 1
  if (a.status === 'pending' && b.status !== 'pending') return -1
  if (a.status !== 'pending' && b.status === 'pending') return 1
  return new Date(b.created_at) - new Date(a.created_at)
}

export default function Orders() {
  const { user } = useAuth()
  const searchRef = useRef(null)

  const [orders, setOrders]               = useState([])
  const [counts, setCounts]               = useState({})
  const [loading, setLoading]             = useState(true)
  const [filter, setFilter]               = useState('pending')
  const [search, setSearch]               = useState('')
  const [showForm, setShowForm]           = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [sidebarOpen, setSidebarOpen]     = useState(false)

  const fetchOrders = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('orders_with_creator')
      .select(`
        *,
        order_items(id, service_name, price, quantity),
        order_addons(id, quantity, unit_price, total, addons(name))
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const c = { all: data.length }
      TABS.forEach(t => {
        if (t.key !== 'all') c[t.key] = data.filter(o => o.status === t.key).length
      })
      setCounts(c)

      const filtered = filter === 'all' ? data : data.filter(o => o.status === filter)
      setOrders([...filtered].sort(SORT_PRIORITY))
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    fetchOrders()

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, filter])

  useEffect(() => {
    if (!selectedOrder) return
    const updated = orders.find(o => o.id === selectedOrder.id)
    if (updated) setSelectedOrder(updated)
  }, [orders])

  const updateStatus = async (id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    if (status === 'released') setSelectedOrder(null)
    await supabase.from('orders').update({ status }).eq('id', id)
    fetchOrders()
  }

  const markPaid = async (id) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: true } : o))
    await supabase.from('orders').update({ payment_status: true }).eq('id', id)
    fetchOrders()
  }

  // Filter orders by search query (client-side, instant)
  const displayedOrders = search.trim()
    ? orders.filter(o =>
        o.customer_name.toLowerCase().includes(search.toLowerCase())
      )
    : orders

  return (
    <div className="flex h-screen bg-gray-50">
      <OrdersSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 ml-0 md:ml-64 flex flex-col overflow-hidden relative">

        {/* ── PAGE HEADER — search bar ─────────────── */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">

          {/* Mobile menu button */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FiMenu size={18} />
          </button>

          {/* Search bar — takes up all remaining space */}
          <div className="flex-1 relative">
            <FiSearch
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search customer name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="
                w-full h-9 pl-8 pr-8 rounded-lg border border-gray-200
                bg-gray-50 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                transition
              "
            />
            {/* Clear button */}
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus() }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          {/* Desktop new order button */}
          <button
            onClick={() => setShowForm(true)}
            className="
              hidden md:flex items-center gap-1.5 shrink-0
              h-9 px-4 rounded-lg text-sm font-semibold
              bg-blue-600 text-white hover:bg-blue-700 transition
            "
          >
            <FiPlus size={15} />
            New Order
          </button>
        </div>

        {/* ── FILTER TABS ────────────────────────────── */}
        <div className="bg-white border-b px-4 flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const count = counts[tab.key]
            const isActive = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => { setFilter(tab.key); setSearch('') }}
                className={`
                  h-11 px-3.5 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'}
                `}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`
                    ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold
                    ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}
                  `}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── ORDER LIST ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayedOrders.length === 0 ? (
            search.trim() ? (
              <NoResults query={search} onClear={() => setSearch('')} />
            ) : (
              <EmptyState filter={filter} onNewOrder={() => setShowForm(true)} />
            )
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-xl border mx-4 mt-4 overflow-hidden shadow-sm">
                <div className="grid grid-cols-[1fr_1.6fr_90px_80px_90px_140px] text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5 border-b bg-gray-50">
                  <span>Customer</span>
                  <span>Services</span>
                  <span>Total</span>
                  <span>Payment</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {displayedOrders.map(order => (
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

              {/* Mobile cards */}
              <div className="md:hidden px-3 pt-3 pb-24 space-y-2.5">
                {displayedOrders.map(order => (
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
        </div>

        {/* ── MOBILE FAB ─────────────────────────────── */}
        <button
          onClick={() => setShowForm(true)}
          className="
            md:hidden
            fixed bottom-5 right-5 z-30
            w-14 h-14 rounded-full shadow-lg
            bg-blue-600 text-white
            flex items-center justify-center
            active:scale-95 transition-transform
          "
          aria-label="New Order"
        >
          <FiPlus size={24} />
        </button>

        {/* ── NEW ORDER FORM ─────────────────────────── */}
        {showForm && (
          <NewOrderForm
            onClose={() => setShowForm(false)}
            onCreated={() => { setShowForm(false); fetchOrders() }}
          />
        )}

        {/* ── ORDER DRAWER ───────────────────────────── */}
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

function NoResults({ query, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-2xl">
        🔍
      </div>
      <p className="text-gray-700 font-medium">No results for "{query}"</p>
      <p className="text-gray-400 text-sm mt-1 mb-4">Try a different name</p>
      <button
        onClick={onClear}
        className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold"
      >
        Clear search
      </button>
    </div>
  )
}

function EmptyState({ filter, onNewOrder }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-2xl">
        📋
      </div>
      <p className="text-gray-700 font-medium">No {filter !== 'all' ? filter : ''} orders</p>
      <p className="text-gray-400 text-sm mt-1 mb-4">
        {filter === 'pending' ? 'New orders will appear here' : 'Try a different filter'}
      </p>
      {filter === 'pending' && (
        <button
          onClick={onNewOrder}
          className="h-10 px-5 bg-blue-600 text-white rounded-lg text-sm font-semibold"
        >
          + New Order
        </button>
      )}
    </div>
  )
}