export default function KPICard({ title, value, icon, trend }) {
  return (
    <div className="bg-white shadow-md rounded-xl p-4 flex items-center justify-between hover:shadow-lg transition">
      <div>
        <h3 className="text-gray-500 text-sm">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
        {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
      </div>
      <div className="text-blue-500 text-3xl">{icon}</div>
    </div>
  );
}