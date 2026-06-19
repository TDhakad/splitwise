import MSIcon from './MSIcon';
import { useDeleteExpense } from '../features/expenses/api';
import type { ExpenseWithCreator } from '../types/api';

interface ExpenseDeleteDialogProps {
  expense: ExpenseWithCreator;
  currentUserId: number;
  onClose: () => void;
  onDeleted: () => void;
}

export default function ExpenseDeleteDialog({ expense, currentUserId, onClose, onDeleted }: ExpenseDeleteDialogProps) {
  const deleteExpense = useDeleteExpense();

  const handleDelete = async () => {
    try {
      await deleteExpense.mutateAsync({ currentUserId, expense });
      onDeleted();
    } catch {
      // Mutation state renders the API error in the dialog.
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-50 text-[#D93F3C] flex items-center justify-center mb-5">
            <MSIcon name="delete_outline" className="text-2xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Delete expense?</h2>
          <p className="text-sm text-gray-600 mt-2 leading-6">
            This will permanently delete <span className="font-bold text-gray-900">{expense.description}</span> and recalculate balances for everyone involved.
          </p>
          {deleteExpense.isError && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#D93F3C]">
              {deleteExpense.error.message}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 bg-gray-50 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteExpense.isPending}
            className="px-5 py-2.5 rounded-xl bg-[#D93F3C] hover:bg-[#bf302d] text-white text-sm font-bold shadow-sm disabled:opacity-60 transition-colors"
          >
            {deleteExpense.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
