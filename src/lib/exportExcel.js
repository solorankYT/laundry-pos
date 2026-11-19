import * as XLSX from 'xlsx';
import {
  fetchReportData,
  getDailyClose,
  getOrderSubtotal,
  getServiceStats,
  hasOutstandingBalance,
  isComplimentary,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  summarizeReport,
} from './dashboardData.js';
import { businessDateKey, BUSINESS_TIME_ZONE, formatRangeLabel, formatDateTime } from './dateRanges.js';

const PESO_FMT = '"₱"#,##0.00';

function reportSheet(title, rangeLabel, columns, rows, { currencyCols = [], total, note } = {}) {
  const headerRow = 4;
  const headings = [
    [title],
    [rangeLabel + ' (Asia/Manila)'],
    [`Generated ${new Date().toLocaleString('en-PH', { timeZone: BUSINESS_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' })}`],
    note ? [note] : [],
    columns,
  ];
  const ws = XLSX.utils.aoa_to_sheet([...headings, ...rows, ...(total ? [total] : [])]);
  ws['!cols'] = columns.map((column) => ({ wch: Math.max(column.length + 3, 18) }));
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRow, c: 0 },
      e: { r: headerRow + rows.length, c: columns.length - 1 },
    }),
  };
  for (let row = headerRow + 1; row <= headerRow + rows.length + (total ? 1 : 0); row++) {
    for (const col of currencyCols) {
      const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell?.t === 'n') cell.z = PESO_FMT;
    }
  }
  return ws;
}

function paymentLabel(order) {
  if (order.status === 'cancelled') return 'Voided';
  if (isComplimentary(order)) return 'Complimentary';
  if (Number(order.total) === 0) return 'No charge';
  return order.payment_status ? 'Paid' : 'Unpaid';
}

function orderDetails(orders, rangeLabel) {
  const columns = [
    'Claim Number', 'Date', 'Time', 'Customer', 'Services', 'Add-ons', 'Net Order Value',
    'Balance Due', 'Payment', 'Status', 'Opened By', 'Value Before Adjustments',
    'Discount Amount', 'Complimentary Value', 'Adjustment Reason', 'Adjustment Approved At',
  ];
  const rows = orders.map((order) => {
    const { date, time } = formatDateTime(order.created_at);
    const services = order.order_items?.map((item) => `${item.service_name} ×${item.quantity}`).join(', ');
    const addons = order.order_addons?.map((item) => `${item.addon_name ?? 'Add-on'} ×${item.quantity}`).join(', ');
    const complimentary = isComplimentary(order);
    const adjustment = order.discount_at ? formatDateTime(order.discount_at) : null;
    return [
      order.order_number ?? order.id,
      date,
      time,
      order.customer_name,
      services ?? '',
      addons ?? '',
      Number(order.total),
      hasOutstandingBalance(order) ? Number(order.total) : 0,
      paymentLabel(order),
      ORDER_STATUS_LABELS[order.status] ?? order.status,
      order.created_by_email ?? '',
      getOrderSubtotal(order),
      complimentary ? 0 : Number(order.discount_amount ?? 0),
      complimentary ? Number(order.discount_amount) : 0,
      order.discount_reason ?? '',
      adjustment ? `${adjustment.date} ${adjustment.time}` : '',
    ];
  });
  return reportSheet('Orders opened in this period', rangeLabel, columns, rows, {
    currencyCols: [6, 7, 11, 12, 13],
    note: 'Dates in this sheet refer to the order opening. The adjustment approval timestamp is shown separately.',
  });
}

function paymentDetails(payments, rangeLabel) {
  const columns = ['Date', 'Time', 'Claim Number', 'Customer', 'Amount Collected', 'Method', 'Cashier'];
  const rows = payments.map((payment) => {
    const { date, time } = formatDateTime(payment.recorded_at);
    return [
      date,
      time,
      payment.orders?.order_number ?? payment.order_id,
      payment.orders?.customer_name ?? '',
      Number(payment.amount),
      PAYMENT_METHOD_LABELS[payment.method] ?? payment.method,
      payment.recorded_by_email ?? '',
    ];
  });
  const { revenue } = summarizeReport([], payments);
  return reportSheet('Payments collected in this period', rangeLabel, columns, rows, {
    currencyCols: [4],
    total: ['Total', '', '', '', revenue],
  });
}

function dailyClose(orders, payments, rangeLabel) {
  const columns = [
    'Business Day', 'Orders Opened', 'Voided Orders', 'Net Order Value', 'Cash Collected',
    'GCash Collected', 'Other Collected', 'Total Collected', 'Outstanding on Orders Opened',
    'Value Before Adjustments', 'Discounted Orders', 'Discount Amount', 'Complimentary Orders',
    'Complimentary Value',
  ];
  function closeRow(label, report) {
    const methods = Object.fromEntries(report.collections.byMethod.map(({ method, amount }) => [method, amount]));
    const { discountedCount, discountAmount, complimentaryCount, complimentaryAmount } = report.adjustments;
    return [
      label, report.totalOrders, report.cancelledCount, report.orderValue,
      methods.cash, methods.gcash, methods.other, report.revenue, report.unpaidAmount,
      report.grossOrderValue, discountedCount, discountAmount, complimentaryCount, complimentaryAmount,
    ];
  }
  const rows = getDailyClose(orders, payments).map((report) => closeRow(report.day, report));
  return reportSheet('Daily Close', rangeLabel, columns, rows, {
    currencyCols: [3, 4, 5, 6, 7, 8, 9, 11, 13],
    note: 'Collections use the payment date. Order values, current balances, and current adjustments use the order opening date and exclude voids.',
    total: closeRow('Total', summarizeReport(orders, payments)),
  });
}

function serviceDetails(orders, rangeLabel) {
  const columns = ['Service', 'Orders', 'Quantity', 'Value Before Adjustments', '% of Service Value'];
  const rows = getServiceStats(orders).map((service) => [
    service.name, service.orders, service.quantity, service.revenue, `${service.pctOfRevenue.toFixed(1)}%`,
  ]);
  return reportSheet('Service Performance', rangeLabel, columns, rows, { currencyCols: [3] });
}

function customerDetails(orders, rangeLabel) {
  const byName = new Map();
  for (const order of orders) {
    if (!order.customer_name || order.status === 'cancelled') continue;
    const row = byName.get(order.customer_name) ?? { orders: 0, cents: 0, last: order.created_at };
    row.orders += 1;
    row.cents += Math.round(Number(order.total) * 100);
    if (new Date(order.created_at) > new Date(row.last)) row.last = order.created_at;
    byName.set(order.customer_name, row);
  }
  const rows = [...byName.entries()].map(([name, { orders: count, cents, last }]) => [
    name, count, cents / 100, formatDateTime(last).date,
  ]);
  return reportSheet('Orders by Customer Name', rangeLabel, ['Customer Name', 'Orders', 'Net Order Value', 'Last Order'], rows, { currencyCols: [2] });
}

export function buildReportWorkbook({ reportType, range, data, hasCustomerData = true }) {
  const rangeLabel = formatRangeLabel(range.start, range.end);
  const workbook = XLSX.utils.book_new();
  const { orders, payments } = data;
  const sheets = {
    daily_summary: () => ['Daily Close', dailyClose(orders, payments, rangeLabel)],
    payments: () => ['Payments', paymentDetails(payments, rangeLabel)],
    orders: () => ['Orders', orderDetails(orders, rangeLabel)],
    services: () => ['Services', serviceDetails(orders, rangeLabel)],
    customers: () => ['Customers', customerDetails(orders, rangeLabel)],
  };
  const types = {
    full: ['daily_summary', 'payments', 'orders', 'services', ...(hasCustomerData ? ['customers'] : [])],
    sales: ['daily_summary', 'payments'],
  }[reportType] ?? [reportType];

  for (const type of types) {
    const build = sheets[type];
    if (!build) throw new Error(`Unknown report type: ${type}`);
    const [name, sheet] = build();
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  return workbook;
}

export async function exportToExcel({ reportType, range, data, filters = {}, hasCustomerData = true }) {
  const report = data ?? await fetchReportData(range);
  let { orders, payments } = report;
  if (filters.status || filters.paymentStatus) {
    orders = orders.filter((order) => {
      const paymentStatus = paymentLabel(order).toLowerCase();
      return (!filters.status || order.status === filters.status)
        && (!filters.paymentStatus || paymentStatus === filters.paymentStatus);
    });
    const ids = new Set(orders.map((order) => order.id));
    payments = payments.filter((payment) => ids.has(payment.order_id));
  }

  const workbook = buildReportWorkbook({ reportType, range, data: { orders, payments }, hasCustomerData });
  const start = businessDateKey(range.start);
  const end = businessDateKey(new Date(range.end.getTime() - 1));
  const period = start === end ? start : `${start}_to_${end}`;
  const name = reportType.replaceAll('_', '-');
  const fileName = `Laundry-POS-${name}-${period}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
}
