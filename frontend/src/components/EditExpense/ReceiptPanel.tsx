import MSIcon from '../MSIcon';

interface ReceiptPanelProps {
  hasReceipt: boolean;
  onHasReceiptChange: (hasReceipt: boolean) => void;
}

export default function ReceiptPanel({ hasReceipt, onHasReceiptChange }: ReceiptPanelProps) {
  return (
    <div className="w-[320px] shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col h-fit">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-lg">Receipt</h3>
        {hasReceipt && (
          <button onClick={() => onHasReceiptChange(false)} className="text-[#D93F3C] hover:bg-red-50 p-1.5 rounded-lg transition-colors">
            <MSIcon name="delete_outline" className="text-xl" />
          </button>
        )}
      </div>

      {hasReceipt ? (
        <div className="bg-gray-100 rounded-xl overflow-hidden relative min-h-[400px]">
          <img
            src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000"
            alt="Receipt"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-8 text-center min-h-[200px] cursor-pointer hover:border-[#007A64] hover:bg-[#EAF5F2] transition-colors group" onClick={() => onHasReceiptChange(true)}>
          <MSIcon name="cloud_upload" className="text-4xl text-gray-400 group-hover:text-[#007A64] mb-3 transition-colors" />
          <p className="text-sm font-bold text-gray-700 group-hover:text-[#007A64]">Click to upload receipt</p>
          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
        </div>
      )}
    </div>
  );
}
