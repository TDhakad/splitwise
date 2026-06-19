import clsx from 'clsx';
import MSIcon from '../MSIcon';
import type { ChangeEvent } from 'react';
import type { User } from '../../types/api';
import type { BooleanById } from '../../types/ui';

interface ScanReceiptEntryProps {
  users: User[];
  currentUserId: number;
  involvedUsers: BooleanById;
  activeIds: number[];
  isProcessingReceipt: boolean;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectFriends: () => void;
}

export default function ScanReceiptEntry({
  users,
  currentUserId,
  involvedUsers,
  activeIds,
  isProcessingReceipt,
  onFileUpload,
  onSelectFriends,
}: ScanReceiptEntryProps) {
  return (
    <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border-2 border-dashed border-gray-300 p-8 flex flex-col items-center text-center bg-gray-50/50">
        <MSIcon name="cloud_upload" className="text-gray-400 text-5xl mb-4" />
        <p className="text-gray-900 font-bold mb-2">Upload or capture receipt</p>
        <p className="text-sm text-gray-500 mb-6">Supports JPG, PNG</p>

        <label className={clsx(
          "text-white font-bold py-3 px-6 rounded-xl transition-colors cursor-pointer w-full text-center block",
          isProcessingReceipt ? "bg-[#007A64]/50 cursor-not-allowed" : "bg-[#007A64] hover:bg-[#006150]"
        )}>
          {isProcessingReceipt ? (
            <span className="flex items-center justify-center gap-2">
              <MSIcon name="sync" className="animate-spin" /> Processing...
            </span>
          ) : 'Choose File or Camera'}
          <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" disabled={isProcessingReceipt} onChange={onFileUpload} />
        </label>
      </div>

      <div className="w-full max-w-sm">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3 text-left">Who is involved?</p>
        <button onClick={onSelectFriends} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 flex items-center justify-between hover:border-[#007A64] transition-colors shadow-sm">
          <span className="text-sm text-gray-600 font-medium truncate">
            {activeIds.length > 1
              ? users.filter(u => involvedUsers[u.id]).map(u => u.id === currentUserId ? 'You' : u.name).join(', ')
              : 'Select friends'}
          </span>
          <MSIcon name="group_add" className="text-gray-400" />
        </button>
        <p className="text-xs text-gray-400 mt-2 text-center">You'll be able to assign items to specific people after scanning.</p>
      </div>
    </div>
  );
}
