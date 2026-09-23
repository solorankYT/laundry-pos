import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

import OrderRow from '../components/orders/OrderRow'
import OrderCard from '../components/orders/OrderCard'
import OrderDrawer from '../components/orders/OrderDrawer'
import NewOrderForm from '../components/orders/NewOrderForm'
import OrdersSidebar from '../components/layout/OrdersSidebar'
import { ORDER_ROW_GRID } from '../components/orders/orderUi'

import { Search, X, Plus, ClipboardList, SearchX } from 'lucide-react'
import { MobileNav } from '../components/layout/MobileNav'

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'done', label: 'Done' },
  { key: 'released', label: 'Released' },
  { key: 'all', label: 'All' },
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

  const [orders, setOrders] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')

  // New order
  const [showForm, setShowForm] = useState(false)

  // Edit order
  const [editingOrder, setEditingOrder] = useState(null)

  // Selected order drawer
  const [selectedOrder, setSelectedOrder] = useState(null)

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id,
          service_id,
          service_name,
          price,
          quantity
        ),
        order_addons(
          id,
          addon_id,
          quantity,
          unit_price,
          total,
          addons(name)
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const c = { all: data.length }

      TABS.forEach(tab => {
        if (tab.key !== 'all') {
          c[tab.key] = data.filter(
            order => order.status === tab.key
          ).length
        }
      })

      setCounts(c)

      const filtered =
        filter === 'all'
          ? data
          : data.filter(order => order.status === filter)

      setOrders([...filtered].sort(SORT_PRIORITY))
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
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        fetchOrders
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, filter])

  /*
   * Keep the drawer synchronized with realtime/order updates.
   */
  useEffect(() => {
    if (!selectedOrder) return

    const updated = orders.find(
      order => order.id === selectedOrder.id
    )

    if (updated) {
      setSelectedOrder(updated)
    }
  }, [orders])

  /*
   * Update order status.
   */
  const updateStatus = async (id, status) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === id
          ? { ...order, status }
          : order
      )
    )

    if (status === 'released') {
      setSelectedOrder(null)
    }

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error('Failed to update order status:', error)
      await fetchOrders()
      return
    }

    await fetchOrders()
  }

  /*
   * Mark order as paid.
   */
  const markPaid = async id => {
    setOrders(prev =>
      prev.map(order =>
        order.id === id
          ? { ...order, payment_status: true }
          : order
      )
    )

    const { error } = await supabase
      .from('orders')
      .update({ payment_status: true })
      .eq('id', id)

    if (error) {
      console.error('Failed to mark order as paid:', error)
      await fetchOrders()
      return
    }

    await fetchOrders()
  }

  /*
   * Open New Order form.
   */
  const handleNewOrder = () => {
    setSelectedOrder(null)
    setEditingOrder(null)
    setShowForm(true)
  }

  /*
   * Open Edit Order form.
   */
  const handleEditOrder = order => {
    setSelectedOrder(null)
    setShowForm(false)
    setEditingOrder(order)
  }

  /*
   * Delete an order and its related items/add-ons.
   *
   * We delete the children first because order_items
   * and order_addons may reference the order.
   */
  const handleDeleteOrder = async orderId => {
    try {
      // Delete order add-ons
      const { error: addonsError } = await supabase
        .from('order_addons')
        .delete()
        .eq('order_id', orderId)

      if (addonsError) throw addonsError

      // Delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      if (itemsError) throw itemsError

      // Delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (orderError) throw orderError

      setSelectedOrder(null)
      setEditingOrder(null)

      await fetchOrders()
    } catch (error) {
      console.error('Failed to delete order:', error)
      alert('Failed to delete order. Please try again.')
    }
  }

  /*
   * After creating or editing an order.
   */
  const handleFormCreated = async () => {
    setShowForm(false)
    setEditingOrder(null)
    await fetchOrders()
  }

  const displayedOrders = search.trim()
    ? orders.filter(order =>
        order.customer_name
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : orders

  return (
    <div className="flex h-screen bg-neutral-50">

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

        {/* SEARCH + NEW ORDER */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">

          <div className="flex-1 relative">

            <Search
              size={16}
              className="
                absolute left-3 top-1/2 -translate-y-1/2
                text-neutral-400 pointer-events-none
              "
            />

            <input
              ref={searchRef}
              type="text"
              placeholder="Search customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="
                w-full h-10
                pl-9 pr-9
                rounded-lg
                border border-neutral-200
                bg-neutral-50
                text-sm text-neutral-900
                placeholder:text-neutral-400
                focus:outline-none
                focus:bg-white
                focus:border-blue-400
                focus:ring-2
                focus:ring-blue-100
                transition
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  searchRef.current?.focus()
                }}
                aria-label="Clear search"
                className="
                  absolute right-2.5 top-1/2 -translate-y-1/2
                  w-5 h-5
                  flex items-center justify-center
                  rounded-full
                  text-neutral-400
                  hover:bg-neutral-200
                  hover:text-neutral-600
                  transition
                "
              >
                <X size={13} />
              </button>
            )}

          </div>

          <button
            type="button"
            onClick={handleNewOrder}
            className="
              hidden md:flex
              items-center gap-1.5
              shrink-0
              h-10 px-4
              rounded-lg
              text-sm font-semibold
              bg-blue-600 text-white
              hover:bg-blue-700
              active:scale-[0.98]
              transition
            "
          >
            <Plus size={16} />
            New Order
          </button>

        </div>

   {/* FILTER TABS */}
      <div className="bg-white border-b border-stone-200 px-4 py-2.5 flex gap-1.5 overflow-x-auto">

        {TABS.map(tab => {
          const count = counts[tab.key]
          const isActive = filter === tab.key

          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => {
                setFilter(tab.key)
                setSearch('')
              }}
              className={`
                shrink-0
                flex items-center gap-1.5
                h-9 px-3.5
                rounded-full
                text-sm font-medium
                transition-colors

                ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }
              `}
            >
              {tab.label}

              {typeof count === 'number' && count > 0 && (
                <span
                  className={`
                    text-[11px]
                    font-semibold
                    min-w-[18px]
                    px-1
                    rounded-full
                    leading-[1.4]
                    text-center
                    tabular-nums

                    ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-stone-400'
                    }
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}

      </div>
        {/* ORDER LIST */}
        <div className="flex-1 overflow-y-auto">

          {loading ? (
            <>
              {/* Desktop skeleton */}
              <div className="hidden lg:block bg-white rounded-xl border mx-4 mt-4 overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>

              {/* Mobile skeleton */}
              <div className="lg:hidden px-3 pt-3 pb-28 space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </>
          ) : displayedOrders.length === 0 ? (

            search.trim() ? (
              <NoResults
                query={search}
                onClear={() => setSearch('')}
              />
            ) : (
              <EmptyState
                filter={filter}
                onNewOrder={handleNewOrder}
              />
            )

          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block bg-white rounded-xl border mx-4 mt-4 overflow-hidden shadow-sm">

                <div className={`
                  grid ${ORDER_ROW_GRID}
                  text-[11px]
                  font-semibold
                  text-stone-500
                  uppercase
                  tracking-wide
                  px-4 py-2.5
                  border-b
                  bg-stone-50
                `}>
                  <span>Customer</span>
                  <span>Services</span>
                  <span>Total / payment</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>

                {displayedOrders.map(order => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onClick={() => setSelectedOrder(order)}
                    onUpdateStatus={updateStatus}
                    onMarkPaid={markPaid}
                    onEdit={handleEditOrder}
                    onDelete={handleDeleteOrder}
                    isActive={selectedOrder?.id === order.id}
                  />
                ))}

              </div>

              {/* Mobile cards */}
              <div className="lg:hidden px-3 pt-3 pb-28 space-y-2.5">

                {displayedOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => setSelectedOrder(order)}
                    onUpdateStatus={updateStatus}
                    onMarkPaid={markPaid}
                    onEdit={handleEditOrder}
                    onDelete={handleDeleteOrder}
                    isActive={selectedOrder?.id === order.id}
                  />
                ))}

              </div>
            </>
          )}

        </div>

        {/* MOBILE NAV */}
        <div className="flex">
        <MobileNav onAddClick={handleNewOrder} />
        </div>
        {/* NEW / EDIT ORDER FORM */}
        {(showForm || editingOrder) && (
          <NewOrderForm
            order={editingOrder}
            onClose={() => {
              setShowForm(false)
              setEditingOrder(null)
            }}
            onCreated={handleFormCreated}
          />
        )}

        {/* ORDER DRAWER */}
        {selectedOrder && (
          <OrderDrawer
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdateStatus={updateStatus}
            onMarkPaid={markPaid}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
          />
        )}

      </main>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="
      bg-white
      rounded-xl
      border border-neutral-200
      p-4
      animate-pulse
      space-y-3
    ">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 bg-neutral-200 rounded" />
          <div className="h-3 w-24 bg-neutral-100 rounded" />
        </div>
        <div className="h-5 w-14 bg-neutral-100 rounded-md" />
      </div>

      <div className="h-6 w-32 bg-neutral-200 rounded" />
      <div className="h-3 w-40 bg-neutral-100 rounded" />

      <div className="h-11 w-full bg-neutral-100 rounded-xl" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className={`
      grid ${ORDER_ROW_GRID}
      items-center
      px-4 py-3.5
      border-t
      animate-pulse
    `}>
      <div className="h-3.5 w-24 bg-neutral-200 rounded" />
      <div className="h-3 w-32 bg-neutral-100 rounded" />
      <div className="h-3.5 w-28 bg-neutral-200 rounded" />
      <div className="h-5 w-14 bg-neutral-100 rounded-md" />
      <div className="h-10 w-28 bg-neutral-100 rounded-lg ml-auto" />
    </div>
  )
}

function NoResults({ query, onClear }) {
  return (
    <div className="
      flex flex-col
      items-center justify-center
      h-full
      py-24 px-8
      text-center
    ">
      <div className="
        w-11 h-11
        rounded-full
        bg-neutral-100
        flex items-center justify-center
        mb-3
      ">
        <SearchX size={20} className="text-neutral-400" />
      </div>

      <p className="text-neutral-700 font-medium text-sm">
        No results for "{query}"
      </p>

      <p className="text-neutral-400 text-xs mt-1 mb-4">
        Try a different name
      </p>

      <button
        type="button"
        onClick={onClear}
        className="
          h-9 px-4
          bg-neutral-100
          text-neutral-700
          rounded-lg
          text-sm font-semibold
          hover:bg-neutral-200
          transition
        "
      >
        Clear search
      </button>
    </div>
  )
}

function EmptyState({ filter, onNewOrder }) {
  return (
    <div className="
      flex flex-col
      items-center justify-center
      h-full
      py-24 px-8
      text-center
    ">
      <div className="
        w-11 h-11
        rounded-full
        bg-neutral-100
        flex items-center justify-center
        mb-3
      ">
        <ClipboardList
          size={20}
          className="text-neutral-400"
        />
      </div>

      <p className="text-neutral-700 font-medium text-sm">
        No {filter !== 'all' ? filter : ''} orders
      </p>

      <p className="text-neutral-400 text-xs mt-1 mb-4">
        {filter === 'pending'
          ? 'New laundry orders will appear here'
          : 'Try a different filter'}
      </p>

      {filter === 'pending' && (
        <button
          type="button"
          onClick={onNewOrder}
          className="
            h-10 px-5
            bg-blue-600
            text-white
            rounded-lg
            text-sm font-semibold
            active:scale-[0.98]
            transition
          "
        >
          New Order
        </button>
      )}

    </div>
  )
}