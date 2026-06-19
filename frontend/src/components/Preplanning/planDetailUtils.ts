import type { ExpenseCategory } from '../../types/api';

export const planCategories: ExpenseCategory[] = ["Dining", "Accommodation", "Transport", "Groceries", "Entertainment", "General"];

export function formatMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getPercent(part: number, total: number): number {
  if (!total) return 0;
  return Math.min(Math.round((part / total) * 100), 100);
}

export function getCategoryIcon(cat: ExpenseCategory | string) {
  switch (cat) {
    case 'Accommodation': return { icon: 'hotel', bg: 'bg-orange-50', text: 'text-orange-600', fill: 'bg-orange-500' };
    case 'Transport': return { icon: 'flight', bg: 'bg-blue-50', text: 'text-blue-600', fill: 'bg-blue-500' };
    case 'Dining': return { icon: 'restaurant', bg: 'bg-red-50', text: 'text-red-600', fill: 'bg-red-500' };
    case 'Groceries': return { icon: 'shopping_cart', bg: 'bg-green-50', text: 'text-green-600', fill: 'bg-green-500' };
    case 'Entertainment': return { icon: 'local_cafe', bg: 'bg-purple-50', text: 'text-purple-600', fill: 'bg-purple-500' };
    default: return { icon: 'category', bg: 'bg-gray-100', text: 'text-gray-600', fill: 'bg-gray-500' };
  }
}

export type ExpandedAllocation = number | 'unallocated' | null;
