import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Banknote } from 'lucide-react'
import {
  MoneyLine,
  ORDER_ROW_GRID,
  OrderConfirm,
  OrderStatus,
  activateOnEnter,
  formatServices,
  orderCode,
  useOrderQuickActions,
} from './orderUi'

dayjs.extend(relativeTime)

export default function OrderRow({
  order,
  onClick,
  onUpdateStatus,
  onMarkPaid,
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
  } = useOrderQuickActions({
    order,
    onUpdateStatus,
    onMarkPaid,
  })

  const servicesSummary = formatServices(order.order_items)
  const code = orderCode(order)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={activateOnEnter(onClick)}
        className={`
          grid ${ORDER_ROW_GRID}
          px-4 py-3
          text-sm
          border-t border-blue-100
          items-center
          cursor-pointer
          text-left
          transition-colors

          ${
            isActive
              ? 'bg-blue-50/70'
              : 'hover:bg-blue-50/40 active:bg-blue-50/60'
          }
        `}
      >
        {/* CUSTOMER */}
        <div className="min-w-0 pr-3">
          <p className="font-semibold text-slate-900 truncate">
            {order.customer_name}
          </p>

          <p className="text-xs text-slate-500 mt-0.5">
            {code ? `#${code}` : 'Order'}

            <span className="mx-1 text-slate-300">
              ·
            </span>

            {dayjs(order.created_at).fromNow()}
          </p>
        </div>

        {/* SERVICES */}
        <div
          className="text-slate-600 text-[13px] truncate pr-4"
          title={servicesSummary}
        >
          {servicesSummary}
        </div>

        {/* TOTAL */}
        <MoneyLine
          total={order.total}
          paid={isPaid}
          size="sm"
        />

        {/* STATUS */}
        <div>
          <OrderStatus status={order.status} />
        </div>

        {/* ACTIONS */}
        <div
          className="flex items-center justify-end gap-2"
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          {order.status === 'released' ? (
            <span className="text-xs font-medium text-slate-400 pr-1">
              Released
            </span>
          ) : (
            <>
              {!isPaid && (
                <ActionBtn
                  label={updating ? 'Saving…' : 'Mark as paid'}
                  icon={Banknote}
                  disabled={updating}
                  tone="pay"
                  onClick={askPay}
                />
              )}

              {advance && (
                <ActionBtn
                  label={updating ? 'Saving…' : advance.label}
                  disabled={updating || releaseBlocked}
                  title={
                    releaseBlocked
                      ? 'Payment required before release'
                      : undefined
                  }
                  tone={releaseBlocked ? 'blocked' : 'primary'}
                  onClick={askAdvance}
                />
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

function ActionBtn({
  label,
  icon: Icon,
  onClick,
  disabled,
  title,
  tone,
}) {
  const tones = {
    pay: `
      bg-rose-50
      text-rose-600
      border border-rose-100
      hover:bg-rose-100
    `,

    primary: `
      bg-blue-600
      text-white
      hover:bg-blue-700
      active:bg-blue-700
    `,

    blocked: `
      bg-slate-100
      text-slate-400
      border border-slate-200
      cursor-not-allowed
    `,
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        inline-flex
        items-center
        justify-center
        gap-1.5
        h-10
        px-3
        rounded-lg
        text-[13px]
        font-semibold
        whitespace-nowrap
        transition-colors

        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-500
        focus-visible:ring-offset-1

        disabled:opacity-50
        disabled:cursor-not-allowed

        ${tones[tone]}
      `}
    >
      {Icon ? <Icon size={15} /> : null}
      {label}
    </button>
  )
}