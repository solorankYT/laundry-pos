// src/lib/dateRanges.js
//
// Single source of truth for "what period is selected". Both the dashboard
// and the Excel export call getRangeForPreset() so the numbers they show
// always describe the same window of time.

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d) {
  // Week starts on Monday.
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return endOfDay(e);
}

function startOfMonth(d) {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d) {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom', label: 'Custom Range' },
];

// Returns { start: Date, end: Date, comparisonStart, comparisonEnd }
// comparison* is the equivalent prior period, used for "+8% vs last week" copy.
export function getRangeForPreset(preset, custom = {}) {
  const now = new Date();

  switch (preset) {
    case 'today': {
      const start = startOfDay(now);
      const end = endOfDay(now);
      const comparisonStart = startOfDay(addDays(now, -1));
      const comparisonEnd = endOfDay(addDays(now, -1));
      return { start, end, comparisonStart, comparisonEnd };
    }
    case 'yesterday': {
      const y = addDays(now, -1);
      const start = startOfDay(y);
      const end = endOfDay(y);
      const comparisonStart = startOfDay(addDays(y, -1));
      const comparisonEnd = endOfDay(addDays(y, -1));
      return { start, end, comparisonStart, comparisonEnd };
    }
    case 'this_week': {
      const start = startOfWeek(now);
      const end = endOfWeek(now);
      const comparisonStart = addDays(start, -7);
      const comparisonEnd = addDays(end, -7);
      return { start, end, comparisonStart, comparisonEnd };
    }
    case 'last_week': {
      const start = addDays(startOfWeek(now), -7);
      const end = addDays(endOfWeek(now), -7);
      const comparisonStart = addDays(start, -7);
      const comparisonEnd = addDays(end, -7);
      return { start, end, comparisonStart, comparisonEnd };
    }
    case 'this_month': {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        start,
        end,
        comparisonStart: startOfMonth(prevMonthDate),
        comparisonEnd: endOfMonth(prevMonthDate),
      };
    }
    case 'last_month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const prevMonthDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      return {
        start,
        end,
        comparisonStart: startOfMonth(prevMonthDate),
        comparisonEnd: endOfMonth(prevMonthDate),
      };
    }
    case 'custom': {
      const start = startOfDay(new Date(custom.start));
      const end = endOfDay(new Date(custom.end));
      const lengthMs = end.getTime() - start.getTime();
      const comparisonEnd = new Date(start.getTime() - 1);
      const comparisonStart = new Date(comparisonEnd.getTime() - lengthMs);
      return { start, end, comparisonStart, comparisonEnd };
    }
    default:
      throw new Error(`Unknown preset: ${preset}`);
  }
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Human label for the currently selected period, e.g. "September 1–24, 2026"
export function formatRangeLabel(start, end) {
  const sameDay = start.toDateString() === end.toDateString();
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const monthFmt = { month: 'long' };
  const yearFmt = { year: 'numeric' };

  if (sameDay) {
    return start.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (sameMonth) {
    return `${start.toLocaleDateString('en-PH', monthFmt)} ${start.getDate()}\u2013${end.getDate()}, ${start.toLocaleDateString('en-PH', yearFmt)}`;
  }
  return `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} \u2013 ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function formatDateShort(d) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function formatDateTime(d) {
  const date = new Date(d);
  return {
    date: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

export function formatPeso(amount) {
  return `\u20B1${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function percentChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
