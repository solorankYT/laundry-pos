import { useRef, useState } from 'react'

export const ORDER_SELECT = `
  *,
  order_items(id,service_id,service_name,price,quantity),
  order_addons(id,addon_id,quantity,unit_price,total,addon_name,addons(name))
`

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'other', label: 'Other' },
]

export function searchPattern(value) {
  const term = value.replace(/^#\s*/, '')
  const normalized = /^[+\d][\d ()-]*$/.test(term) ? term.replace(/\D/g, '') : term
  return '%' + normalized.replace(/[\\%_]/g, '\\$&') + '%'
}

export function isRejectedOrderWrite(error, status) {
  if (error?.code === 'P0002') return true
  return status >= 400 && status < 500 && /^(22|23|42)/.test(error?.code ?? '')
}

export function orderActionError(error, fallback) {
  return ['22023', 'P0002', '42501'].includes(error?.code) ? error.message : fallback
}

export function formatPickup(value) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export const STAGES = ['pending', 'done', 'released']

export const STAGE_LABEL = {
  pending: 'Pending',
  done: 'Done',
  released: 'Released',
  cancelled: 'Voided',
}

export const NEXT_ACTION = {
  pending: { next: 'done', label: 'Mark as done' },
  done: { next: 'released', label: 'Release order' },
  released: null,
}

export const ORDER_ROW_GRID =
  'grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(148px,0.9fr)_112px_minmax(220px,auto)]'

export function peso(n) {
  return `₱${Number(n).toFixed(2)}`
}

export function orderCode(order) {
  if (order.order_number) return order.order_number
  if (order.id) return String(order.id)
  return null
}

export function formatServices(items) {
  if (!items || items.length === 0) return '—'

  return items
    .map(item =>
      item.quantity > 1
        ? `${item.service_name} ×${item.quantity}`
        : item.service_name
    )
    .join(' · ')
}

export function isOrderPaid(order) {
  return order.payment_status === true || order.payment_status === 'paid'
}

export function useOrderQuickActions({ order, onUpdateStatus }) {
  const [updating, setUpdating] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const statusRequest = useRef(false)

  const isPaid = isOrderPaid(order)
  const advance = NEXT_ACTION[order.status]
  const releaseBlocked = advance?.next === 'released' && !isPaid

  const runAdvance = async () => {
    setConfirm(null)
    if (!advance || statusRequest.current || releaseBlocked) return

    statusRequest.current = true
    setUpdating(true)
    try {
      await onUpdateStatus(order.id, advance.next)
    } finally {
      statusRequest.current = false
      setUpdating(false)
    }
  }

  const askAdvance = e => {
    e?.stopPropagation?.()
    if (!advance || updating || releaseBlocked) return

    setConfirm({
      message:
        advance.next === 'released'
          ? 'Release this order to the customer?'
          : 'Mark this order as done?',
      action: runAdvance,
    })
  }

  return {
    updating,
    setUpdating,
    confirm,
    setConfirm,
    isPaid,
    advance,
    releaseBlocked,
    askAdvance,
  }
}

export function activateOnEnter(handler) {
  return e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handler(e)
    }
  }
}
