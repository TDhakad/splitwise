import type { ReceiptBreakdown, User } from '../types/api';

export type ReceiptExportFormat = 'csv' | 'tsv';

/**
 * Derives a per-item "weight" for each user from the stored dollar amounts.
 *
 * The persisted receipt breakdown only keeps the computed dollar share for each
 * user (no raw split weights). To rebuild a weight matrix we normalize every
 * item's shares against the smallest non-zero share, so an equally shared item
 * yields 1 for each participant, and a custom split like $2.47 / $6.18 / $6.18
 * yields 1 / 2.5 / 2.5.
 */
function computeItemWeights(amounts: number[]): number[] {
  const positives = amounts.filter(amount => amount > 0);
  if (positives.length === 0) return amounts.map(() => 0);
  const unit = Math.min(...positives);
  if (unit <= 0) return amounts.map(() => 0);
  return amounts.map(amount => (amount > 0 ? amount / unit : 0));
}

function formatWeight(weight: number): string {
  if (weight <= 0) return '0';
  // Round to 2 decimals, then drop trailing zeros: 1 -> "1", 2.5 -> "2.5".
  return String(Math.round(weight * 100) / 100);
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Builds the totals rows shown below the item grid, in label/value columns.
 * Subtotal, Tax and Total are always included; Discount and Tip only appear
 * when they are non-zero.
 */
function buildTotalsRows(breakdown: ReceiptBreakdown): string[][] {
  const { subtotal, discount, tax, tip, total } = breakdown.totals;
  const rows: string[][] = [['Subtotal', formatPrice(subtotal)]];
  if (discount) rows.push(['Discount', formatPrice(discount)]);
  rows.push(['Tax', formatPrice(tax)]);
  if (tip) rows.push(['Tip', formatPrice(tip)]);
  rows.push(['Total', formatPrice(total)]);
  return rows;
}

/**
 * Builds the export grid: a header row, one row per receipt item, then a blank
 * separator row followed by the totals (Subtotal / Tax / Total, etc.).
 * Item columns are: Product, Price Paid, then one column per user (their weight).
 */
export function buildReceiptMatrix(breakdown: ReceiptBreakdown, users: User[]): string[][] {
  const header = ['Product', 'Price Paid', ...users.map(user => user.name)];

  const rows = breakdown.items.map(item => {
    const amountByUser = new Map(item.shares.map(share => [share.user_id, share.amount]));
    const amounts = users.map(user => amountByUser.get(user.id) ?? 0);
    const weights = computeItemWeights(amounts);
    return [item.name, formatPrice(item.price), ...weights.map(formatWeight)];
  });

  return [header, ...rows, [], ...buildTotalsRows(breakdown)];
}

function escapeCsvField(field: string): string {
  if (/[",\n\r]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function escapeTsvField(field: string): string {
  // Tabs and newlines would break the row/column structure.
  return field.replace(/[\t\n\r]+/g, ' ');
}

export function serializeMatrix(matrix: string[][], format: ReceiptExportFormat): string {
  if (format === 'tsv') {
    return matrix.map(row => row.map(escapeTsvField).join('\t')).join('\n');
  }
  return matrix.map(row => row.map(escapeCsvField).join(',')).join('\n');
}

function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'receipt-breakdown';
}

export function exportReceiptBreakdown(
  breakdown: ReceiptBreakdown,
  users: User[],
  format: ReceiptExportFormat,
  title?: string,
): void {
  const matrix = buildReceiptMatrix(breakdown, users);
  const content = serializeMatrix(matrix, format);
  const mime = format === 'tsv' ? 'text/tab-separated-values' : 'text/csv';
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(title ?? 'receipt-breakdown')}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyReceiptBreakdown(
  breakdown: ReceiptBreakdown,
  users: User[],
  format: ReceiptExportFormat,
): Promise<void> {
  const content = serializeMatrix(buildReceiptMatrix(breakdown, users), format);

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  // Fallback for browsers/contexts without the async clipboard API.
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}
