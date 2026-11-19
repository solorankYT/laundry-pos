import UsersTable from '../components/dashboard/UsersTable'

export default function User() {
  return (
    <section className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-stone-900">Staff</h1>
      <p className="text-sm text-stone-600">The shop administrator manages staff accounts.</p>
      <UsersTable />
    </section>
  )
}
