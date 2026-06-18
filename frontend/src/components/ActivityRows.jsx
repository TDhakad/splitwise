import React from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { avatarColor, initials } from '../lib/utils.js';

export function ExpenseActivityRow({ activity, users, currentUserId, onClick }) {
   return (
      <div onClick={onClick} className="p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer group">
         <div className="relative pt-1 shrink-0">
            <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white transition-transform group-hover:scale-105", avatarColor(activity.user_id))}>
               {initials(activity.userName)}
            </div>
            <div className={clsx("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white", activity.badgeColor)}>
               <MSIcon name={activity.icon} className="text-[10px] font-bold" />
            </div>
         </div>
         
         <div className="flex-1 min-w-0 pt-1">
            <p className="text-[15px] text-gray-900 leading-snug">
               <span className="font-bold">{activity.userName}</span> {activity.action} {activity.item && <span className="font-semibold italic">"{activity.item}"</span>}
            </p>
            <p className="text-sm text-gray-500 mt-1">
               {activity.timeAgo} {activity.groupName ? `in '${activity.groupName}'` : ''}
            </p>
         </div>

         <div className="text-right shrink-0 pt-1 ml-4">
            {activity.net > 0.005 && (
               <>
                  <p className="text-[11px] font-bold tracking-widest uppercase text-[#007A64] mb-1">You are owed</p>
                  <p className="text-xl font-bold text-[#007A64]">${activity.net.toFixed(2)}</p>
               </>
            )}
            {activity.net < -0.005 && (
               <>
                  <p className="text-[11px] font-bold tracking-widest uppercase text-[#EF4444] mb-1">You owe</p>
                  <p className="text-xl font-bold text-[#EF4444]">${Math.abs(activity.net).toFixed(2)}</p>
               </>
            )}
            {Math.abs(activity.net) <= 0.005 && (
               <>
                  <p className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-1">Not involved</p>
               </>
            )}
         </div>
      </div>
   );
}

export function SettlementActivityRow({ activity, users, currentUserId }) {
   return (
      <div className="p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors">
         <div className="relative pt-1 shrink-0">
            <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white", avatarColor(activity.user_id))}>
               {initials(activity.userName)}
            </div>
            <div className={clsx("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white", activity.badgeColor)}>
               <MSIcon name={activity.icon} className="text-[10px] font-bold" />
            </div>
         </div>
         
         <div className="flex-1 min-w-0 pt-1">
            <p className="text-[15px] text-gray-900 leading-snug">
               <span className="font-bold">{activity.userName}</span> {activity.action} {activity.item && <span className="font-semibold italic">"{activity.item}"</span>}
            </p>
            <p className="text-sm text-gray-500 mt-1">
               {activity.timeAgo} {activity.groupName ? `in '${activity.groupName}'` : ''}
            </p>
            <div className="mt-4">
               <button className="px-4 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                  View Transaction
               </button>
            </div>
         </div>

         <div className="text-right shrink-0 pt-1 ml-4 flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-gray-700 justify-end mt-1">
               <MSIcon name="check_circle" className="text-sm text-[#007A64]" />
               <span className="text-xs font-bold tracking-widest uppercase text-[#007A64]">Settled</span>
            </div>
         </div>
      </div>
   );
}

export function GroupInviteActivityRow({ activity, users, currentUserId }) {
   return (
      <div className="p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors">
         <div className="relative pt-1 shrink-0">
            <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white", avatarColor(activity.user_id))}>
               {initials(activity.userName)}
            </div>
            <div className={clsx("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white", activity.badgeColor)}>
               <MSIcon name={activity.icon} className="text-[10px] font-bold" />
            </div>
         </div>
         
         <div className="flex-1 min-w-0 pt-1">
            <p className="text-[15px] text-gray-900 leading-snug">
               <span className="font-bold">{activity.userName}</span> {activity.action} {activity.item && <span className="font-semibold italic">"{activity.item}"</span>}
            </p>
            <p className="text-sm text-gray-500 mt-1">
               {activity.timeAgo}
            </p>
            <div className="mt-4 flex gap-3">
               <button className="px-5 py-2 bg-[#007A64] text-white rounded-md text-sm font-bold hover:bg-[#00604f] transition-colors shadow-sm">
                  Accept
               </button>
               <button className="px-5 py-2 bg-white border border-gray-300 rounded-md text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                  Decline
               </button>
            </div>
         </div>
      </div>
   );
}
