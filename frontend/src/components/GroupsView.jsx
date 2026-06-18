import React from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { avatarColor, initials } from '../lib/utils.js';

export default function GroupsView({ groups, rawBalances, currentUserId, onCreateGroup, onAddExpense, onSelect }) {
    const calculateGroupNet = (groupId) => {
        let net = 0;
        rawBalances.forEach(b => {
           if (b.group_id === groupId) {
              if (b.from_user_id === currentUserId) net -= b.amount;
              if (b.to_user_id === currentUserId) net += b.amount;
           }
        });
        return net;
    };

    return (
       <div className="max-w-[1400px] mx-auto p-8 h-full overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
             <div>
                <h2 className="text-[28px] font-bold text-gray-900 mb-1">Groups</h2>
                <p className="text-sm text-gray-500 font-medium">Manage and track shared group expenses.</p>
             </div>
             <button onClick={onCreateGroup} className="bg-[#1CC29F] text-white px-5 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-[#19b08f] transition-colors shadow-sm text-sm active:scale-95 shrink-0">
                <MSIcon name="group_add" className="text-lg" /> New Group
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {groups.map(g => {
                const net = calculateGroupNet(g.id);
                return (
                   <div key={g.id} onClick={() => onSelect(g.id)} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-shadow relative cursor-pointer">
                      <div className={clsx("h-1.5 w-full", net > 0 ? "bg-[#007A64]" : net < 0 ? "bg-gray-400" : "bg-gray-200")} />
                      
                      <div className="p-6 flex-1 flex flex-col">
                         <div className="flex justify-between items-start mb-5">
                            <div className="flex gap-4 min-w-0">
                               <div className="w-12 h-12 bg-[#F3F4F6] rounded-xl flex items-center justify-center text-[#007A64] shrink-0">
                                  <MSIcon name="flight" className="text-2xl" />
                               </div>
                               <div className="min-w-0">
                                  <h3 className="text-lg font-bold text-gray-900 truncate pr-2">{g.name}</h3>
                                  <p className="text-[12px] text-gray-500 mt-0.5">Last active 2 days ago</p>
                               </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 -mr-2"><MSIcon name="more_vert" /></button>
                         </div>
                         
                         <div className="flex -space-x-2.5 mb-6">
                            {g.members?.slice(0,4).map(m => (
                               <div key={m.id} className={clsx("w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white z-10", avatarColor(m.id))}>
                                 {initials(m.name)}
                               </div>
                            ))}
                            {g.members?.length > 4 && (
                               <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 z-0">
                                 +{g.members.length - 4}
                               </div>
                            )}
                            {!g.members?.length && <p className="text-xs text-gray-400 italic">No members</p>}
                         </div>

                         <div className="mt-auto">
                            {net > 0 && (
                               <>
                                  <div className="bg-[#F8F9FA] rounded-xl p-5 mb-4 border border-gray-100">
                                     <p className="text-[12px] text-gray-500 mb-1 font-medium">You are owed</p>
                                     <h4 className="text-[32px] font-bold text-[#007A64] leading-none">${net.toFixed(2)}</h4>
                                  </div>
                                  <button onClick={(e) => {e.stopPropagation(); alert('Settle up flow placeholder')}} className="w-full bg-[#007A64] text-white py-2.5 rounded-lg font-bold hover:bg-[#00604f] transition-colors text-sm shadow-sm active:scale-95">
                                     Settle Up
                                  </button>
                               </>
                            )}
                            {net < 0 && (
                               <>
                                  <div className="bg-[#F8F9FA] rounded-xl p-5 mb-4 border border-gray-100">
                                     <p className="text-[12px] text-gray-500 mb-1 font-medium">You owe</p>
                                     <h4 className="text-[32px] font-bold text-[#D93F3C] leading-none">${Math.abs(net).toFixed(2)}</h4>
                                  </div>
                                  <button onClick={(e) => {e.stopPropagation(); onSelect(g.id)}} className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition-colors text-sm border border-gray-200 active:scale-95">
                                     View Details
                                  </button>
                               </>
                            )}
                            {net === 0 && (
                               <>
                                  <div className="bg-[#F8F9FA] rounded-xl p-5 mb-4 flex items-center justify-between border border-gray-100 h-[100px]">
                                     <p className="text-[13px] text-gray-600 font-medium">All settled up</p>
                                     <div className="w-6 h-6 rounded-full border-2 border-[#007A64] text-[#007A64] flex items-center justify-center"><MSIcon name="check" className="text-sm font-bold" /></div>
                                  </div>
                                  <button onClick={(e) => {e.stopPropagation(); onAddExpense(g)}} className="w-full bg-white text-[#007A64] border border-[#007A64] py-2.5 rounded-lg font-bold hover:bg-[#EAF5F2] transition-colors text-sm active:scale-95">
                                     Add New Expense
                                  </button>
                               </>
                            )}
                         </div>
                      </div>
                   </div>
                );
             })}
          </div>
       </div>
    );
}
