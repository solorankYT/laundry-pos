import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

import OrderRow from '../components/orders/OrderRow'
import OrderCard from '../components/orders/OrderCard'
import OrderDrawer from '../components/orders/OrderDrawer'
import NewOrderForm from '../components/orders/NewOrderForm'
import { ORDER_ROW_GRID, ORDER_SELECT, orderActionError, searchPattern } from '../components/orders/orderData'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  X,
  Plus,
  ClipboardList,
  SearchX,
} from 'lucide-react'

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'done', label: 'Done' },
  { key: 'released', label: 'Released' },
  { key: 'cancelled', label: 'Voided' },
  { key: 'all', label: 'All' },
]

const PAGE_SIZE = 25

export default function Orders() {
  const { user, role } = useAuth()
  const searchRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('status')
  const filter = TABS.some(tab => tab.key === activeTab) ? activeTab : 'pending'

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [openPayment, setOpenPayment] = useState(false)
  const paramOpensForm = searchParams.get('action') === 'new'

  function reloadOrders() {
    setRefresh(value => value + 1)
  }

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, reloadOrders)
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    const term = search.trim()
    const start = page * PAGE_SIZE

    async function fetchOrders() {
      setLoading(true)
      setLoadError('')

      let query = supabase
        .from('orders')
        .select(ORDER_SELECT)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(start, start + PAGE_SIZE)
        .abortSignal(controller.signal)

      if (term) query = query.ilike('search_text', searchPattern(term))
      else if (filter !== 'all') query = query.eq('status', filter)

      const { data, error } = await query
      if (controller.signal.aborted) return

      if (error) {
        setLoadError('Orders could not be loaded. Check the connection and retry.')
      } else if (data.length === 0 && page > 0) {
        setPage(value => value - 1)
        return
      } else {
        setOrders(data.slice(0, PAGE_SIZE))
        setHasMore(data.length > PAGE_SIZE)
        setSelectedOrder(current => data.find(order => order.id === current?.id) ?? current)
      }

      setLoading(false)
    }

    const timer = window.setTimeout(fetchOrders, term ? 250 : 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [user, filter, search, page, refresh])

  async function updateStatus(id, status) {
    setActionError('')
    const { error } = await supabase.rpc('advance_order', { p_order_id: id, p_status: status })

    if (error) {
      setActionError(orderActionError(error, 'The status update could not be confirmed. Check the order and retry.'))
    } else {
      setSelectedOrder(order => order?.id === id ? { ...order, status } : order)
    }

    reloadOrders()
  }

  async function markPaid(id, request) {
    const { error, status } = await supabase.rpc('record_order_payment', {
      p_order_id: id,
      p_request_id: request.id,
      p_method: request.quote.method,
      p_expected_total: request.expectedTotal,
      p_expected_updated_at: request.expectedUpdatedAt,
      p_discount_amount: request.quote.complimentary ? null : request.quote.discountAmount,
      p_adjustment_reason: request.quote.reason,
      p_complimentary: request.quote.complimentary,
    })

    if (error) {
      return { error, status }
    }

    setSelectedOrder(order => order?.id === id ? {
      ...order,
      subtotal: request.quote.subtotal,
      total: request.quote.total,
      discount_amount: request.quote.discountAmount,
      discount_reason: request.quote.reason,
      payment_status: true,
    } : order)
    reloadOrders()
    return {}
  }

  async function voidOrder(id, reason) {
    const { error } = await supabase.rpc('void_order', { p_order_id: id, p_reason: reason })

    if (error) {
      return orderActionError(error, 'The void could not be confirmed. Refresh the order before retrying.')
    }

    setSelectedOrder(null)
    reloadOrders()
    return ''
  }

  function handleSearch(value) {
    setSearch(value)
    setPage(0)
  }

  function openOrder(order, showPayment = false) {
    setActionError('')
    setOpenPayment(showPayment)
    setSelectedOrder(order)
  }

  function handleNewOrder() {
    setSelectedOrder(null)
    setEditingOrder(null)
    setShowForm(true)
  }

  function handleEditOrder(order) {
    setSelectedOrder(null)
    setEditingOrder(order)
  }

  function closeForm() {
    setShowForm(false)
    setEditingOrder(null)
    if (paramOpensForm) {
      const params = new URLSearchParams(searchParams)
      params.delete('action')
      setSearchParams(params, { replace: true })
    }
  }

  async function handleFormCreated(orderId) {
    closeForm()
    setActionError('')
    reloadOrders()

    const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', orderId).single()
    if (error) {
      setActionError('The order was saved, but its details could not be loaded. Use the order list to reopen it.')
    } else {
      openOrder(data)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-6rem-env(safe-area-inset-bottom))] bg-blue-50/50 md:h-dvh">

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* SEARCH + NEW ORDER */}
        <div className="bg-white border-b border-blue-100 px-4 py-3 flex items-center gap-3">

          <div className="flex-1 relative">

            <Search
              size={16}
              className="
                absolute left-3 top-1/2 -translate-y-1/2
                text-slate-400
                pointer-events-none
              "
            />

            <input
              ref={searchRef}
              type="text"
              placeholder="Search claim number, phone, or customer"
              aria-label="Search orders across all statuses"
              maxLength={120}
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="
                w-full h-10
                pl-9 pr-9
                rounded-lg
                border border-blue-100
                bg-blue-50/40
                text-sm text-slate-900
                placeholder:text-slate-400
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
                  handleSearch('')
                  searchRef.current?.focus()
                }}
                aria-label="Clear search"
                className="
                  absolute right-2.5 top-1/2 -translate-y-1/2
                  w-5 h-5
                  flex items-center justify-center
                  rounded-full
                  text-slate-400
                  hover:bg-blue-50
                  hover:text-slate-600
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
        <div className="
          bg-white
          border-b border-blue-100
          px-4 py-2.5
          flex gap-1.5
          overflow-x-auto
        ">
          {TABS.map(tab => {
            const isActive = !search.trim() && filter === tab.key

            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => {
                  setSearchParams({ status: tab.key })
                  handleSearch('')
                  setActionError('')
                }}
                aria-pressed={isActive}
                className={`
                  shrink-0
                  flex items-center gap-1.5
                  h-9 px-3.5
                  rounded-full
                  text-sm font-medium
                  transition-colors

                  ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-slate-500 hover:bg-blue-100 hover:text-slate-700'
                  }
                `}
              >
                {tab.label}

              </button>
            )
          })}
        </div>

        {search.trim() && (
          <p className="px-4 py-2 text-xs text-slate-600">Searching all order statuses</p>
        )}

        {actionError && !selectedOrder && (
          <p role="alert" className="mx-4 my-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>
        )}

        {/* ORDER LIST */}
        <div className="min-h-0 flex-1 overflow-y-auto">

          {loadError ? (
            <div role="alert" className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}{' '}
              <button type="button" className="font-semibold underline" onClick={reloadOrders}>Retry</button>
            </div>
          ) : loading ? (
            <>
              {/* Desktop skeleton */}
              <div className="
                hidden lg:block
                bg-white
                rounded-xl
                border border-blue-100
                mx-4 mt-4
                overflow-hidden
              ">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>

              {/* Mobile skeleton */}
              <div className="lg:hidden px-3 pt-3 pb-4 space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </>
          ) : orders.length === 0 ? (

            search.trim() ? (
              <NoResults
                query={search}
                onClear={() => handleSearch('')}
              />
            ) : (
              <EmptyState
                filter={filter}
                onNewOrder={handleNewOrder}
              />
            )

          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="
                hidden lg:block
                bg-white
                rounded-xl
                border border-blue-100
                mx-4 mt-4
                overflow-hidden
                shadow-sm
              ">

                <div className={`
                  grid ${ORDER_ROW_GRID}
                  text-[11px]
                  font-semibold
                  text-slate-500
                  uppercase
                  tracking-wide
                  px-4 py-2.5
                  border-b border-blue-100
                  bg-blue-50/50
                `}>
                  <span>Customer</span>
                  <span>Services</span>
                  <span>Total / payment</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>

                {orders.map(order => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onClick={() => openOrder(order)}
                    onUpdateStatus={updateStatus}
                    onOpenPayment={() => openOrder(order, true)}
                    isActive={selectedOrder?.id === order.id}
                  />
                ))}

              </div>

              {/* MOBILE CARDS */}
              <div className="
                lg:hidden
                px-3
                pt-3
                pb-4
                space-y-2.5
              ">
                {orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => openOrder(order)}
                    onUpdateStatus={updateStatus}
                    onOpenPayment={() => openOrder(order, true)}
                    isActive={selectedOrder?.id === order.id}
                  />
                ))}
              </div>
            </>
          )}

        </div>

        {!loading && !loadError && (page > 0 || hasMore) && (
          <nav aria-label="Order pages" className="flex items-center justify-center gap-4 border-t border-blue-100 bg-white px-4 py-3 text-sm">
            <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button>
            <span>Page {page + 1}</span>
            <button type="button" disabled={!hasMore} onClick={() => setPage(value => value + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button>
          </nav>
        )}

        {/* NEW / EDIT ORDER FORM */}
        {(showForm || paramOpensForm || editingOrder) && (
          <NewOrderForm
            key={editingOrder?.id ?? 'new'}
            order={editingOrder}
            onClose={closeForm}
            onCreated={handleFormCreated}
          />
        )}

        {/* ORDER DRAWER */}
        {selectedOrder && (
          <OrderDrawer
            key={selectedOrder.id}
            order={selectedOrder}
            actionError={actionError}
            startPayment={openPayment}
            onClose={() => setSelectedOrder(null)}
            onUpdateStatus={updateStatus}
            onMarkPaid={markPaid}
            onEdit={handleEditOrder}
            onVoid={role === 'manager' ? voidOrder : undefined}
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
      border border-blue-100
      p-4
      animate-pulse
      space-y-3
    ">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded" />
        </div>

        <div className="h-5 w-14 bg-blue-50 rounded-md" />
      </div>

      <div className="h-6 w-32 bg-slate-200 rounded" />
      <div className="h-3 w-40 bg-slate-100 rounded" />

      <div className="h-11 w-full bg-blue-50 rounded-xl" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className={`
      grid ${ORDER_ROW_GRID}
      items-center
      px-4 py-3.5
      border-t border-blue-50
      animate-pulse
    `}>
      <div className="h-3.5 w-24 bg-slate-200 rounded" />
      <div className="h-3 w-32 bg-slate-100 rounded" />
      <div className="h-3.5 w-28 bg-slate-200 rounded" />
      <div className="h-5 w-14 bg-blue-50 rounded-md" />
      <div className="h-10 w-28 bg-blue-50 rounded-lg ml-auto" />
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
        bg-blue-50
        flex items-center justify-center
        mb-3
      ">
        <SearchX size={20} className="text-blue-400" />
      </div>

      <p className="text-slate-700 font-medium text-sm">
        No results for "{query}"
      </p>

      <p className="text-slate-400 text-xs mt-1 mb-4">
        Try another claim number, phone, or customer
      </p>

      <button
        type="button"
        onClick={onClear}
        className="
          h-9 px-4
          bg-blue-50
          text-blue-700
          rounded-lg
          text-sm font-semibold
          hover:bg-blue-100
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
        bg-blue-50
        flex items-center justify-center
        mb-3
      ">
        <ClipboardList
          size={20}
          className="text-blue-400"
        />
      </div>

      <p className="text-slate-700 font-medium text-sm">
        No {filter !== 'all' ? filter : ''} orders
      </p>

      <p className="text-slate-400 text-xs mt-1 mb-4">
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
            hover:bg-blue-700
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
