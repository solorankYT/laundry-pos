// src/lib/dashboardData.js
//
// ASSUMED SCHEMA — adjust table/column names to match your actual Supabase
// tables, the rest of the file doesn't need to change if you keep the shape:
//
//   orders
//     id, order_number, customer_name, customer_id, created_at (timestamptz),
//     status          text: 'pending' | 'processing' | 'ready' | 'released' | 'cancelled'
//     payment_status  text: 'paid' | 'unpaid'
//     payment_method  text: 'cash' | 'gcash' | 'other'
//     subtotal, discount, total  numeric
//     created_by      text (staff name, optional)
//
//   order_items   (one row per service or add-on on an order)
//     id, order_id, item_type text: 'service' | 'addon'
//     name, quantity, unit_price, line_total  numeric
//
// Every dashboard card AND the Excel export both call the functions below,
// so "dashboard numbers = export numbers" by construction — there is only
// one place that filters/aggregates orders.

import { supabase } from './supabase';

const ACTIVE_PROCESSING_STATUSES = ['pending', 'processing'];

/**
 * Fetches every order (with its line items) that falls inside [start, end].
 * This is the one query everything else in this file derives from.
 */
export async function fetchOrdersInRange(start, end) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Top-of-dashboard KPI numbers for the selected period, plus the same
 * numbers for the prior comparable period so cards can show a trend.
 */
export async function getKpiSummary({ start, end, comparisonStart, comparisonEnd }) {
  const [current, previous] = await Promise.all([
    fetchOrdersInRange(start, end),
    fetchOrdersInRange(comparisonStart, comparisonEnd),
  ]);

  const summarize = (orders) => {
    const notCancelled = orders.filter((o) => o.status !== 'cancelled');
    const revenue = notCancelled.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const unpaidOrders = orders.filter((o) => o.payment_status === 'unpaid' && o.status !== 'cancelled');
    const unpaidAmount = unpaidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const pending = orders.filter((o) => ACTIVE_PROCESSING_STATUSES.includes(o.status));
    const ready = orders.filter((o) => o.status === 'ready');
    const released = orders.filter((o) => o.status === 'released');
    const cancelled = orders.filter((o) => o.status === 'cancelled');

    return {
      totalOrders: orders.length,
      revenue,
      unpaidAmount,
      unpaidCount: unpaidOrders.length,
      pendingCount: pending.length,
      pendingWashing: pending.filter((o) => o.status === 'pending').length,
      pendingProcessing: pending.filter((o) => o.status === 'processing').length,
      readyCount: ready.length,
      releasedCount: released.length,
      cancelledCount: cancelled.length,
      avgOrderValue: notCancelled.length ? revenue / notCancelled.length : 0,
    };
  };

  const cur = summarize(current);
  const prev = summarize(previous);

  return {
    ...cur,
    trend: {
      revenue: pctChange(cur.revenue, prev.revenue),
      orders: pctChange(cur.totalOrders, prev.totalOrders),
    },
    orders: current, // raw list, reused by other cards for this same period
  };
}

function pctChange(cur, prev) {
  if (!prev) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

/** Order counts by status, for the compact "Orders Overview" list. */
export function getOrdersByStatus(orders) {
  const statuses = ['pending', 'processing', 'ready', 'released', 'cancelled'];
  return statuses
    .map((status) => ({ status, count: orders.filter((o) => o.status === status).length }))
    .filter((row) => row.count > 0);
}

/**
 * Revenue grouped by day, for the Revenue chart. `orders` should already be
 * scoped to the selected range. Works for daily/weekly/monthly buckets by
 * changing the bucket key function.
 */
export function getRevenueSeries(orders, groupBy = 'day') {
  const notCancelled = orders.filter((o) => o.status !== 'cancelled');
  const buckets = new Map();

  for (const o of notCancelled) {
    const d = new Date(o.created_at);
    let key;
    if (groupBy === 'day') {
      key = d.toISOString().slice(0, 10);
    } else if (groupBy === 'week') {
      const monday = new Date(d);
      const day = monday.getDay();
      monday.setDate(monday.getDate() - ((day + 6) % 7));
      key = monday.toISOString().slice(0, 10);
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    const existing = buckets.get(key) || { key, revenue: 0, orders: 0 };
    existing.revenue += Number(o.total || 0);
    existing.orders += 1;
    buckets.set(key, existing);
  }

  return Array.from(buckets.values()).sort((a, b) => (a.key > b.key ? 1 : -1));
}

/** Ranked list of services by order count + revenue (Popular Services / Revenue by Service). */
export function getServiceStats(orders) {
  const map = new Map();
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    for (const item of o.order_items || []) {
      if (item.item_type !== 'service') continue;
      const row = map.get(item.name) || { name: item.name, orders: 0, quantity: 0, revenue: 0 };
      row.orders += 1;
      row.quantity += Number(item.quantity || 0);
      row.revenue += Number(item.line_total || 0);
      map.set(item.name, row);
    }
  }
  const rows = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  return rows.map((r) => ({ ...r, pctOfRevenue: totalRevenue ? (r.revenue / totalRevenue) * 100 : 0 }));
}

/** Same shape as getServiceStats but for add-ons (Detergent, Fabric Softener, ...). */
export function getAddonStats(orders) {
  const map = new Map();
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    for (const item of o.order_items || []) {
      if (item.item_type !== 'addon') continue;
      const row = map.get(item.name) || { name: item.name, sold: 0, revenue: 0 };
      row.sold += Number(item.quantity || 0);
      row.revenue += Number(item.line_total || 0);
      map.set(item.name, row);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

/** Paid vs unpaid totals, and a breakdown by payment method (Payment Summary). */
export function getPaymentStats(orders) {
  const notCancelled = orders.filter((o) => o.status !== 'cancelled');
  const paid = notCancelled.filter((o) => o.payment_status === 'paid');
  const unpaid = notCancelled.filter((o) => o.payment_status === 'unpaid');

  const byMethod = new Map();
  for (const o of paid) {
    const method = o.payment_method || 'other';
    byMethod.set(method, (byMethod.get(method) || 0) + Number(o.total || 0));
  }

  return {
    paidAmount: paid.reduce((s, o) => s + Number(o.total || 0), 0),
    unpaidAmount: unpaid.reduce((s, o) => s + Number(o.total || 0), 0),
    unpaidCount: unpaid.length,
    byMethod: Array.from(byMethod.entries()).map(([method, amount]) => ({ method, amount })),
  };
}

/**
 * Items that need the owner's attention right now: ready-for-pickup,
 * unpaid, and orders that have been "processing" longer than expected.
 * Only categories that actually have entries are returned.
 */
export function getNeedsAttention(orders, { delayHours = 24 } = {}) {
  const now = Date.now();
  const ready = orders.filter((o) => o.status === 'ready');
  const unpaid = orders.filter((o) => o.payment_status === 'unpaid' && o.status !== 'cancelled');
  const delayed = orders.filter((o) => {
    if (!ACTIVE_PROCESSING_STATUSES.includes(o.status)) return false;
    const ageHours = (now - new Date(o.created_at).getTime()) / 36e5;
    return ageHours > delayHours;
  });
  const cancelled = orders.filter((o) => o.status === 'cancelled');

  const items = [];
  if (ready.length) {
    items.push({
      key: 'ready',
      severity: 'positive',
      title: `${ready.length} order${ready.length === 1 ? '' : 's'} ready for release`,
      subtitle: 'Customers can pick these up.',
      count: ready.length,
    });
  }
  if (unpaid.length) {
    const amount = unpaid.reduce((s, o) => s + Number(o.total || 0), 0);
    items.push({
      key: 'unpaid',
      severity: 'urgent',
      title: `${unpaid.length} unpaid order${unpaid.length === 1 ? '' : 's'}`,
      subtitle: `\u20B1${amount.toLocaleString('en-PH')} outstanding.`,
      count: unpaid.length,
    });
  }
  if (delayed.length) {
    items.push({
      key: 'delayed',
      severity: 'warning',
      title: `${delayed.length} delayed order${delayed.length === 1 ? '' : 's'}`,
      subtitle: 'Processing longer than expected.',
      count: delayed.length,
    });
  }
  if (cancelled.length) {
    items.push({
      key: 'cancelled',
      severity: 'neutral',
      title: `${cancelled.length} cancelled order${cancelled.length === 1 ? '' : 's'}`,
      subtitle: 'Review if this needs follow-up.',
      count: cancelled.length,
    });
  }
  return items;
}

/** Order counts by hour of day, for "Busiest Hours". Returns [] if too little data to be meaningful. */
export function getPeakHours(orders, minOrders = 20) {
  if (orders.length < minOrders) return [];
  const buckets = new Array(24).fill(0);
  for (const o of orders) {
    buckets[new Date(o.created_at).getHours()] += 1;
  }
  return buckets
    .map((count, hour) => ({ hour, count }))
    .filter((b) => b.count > 0);
}
