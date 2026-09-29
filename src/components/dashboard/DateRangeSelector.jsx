import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCalendar } from 'react-icons/fi';
import { PRESETS } from '../../lib/dateRanges';

export default function DateRangeSelector({
  preset,
  customRange,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [draftCustom, setDraftCustom] = useState(customRange || {});
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);

    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  // Keep draft in sync if the parent changes the custom range
  useEffect(() => {
    setDraftCustom(customRange || {});
  }, [customRange]);

  const currentLabel =
    PRESETS.find((p) => p.key === preset)?.label || 'Today';

  const hasValidRange =
    draftCustom.start &&
    draftCustom.end &&
    draftCustom.start <= draftCustom.end;

  return (
    <div className="relative" ref={ref}>

      {/* TRIGGER */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          flex items-center gap-2
          h-10
          px-3
          text-sm
          font-medium
          border border-gray-200
          rounded-lg
          bg-white
          hover:bg-gray-50
          text-gray-700
          whitespace-nowrap
        "
      >
        <FiCalendar
          className="text-gray-400 shrink-0"
          size={15}
        />

        <span>{currentLabel}</span>

        <FiChevronDown
          className="text-gray-400 shrink-0"
          size={14}
        />
      </button>

      {open && (
        <>
          {/* MOBILE BACKDROP */}
          <div
            className="
              fixed inset-0
              bg-black/10
              z-40
              sm:hidden
            "
            onClick={() => setOpen(false)}
          />

          {/* DROPDOWN */}
          <div
            className="
              fixed
              left-1/2
              -translate-x-1/2
              top-20

              w-[calc(100vw-32px)]
              max-w-[320px]

              sm:absolute
              sm:left-auto
              sm:right-0
              sm:translate-x-0
              sm:top-auto
              sm:mt-2
              sm:w-56

              bg-white
              border border-gray-200
              rounded-xl
              shadow-lg
              z-50
              overflow-hidden
            "
          >

            {/* PRESETS */}
            <div className="py-1">
              {PRESETS
                .filter((p) => p.key !== 'custom')
                .map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      onChange(p.key);
                      setOpen(false);
                    }}
                    className={`
                      w-full
                      text-left
                      px-4
                      py-2.5
                      text-sm
                      transition
                      hover:bg-gray-50
                      active:bg-gray-100
                      ${
                        preset === p.key
                          ? 'text-blue-600 font-medium bg-blue-50'
                          : 'text-gray-700'
                      }
                    `}
                  >
                    {p.label}
                  </button>
                ))}
            </div>

            {/* CUSTOM RANGE */}
            <div className="border-t border-gray-100 px-4 py-4">

              <p className="text-xs font-medium text-gray-500 text-center mb-4">
                Custom date range
              </p>

              <div className="flex flex-col items-center">

                {/* FROM */}
                <div className="w-full">
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5">
                    From
                  </label>

                  <input
                    type="date"
                    value={draftCustom.start || ''}
                    onChange={(e) =>
                      setDraftCustom((c) => ({
                        ...c,
                        start: e.target.value,
                      }))
                    }
                    className="
                      w-full
                      h-11
                      px-3
                      text-sm
                      bg-gray-50
                      border border-gray-200
                      rounded-lg
                      text-gray-700
                      outline-none
                      focus:bg-white
                      focus:border-blue-400
                      focus:ring-2
                      focus:ring-blue-50
                    "
                  />
                </div>

                {/* SEPARATOR */}
                <div className="flex items-center justify-center h-7">
                  <span className="text-xs text-gray-300">
                    to
                  </span>
                </div>

                {/* TO */}
                <div className="w-full">
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5">
                    To
                  </label>

                  <input
                    type="date"
                    value={draftCustom.end || ''}
                    onChange={(e) =>
                      setDraftCustom((c) => ({
                        ...c,
                        end: e.target.value,
                      }))
                    }
                    className="
                      w-full
                      h-11
                      px-3
                      text-sm
                      bg-gray-50
                      border border-gray-200
                      rounded-lg
                      text-gray-700
                      outline-none
                      focus:bg-white
                      focus:border-blue-400
                      focus:ring-2
                      focus:ring-blue-50
                    "
                  />
                </div>

              </div>

              {/* APPLY */}
              <button
                type="button"
                disabled={!hasValidRange}
                onClick={() => {
                  onChange('custom', draftCustom);
                  setOpen(false);
                }}
                className="
                  w-full
                  h-11
                  mt-4
                  rounded-lg
                  bg-gray-900
                  text-white
                  text-sm
                  font-medium
                  transition
                  hover:bg-gray-800
                  active:bg-gray-950
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                "
              >
                Apply
              </button>

            </div>
          </div>
        </>
      )}
    </div>
  );
}