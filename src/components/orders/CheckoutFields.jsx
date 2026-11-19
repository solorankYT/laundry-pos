import { checkoutDraft, PAYMENT_METHODS, peso } from './orderData'

const inputClass = 'mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-stone-900 disabled:bg-stone-100'

export default function CheckoutFields({ draft, quote, onChange, disabled, allowLater = false, deferOnly = false }) {
  const needsReason = draft.mode === 'discount' || draft.mode === 'complimentary'
  const needsMethod = draft.mode === 'full' || draft.mode === 'discount'

  function change(field, value) {
    onChange({ ...draft, [field]: value })
  }

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-3 text-sm text-stone-700">
      <legend className="mb-3 font-semibold text-stone-900">Checkout</legend>
      <label className="block font-medium">
        Price option
        <select className={inputClass} value={draft.mode} onChange={event => onChange(checkoutDraft(event.target.value, null, draft.method))}>
          <option value="full">Full price</option>
          <option value="discount">Discount</option>
          {!deferOnly && <option value="complimentary">Complimentary</option>}
        </select>
      </label>
      {draft.mode === 'discount' && (
        <label className="block font-medium">
          Discount amount (₱)
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            min="0.01"
            max={Math.max(0, quote.subtotal - 0.01).toFixed(2)}
            step="0.01"
            required
            value={draft.amount}
            onChange={event => change('amount', event.target.value)}
          />
          {draft.amount && !quote.validDiscount && (
            <span className="mt-1 block text-rose-700">Enter an amount above ₱0 and below {peso(quote.subtotal)}.</span>
          )}
        </label>
      )}
      {needsReason && (
        <label className="block font-medium">
          {draft.mode === 'discount' ? 'Discount reason' : 'Complimentary reason'}
          <input
            className={inputClass}
            maxLength={500}
            required
            value={draft.reason}
            placeholder={draft.mode === 'discount' ? 'e.g. Regular customer' : 'e.g. Family order'}
            onChange={event => change('reason', event.target.value)}
          />
        </label>
      )}
      {needsMethod && !deferOnly && (
        <label className="block font-medium">
          {allowLater ? 'Payment at drop-off' : 'Payment method'}
          <select className={inputClass} required value={draft.method} onChange={event => change('method', event.target.value)}>
            <option value="">Choose Cash or GCash</option>
            {allowLater && <option value="later">Pay at pickup</option>}
            {PAYMENT_METHODS.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}
          </select>
        </label>
      )}
      <dl className="space-y-1 rounded-lg bg-stone-100 p-3 tabular-nums">
        {needsReason && (
          <>
            <div className="flex justify-between gap-2"><dt>Original total</dt><dd>{peso(quote.subtotal)}</dd></div>
            <div className="flex justify-between gap-2"><dt>Discount</dt><dd>−{peso(quote.discountAmount)}</dd></div>
          </>
        )}
        <div className="flex justify-between gap-2 font-semibold text-stone-900">
          <dt>{draft.method === 'later' && draft.mode !== 'complimentary' ? 'Due at pickup' : 'Amount to collect'}</dt>
          <dd>{quote.validDiscount ? peso(quote.total) : '—'}</dd>
        </div>
      </dl>
    </fieldset>
  )
}
