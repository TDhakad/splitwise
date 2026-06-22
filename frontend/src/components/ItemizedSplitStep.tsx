import MSIcon from './MSIcon';
import EditItemSplitModal from './ItemizedSplit/EditItemSplitModal';
import ReceiptItemsPanel from './ItemizedSplit/ReceiptItemsPanel';
import SplitSummaryPanel from './ItemizedSplit/SplitSummaryPanel';
import useItemizedSplit from './ItemizedSplit/useItemizedSplit';
import type { ExpenseParticipantBase, ReceiptBreakdown, User } from '../types/api';
import type { BooleanById, ReceiptReviewData } from '../types/ui';

interface ItemizedSplitStepProps {
  receiptData: ReceiptReviewData;
  users: User[];
  involvedUsers: BooleanById;
  currentUserId: number;
  payerId: number;
  initialBreakdown?: ReceiptBreakdown | null;
  onSave: (participants: ExpenseParticipantBase[], finalTotal: number, receiptBreakdown: ReceiptBreakdown) => void;
  onClose: () => void;
  onBack: () => void;
}

export default function ItemizedSplitStep({ receiptData, users, involvedUsers, currentUserId, payerId, initialBreakdown, onSave, onClose, onBack }: ItemizedSplitStepProps) {
  const split = useItemizedSplit(receiptData, users, involvedUsers, currentUserId, payerId, initialBreakdown);

  const handleFinish = () => {
    onSave(split.buildParticipants(), split.receiptTotal, split.buildBreakdown());
  };

  return (
    <>
      <div className="fixed top-0 right-0 bottom-0 w-full md:w-[calc(100%-16rem)] bg-[#F8F9FB] z-50 flex flex-col animate-in slide-in-from-right-8 duration-300">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <MSIcon name="arrow_back" className="text-gray-900" />
            </button>
            <h1 className="font-bold text-xl text-gray-900">Itemized Split</h1>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
              <MSIcon name="close" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 p-8">
          <div className="max-w-6xl mx-auto h-full flex flex-col lg:flex-row gap-8 items-stretch">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ReceiptItemsPanel
                items={receiptData.items}
                activeUsers={split.activeUsers}
                currentUserId={currentUserId}
                itemAssignments={split.itemAssignments}
                customSplits={split.customSplits}
                onSetAllForMe={split.setAllForMe}
                onToggleUser={split.toggleUserForItem}
                onEditItem={split.setEditingItemIdx}
              />
            </div>
            <div className="w-full lg:w-96 shrink-0 min-h-0 overflow-y-auto">
              <SplitSummaryPanel
                activeUsers={split.activeUsers}
                currentUserId={currentUserId}
                receiptTotal={split.receiptTotal}
                receiptData={receiptData}
                assignedSum={split.assignedSum}
                unassigned={split.unassigned}
                memberTotals={split.memberTotals}
                isFullyAssigned={split.isFullyAssigned}
                onFinish={handleFinish}
              />
            </div>
          </div>
        </div>
      </div>

      {split.editingItemIdx !== null && (
        <EditItemSplitModal
          item={receiptData.items[split.editingItemIdx]}
          activeUsers={split.activeUsers}
          currentAssignments={split.itemAssignments[split.editingItemIdx]}
          currentCustom={split.customSplits[split.editingItemIdx]}
          onSave={(newSplit) => split.saveCustomSplit(split.editingItemIdx!, newSplit)}
          onClose={() => split.setEditingItemIdx(null)}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}
