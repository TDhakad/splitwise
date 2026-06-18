import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import MSIcon from './components/MSIcon';
import DashboardView from './components/DashboardView';
import GroupsView from './components/GroupsView';
import GroupDetailView from './components/GroupDetailView';
import CreateGroupModal from './components/CreateGroupModal';
import AddExpenseFlow from './components/AddExpenseFlow';
import ActivityView from './components/ActivityView';
import FriendsView from './components/FriendsView';
import FriendDetailView from './components/FriendDetailView';
import ExpenseDetailView from './components/ExpenseDetailView';
import EditExpenseModal from './components/EditExpenseModal';
import SettleUpModal from './components/SettleUpModal';
import LoginView from './components/LoginView';
import SignupView from './components/SignupView';
import { apiFetch } from './lib/constants';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [isInitializing, setIsInitializing] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [expenseGroupCtx, setExpenseGroupCtx] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [selectedExpenseCtx, setSelectedExpenseCtx] = useState(null);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [settleUpCtx, setSettleUpCtx] = useState(null);
  const [groupRefreshTrigger, setGroupRefreshTrigger] = useState(0);
  const [expenseAuditRefreshTrigger, setExpenseAuditRefreshTrigger] = useState(0);
  
  const [balances, setBalances] = useState({ total_owes: 0, total_owed: 0, net_balance: 0 });
  const [rawBalances, setRawBalances] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const fetchCoreRequestId = useRef(0);

  useEffect(() => {
    if (token) {
      localStorage.setItem('access_token', token);
      fetchCurrentUser();
    } else {
      localStorage.removeItem('access_token');
      setCurrentUser(null);
      setIsInitializing(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await apiFetch('/users/me');
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      } else {
        setToken(null);
      }
    } catch (e) {
      console.error(e);
      setToken(null);
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchCore = async () => {
    if (!currentUser) return;
    const requestId = ++fetchCoreRequestId.current;

    try {
      const [uRes, gRes, bRes, eRes, sRes, rbRes] = await Promise.all([
        apiFetch('/users/'),
        apiFetch('/groups/'),
        apiFetch(`/balances/summary/${currentUser.id}`),
        apiFetch(`/users/${currentUser.id}/expenses`),
        apiFetch(`/users/${currentUser.id}/settlements`),
        apiFetch(`/balances/${currentUser.id}`),
      ]);
      const [friends, allGroups, balanceData, expenseData, settlementData, rawBalanceData] = await Promise.all([
        uRes.json(),
        gRes.json(),
        bRes.json(),
        eRes.json(),
        sRes.json(),
        rbRes.json(),
      ]);
      if (requestId !== fetchCoreRequestId.current) return;

      const selectableUsers = [currentUser, ...friends.filter(u => u.id !== currentUser.id)];
      setUsers(selectableUsers);
      setGroups(allGroups);
      setBalances(balanceData);
      setExpenses(expenseData);
      setSettlements(settlementData);
      setRawBalances(rawBalanceData);
    } catch (e) {
      console.error('fetch failed', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchCore();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedExpenseCtx && expenses.length > 0) {
      const updatedExpense = expenses.find(e => e.id === selectedExpenseCtx.expense.id);
      if (updatedExpense && updatedExpense !== selectedExpenseCtx.expense) {
        setSelectedExpenseCtx(prev => ({ ...prev, expense: updatedExpense }));
      }
    }
  }, [expenses]);

  const handleLogout = () => {
    setToken(null);
  };

  const openSettleUpModal = (payeeOrOptions, amount = null, groupId = null) => {
    if (typeof payeeOrOptions === 'object' && payeeOrOptions !== null) {
      setSettleUpCtx(payeeOrOptions);
      return;
    }

    const friendId = payeeOrOptions;
    const signedAmount = Number(amount) || 0;
    const normalizedAmount = Math.abs(signedAmount);
    if (signedAmount < 0) {
      setSettleUpCtx({ payerId: currentUser.id, payeeId: friendId, amount: normalizedAmount, groupId });
    } else {
      setSettleUpCtx({ payerId: friendId, payeeId: currentUser.id, amount: normalizedAmount, groupId });
    }
  };

  if (isInitializing) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }

  if (!currentUser) {
    return authView === 'login' ? 
      <LoginView onLoginSuccess={setToken} onSwitchToSignup={() => setAuthView('signup')} /> : 
      <SignupView onSignupSuccess={setToken} onSwitchToLogin={() => setAuthView('login')} />;
  }

  const openExpenseModal = (group = null) => { setExpenseGroupCtx(group); setShowAddExpense(true); };
  const handleTabChange = (tab) => { setActiveTab(tab); setSelectedGroupId(null); setSelectedExpenseCtx(null); };

  const tabs = [
    { id: 'dashboard', icon: 'grid_view', label: 'Dashboard' },
    { id: 'friends', icon: 'person', label: 'Friends' },
    { id: 'groups', icon: 'groups', label: 'Groups' },
    { id: 'activity', icon: 'history', label: 'Activity' },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-sans text-gray-900 selection:bg-[#007A64] selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 relative z-20">
         <div className="p-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-[#007A64] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
                  <MSIcon name="account_balance_wallet" fill={1} className="text-xl" />
               </div>
               <div>
                  <h1 className="font-bold text-lg leading-tight tracking-tight text-[#007A64]">Equitable<br />Finance</h1>
               </div>
            </div>
            <p className="mt-3 text-[10px] font-bold text-gray-500 tracking-[0.15em] uppercase">Manage shared expenses</p>
         </div>

         <div className="px-4 py-2">
            <button onClick={() => openExpenseModal()} className="w-full bg-[#007A64] hover:bg-[#00604f] text-white rounded-xl py-3.5 px-4 font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-sm">
               <MSIcon name="add" /> Add Expense
            </button>
         </div>

         <nav className="flex-1 px-4 py-6 space-y-1.5">
            {tabs.map(t => (
               <button key={t.id} onClick={() => handleTabChange(t.id)}
                  className={clsx('w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold transition-all',
                     activeTab === t.id ? 'bg-[#EAF5F2] text-[#007A64]' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900')}>
                  <MSIcon name={t.icon} fill={activeTab === t.id ? 1 : 0} className="text-[22px]" />
                  {t.label}
               </button>
            ))}
         </nav>

         <div className="p-4 border-t border-gray-100">
            <button className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-colors">
               <MSIcon name="settings" className="text-xl" /> Settings
            </button>
            <button className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-colors" onClick={handleLogout}>
               <MSIcon name="logout" className="text-xl" /> Log out
            </button>
         </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] relative">
         <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10 sticky top-0">
            <div className="relative w-96">
               <MSIcon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" placeholder="Search expenses, friends..." className="w-full bg-gray-100/80 border-transparent rounded-full py-2.5 pl-11 pr-4 text-sm font-medium text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007A64]/20 focus:bg-white transition-all" />
            </div>
            
            <div className="flex items-center gap-5">
               <button className="relative text-gray-500 hover:text-gray-900 transition-colors">
                  <MSIcon name="notifications" />
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
               </button>
               <button className="text-gray-500 hover:text-gray-900 transition-colors">
                  <MSIcon name="settings" />
               </button>
               <div className="w-px h-6 bg-gray-300 mx-1" />
               <button className="w-9 h-9 rounded-full bg-[#007A64] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
                 {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
               </button>
            </div>
         </header>

         <main className="flex-1 overflow-hidden relative">
            {activeTab === 'dashboard' && <DashboardView balances={balances} rawBalances={rawBalances} groups={groups} users={users} currentUserId={currentUser.id} />}
            
            {activeTab === 'groups' && !selectedGroupId && !selectedExpenseCtx && <GroupsView groups={groups} rawBalances={rawBalances} currentUserId={currentUser.id} onCreateGroup={() => setShowCreateGroup(true)} onAddExpense={openExpenseModal} onSelect={setSelectedGroupId} />}
            {activeTab === 'groups' && selectedGroupId && !selectedExpenseCtx && <GroupDetailView groupId={selectedGroupId} currentUserId={currentUser.id} users={users} refreshTrigger={groupRefreshTrigger} onRefresh={fetchCore} onAddExpense={openExpenseModal} onSelectExpense={(exp, grp) => setSelectedExpenseCtx({ expense: exp, from: 'group', groupName: grp.name })} onBack={() => setSelectedGroupId(null)} onSettleUp={(opts) => openSettleUpModal({ groupId: selectedGroupId, ...opts })} />}
            
            {activeTab === 'activity' && !selectedExpenseCtx && <ActivityView expenses={expenses} settlements={settlements} groups={groups} users={users} currentUserId={currentUser.id} onSelectExpense={(exp) => setSelectedExpenseCtx({ expense: exp, from: 'activity' })} />}
            
            {activeTab === 'friends' && !selectedFriendId && <FriendsView users={users} rawBalances={rawBalances} balances={balances} currentUserId={currentUser.id} onSettleUp={openSettleUpModal} onSelectFriend={setSelectedFriendId} onRefresh={fetchCore} />}
            {activeTab === 'friends' && selectedFriendId && <FriendDetailView friendId={selectedFriendId} users={users} rawBalances={rawBalances} balances={balances} expenses={expenses} groups={groups} currentUserId={currentUser.id} onBack={() => setSelectedFriendId(null)} onSettleUp={openSettleUpModal} />}
            
            {selectedExpenseCtx && <ExpenseDetailView expense={selectedExpenseCtx.expense} context={selectedExpenseCtx} users={users} currentUserId={currentUser.id} refreshTrigger={expenseAuditRefreshTrigger} onEdit={() => setShowEditExpense(true)} onBack={() => setSelectedExpenseCtx(null)} />}
         </main>
      </div>

      {/* Modals */}
      {showAddExpense && <AddExpenseFlow users={users} groups={groups} currentUserId={currentUser.id} groupCtx={expenseGroupCtx} onClose={() => setShowAddExpense(false)} onSave={() => { setShowAddExpense(false); fetchCore(); if (selectedGroupId || expenseGroupCtx) setGroupRefreshTrigger(prev => prev + 1); }} />}
      {showCreateGroup && <CreateGroupModal users={users} currentUserId={currentUser.id} onClose={() => setShowCreateGroup(false)} onSave={() => { setShowCreateGroup(false); fetchCore(); }} />}
      {showEditExpense && <EditExpenseModal expense={selectedExpenseCtx.expense} users={users} currentUserId={currentUser.id} onClose={() => setShowEditExpense(false)} onSave={() => { setShowEditExpense(false); fetchCore(); setGroupRefreshTrigger(prev => prev + 1); setExpenseAuditRefreshTrigger(prev => prev + 1); }} />}
      {settleUpCtx && <SettleUpModal users={users} currentUserId={currentUser.id} defaultPayerId={settleUpCtx.payerId} defaultPayeeId={settleUpCtx.payeeId} defaultAmount={settleUpCtx.amount} defaultMaxAmount={settleUpCtx.maxAmount} defaultGroupId={settleUpCtx.groupId} onClose={() => setSettleUpCtx(null)} onSave={() => { setSettleUpCtx(null); fetchCore(); if (selectedGroupId || settleUpCtx.groupId) setGroupRefreshTrigger(prev => prev + 1); }} />}
    </div>
  );
}
