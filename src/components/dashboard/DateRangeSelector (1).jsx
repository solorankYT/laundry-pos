import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCalendar } from 'react-icons/fi';
import { PRESETS } from '../../lib/dateRanges';

export default function DateRangeSelector({ preset, customRange, onChange }) {
  const [open, setOpen] = useState(false);
  const [draftCustom, setDraftCustom] = useState(customRange || {});
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const currentLabel = PRESETS.find((p) => p.key === preset)?.label || 'Today';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700"
      >
        <FiCalendar className="text-gray-400" size={15} />
        {currentLabel}
        <FiChevronDown className="text-gray-400" size={14} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
          {PRESETS.filter((p) => p.key !== 'custom').map((p) => (
            <button
              key={p.key}
              onClick={() => {
                onChange(p.key);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                preset === p.key ? 'text-blue-600 font-medium' : 'text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}

          <div className="border-t border-gray-100 mt-1 pt-2 px-3 pb-2">
            <p className="text-xs text-gray-400 mb-1.5">Custom Range</p>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1"
                value={draftCustom.start || ''}
                onChange={(e) => setDraftCustom((c) => ({ ...c, start: e.target.value }))}
              />
              <span className="text-gray-300 text-xs">to</span>
              <input
                type="date"
                className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1"
                value={draftCustom.end || ''}
                onChange={(e) => setDraftCustom((c) => ({ ...c, end: e.target.value }))}
              />
            </div>
            <button
              disabled={!draftCustom.start || !draftCustom.end}
              onClick={() => {
                onChange('custom', draftCustom);
                setOpen(false);
              }}
              className="w-full mt-2 text-xs font-medium bg-gray-900 text-white rounded py-1.5 disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
