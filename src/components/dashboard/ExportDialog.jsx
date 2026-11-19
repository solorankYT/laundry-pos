import { useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { getRangeForPreset, formatRangeLabel, isValidCustomRange, PRESETS } from '../../lib/dateRanges';

const REPORT_OPTIONS = [
  { key: 'daily_summary', label: 'Daily Summary', hint: 'Cash, GCash, and outstanding balances by day' },
  { key: 'sales', label: 'Sales', hint: 'Daily totals and individual collections' },
  { key: 'orders', label: 'Orders', hint: 'Order list with status' },
  { key: 'services', label: 'Services', hint: 'Performance by service' },
  { key: 'payments', label: 'Payments', hint: 'Payments by method and cashier' },
  { key: 'full', label: 'Full Report', hint: 'All of the above in one workbook' },
];

/**
 * Modal export dialog. Defaults to whatever period the dashboard is
 * currently showing, and — if `activeFilters` is passed (e.g. the owner is
 * viewing filtered orders) — offers to export just those results.
 */
export default function ExportDialog({ open, onClose, initialPreset = 'today', initialCustomRange, activeFilters, snapshot, hasCustomerData = true }) {
  const [preset, setPreset] = useState(initialPreset);
  const [customRange, setCustomRange] = useState(initialCustomRange || {});
  const [reportType, setReportType] = useState('daily_summary');
  const [useFilters, setUseFilters] = useState(Boolean(activeFilters));
  const [status, setStatus] = useState('idle');

  if (!open) return null;

  const validRange = preset !== 'custom' || isValidCustomRange(customRange);
  const range = validRange ? getRangeForPreset(preset, customRange) : null;
  const rangeLabel = range ? formatRangeLabel(range.start, range.end) : 'Choose a valid date range.';
  const snapshotMatches = range && snapshot
    && snapshot.range.start.getTime() === range.start.getTime()
    && snapshot.range.end.getTime() === range.end.getTime();

  async function handleExport() {
    if (!range) return;
    setStatus('working');
    try {
      const { exportToExcel } = await import('../../lib/exportExcel');
      await exportToExcel({
        reportType,
        range,
        data: snapshotMatches ? snapshot.data : undefined,
        filters: useFilters ? activeFilters : {},
        hasCustomerData,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="export-title" className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="export-title" className="text-base font-semibold text-gray-900">Export Report</h2>
          <button aria-label="Close export" disabled={status === 'working'} onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
              aria-label="Start date"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
              value={customRange.start || ''}
              onChange={(e) => setCustomRange((c) => ({ ...c, start: e.target.value }))}
            />
            <span className="text-gray-300 text-xs">to</span>
            <input
              type="date"
              aria-label="End date"
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
          <button disabled={status === 'working'} onClick={onClose} className="text-sm px-3.5 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={!validRange || status === 'working'}
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-60"
          >
            <FiDownload size={14} />
            {status === 'working' ? 'Preparing\u2026' : 'Export to Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
