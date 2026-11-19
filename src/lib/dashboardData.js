import { supabase } from './supabase.js';
import { businessDateKey, formatPeso } from './dateRanges.js';

const ORDER_COLUMNS = 'id, order_number, customer_name, created_at, created_by_email, total, payment_status, status, order_items(service_name, quantity, price), order_addons(addon_name, quantity, total)';
const PAYMENT_COLUMNS = 'id, order_id, amount, method, recorded_at, recorded_by_email, orders(order_number, customer_name)';
const PAGE_SIZE = 500;

async function fetchInRange(table, columns, timestamp, start, end, client) {
  const rows = [];
  let cursor;
  for (;;) {
    let query = client.from(table)
      .select(columns)
      .gte(timestamp, start.toISOString())
      .lt(timestamp, end.toISOString())
      .order(timestamp, { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) {
      query = query.or(`${timestamp}.lt.${cursor[timestamp]},and(${timestamp}.eq.${cursor[timestamp]},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) return rows;

    rows.push(...data);
    cursor = data.at(-1);
  }
}

export function fetchOrdersInRange(start, end, client = supabase) {
  return fetchInRange('orders', ORDER_COLUMNS, 'created_at', start, end, client);
}

export function fetchPaymentsInRange(start, end, client = supabase) {
  return fetchInRange('order_payments', PAYMENT_COLUMNS, 'recorded_at', start, end, client);
}

export async function fetchReadyOrderCount(signal) {
  const { count, error } = await supabase.from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'done')
    .abortSignal(signal);
  if (error || count === null) throw error ?? new Error('Ready order count unavailable.');
  return count;
}

export async function fetchReportData({ start, end }, client = supabase) {
  const [orders, payments] = await Promise.all([
    fetchOrdersInRange(start, end, client),
    fetchPaymentsInRange(start, end, client),
  ]);
  return { orders, payments };
}

const toCents = (amount) => Math.round(Number(amount || 0) * 100);
const sumAmounts = (rows, amount) => rows.reduce((sum, row) => sum + toCents(amount(row)), 0) / 100;
const isActive = (order) => order.status !== 'cancelled';

export const PAYMENT_METHOD_LABELS = { cash: 'Cash', gcash: 'GCash', other: 'Other' };
export const ORDER_STATUS_LABELS = { pending: 'Pending', done: 'Ready', released: 'Released', cancelled: 'Voided' };

export function getPaymentStats(orders, payments = []) {
  const unpaid = orders.filter((order) => isActive(order) && !order.payment_status);
  return {
    paidAmount: sumAmounts(payments, (payment) => payment.amount),
    unpaidAmount: sumAmounts(unpaid, (order) => order.total),
    unpaidCount: unpaid.length,
    byMethod: Object.keys(PAYMENT_METHOD_LABELS).map((method) => ({
      method,
      amount: sumAmounts(payments.filter((payment) => payment.method === method), (payment) => payment.amount),
    })),
  };
}

export function summarizeReport(orders, payments) {
  const active = orders.filter(isActive);
  const orderValue = sumAmounts(active, (order) => order.total);
  const statusCounts = Object.fromEntries(getOrdersByStatus(orders).map(({ status, count }) => [status, count]));
  const collections = getPaymentStats(orders, payments);

  return {
    totalOrders: orders.length,
    orderValue,
    revenue: collections.paidAmount,
    unpaidAmount: collections.unpaidAmount,
    unpaidCount: collections.unpaidCount,
    pendingCount: statusCounts.pending ?? 0,
    pendingWashing: statusCounts.pending ?? 0,
    pendingProcessing: 0,
    readyCount: statusCounts.done ?? 0,
    releasedCount: statusCounts.released ?? 0,
    cancelledCount: statusCounts.cancelled ?? 0,
    avgOrderValue: active.length ? orderValue / active.length : 0,
    collections,
  };
}

export async function getKpiSummary(range, client = supabase) {
  const [current, previous] = await Promise.all([
    fetchReportData(range, client),
    fetchReportData({ start: range.comparisonStart, end: range.comparisonEnd }, client),
  ]);
  const summary = summarizeReport(current.orders, current.payments);
  const previousSummary = summarizeReport(previous.orders, previous.payments);

  return {
    ...current,
    ...summary,
    trend: {
      revenue: percentChange(summary.revenue, previousSummary.revenue),
      orders: percentChange(summary.totalOrders, previousSummary.totalOrders),
    },
  };
}

function percentChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function getOrdersByStatus(orders) {
  const counts = new Map();
  for (const { status } of orders) counts.set(status, (counts.get(status) ?? 0) + 1);
  return Object.keys(ORDER_STATUS_LABELS)
    .filter((status) => counts.has(status))
    .map((status) => ({ status, count: counts.get(status) }));
}

export function getDailyClose(orders, payments) {
  const days = new Map();
  for (const order of orders) {
    const key = businessDateKey(order.created_at);
    if (!days.has(key)) days.set(key, { orders: [], payments: [] });
    days.get(key).orders.push(order);
  }
  for (const payment of payments) {
    const key = businessDateKey(payment.recorded_at);
    if (!days.has(key)) days.set(key, { orders: [], payments: [] });
    days.get(key).payments.push(payment);
  }
  return [...days.keys()].sort().map((day) => {
    const { orders: dayOrders, payments: dayPayments } = days.get(day);
    return { day, ...summarizeReport(dayOrders, dayPayments) };
  });
}

export function getRevenueSeries(payments, groupBy = 'day') {
  const groups = new Map();
  for (const payment of payments) {
    const day = businessDateKey(payment.recorded_at);
    let key = day;
    if (groupBy === 'month') key = day.slice(0, 7);
    if (groupBy === 'week') {
      const date = new Date(`${day}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      key = date.toISOString().slice(0, 10);
    }
    const group = groups.get(key) ?? { cents: 0, payments: 0 };
    group.cents += toCents(payment.amount);
    group.payments += 1;
    groups.set(key, group);
  }
  return [...groups.keys()].sort().map((key) => {
    const group = groups.get(key);
    return { key, revenue: group.cents / 100, payments: group.payments };
  });
}

export function getServiceStats(orders) {
  const stats = new Map();
  for (const order of orders.filter(isActive)) {
    for (const item of order.order_items ?? []) {
      const name = item.service_name;
      const row = stats.get(name) ?? { name, orders: 0, quantity: 0, cents: 0 };
      row.orders += 1;
      row.quantity += Number(item.quantity);
      row.cents += toCents(item.price) * Number(item.quantity);
      stats.set(name, row);
    }
  }
  const rows = [...stats.values()].sort((a, b) => b.cents - a.cents);
  const total = rows.reduce((sum, row) => sum + row.cents, 0);
  return rows.map(({ cents, ...row }) => ({
    ...row, revenue: cents / 100, pctOfRevenue: total ? (cents / total) * 100 : 0,
  }));
}

export function getAddonStats(orders) {
  const stats = new Map();
  for (const order of orders.filter(isActive)) {
    for (const item of order.order_addons ?? []) {
      const name = item.addon_name ?? 'Add-on';
      const row = stats.get(name) ?? { name, sold: 0, cents: 0 };
      row.sold += Number(item.quantity);
      row.cents += toCents(item.total);
      stats.set(name, row);
    }
  }
  return [...stats.values()]
    .sort((a, b) => b.cents - a.cents)
    .map(({ cents, ...row }) => ({ ...row, revenue: cents / 100 }));
}

export function getNeedsAttention(orders, { delayHours = 24 } = {}) {
  const ready = orders.filter((order) => order.status === 'done');
  const { unpaidCount, unpaidAmount } = getPaymentStats(orders);
  const delayed = orders.filter((order) => (
    order.status === 'pending' && Date.now() - new Date(order.created_at) > delayHours * 3600000
  ));
  const cancelled = orders.filter((order) => order.status === 'cancelled');

  return [
    { key: 'done', severity: 'positive', title: 'Ready for pickup', count: ready.length },
    { key: 'unpaid', severity: 'urgent', title: 'Unpaid orders', subtitle: `${formatPeso(unpaidAmount)} outstanding`, count: unpaidCount },
    { key: 'delayed', severity: 'warning', title: 'Delayed orders', count: delayed.length },
    { key: 'cancelled', severity: 'neutral', title: 'Voided orders', count: cancelled.length },
  ].filter(({ count }) => count);
}
