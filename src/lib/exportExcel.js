// src/lib/exportExcel.js
//
// Builds the owner-facing Excel reports. Requires the `xlsx` (SheetJS) package:
//   npm install xlsx
//
// IMPORTANT: this file does not re-derive any numbers. It calls the exact
// same aggregation functions dashboardData.js uses for the on-screen
// dashboard, on the exact same order list, so a Sales Report or Summary
// sheet can never disagree with what the owner sees on screen.

import * as XLSX from 'xlsx';
import {
  fetchOrdersInRange,
  getOrdersByStatus,
  getRevenueSeries,
  getServiceStats,
  getAddonStats,
  getPaymentStats,
} from './dashboardData';
import { formatRangeLabel, formatDateTime, formatDateShort } from './dateRanges';

const PESO_FMT = '"\u20B1"#,##0';

function styledSheet(rows, { headerRow = 0, currencyCols = [], colWidths } = {}) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (colWidths) ws['!cols'] = colWidths.map((w) => ({ wch: w }));
  ws['!freeze'] = { xSplit: 0, ySplit: headerRow + 1 };
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: rows.length - 1, c: (rows[headerRow] || []).length - 1 } }) };

  // Apply currency number format to specified columns (0-indexed), skipping header rows.
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = headerRow + 1; R <= range.e.r; R++) {
    for (const C of currencyCols) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && typeof cell.v === 'number') cell.z = PESO_FMT;
    }
  }
  return ws;
}

function reportHeaderRows(title, rangeLabel) {
  return [
    [title],
    [rangeLabel],
    [`Generated ${new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`],
    [],
  ];
}

function orderRow(o) {
  const { date, time } = formatDateTime(o.created_at);
  const services = (o.order_items || []).filter((i) => i.item_type === 'service').map((i) => i.name).join(', ');
  const addons = (o.order_items || []).filter((i) => i.item_type === 'addon').map((i) => i.name).join(', ');
  return { date, time, services, addons };
}

/* ------------------------------------------------------------------ */
/* Individual report builders — each returns a SheetJS worksheet       */
/* ------------------------------------------------------------------ */

function buildSalesSheet(orders, rangeLabel) {
  const header = ['Order #', 'Date', 'Time', 'Customer', 'Services', 'Add-ons', 'Subtotal', 'Discount', 'Total', 'Payment Method', 'Payment Status', 'Order Status'];
  const top = reportHeaderRows('Sales Report', rangeLabel);
  const headerRow = top.length;
  const rows = orders.map((o) => {
    const { date, time, services, addons } = orderRow(o);
    return [
      o.order_number ?? o.id,
      date,
      time,
      o.customer_name || '',
      services,
      addons,
      Number(o.subtotal || 0),
      Number(o.discount || 0),
      Number(o.total || 0),
      titleCase(o.payment_method),
      titleCase(o.payment_status),
      titleCase(o.status),
    ];
  });
  const all = [...top.slice(0, headerRow), header, ...rows];
  return styledSheet(all, { headerRow, currencyCols: [6, 7, 8], colWidths: [10, 12, 10, 20, 24, 18, 10, 10, 10, 14, 12, 12] });
}

function buildOrdersSheet(orders, rangeLabel) {
  const header = ['Order #', 'Date', 'Time', 'Customer', 'Services', 'Total', 'Payment Status', 'Order Status', 'Created By'];
  const top = reportHeaderRows('Orders Report', rangeLabel);
  const headerRow = top.length;
  const rows = orders.map((o) => {
    const { date, time, services } = orderRow(o);
    return [o.order_number ?? o.id, date, time, o.customer_name || '', services, Number(o.total || 0), titleCase(o.payment_status), titleCase(o.status), o.created_by || ''];
  });
  const all = [...top.slice(0, headerRow), header, ...rows];
  return styledSheet(all, { headerRow, currencyCols: [5], colWidths: [10, 12, 10, 20, 24, 10, 12, 12, 14] });
}

function buildServicesSheet(orders, rangeLabel) {
  const stats = getServiceStats(orders);
  const header = ['Service', 'Orders', 'Quantity', 'Revenue', '% of Total Revenue'];
  const top = reportHeaderRows('Service Performance', rangeLabel);
  const headerRow = top.length;
  const rows = stats.map((s) => [s.name, s.orders, s.quantity, s.revenue, `${s.pctOfRevenue.toFixed(1)}%`]);
  const all = [...top.slice(0, headerRow), header, ...rows];
  return styledSheet(all, { headerRow, currencyCols: [3], colWidths: [20, 10, 10, 12, 16] });
}

function buildPaymentsSheet(orders, rangeLabel) {
  const header = ['Date', 'Order #', 'Customer', 'Amount', 'Payment Method', 'Payment Status'];
  const top = reportHeaderRows('Payment Report', rangeLabel);
  const headerRow = top.length;
  const rows = orders.map((o) => {
    const { date } = formatDateTime(o.created_at);
    return [date, o.order_number ?? o.id, o.customer_name || '', Number(o.total || 0), titleCase(o.payment_method), titleCase(o.payment_status)];
  });
  const all = [...top.slice(0, headerRow), header, ...rows];
  return styledSheet(all, { headerRow, currencyCols: [3], colWidths: [12, 10, 20, 10, 14, 12] });
}

function buildCustomersSheet(orders, rangeLabel) {
  const map = new Map();
  for (const o of orders) {
    if (!o.customer_name) continue;
    const row = map.get(o.customer_name) || { name: o.customer_name, contact: o.customer_contact || '', orders: 0, spent: 0, last: o.created_at };
    row.orders += 1;
    row.spent += Number(o.total || 0);
    if (new Date(o.created_at) > new Date(row.last)) row.last = o.created_at;
    map.set(o.customer_name, row);
  }
  const header = ['Customer', 'Contact', 'Orders', 'Total Spent', 'Last Order'];
  const top = reportHeaderRows('Customer Report', rangeLabel);
  const headerRow = top.length;
  const rows = Array.from(map.values())
    .sort((a, b) => b.spent - a.spent)
    .map((c) => [c.name, c.contact, c.orders, c.spent, formatDateShort(c.last)]);
  const all = [...top.slice(0, headerRow), header, ...rows];
  return styledSheet(all, { headerRow, currencyCols: [3], colWidths: [20, 16, 10, 12, 12] });
}

function buildDailySummarySheet(orders, rangeLabel) {
  const notCancelled = orders.filter((o) => o.status !== 'cancelled');
  const byDay = new Map();
  for (const o of orders) {
    const key = formatDateShort(o.created_at);
    const row = byDay.get(key) || { date: key, total: 0, completed: 0, cancelled: 0, revenue: 0, paid: 0, unpaid: 0 };
    row.total += 1;
    if (o.status === 'cancelled') row.cancelled += 1;
    if (o.status === 'released') row.completed += 1;
    if (o.status !== 'cancelled') {
      row.revenue += Number(o.total || 0);
      if (o.payment_status === 'paid') row.paid += Number(o.total || 0);
      else row.unpaid += Number(o.total || 0);
    }
    byDay.set(key, row);
  }
  const header = ['Date', 'Total Orders', 'Completed', 'Cancelled', 'Revenue', 'Paid', 'Unpaid', 'Avg Order Value'];
  const top = reportHeaderRows('Daily Summary', rangeLabel);
  const headerRow = top.length;
  const rows = Array.from(byDay.values()).map((d) => [
    d.date,
    d.total,
    d.completed,
    d.cancelled,
    d.revenue,
    d.paid,
    d.unpaid,
    d.total ? d.revenue / (d.total - d.cancelled || 1) : 0,
  ]);
  const all = [...top.slice(0, headerRow), header, ...rows];
  return styledSheet(all, { headerRow, currencyCols: [4, 5, 6, 7], colWidths: [12, 12, 10, 10, 12, 12, 12, 14] });
}

function buildSummarySheet(orders, rangeLabel) {
  const notCancelled = orders.filter((o) => o.status !== 'cancelled');
  const revenue = notCancelled.reduce((s, o) => s + Number(o.total || 0), 0);
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;
  const { unpaidAmount } = getPaymentStats(orders);
  const avgOrder = notCancelled.length ? revenue / notCancelled.length : 0;
  const series = getRevenueSeries(orders, 'day');
  const services = getServiceStats(orders).slice(0, 10);

  const rows = [
    ['LAUNDRY POS BUSINESS REPORT'],
    [rangeLabel],
    [],
    ['Total Revenue', revenue],
    ['Total Orders', orders.length],
    ['Completed Orders', orders.filter((o) => o.status === 'released').length],
    ['Cancelled Orders', cancelled],
    ['Unpaid Amount', unpaidAmount],
    ['Average Order Value', avgOrder],
    [],
    ['Revenue by Day'],
    ['Date', 'Orders', 'Revenue'],
    ...series.map((s) => [formatDateShort(s.key), s.orders, s.revenue]),
    [],
    ['Top Services'],
    ['Service', 'Orders', 'Revenue'],
    ...services.map((s) => [s.name, s.orders, s.revenue]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }];
  // Currency-format the known money cells.
  [3, 7, 8].forEach((r) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cell) cell.z = PESO_FMT;
  });
  const dayStart = 11;
  series.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: dayStart + 1 + i, c: 2 })];
    if (cell) cell.z = PESO_FMT;
  });
  const svcStart = dayStart + series.length + 3;
  services.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: svcStart + 1 + i, c: 2 })];
    if (cell) cell.z = PESO_FMT;
  });
  return ws;
}

function titleCase(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

function fileNameFor(reportType, start, end) {
  const fmt = (d) => new Date(d).toISOString().slice(0, 10);
  const sameDay = fmt(start) === fmt(end);
  const label = sameDay ? fmt(start) : `${fmt(start)}_to_${fmt(end)}`;
  const typeLabel = { full: 'Report', daily_summary: 'Daily-Summary', sales: 'Sales', orders: 'Orders', services: 'Services', payments: 'Payments', customers: 'Customers' }[reportType] || 'Report';
  return `Laundry-POS-${typeLabel}-${label}.xlsx`;
}

/**
 * reportType: 'sales' | 'orders' | 'services' | 'payments' | 'customers' | 'daily_summary' | 'full'
 * range: { start, end } Date objects (already resolved from a preset or custom picker)
 * filters (optional): { status, paymentStatus } — applied on top of the date range,
 *   used when the owner exports "current results" from an already-filtered view.
 */
export async function exportToExcel({ reportType, range, filters = {}, hasCustomerData = true }) {
  let orders = await fetchOrdersInRange(range.start, range.end);

  if (filters.status) orders = orders.filter((o) => o.status === filters.status);
  if (filters.paymentStatus) orders = orders.filter((o) => o.payment_status === filters.paymentStatus);

  const rangeLabel = formatRangeLabel(range.start, range.end);
  const wb = XLSX.utils.book_new();

  const addSheet = (name, ws) => XLSX.utils.book_append_sheet(wb, ws, name);

  if (reportType === 'sales') {
    addSheet('Sales', buildSalesSheet(orders, rangeLabel));
  } else if (reportType === 'orders') {
    addSheet('Orders', buildOrdersSheet(orders, rangeLabel));
  } else if (reportType === 'services') {
    addSheet('Services', buildServicesSheet(orders, rangeLabel));
  } else if (reportType === 'payments') {
    addSheet('Payments', buildPaymentsSheet(orders, rangeLabel));
  } else if (reportType === 'customers') {
    addSheet('Customers', buildCustomersSheet(orders, rangeLabel));
  } else if (reportType === 'daily_summary') {
    addSheet('Daily Summary', buildDailySummarySheet(orders, rangeLabel));
  } else if (reportType === 'full') {
    addSheet('Summary', buildSummarySheet(orders, rangeLabel));
    addSheet('Sales', buildSalesSheet(orders, rangeLabel));
    addSheet('Orders', buildOrdersSheet(orders, rangeLabel));
    addSheet('Services', buildServicesSheet(orders, rangeLabel));
    addSheet('Payments', buildPaymentsSheet(orders, rangeLabel));
    if (hasCustomerData) addSheet('Customers', buildCustomersSheet(orders, rangeLabel));
  } else {
    throw new Error(`Unknown reportType: ${reportType}`);
  }

  const fileName = fileNameFor(reportType, range.start, range.end);
  XLSX.writeFile(wb, fileName);
  return fileName;
}
