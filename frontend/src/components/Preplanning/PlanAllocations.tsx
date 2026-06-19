import { useState } from 'react';
import MSIcon from '../MSIcon';
import { formatMoney, getCategoryIcon, getPercent } from './planDetailUtils';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';
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
  isMovingCategory: boolean;
  allocationError: string;
  onSelectExpense: (expense: ExpenseWithCreator) => void;
  onToggleAddAlloc: () => void;
  onToggleAllocation: (allocId: ExpandedAllocation) => void;
  onAddAllocation: () => void;
  onUpdateAllocation: (allocationId: number, category: ExpenseCategory, amountText: string) => void;
  onDeleteAllocation: (allocationId: number) => void;
  onMoveExpenseCategory: (expense: ExpenseWithCreator, category: ExpenseCategory) => void;
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
  isMovingCategory,
  allocationError,
  onSelectExpense,
  onToggleAddAlloc,
  onToggleAllocation,
  onAddAllocation,
  onUpdateAllocation,
  onDeleteAllocation,
  onMoveExpenseCategory,
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
        <div className="mb-8">
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex flex-col md:flex-row items-end gap-4 shadow-sm">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-gray-600 mb-2">Category Name</label>
              <select value={newAllocCategory} onChange={e => setNewAllocCategory(e.target.value as ExpenseCategory)} className="w-full bg-white border border-gray-200 text-gray-900 font-medium rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64] transition-colors">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
          {allocationError && <p className="text-sm font-bold text-[#D93F3C] mt-3">{allocationError}</p>}
        </div>
      )}
      {!showAddAlloc && allocationError && <p className="text-sm font-bold text-[#D93F3C] mb-4">{allocationError}</p>}

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
                allocationId={alloc.id}
                title={alloc.category}
                budgetCents={alloc.allocated_amount}
                spentCents={spentCents}
                percent={p}
                isExpanded={isExpanded}
                catStyle={catStyle}
                categories={categories}
                expenses={categoryExpenses}
                isUpdatingAllocations={isUpdatingAllocations}
                isMovingCategory={isMovingCategory}
                onToggle={() => onToggleAllocation(alloc.id)}
                onSelectExpense={onSelectExpense}
                onUpdateAllocation={onUpdateAllocation}
                onDeleteAllocation={onDeleteAllocation}
                onMoveExpenseCategory={onMoveExpenseCategory}
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
            categories={categories}
            expenses={unallocatedExpenses}
            overbudget
            isUpdatingAllocations={isUpdatingAllocations}
            isMovingCategory={isMovingCategory}
            onToggle={() => onToggleAllocation('unallocated')}
            onSelectExpense={onSelectExpense}
            onMoveExpenseCategory={onMoveExpenseCategory}
          />
        )}
      </div>
    </div>
  );
}

interface AllocationCardProps {
  allocationId?: number;
  title: string;
  budgetCents: number;
  spentCents: number;
  percent: number;
  isExpanded: boolean;
  catStyle: ReturnType<typeof getCategoryIcon>;
  categories: ExpenseCategory[];
  expenses: ExpenseWithCreator[];
  overbudget?: boolean;
  isUpdatingAllocations: boolean;
  isMovingCategory: boolean;
  onToggle: () => void;
  onSelectExpense: (expense: ExpenseWithCreator) => void;
  onUpdateAllocation?: (allocationId: number, category: ExpenseCategory, amountText: string) => void;
  onDeleteAllocation?: (allocationId: number) => void;
  onMoveExpenseCategory: (expense: ExpenseWithCreator, category: ExpenseCategory) => void;
}

function AllocationCard({
  allocationId,
  title,
  budgetCents,
  spentCents,
  percent,
  isExpanded,
  catStyle,
  categories,
  expenses,
  overbudget = false,
  isUpdatingAllocations,
  isMovingCategory,
  onToggle,
  onSelectExpense,
  onUpdateAllocation,
  onDeleteAllocation,
  onMoveExpenseCategory,
}: AllocationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<ExpenseCategory>(title as ExpenseCategory);
  const [editAmount, setEditAmount] = useState((budgetCents / 100).toFixed(2));

  const handleEditClick = (event: MouseEvent) => {
    event.stopPropagation();
    setIsEditing(true);
  };

  const handleSaveClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (allocationId && onUpdateAllocation) {
      onUpdateAllocation(allocationId, editCategory, editAmount);
    }
    setIsEditing(false);
  };

  const handleDeleteClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (allocationId && onDeleteAllocation) {
      onDeleteAllocation(allocationId);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:border-[#007A64] transition-colors cursor-pointer group" onClick={onToggle}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${catStyle.bg} ${catStyle.text} flex items-center justify-center`}>
            <MSIcon name={catStyle.icon} className="text-2xl" />
          </div>
          <div>
            {isEditing && allocationId ? (
              <select value={editCategory} onClick={e => e.stopPropagation()} onChange={e => setEditCategory(e.target.value as ExpenseCategory)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900">
                {categories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            ) : (
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#007A64] transition-colors">{title}</h3>
            )}
          </div>
        </div>
        <div className="text-right flex items-center gap-4">
          <div>
            {isEditing && allocationId ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                <input value={editAmount} onClick={e => e.stopPropagation()} onChange={e => setEditAmount(e.target.value)} className="w-28 bg-gray-50 border border-gray-200 rounded-lg py-2 pl-7 pr-3 text-right text-sm font-bold text-gray-900" />
              </div>
            ) : (
              <div className="text-xl font-bold text-gray-900">{formatMoney(budgetCents)}</div>
            )}
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Budget</div>
          </div>
          {allocationId && (
            <div className="flex items-center gap-1">
              {isEditing ? (
                <button onClick={handleSaveClick} disabled={isUpdatingAllocations} className="w-8 h-8 rounded-full text-[#007A64] hover:bg-[#EAF5F2] flex items-center justify-center disabled:opacity-50" aria-label="Save allocation">
                  <MSIcon name="check" />
                </button>
              ) : (
                <button onClick={handleEditClick} className="w-8 h-8 rounded-full text-gray-400 hover:text-[#007A64] hover:bg-[#EAF5F2] flex items-center justify-center" aria-label="Edit allocation">
                  <MSIcon name="edit" className="text-[18px]" />
                </button>
              )}
              <button onClick={handleDeleteClick} disabled={isUpdatingAllocations} className="w-8 h-8 rounded-full text-gray-400 hover:text-[#D93F3C] hover:bg-red-50 flex items-center justify-center disabled:opacity-50" aria-label="Delete allocation">
                <MSIcon name="delete_outline" className="text-[18px]" />
              </button>
            </div>
          )}
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
      {isExpanded && <AllocationTransactions expenses={expenses} title={title} categories={categories} isMovingCategory={isMovingCategory} onSelectExpense={onSelectExpense} onMoveExpenseCategory={onMoveExpenseCategory} />}
    </div>
  );
}

interface AllocationTransactionsProps {
  expenses: ExpenseWithCreator[];
  title: string;
  categories: ExpenseCategory[];
  isMovingCategory: boolean;
  onSelectExpense: (expense: ExpenseWithCreator) => void;
  onMoveExpenseCategory: (expense: ExpenseWithCreator, category: ExpenseCategory) => void;
}

function AllocationTransactions({ expenses, title, categories, isMovingCategory, onSelectExpense, onMoveExpenseCategory }: AllocationTransactionsProps) {
  return (
    <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-300 cursor-default" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-gray-900">Transactions</h4>
      </div>
      <div className="space-y-3">
        {expenses.length > 0 ? expenses.map(exp => (
          <div key={exp.id} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelectExpense(exp); }}>
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
            <div className="text-right shrink-0">
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
            <select
              value={(exp.category || 'General') as ExpenseCategory}
              disabled={isMovingCategory}
              onClick={e => e.stopPropagation()}
              onChange={e => onMoveExpenseCategory(exp, e.target.value as ExpenseCategory)}
              className="w-40 shrink-0 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#007A64] disabled:opacity-50"
            >
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
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
