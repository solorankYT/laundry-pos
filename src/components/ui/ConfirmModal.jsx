export default function ConfirmModal({
  isOpen,
  message,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null

  return (
    <div
      className="
        fixed
        inset-0
        z-[60]
        flex
        items-end
        justify-center
        bg-black/40
        px-4
        pb-[calc(6rem+env(safe-area-inset-bottom))]
      "
      onClick={onCancel}
    >
      <div
        className="
          w-full
          max-w-sm
          rounded-2xl
          bg-white
          p-5
          shadow-xl
        "
        onClick={e => e.stopPropagation()}
      >
        <p className="mb-4 text-sm font-semibold text-gray-800">
          {message}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="
              flex-1
              h-11
              rounded-xl
              border
              border-gray-200
              text-sm
              font-semibold
              text-gray-600
              transition
              active:scale-[0.98]
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="
              flex-1
              h-11
              rounded-xl
              bg-blue-600
              text-white
              text-sm
              font-semibold
              transition
              active:scale-[0.98]
            "
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}