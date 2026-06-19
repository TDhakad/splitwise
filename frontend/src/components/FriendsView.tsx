import { useState } from 'react';
import type { FormEvent } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { avatarColor, initials } from '../lib/utils';
import { useFriendRequests, useRespondFriendRequest, useSendFriendRequest } from '../features/friends/api';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { getErrorMessage } from '../lib/constants';
import type { BalanceSummary, TotalsBalanceSummary, User } from '../types/api';
import type { SettleUpContext } from '../types/ui';

interface FriendListItem {
  id: number;
  name: string;
  email: string;
  net: number;
}

interface FriendsViewProps {
  users: User[];
  rawBalances: BalanceSummary[];
  balances: TotalsBalanceSummary;
  currentUserId: number;
  onSettleUp: (options: SettleUpContext) => void;
}

type FriendRequestStatus = 'ACCEPTED' | 'REJECTED' | 'REMOVED';

import { useNavigate } from 'react-router-dom';

export default function FriendsView({ users, rawBalances, balances, currentUserId, onSettleUp }: FriendsViewProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  
  // Add Friend Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addError, setAddError] = useState('');
  const requestsQuery = useFriendRequests();
  const sendRequest = useSendFriendRequest();
  const respondRequest = useRespondFriendRequest();
  const requests = requestsQuery.data ?? [];
  const debouncedQuery = useDebouncedValue(query);

  const handleSendRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddError('');
    try {
      await sendRequest.mutateAsync(addEmail.trim());
      setShowAddModal(false);
      setAddEmail('');
    } catch (e) {
      setAddError(getErrorMessage(e));
    }
  };

  const handleRespondRequest = async (id: number, status: FriendRequestStatus) => {
    try {
      await respondRequest.mutateAsync({ id, status });
    } catch (e) {
      console.error(e);
    }
  };

  // Calculate per-friend balances
  const friendBalances: Record<number, number> = {};
  rawBalances.forEach(b => {
    const friendId = b.from_user_id === currentUserId ? b.to_user_id : b.from_user_id;
    if (!friendBalances[friendId]) friendBalances[friendId] = 0;
    
    if (b.from_user_id === currentUserId) friendBalances[friendId] -= b.amount;
    if (b.to_user_id === currentUserId) friendBalances[friendId] += b.amount;
  });

  const friendsList: FriendListItem[] = Object.entries(friendBalances).map(([id, net]) => {
     const user = users.find(u => u.id === parseInt(id));
     return {
        id: parseInt(id),
        name: user?.name || 'Unknown',
        email: user?.email || '',
        net: net
     };
  });
  
  users.forEach(u => {
      if (u.id !== currentUserId && !friendBalances[u.id]) {
          friendsList.push({
              id: u.id,
              name: u.name,
              email: u.email || '',
              net: 0
          });
      }
  });

  // Deduplicate friendsList just in case
  const uniqueFriendsList = Array.from(new Map(friendsList.map(f => [f.id, f])).values());

  const filteredFriends = uniqueFriendsList.filter(f => 
      f.name.toLowerCase().includes(debouncedQuery.toLowerCase()) || 
      f.email.toLowerCase().includes(debouncedQuery.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const totalOwes = balances?.total_owes || 0;
  const totalOowed = balances?.total_owed || 0;

  const incomingRequests = requests.filter(r => r.addressee_id === currentUserId);
  const outgoingRequests = requests.filter(r => r.requester_id === currentUserId);

  return (
    <div className="max-w-[1000px] mx-auto p-8 h-full overflow-y-auto relative">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <h2 className="text-[28px] font-bold text-gray-900 mb-1">Friends</h2>
          <p className="text-sm text-gray-500 font-medium">Manage your connections and settle up.</p>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-white rounded-xl border border-gray-200 p-5 min-w-[160px] shadow-sm">
              <p className="text-[12px] text-gray-500 font-medium mb-1">Total you owe</p>
              <p className="text-[28px] font-bold text-[#D93F3C] leading-none">${totalOwes.toFixed(2)}</p>
           </div>
           <div className="bg-white rounded-xl border border-gray-200 p-5 min-w-[160px] shadow-sm">
              <p className="text-[12px] text-gray-500 font-medium mb-1">Owed to you</p>
              <p className="text-[28px] font-bold text-[#007A64] leading-none">${totalOowed.toFixed(2)}</p>
           </div>
        </div>
      </div>

      {incomingRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Incoming Friend Requests</h3>
          <div className="grid gap-3">
            {incomingRequests.map(req => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold", avatarColor(req.requester.id))}>
                    {initials(req.requester.name)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{req.requester.name}</p>
                    <p className="text-xs text-gray-500">{req.requester.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRespondRequest(req.id, 'ACCEPTED')} className="bg-[#007A64] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#00604f] transition-colors">
                    Accept
                  </button>
                  <button onClick={() => handleRespondRequest(req.id, 'REJECTED')} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoingRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Pending Sent Requests</h3>
          <div className="grid gap-3">
            {outgoingRequests.map(req => (
              <div key={req.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 opacity-70">
                  <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", avatarColor(req.addressee.id))}>
                    {initials(req.addressee.name)}
                  </div>
                  <p className="font-medium text-sm text-gray-900">{req.addressee.email}</p>
                </div>
                <button onClick={() => handleRespondRequest(req.id, 'REMOVED')} className="text-gray-400 hover:text-red-500 text-xs font-bold px-3 transition-colors">
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200">
           <div className="relative flex-1 max-w-md">
              <MSIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                 type="text" 
                 placeholder="Search friends by name or email..." 
                 value={query}
                 onChange={e => setQuery(e.target.value)}
                 className="w-full bg-transparent pl-12 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none" 
              />
           </div>
           <button onClick={() => setShowAddModal(true)} className="text-[#007A64] font-bold text-sm flex items-center gap-2 hover:bg-[#EAF5F2] px-4 py-2 rounded-lg transition-colors">
              <MSIcon name="person_add" className="text-lg" /> Add Friend
           </button>
        </div>

        <table className="w-full text-left border-collapse">
           <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                 <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-1/2">Friend</th>
                 <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Balance</th>
                 <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right w-[180px]">Action</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
              {filteredFriends.map(f => (
                 <tr 
                    key={f.id} 
                    onClick={() => navigate(`/friends/${f.id}`)}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                 >
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-4">
                          <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm", avatarColor(f.id))}>
                             {initials(f.name)}
                          </div>
                          <div>
                             <p className="font-bold text-sm text-gray-900">{f.name}</p>
                             <p className="text-[13px] text-gray-500">{f.email}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right align-middle">
                       {f.net > 0 && (
                          <>
                             <p className="text-[22px] font-bold text-[#007A64] leading-none">${f.net.toFixed(2)}</p>
                             <p className="text-[11px] font-bold text-[#007A64] mt-1.5">owes you</p>
                          </>
                       )}
                       {f.net < 0 && (
                          <>
                             <p className="text-[22px] font-bold text-[#D93F3C] leading-none">${Math.abs(f.net).toFixed(2)}</p>
                             <p className="text-[11px] font-bold text-[#D93F3C] mt-1.5">you owe</p>
                          </>
                       )}
                       {f.net === 0 && (
                          <p className="text-[15px] font-medium text-gray-400">Settled up</p>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right align-middle">
                       {f.net > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); onSettleUp({ payerId: f.id, payeeId: currentUserId, amount: f.net, maxAmount: f.net }); }} className="bg-[#EAF5F2] text-[#007A64] hover:bg-[#007A64] hover:text-white px-5 py-2.5 rounded-lg font-bold text-xs transition-colors shadow-sm min-w-[120px]">
                             Record Payment
                          </button>
                       )}
                       {f.net < 0 && (
                          <button 
                             onClick={(e) => { e.stopPropagation(); onSettleUp({ payerId: currentUserId, payeeId: f.id, amount: Math.abs(f.net), maxAmount: Math.abs(f.net) }); }}
                             className="bg-[#007A64] text-white hover:bg-[#00604f] px-5 py-2.5 rounded-lg font-bold text-xs transition-colors shadow-sm min-w-[120px]"
                          >
                             Settle Up
                          </button>
                       )}
                       {f.net === 0 && (
                          <button onClick={(e) => e.stopPropagation()} className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-5 py-2.5 rounded-lg font-bold text-xs transition-colors shadow-sm min-w-[120px]">
                             View Details
                          </button>
                       )}
                    </td>
                 </tr>
              ))}
              {filteredFriends.length === 0 && (
                 <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500 text-sm">
                       No friends found.
                    </td>
                 </tr>
              )}
           </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900">Add a Friend</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <MSIcon name="close" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Enter your friend's exact email address to send them a connection request. They will need to accept it before you can add them to expenses.
              </p>
              
              {addError && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{addError}</div>}
              
              <form onSubmit={handleSendRequest}>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#007A64] focus:ring-1 focus:ring-[#007A64] transition-all"
                  />
                </div>
                
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 font-bold text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={sendRequest.isPending || !addEmail.trim()} className="px-5 py-2.5 font-bold text-sm text-white bg-[#007A64] hover:bg-[#00604f] rounded-xl transition-colors disabled:opacity-50">
                    {sendRequest.isPending ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
