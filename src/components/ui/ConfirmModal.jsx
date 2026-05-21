
export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-gray-800 mb-4">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}