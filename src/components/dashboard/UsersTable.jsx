import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function UsersTable() {
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchStaff() {
      const response = await supabase
        .from('staff_profiles')
        .select('user_id, display_name, role, active')
        .order('display_name')
        .abortSignal(controller.signal)

      if (!controller.signal.aborted) setResult(response)
    }

    fetchStaff()
    return () => controller.abort()
  }, [])

  if (!result) return <p role="status" className="text-sm text-stone-600">Loading staff…</p>
  if (result.error) return <p role="alert" className="text-sm text-rose-700">Could not load staff. Refresh to try again.</p>
  if (!result.data.length) return <p className="text-sm text-stone-600">No staff accounts are available.</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
          <tr>
            <th scope="col" className="p-3">Name</th>
            <th scope="col" className="p-3">Role</th>
            <th scope="col" className="p-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {result.data.map(staff => (
            <tr key={staff.user_id}>
              <td className="p-3 font-medium">{staff.display_name}</td>
              <td className="p-3">{staff.role === 'manager' ? 'Manager' : 'Cashier'}</td>
              <td className="p-3">{staff.active ? 'Active' : 'Inactive'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
