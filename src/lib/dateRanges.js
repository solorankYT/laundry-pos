export const BUSINESS_TIME_ZONE = 'Asia/Manila';
const DAY_MS = 24 * 60 * 60 * 1000;
const manilaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom', label: 'Custom Range' },
];

export function businessDateKey(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return manilaDay.format(new Date(date));
}

function calendarDay(key) {
  return new Date(`${key}T00:00:00Z`);
}

function addDays(key, days) {
  return new Date(calendarDay(key).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function monthStart(key, offset) {
  const date = calendarDay(key);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1))
    .toISOString().slice(0, 10);
}

function midnight(key) {
  return new Date(`${key}T00:00:00+08:00`);
}

function range(start, end, comparisonStart, comparisonEnd) {
  return {
    start: midnight(start),
    end: midnight(end),
    comparisonStart: midnight(comparisonStart),
    comparisonEnd: midnight(comparisonEnd),
  };
}

export function isValidCustomRange(custom) {
  return [custom?.start, custom?.end].every((day) => (
    typeof day === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(day)
      && Number.isFinite(calendarDay(day).getTime())
      && calendarDay(day).toISOString().slice(0, 10) === day
  )) && custom.start <= custom.end;
}

// All ranges start at Manila midnight. The end timestamps are exclusive.
export function getRangeForPreset(preset, custom = {}, now = new Date()) {
  const today = businessDateKey(now);
  switch (preset) {
    case 'today':
      return range(today, addDays(today, 1), addDays(today, -1), today);
    case 'yesterday':
      return range(addDays(today, -1), today, addDays(today, -2), addDays(today, -1));
    case 'this_week':
    case 'last_week': {
      const weekday = calendarDay(today).getUTCDay();
      const monday = addDays(today, -((weekday + 6) % 7));
      const start = preset === 'this_week' ? monday : addDays(monday, -7);
      return range(start, addDays(start, 7), addDays(start, -7), start);
    }
    case 'this_month':
    case 'last_month': {
      const current = preset === 'this_month' ? 0 : -1;
      return range(
        monthStart(today, current),
        monthStart(today, current + 1),
        monthStart(today, current - 1),
        monthStart(today, current),
      );
    }
    case 'custom': {
      if (!isValidCustomRange(custom)) throw new Error('Choose a valid date range.');
      const end = addDays(custom.end, 1);
      const length = (calendarDay(end) - calendarDay(custom.start)) / DAY_MS;
      return range(custom.start, end, addDays(custom.start, -length), custom.start);
    }
    default:
      throw new Error(`Unknown preset: ${preset}`);
  }
}

export function formatRangeLabel(start, end) {
  const lastDay = new Date(end.getTime() - 1);
  const formatter = new Intl.DateTimeFormat('en-PH', {
    timeZone: BUSINESS_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric',
  });
  return formatter.formatRange(start, lastDay);
}

export function formatDateShort(date) {
  const key = businessDateKey(date);
  return midnight(key).toLocaleDateString('en-PH', {
    timeZone: BUSINESS_TIME_ZONE, month: 'short', day: 'numeric',
  });
}

export function formatDateTime(value) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('en-PH', {
      timeZone: BUSINESS_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-PH', {
      timeZone: BUSINESS_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true,
    }),
  };
}

export function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
