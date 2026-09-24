import { useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { getRangeForPreset, formatRangeLabel, PRESETS } from '../../lib/dateRanges';
import { exportToExcel } from '../../lib/exportExcel';

const REPORT_OPTIONS = [
  { key: 'daily_summary', label: 'Daily Summary', hint: 'One page, owner-friendly totals' },
  { key: 'sales', label: 'Sales', hint: 'Every order with services, add-ons, payment' },
  { key: 'orders', label: 'Orders', hint: 'Order list with status' },
  { key: 'services', label: 'Services', hint: 'Performance by service' },
  { key: 'payments', label: 'Payments', hint: 'Paid / unpaid breakdown' },
  { key: 'full', label: 'Full Report', hint: 'All of the above in one workbook' },
];

/**
 * Modal export dialog. Defaults to whatever period the dashboard is
 * currently showing, and — if `activeFilters` is passed (e.g. the owner is
 * viewing filtered orders) — offers to export just those results.
 */
export default function ExportDialog({ open, onClose, initialPreset = 'today', initialCustomRange, activeFilters, hasCustomerData = true }) {
  const [preset, setPreset] = useState(initialPreset);
  const [customRange, setCustomRange] = useState(initialCustomRange || {});
  const [reportType, setReportType] = useState('daily_summary');
  const [useFilters, setUseFilters] = useState(Boolean(activeFilters));
  const [status, setStatus] = useState('idle'); // idle | working | done | error

  if (!open) return null;

  const range = getRangeForPreset(preset, customRange);
  const rangeLabel = formatRangeLabel(range.start, range.end);

  async function handleExport() {
    setStatus('working');
    try {
      await exportToExcel({
        reportType,
        range,
        filters: useFilters ? activeFilters : {},
        hasCustomerData,
      });
      setStatus('done');
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Export Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={18} />
          </button>
        </div>

        <label className="block text-xs font-medium text-gray-500 mb-1">Date Range</label>
        <select
          className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 mb-1"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
        >
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>

        {preset === 'custom' && (
          <div className="flex items-center gap-1.5 mb-2">
            <input
              type="date"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
              value={customRange.start || ''}
              onChange={(e) => setCustomRange((c) => ({ ...c, start: e.target.value }))}
            />
            <span className="text-gray-300 text-xs">to</span>
            <input
              type="date"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
              value={customRange.end || ''}
              onChange={(e) => setCustomRange((c) => ({ ...c, end: e.target.value }))}
            />
          </div>
        )}

        <p className="text-xs text-gray-400 mb-4">{rangeLabel}</p>

        <label className="block text-xs font-medium text-gray-500 mb-1.5">Report</label>
        <div className="space-y-1 mb-4">
          {REPORT_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer border ${
                reportType === opt.key ? 'border-blue-300 bg-blue-50/50' : 'border-transparent hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="reportType"
                className="mt-0.5"
                checked={reportType === opt.key}
                onChange={() => setReportType(opt.key)}
              />
              <span>
                <span className="block text-sm text-gray-800">{opt.label}</span>
                <span className="block text-xs text-gray-400">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {activeFilters && Object.keys(activeFilters).length > 0 && (
          <label className="flex items-center gap-2 text-xs text-gray-600 mb-4">
            <input type="checkbox" checked={useFilters} onChange={(e) => setUseFilters(e.target.checked)} />
            Export current results only ({Object.values(activeFilters).join(', ')})
          </label>
        )}

        {status === 'error' && (
          <p className="text-xs text-red-500 mb-3">We couldn't generate the report. Please try again.</p>
        )}

        <div className="flex justify-end gap-2 mt-1">
          <button onClick={onClose} className="text-sm px-3.5 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={status === 'working'}
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-60"
          >
            <FiDownload size={14} />
            {status === 'working' ? 'Preparing\u2026' : status === 'done' ? 'Exported \u2713' : 'Export to Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
