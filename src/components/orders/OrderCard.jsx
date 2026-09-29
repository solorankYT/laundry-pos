import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Banknote } from 'lucide-react'
import {
  MoneyLine,
  OrderConfirm,
  OrderStatus,
  activateOnEnter,
  formatServices,
  orderCode,
  useOrderQuickActions,
} from './orderUi'

dayjs.extend(relativeTime)

export default function OrderCard({
  order,
  onUpdateStatus,
  onMarkPaid,
  onClick,
  isActive,
}) {
  const {
    updating,
    confirm,
    setConfirm,
    isPaid,
    advance,
    releaseBlocked,
    askAdvance,
    askPay,
  } = useOrderQuickActions({ order, onUpdateStatus, onMarkPaid })

  const code = orderCode(order)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={activateOnEnter(onClick)}
        className={`
          bg-white
          rounded-xl
          border
          overflow-hidden
          cursor-pointer
          text-left
          transition-colors

          ${
            isActive
              ? 'border-blue-300 bg-blue-50/40'
              : 'border-blue-100 hover:border-blue-200 active:bg-blue-50/40'
          }
        `}
      >
        {/* ORDER INFO */}
        <div className="px-4 pt-3.5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-slate-900 truncate leading-tight">
                {order.customer_name}
              </p>

              <p className="text-xs text-slate-500 mt-0.5">
                {code ? `#${code}` : 'Order'}
                <span className="mx-1 text-slate-300">·</span>
                {dayjs(order.created_at).fromNow()}
              </p>
            </div>

            <OrderStatus status={order.status} />
          </div>

          {/* TOTAL */}
          <div className="mt-3">
            <MoneyLine total={order.total} paid={isPaid} />
          </div>

          {/* SERVICES */}
          <p className="mt-2 text-[13px] text-slate-500 truncate">
            {formatServices(order.order_items)}
          </p>
        </div>

        {/* ACTIONS */}
        <div
          className="px-3 pb-3"
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          {order.status === 'released' ? (
            <div className="rounded-lg bg-slate-50 py-2.5 text-center">
              <p className="text-xs font-medium text-slate-400">
                Order released
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {/* MARK AS PAID */}
                {!isPaid && (
                  <button
                    type="button"
                    onClick={askPay}
                    disabled={updating}
                    className="
                      flex-1
                      min-h-11
                      rounded-xl
                      text-sm
                      font-semibold
                      bg-rose-50
                      text-rose-600
                      border border-rose-100
                      flex items-center justify-center gap-1.5
                      transition-colors
                      hover:bg-rose-100
                      active:bg-rose-100
                      disabled:opacity-50
                    "
                  >
                    <Banknote size={16} />

                    {updating ? 'Saving…' : 'Mark as paid'}
                  </button>
                )}

                {/* ADVANCE STATUS */}
                {advance && (
                  <button
                    type="button"
                    onClick={askAdvance}
                    disabled={updating || releaseBlocked}
                    title={
                      releaseBlocked
                        ? 'Payment required before release'
                        : undefined
                    }
                    className={`
                      flex-1
                      min-h-11
                      rounded-xl
                      text-sm
                      font-semibold
                      transition-colors
                      disabled:opacity-50

                      ${
                        releaseBlocked
                          ? `
                            bg-slate-100
                            text-slate-400
                            border border-slate-200
                            cursor-not-allowed
                          `
                          : `
                            bg-blue-600
                            text-white
                            hover:bg-blue-700
                            active:bg-blue-700
                          `
                      }
                    `}
                  >
                    {updating ? 'Saving…' : advance.label}
                  </button>
                )}
              </div>

              {/* PAYMENT REQUIREMENT */}
              {releaseBlocked && (
                <p className="text-center text-xs text-slate-500 mt-2">
                  Mark as paid before releasing
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <OrderConfirm
        confirm={confirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}