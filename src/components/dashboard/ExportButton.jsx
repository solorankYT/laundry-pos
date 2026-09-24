import { FiDownload } from 'react-icons/fi';

export default function ExportButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
    >
      <FiDownload size={14} className="text-gray-400" />
      Export to Excel
    </button>
  );
}
