import React, { useMemo } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { avatarColor, initials } from '../lib/utils.js';

export default function FriendDetailView({ friendId, users, rawBalances, balances, expenses, groups, currentUserId, onBack, onSettleUp }) {
  const friend = users.find(u => u.id === friendId) || { name: 'Unknown', id: friendId };

  // Calculate overall balance with this specific friend across all groups
  const netBalance = useMemo(() => {
    let net = 0;
    rawBalances.forEach(b => {
      if (b.from_user_id === currentUserId && b.to_user_id === friendId) net -= b.amount;
      if (b.to_user_id === currentUserId && b.from_user_id === friendId) net += b.amount;
    });
    return net;
  }, [rawBalances, currentUserId, friendId]);

  // Map raw balances into simplified debts per group
  const simplifiedDebts = useMemo(() => {
    const debts = [];
    rawBalances.forEach(b => {
      let net = 0;
      if (b.from_user_id === currentUserId && b.to_user_id === friendId) net -= b.amount;
      if (b.to_user_id === currentUserId && b.from_user_id === friendId) net += b.amount;
      
      if (Math.abs(net) > 0.01) {
        const group = groups.find(g => g.id === b.group_id);
        debts.push({
          id: `debt-${b.group_id || 'individual'}`,
          groupId: b.group_id,
          groupName: group ? group.name : 'Non-group expenses',
          net: net
        });
      }
    });
    return debts.sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [rawBalances, currentUserId, friendId, groups]);

  return (
    <div className="h-full flex flex-col bg-[#F8F9FB] relative overflow-hidden">
      <header className="h-20 bg-white border-b border-gray-100 flex items-center px-8 shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
          <MSIcon name="arrow_back" style={{ fontSize: 18 }} /> Back to Friends
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Profile Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className={clsx("w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-md", avatarColor(friend.id))}>
                {initials(friend.name)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{friend.name}</h1>
                <p className="text-gray-500 font-medium">Friend</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 min-w-[250px]">
              <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-2">Total Balance</p>
              {netBalance > 0 ? (
                <>
                  <p className="text-lg font-bold text-[#007A64] mb-3">{friend.name.split(' ')[0]} owes you ${netBalance.toFixed(2)}</p>
                  <button className="w-full bg-[#EAF5F2] text-[#007A64] hover:bg-[#007A64] hover:text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm">
                    Remind
                  </button>
                </>
              ) : netBalance < 0 ? (
                <>
                  <p className="text-lg font-bold text-[#D93F3C] mb-3">You owe ${Math.abs(netBalance).toFixed(2)}</p>
                  <button onClick={() => onSettleUp(friendId, netBalance)} className="w-full bg-[#007A64] text-white hover:bg-[#00604f] px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm">
                    Settle Up
                  </button>
                </>
              ) : (
                <p className="text-lg font-bold text-gray-500">Settled up</p>
              )}
            </div>
          </div>

          {/* Simplified Debts Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Simplified Debts</h2>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                {simplifiedDebts.length} Active
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                    <th className="px-6 py-4 font-bold">Group / Context</th>
                    <th className="px-6 py-4 font-bold text-right">Balance</th>
                    <th className="px-6 py-4 font-bold text-right w-[160px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {simplifiedDebts.map(debt => (
                    <tr key={debt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                            <MSIcon name={debt.groupId ? "group" : "person"} className="text-gray-500" />
                          </div>
                          <p className="font-bold text-sm text-gray-900">{debt.groupName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right align-middle">
                        {debt.net > 0 ? (
                          <>
                             <p className="text-lg font-bold text-[#007A64] leading-none">${debt.net.toFixed(2)}</p>
                             <p className="text-[11px] font-bold text-[#007A64] mt-1.5">owes you</p>
                          </>
                        ) : (
                          <>
                             <p className="text-lg font-bold text-[#D93F3C] leading-none">${Math.abs(debt.net).toFixed(2)}</p>
                             <p className="text-[11px] font-bold text-[#D93F3C] mt-1.5">you owe</p>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right align-middle">
                        {debt.net > 0 ? (
                          <button className="bg-[#EAF5F2] text-[#007A64] hover:bg-[#007A64] hover:text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm w-full">
                            Remind
                          </button>
                        ) : (
                          <button onClick={() => onSettleUp(friendId, debt.net, debt.groupId)} className="bg-[#007A64] text-white hover:bg-[#00604f] px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm w-full">
                            Settle Up
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {simplifiedDebts.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-gray-500 text-sm">
                        You and {friend.name.split(' ')[0]} are completely settled up.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
