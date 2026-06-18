import React, { useState, useEffect } from 'react';
import MSIcon from './MSIcon';
import clsx from 'clsx';
import { API_BASE_URL } from '../lib/constants';

export default function ReviewReceiptStep({ receiptImage, receiptData, setReceiptData, onNext, onClose, onBack }) {
  const [items, setItems] = useState(receiptData?.items || []);
  const [subtotal, setSubtotal] = useState(receiptData?.subtotal?.toString() || '0');
  const [discount, setDiscount] = useState(receiptData?.discount?.toString() || '0');
  const [tax, setTax] = useState(receiptData?.tax?.toString() || '0');
  const [tip, setTip] = useState(receiptData?.tip?.toString() || '0');
  const [total, setTotal] = useState(receiptData?.total?.toString() || '0');

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { name: 'New Item', quantity: 1, price: '0.00' }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleNext = () => {
    setReceiptData({ 
      ...receiptData, 
      items, 
      subtotal: parseFloat(subtotal) || 0, 
      discount: parseFloat(discount) || 0,
      tax: parseFloat(tax) || 0, 
      tip: parseFloat(tip) || 0, 
      total: parseFloat(total) || 0
    });
    onNext();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#F8F9FB] rounded-3xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
          
          <header className="bg-white border-b border-gray-200 flex items-center justify-between px-6 h-16 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><MSIcon name="arrow_back" className="text-gray-900" /></button>
              <h1 className="font-bold text-xl text-gray-900">Review Receipt</h1>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><MSIcon name="close" className="text-gray-900" /></button>
          </header>

          <div className="flex-1 flex overflow-hidden">
            {/* Left: Receipt Image */}
            <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200 bg-gray-50 flex justify-center">
              <div className="max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Scanned Receipt</h2>
                  <a href={receiptImage.startsWith('http') ? receiptImage : `${API_BASE_URL}${receiptImage}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#007A64] flex items-center gap-1 hover:underline">
                    <MSIcon name="zoom_in" style={{ fontSize: 16 }} /> View Original
                  </a>
                </div>
                {receiptImage ? (
                  <img src={receiptImage.startsWith('http') ? receiptImage : `${API_BASE_URL}${receiptImage}`} alt="Receipt" className="w-full rounded-xl shadow-md border border-gray-200" />
                ) : (
                  <div className="w-full h-96 bg-gray-200 animate-pulse rounded-xl" />
                )}
              </div>
            </div>

            {/* Right: Items */}
            <div className="w-1/2 flex flex-col bg-white">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Identified Items</h2>
                <span className="bg-[#007A64] text-white text-xs font-bold px-2 py-1 rounded-md">{items.length} Items Found</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {!receiptData?.is_receipt && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm mb-4">
                    <strong>Warning:</strong> This image does not appear to be a clear receipt. Please review and manually add items if necessary.
                  </div>
                )}
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text" 
                        value={item.name} 
                        onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                        className="w-full font-bold text-gray-900 border-none p-0 focus:ring-0 text-base"
                        placeholder="Item name"
                      />
                      <div className="flex items-center text-sm text-gray-500 gap-2">
                        <span>Qty:</span>
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                          className="w-16 border border-gray-300 rounded px-2 py-0.5 text-center focus:ring-[#007A64] focus:border-[#007A64]"
                          min="1"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center justify-end">
                        <span className="text-gray-500 font-medium">$</span>
                        <input 
                          type="number" 
                          value={item.price} 
                          onChange={(e) => handleUpdateItem(idx, 'price', e.target.value)}
                          className="w-16 font-bold text-gray-900 border-none p-0 text-right focus:ring-0 text-lg"
                          min="0" step="0.01"
                        />
                      </div>
                      <button onClick={() => handleRemoveItem(idx)} className="text-gray-400 hover:text-red-500 mt-1">
                        <MSIcon name="delete" style={{ fontSize: 18 }} />
                      </button>
                    </div>
                  </div>
                ))}

                <button onClick={handleAddItem} className="w-full py-4 border-2 border-dashed border-[#007A64]/30 rounded-xl text-[#007A64] font-bold hover:bg-[#EAF5F2] transition-colors flex items-center justify-center gap-2">
                  <MSIcon name="add_circle" /> Add Missing Item
                </button>
              </div>

              {/* Totals Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1">Subtotal <MSIcon name="edit" style={{ fontSize: 14 }} className="text-gray-400" /></span>
                    <div className="flex items-center justify-end">
                      <span className="text-gray-500">$</span>
                      <input type="number" value={subtotal} onChange={e => setSubtotal(e.target.value)} className="w-20 text-right border-none bg-transparent focus:ring-0 p-0 font-medium text-gray-900" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span className="flex items-center gap-1">Discount <MSIcon name="edit" style={{ fontSize: 14 }} className="text-green-400" /></span>
                    <div className="flex items-center justify-end">
                      <span className="text-green-500">-$</span>
                      <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-16 text-right border-none bg-transparent focus:ring-0 p-0 font-medium text-green-600" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1">Tax & Fees <MSIcon name="edit" style={{ fontSize: 14 }} className="text-gray-400" /></span>
                    <div className="flex items-center justify-end">
                      <span className="text-gray-500">$</span>
                      <input type="number" value={tax} onChange={e => setTax(e.target.value)} className="w-16 text-right border-none bg-transparent focus:ring-0 p-0 font-medium text-gray-900" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1">Tip <MSIcon name="edit" style={{ fontSize: 14 }} className="text-gray-400" /></span>
                    <div className="flex items-center justify-end">
                      <span className="text-gray-500">$</span>
                      <input type="number" value={tip} onChange={e => setTip(e.target.value)} className="w-16 text-right border-none bg-transparent focus:ring-0 p-0 font-medium text-gray-900" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center font-bold text-2xl text-gray-900 pt-2 border-t border-gray-200">
                    <span className="flex items-center gap-1 text-xl">Total <MSIcon name="edit" style={{ fontSize: 16 }} className="text-gray-400" /></span>
                    <div className="flex items-center justify-end text-[#007A64]">
                      <span>$</span>
                      <input type="number" value={total} onChange={e => setTotal(e.target.value)} className="w-24 text-right border-none bg-transparent focus:ring-0 p-0 font-bold text-2xl text-[#007A64]" />
                    </div>
                  </div>
                </div>
                
                <button onClick={handleNext} className="w-full bg-[#007A64] text-white font-bold py-4 rounded-xl hover:bg-[#006150] transition-colors flex items-center justify-center gap-2 text-lg">
                  Next: Split Items <MSIcon name="arrow_forward" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
