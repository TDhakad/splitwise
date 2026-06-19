import MSIcon from '../MSIcon';
import { formatMoney, getCategoryIcon, getPercent } from './planDetailUtils';
import type { Dispatch, SetStateAction } from 'react';
import type { ExpenseCategory, ExpenseWithCreator, PlanDetail } from '../../types/api';
import type { ExpandedAllocation } from './planDetailUtils';

interface PlanAllocationsProps {
  plan: PlanDetail;
  categories: ExpenseCategory[];
  showAddAlloc: boolean;
  newAllocCategory: ExpenseCategory;
  newAllocAmount: string;
  expandedAllocation: ExpandedAllocation;
  isUpdatingAllocations: boolean;
  onSelectExpense: (expense: ExpenseWithCreator) => void;
  onToggleAddAlloc: () => void;
  onToggleAllocation: (allocId: ExpandedAllocation) => void;
  onAddAllocation: () => void;
  setNewAllocCategory: Dispatch<SetStateAction<ExpenseCategory>>;
  setNewAllocAmount: Dispatch<SetStateAction<string>>;
}

export default function PlanAllocations({
  plan,
  categories,
  showAddAlloc,
  newAllocCategory,
  newAllocAmount,
  expandedAllocation,
  isUpdatingAllocations,
  onSelectExpense,
  onToggleAddAlloc,
  onToggleAllocation,
  onAddAllocation,
  setNewAllocCategory,
  setNewAllocAmount,
}: PlanAllocationsProps) {
  const allocatedCategories = new Set<string>((plan.allocations || []).map(a => a.category));
  const unallocatedExpenses = (plan.expenses || []).filter(e => {
    const c = e.category || 'General';
    return !allocatedCategories.has(c);
  });

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Budget Allocation</h2>
        <button onClick={onToggleAddAlloc} className="text-sm font-bold text-[#007A64] hover:text-[#00604f] flex items-center gap-1 transition-colors">
          <MSIcon name={showAddAlloc ? "remove_circle_outline" : "add_circle_outline"} className="text-[18px]" /> {showAddAlloc ? "Cancel" : "Allocate"}
        </button>
      </div>

      {showAddAlloc && (
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8 flex flex-col md:flex-row items-end gap-4 shadow-sm">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-600 mb-2">Category Name</label>
            <select value={newAllocCategory} onChange={e => setNewAllocCategory(e.target.value as ExpenseCategory)} className="w-full bg-white border border-gray-200 text-gray-900 font-medium rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64] transition-colors">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-full md:w-32 shrink-0">
            <label className="block text-sm font-bold text-gray-600 mb-2">Type</label>
            <select className="w-full bg-white border border-gray-200 text-gray-900 font-medium rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64] transition-colors">
              <option>Fixed</option>
              <option>Flexible</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-600 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input type="text" value={newAllocAmount} onChange={e => setNewAllocAmount(e.target.value)} placeholder="0.00" className="w-full bg-white border border-gray-200 text-gray-900 font-medium rounded-xl py-3 pl-8 pr-4 text-sm focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64] transition-colors" />
            </div>
          </div>
          <button onClick={onAddAllocation} disabled={isUpdatingAllocations} className="w-full md:w-auto bg-[#007A64] hover:bg-[#00604f] text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1 h-[46px] shrink-0 disabled:opacity-50">
            <MSIcon name="add" className="text-[18px]" /> Add Item
          </button>
        </div>
      )}

      <div className="space-y-4">
        {plan.allocations && plan.allocations.length > 0 ? (
          plan.allocations.map(alloc => {
            const spentCents = plan.allocations_spent[alloc.category] || 0;
            const catStyle = getCategoryIcon(alloc.category);
            const p = getPercent(spentCents, alloc.allocated_amount);
            const isExpanded = expandedAllocation === alloc.id;
            const categoryExpenses = (plan.expenses || []).filter(e => (e.category || 'General') === alloc.category);

            return (
              <AllocationCard
                key={alloc.id}
                title={alloc.category}
                budgetCents={alloc.allocated_amount}
                spentCents={spentCents}
                percent={p}
                isExpanded={isExpanded}
                catStyle={catStyle}
                expenses={categoryExpenses}
                onToggle={() => onToggleAllocation(alloc.id)}
                onSelectExpense={onSelectExpense}
              />
            );
          })
        ) : (
          <div className="p-8 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center text-gray-500 font-bold">
            No allocations defined yet.
          </div>
        )}

        {unallocatedExpenses.length > 0 && (
          <AllocationCard
            title="Unallocated Expenses"
            budgetCents={0}
            spentCents={unallocatedExpenses.reduce((acc, e) => acc + (e.total_amount * 100), 0)}
            percent={100}
            isExpanded={expandedAllocation === 'unallocated'}
            catStyle={{ icon: 'category', bg: 'bg-gray-100', text: 'text-gray-600', fill: 'bg-red-500' }}
            expenses={unallocatedExpenses}
            overbudget
            onToggle={() => onToggleAllocation('unallocated')}
            onSelectExpense={onSelectExpense}
          />
        )}
      </div>
    </div>
  );
}

interface AllocationCardProps {
  title: string;
  budgetCents: number;
  spentCents: number;
  percent: number;
  isExpanded: boolean;
  catStyle: ReturnType<typeof getCategoryIcon>;
  expenses: ExpenseWithCreator[];
  overbudget?: boolean;
  onToggle: () => void;
  onSelectExpense: (expense: ExpenseWithCreator) => void;
}

function AllocationCard({ title, budgetCents, spentCents, percent, isExpanded, catStyle, expenses, overbudget = false, onToggle, onSelectExpense }: AllocationCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:border-[#007A64] transition-colors cursor-pointer group" onClick={onToggle}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${catStyle.bg} ${catStyle.text} flex items-center justify-center`}>
            <MSIcon name={catStyle.icon} className="text-2xl" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#007A64] transition-colors">{title}</h3>
          </div>
        </div>
        <div className="text-right flex items-center gap-4">
          <div>
            <div className="text-xl font-bold text-gray-900">{formatMoney(budgetCents)}</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Budget</div>
          </div>
          <MSIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-gray-400 group-hover:text-[#007A64] transition-colors text-2xl" />
        </div>
      </div>
      <div className="flex items-end justify-between mb-2">
        <div className="text-sm font-semibold text-gray-500">Spent: {formatMoney(spentCents)}</div>
        <div className={`text-sm font-bold ${overbudget ? 'text-red-500' : catStyle.text}`}>{overbudget ? 'Overbudget' : `${percent}%`}</div>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${catStyle.fill} rounded-full`} style={{ width: `${percent}%` }} />
      </div>
      {isExpanded && <AllocationTransactions expenses={expenses} title={title} onSelectExpense={onSelectExpense} />}
    </div>
  );
}

interface AllocationTransactionsProps {
  expenses: ExpenseWithCreator[];
  title: string;
  onSelectExpense: (expense: ExpenseWithCreator) => void;
}

function AllocationTransactions({ expenses, title, onSelectExpense }: AllocationTransactionsProps) {
  return (
    <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-300 cursor-default" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-gray-900">Transactions</h4>
      </div>
      <div className="space-y-3">
        {expenses.length > 0 ? expenses.map(exp => (
          <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelectExpense(exp); }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <MSIcon name="receipt_long" className="text-gray-500 text-[18px]" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{exp.description}</div>
                <div className="text-xs font-medium text-gray-500 mt-0.5">
                  {new Date(exp.date).toLocaleDateString()} • {exp.creator_name || 'Someone'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900">{formatMoney(exp.total_amount * 100)}</div>
              {exp.group_name ? (
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1 flex items-center justify-end gap-1">
                  <MSIcon name="group" className="text-[12px]" /> {exp.group_name}
                </div>
              ) : (
                <div className="text-[10px] font-bold text-[#007A64] uppercase tracking-wider mt-1 flex items-center justify-end gap-1">
                  <MSIcon name="person" className="text-[12px]" /> Personal
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="text-center py-6 text-sm font-medium text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No transactions logged for {title}.
          </div>
        )}
      </div>
    </div>
  );
}
