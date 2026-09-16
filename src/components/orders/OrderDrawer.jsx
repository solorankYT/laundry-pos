
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  CircleDollarSign,
} from 'lucide-react'
import ConfirmModal from '../ui/ConfirmModal'

dayjs.extend(relativeTime)

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    dot: 'bg-yellow-400',
    next: 'done',
    nextLabel: 'Mark as Done',
  },
  done: {
    label: 'Done',
    dot: 'bg-blue-500',
    next: 'released',
    nextLabel: 'Release to Customer',
  },
  released: {
    label: 'Released',
    dot: 'bg-gray-400',
    next: null,
    nextLabel: null,
  },
}

export default function OrderDrawer({
  order,
  onClose,
  onUpdateStatus,
  onMarkPaid,
  onEdit,
  onDelete,
}) {
  const [updating, setUpdating] = useState(false)
  const [visible, setVisible] = useState(false)

  const [confirm, setConfirm] = useState(null)
  // {
  //   message,
  //   action
  // }

  useEffect(() => {
    if (order) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [order])

  if (!order) return null

  const meta =
    STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending

  const isPaid = !!order.payment_status
  const orderAddons = order.order_addons ?? []

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 260)
  }

  /*
   * -----------------------------------------
   * STATUS / PAYMENT ACTIONS
   * -----------------------------------------
   */

  const handleAdvance = async () => {
    setConfirm(null)

    if (
      !meta.next ||
      updating ||
      (meta.next === 'released' && !isPaid)
    ) {
      return
    }

    setUpdating(true)

    try {
      await onUpdateStatus(order.id, meta.next)
    } finally {
      setUpdating(false)
    }
  }

  const handlePay = async () => {
    setConfirm(null)

    if (updating) return

    setUpdating(true)

    try {
      await onMarkPaid(order.id)
    } finally {
      setUpdating(false)
    }
  }

  const openAdvanceConfirm = () => {
    if (!meta.next || updating) return

    if (meta.next === 'released' && !isPaid) {
      return
    }

    setConfirm({
      message:
        meta.next === 'released'
          ? 'Release this order to the customer?'
          : 'Mark this order as done?',
      action: handleAdvance,
    })
  }

  const openPayConfirm = () => {
    if (updating) return

    setConfirm({
      message: 'Mark this order as paid?',
      action: handlePay,
    })
  }

  /*
   * -----------------------------------------
   * EDIT
   * -----------------------------------------
   */

  const handleEdit = () => {
    if (updating) return

    onEdit(order)
  }

  /*
   * -----------------------------------------
   * DELETE
   * -----------------------------------------
   */

  const handleDelete = () => {
    if (updating) return

    setConfirm({
      message:
        'Delete this order permanently? This will also remove its services and add-ons.',
      action: async () => {
        setConfirm(null)
        setUpdating(true)

        try {
          await onDelete(order.id)
        } finally {
          setUpdating(false)
        }
      },
    })
  }

  return (
    <>
      {/* BACKDROP */}
      <div
        onClick={handleClose}
        className={`
          fixed inset-0 z-40
          bg-black/40
          transition-opacity duration-250
          ${visible ? 'opacity-100' : 'opacity-0'}
        `}
      />

      {/* DRAWER */}
      <div
        className={`
          fixed z-50
          bg-white
          shadow-2xl
          flex flex-col

          inset-x-0
          bottom-0
          rounded-t-2xl

          md:inset-y-0
          md:right-0
          md:left-auto
          md:w-[430px]
          md:rounded-none

          transition-transform
          duration-260
          ease-out

          ${
            visible
              ? 'translate-y-0 md:translate-x-0'
              : 'translate-y-full md:translate-x-full'
          }
        `}
        style={{ maxHeight: '90vh' }}
      >

        {/* MOBILE DRAG HANDLE */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* HEADER */}
        <div className="
          px-5 py-4
          flex items-start
          justify-between
          border-b border-gray-100
        ">

          <div className="min-w-0">

            <div className="flex items-center gap-2">
              <span
                className={`
                  w-2 h-2
                  rounded-full
                  ${meta.dot}
                `}
              />

              <span className="text-xs font-medium text-gray-500">
                {meta.label}
              </span>
            </div>

            <p className="
              font-semibold
              text-gray-900
              text-base
              mt-1
              truncate
            ">
              {order.customer_name}
            </p>

            <p className="text-xs text-gray-400">
              {dayjs(order.created_at).format('MMM D, h:mm A')}
              <span className="mx-1">·</span>
              {dayjs(order.created_at).fromNow()}
            </p>

            {order.created_by_email && (
              <p className="text-[11px] text-gray-400 mt-1 truncate">
                Created by: {order.created_by_email}
              </p>
            )}

          </div>

          {/* CLOSE */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close order"
            className="
              shrink-0
              w-10 h-10
              flex items-center justify-center
              rounded-full
              bg-gray-100
              text-gray-500
              hover:bg-gray-200
              active:bg-gray-200
              transition
            "
          >
            <X size={18} />
          </button>

        </div>

        {/* CONTENT */}
        <div className="
          flex-1
          overflow-y-auto
          px-5
          py-4
          space-y-5
        ">

          {/* PAYMENT STATUS */}
          <div className="
            flex
            items-center
            justify-between
            rounded-xl
            border border-gray-100
            px-4
            py-3
          ">
            <div className="flex items-center gap-2">
              <CircleDollarSign
                size={18}
                className="text-gray-400"
              />

              <span className="
                text-sm
                text-gray-600
                font-medium
              ">
                Payment
              </span>
            </div>

            <span
              className={`
                text-xs
                font-semibold
                px-3
                py-1
                rounded-full

                ${
                  isPaid
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }
              `}
            >
              {isPaid ? '✓ Paid' : '✗ Unpaid'}
            </span>
          </div>

          {/* SERVICES */}
          <div>

            <p className="
              text-xs
              font-semibold
              text-gray-400
              uppercase
              tracking-wide
              mb-2
            ">
              Services
            </p>

            <div className="space-y-2">

              {order.order_items?.length > 0 ? (
                order.order_items.map(item => (

                  <div
                    key={item.id}
                    className="
                      flex
                      justify-between
                      items-center
                      py-2.5
                      border-b
                      border-gray-50
                      last:border-0
                    "
                  >

                    <div className="min-w-0 pr-4">

                      <p className="
                        text-sm
                        text-gray-900
                        truncate
                      ">
                        {item.service_name}
                      </p>

                      <p className="
                        text-xs
                        text-gray-400
                        mt-0.5
                      ">
                        ×{item.quantity} @ ₱
                        {Number(item.price).toFixed(2)}
                      </p>

                    </div>

                    <p className="
                      text-sm
                      font-semibold
                      text-gray-900
                      shrink-0
                      tabular-nums
                    ">
                      ₱
                      {(
                        Number(item.price) *
                        Number(item.quantity)
                      ).toFixed(2)}
                    </p>

                  </div>

                ))
              ) : (
                <p className="text-sm text-gray-400">
                  No services
                </p>
              )}

            </div>
          </div>

          {/* ADD-ONS */}
          <div>

            <p className="
              text-xs
              font-semibold
              text-gray-400
              uppercase
              tracking-wide
              mb-2
            ">
              Add-ons
            </p>

            <div className="space-y-2">

              {orderAddons.length > 0 ? (
                orderAddons.map(addon => (

                  <div
                    key={addon.id}
                    className="
                      flex
                      justify-between
                      items-center
                      py-2.5
                      border-b
                      border-gray-50
                      last:border-0
                    "
                  >

                    <div className="min-w-0 pr-4">

                      <p className="
                        text-sm
                        text-gray-900
                        truncate
                      ">
                        {addon.addons?.name ?? 'Add-on'}
                      </p>

                      <p className="
                        text-xs
                        text-gray-400
                        mt-0.5
                      ">
                        ×{addon.quantity} @ ₱
                        {Number(addon.unit_price).toFixed(2)}
                      </p>

                    </div>

                    <p className="
                      text-sm
                      font-semibold
                      text-gray-900
                      shrink-0
                      tabular-nums
                    ">
                      ₱
                      {Number(addon.total).toFixed(2)}
                    </p>

                  </div>

                ))
              ) : (
                <p className="text-sm text-gray-400">
                  No add-ons
                </p>
              )}

            </div>
          </div>

          {/* TOTAL */}
          <div className="
            flex
            justify-between
            items-center
            bg-gray-50
            rounded-xl
            px-4
            py-3.5
          ">
            <span className="
              font-semibold
              text-gray-700
            ">
              Total
            </span>

            <span className="
              text-xl
              font-bold
              text-gray-900
              tabular-nums
            ">
              ₱{Number(order.total).toFixed(2)}
            </span>
          </div>

          {/* NOTES */}
          {order.notes && (
            <div className="
              bg-yellow-50
              border border-yellow-100
              rounded-xl
              px-4 py-3
            ">
              <p className="
                text-xs
                font-semibold
                text-yellow-700
                mb-1
              ">
                Note
              </p>

              <p className="
                text-sm
                text-yellow-800
              ">
                {order.notes}
              </p>
            </div>
          )}

        </div>

        {/* ACTIONS */}
        <div className="
          px-5
          pb-6
          pt-3
          border-t
          border-gray-100
          space-y-2
          bg-white
        ">

          {/* PAYMENT */}
          {!isPaid && (
            <button
              type="button"
              onClick={openPayConfirm}
              disabled={updating}
              className="
                w-full
                h-12
                rounded-xl
                font-semibold
                text-sm
                bg-green-600
                text-white
                flex
                items-center
                justify-center
                gap-2
                active:scale-[0.98]
                disabled:opacity-50
                transition-transform
              "
            >
              <CheckCircle2 size={18} />

              {updating
                ? 'Updating…'
                : 'Mark as Paid'}
            </button>
          )}

          {/* NEXT STATUS */}
          {meta.next && (
            <button
              type="button"
              onClick={openAdvanceConfirm}
              disabled={
                updating ||
                (meta.next === 'released' && !isPaid)
              }
              className={`
                w-full
                h-12
                rounded-xl
                font-semibold
                text-sm
                flex
                items-center
                justify-center
                gap-2
                active:scale-[0.98]
                transition-transform

                ${
                  meta.next === 'released' && !isPaid
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }

                disabled:opacity-50
              `}
            >
              {meta.next === 'released'
                ? 'Release to Customer'
                : 'Mark as Done'}
            </button>
          )}

          {/* RELEASE WARNING */}
          {order.status === 'done' && !isPaid && (
            <p className="
              text-center
              text-xs
              text-gray-400
              px-2
            ">
              Payment is required before releasing this order.
            </p>
          )}

          {/* COMPLETED */}
          {order.status === 'released' && (
            <p className="
              text-center
              text-xs
              text-gray-400
              py-1
            ">
              Order completed
            </p>
          )}

          {/* EDIT / DELETE */}
          <div className="
            flex
            gap-2
            pt-2
          ">

            <button
              type="button"
              onClick={handleEdit}
              disabled={updating}
              className="
                flex-1
                h-11
                rounded-xl
                border
                border-gray-200
                bg-white
                text-gray-700
                text-sm
                font-semibold
                flex
                items-center
                justify-center
                gap-2
                hover:bg-gray-50
                active:bg-gray-100
                disabled:opacity-50
                transition
              "
            >
              <Pencil size={16} />
              Edit Order
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={updating}
              className="
                flex-1
                h-11
                rounded-xl
                border
                border-red-200
                bg-red-50
                text-red-600
                text-sm
                font-semibold
                flex
                items-center
                justify-center
                gap-2
                hover:bg-red-100
                active:bg-red-100
                disabled:opacity-50
                transition
              "
            >
              <Trash2 size={16} />
              Delete
            </button>

          </div>

        </div>
      </div>

      {/* CONFIRM MODAL */}
      {confirm && (
        <ConfirmModal
          isOpen={true}
          message={confirm.message}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}
