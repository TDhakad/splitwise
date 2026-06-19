import MSIcon from '../MSIcon';
import { formatMoney } from './planDetailUtils';
import type { Dispatch, SetStateAction } from 'react';
import type { ExpenseCategory, PlanDetail } from '../../types/api';

interface PlanPredecisionsPanelProps {
  plan: PlanDetail;
  categories: ExpenseCategory[];
  newPredTitle: string;
  newPredCategory: ExpenseCategory;
  newPredAmount: string;
  showCategoryMenu: boolean;
  isCreatingPredecision: boolean;
  onAddPredecision: () => void;
  setNewPredTitle: Dispatch<SetStateAction<string>>;
  setNewPredCategory: Dispatch<SetStateAction<ExpenseCategory>>;
  setNewPredAmount: Dispatch<SetStateAction<string>>;
  setShowCategoryMenu: Dispatch<SetStateAction<boolean>>;
}

export default function PlanPredecisionsPanel({
  plan,
  categories,
  newPredTitle,
  newPredCategory,
  newPredAmount,
  showCategoryMenu,
  isCreatingPredecision,
  onAddPredecision,
  setNewPredTitle,
  setNewPredCategory,
  setNewPredAmount,
  setShowCategoryMenu,
}: PlanPredecisionsPanelProps) {
  return (
    <div className="w-full lg:w-[340px] shrink-0">
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm sticky top-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#EAF5F2] text-[#007A64] flex items-center justify-center">
            <MSIcon name="event_available" className="text-[18px]" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Pre-decisions</h3>
        </div>

        <p className="text-sm font-medium text-gray-500 leading-relaxed mb-6">
          Log expected costs before they happen to secure your budget allocation.
        </p>

        <div className="space-y-3 mb-6">
          {plan.predecisions && plan.predecisions.map(pred => (
            <div key={pred.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-gray-900 text-sm">{pred.title}</div>
                <div className="font-bold text-gray-900 text-sm">{formatMoney(pred.expected_amount)}</div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="font-medium text-gray-500">{pred.category}</div>
                <div className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase tracking-wide text-[10px]">{pred.status}</div>
              </div>
            </div>
          ))}
          {(!plan.predecisions || plan.predecisions.length === 0) && (
            <div className="text-xs text-gray-400 font-medium text-center">No expected costs added yet.</div>
          )}
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-2 flex flex-col gap-2 relative">
          <input type="text" value={newPredTitle} onChange={e => setNewPredTitle(e.target.value)} placeholder="Title..." className="bg-white border border-gray-200 w-full text-sm font-medium text-gray-900 px-3 py-2 rounded-xl focus:outline-none" />
          <div className="flex gap-2">
            <input type="text" value={newPredAmount} onChange={e => setNewPredAmount(e.target.value)} placeholder="Amount ($)" className="bg-white border border-gray-200 w-full text-sm font-medium text-gray-900 px-3 py-2 rounded-xl focus:outline-none" />

            <div className="relative">
              <button onClick={() => setShowCategoryMenu(!showCategoryMenu)} className="bg-white border border-gray-200 text-gray-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-1 shrink-0 h-full">
                {newPredCategory} <MSIcon name="expand_more" className="text-[16px]" />
              </button>
              {showCategoryMenu && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-xl p-1 z-10 w-32">
                  {categories.map(c => (
                    <button key={c} onClick={() => { setNewPredCategory(c); setShowCategoryMenu(false); }} className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-lg">{c}</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={onAddPredecision} disabled={isCreatingPredecision} className="w-10 bg-[#007A64] hover:bg-[#00604f] text-white rounded-xl flex items-center justify-center shrink-0 transition-colors disabled:opacity-50">
              <MSIcon name="add" className="text-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
