import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../hooks/useAuth"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function NewOrderForm({ onClose, onCreated }) {
  const { user } = useAuth()

  const [services, setServices] = useState([])
  const [selected, setSelected] = useState({})
  const [customerName, setCustomerName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchServices()
  }, [user])

  const fetchServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)

    setServices(data ?? [])
  }

  const addItem = (service) => {
    setSelected((prev) => {
      if (prev[service.id]) {
        return {
          ...prev,
          [service.id]: {
            ...prev[service.id],
            quantity: prev[service.id].quantity + 1,
          },
        }
      }
      return { ...prev, [service.id]: { ...service, quantity: 1 } }
    })
  }

  const changeQty = (id, delta) => {
    setSelected((prev) => {
      const item = prev[id]
      if (!item) return prev

      const qty = item.quantity + delta
      if (qty <= 0) {
        const copy = { ...prev }
        delete copy[id]
        return copy
      }

      return { ...prev, [id]: { ...item, quantity: qty } }
    })
  }

  const total = Object.values(selected).reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  )

  const handleSubmit = async () => {
    if (!Object.keys(selected).length) return

    setSubmitting(true)

    const { data: order } = await supabase
      .from("orders")
      .insert({
        customer_name: customerName || "Walk-in",
        total,
        created_by: user.id,
        status: "pending",
      })
      .select()
      .single()

    const items = Object.values(selected).map((i) => ({
      order_id: order.id,
      service_id: i.id,
      service_name: i.name,
      price: i.price,
      quantity: i.quantity,
    }))

    await supabase.from("order_items").insert(items)

    onCreated()
  }

  const base = services.filter((s) => s.type === "base")
  const addons = services.filter((s) => s.type === "addon")

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex">

      <div className="flex w-full bg-muted">

        {/* LEFT: SERVICES */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">

          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {base.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  className="h-20 flex flex-col items-start justify-center"
                  onClick={() => addItem(s)}
                >
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ₱{s.price}
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add-ons</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {addons.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  className="h-20 flex flex-col items-start justify-center"
                  onClick={() => addItem(s)}
                >
                  <span className="text-sm">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ₱{s.price}
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>

        </div>

        {/* RIGHT: CART */}
        <div className="w-[320px] border-l bg-background flex flex-col">

          <Card className="flex flex-col h-full rounded-none border-0">

            <CardHeader>
              <CardTitle>Order</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full px-4">
                {Object.values(selected).map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-3 border-b"
                  >
                    <div>
                      <p className="text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₱{item.price}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={() => changeQty(item.id, -1)}>
                        −
                      </Button>
                      <span>{item.quantity}</span>
                      <Button size="icon" variant="outline" onClick={() => changeQty(item.id, 1)}>
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">

              <Input
                placeholder="Customer (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              <div className="flex justify-between w-full text-sm">
                <span>Total</span>
                <span className="font-bold">₱{total.toFixed(2)}</span>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Charge"}
              </Button>

            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}