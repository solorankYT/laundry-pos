export default function Payments({ orders }) {
  const unpaid = orders.filter(o => !o.payment_status)

  return (
    <div className="p-4 space-y-3">

      <h1 className="text-lg font-semibold">Unpaid Orders</h1>

      {unpaid.map(order => (
        <div key={order.id} className="bg-white p-4 rounded-xl border flex justify-between">

          <div>
            <p className="font-medium">{order.customer_name}</p>
            <p className="text-sm text-gray-500">₱{order.total}</p>
          </div>

          <button className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm">
            Mark Paid
          </button>

        </div>
      ))}

    </div>
  )
}