import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import PreplanningHub from './components/Preplanning/PreplanningHub';
import LoadingState from './components/ui/LoadingState';
import ErrorState from './components/ui/ErrorState';
import { useCurrentUser } from './features/auth/api';
import { useUsers, usersKeys } from './features/users/api';
import { useGroups, groupsKeys } from './features/groups/api';
import { useBalanceSummary, useRawBalances, balancesKeys } from './features/balances/api';
import { useUserExpenses, expensesKeys } from './features/expenses/api';
import { useUserSettlements, settlementsKeys } from './features/settlements/api';
import { plansKeys } from './features/preplanning/api';
import type { ExpenseWithCreator, GroupDetail, Plan } from './types/api';
import type { AppTab, AuthView, ExpenseSelectionContext, SettleUpContext } from './types/ui';

export default function App() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [authView, setAuthView] = useState<AuthView>('login');

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [expenseGroupCtx, setExpenseGroupCtx] = useState<GroupDetail | null>(null);
  const [expensePlanCtx, setExpensePlanCtx] = useState<Plan | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [selectedExpenseCtx, setSelectedExpenseCtx] = useState<ExpenseSelectionContext | null>(null);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [settleUpCtx, setSettleUpCtx] = useState<SettleUpContext | null>(null);

  const currentUserQuery = useCurrentUser(token);
  const currentUser = currentUserQuery.data ?? null;
  const currentUserId = currentUser?.id;
  const hasUser = Boolean(currentUserId);

  const usersQuery = useUsers(hasUser);
  const groupsQuery = useGroups(hasUser);
  const balancesQuery = useBalanceSummary(currentUserId);
  const rawBalancesQuery = useRawBalances(currentUserId);
  const expensesQuery = useUserExpenses(currentUserId);
  const settlementsQuery = useUserSettlements(currentUserId);

  useEffect(() => {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
      queryClient.clear();
    }
  }, [queryClient, token]);

  useEffect(() => {
    if (currentUserQuery.error?.status === 401 || currentUserQuery.error?.status === 403) {
      const timeoutId = window.setTimeout(() => setToken(null), 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [currentUserQuery.error]);

  const friendUsers = usersQuery.data ?? [];
  const users = currentUser ? [currentUser, ...friendUsers.filter(u => u.id !== currentUser.id)] : [];
  const groups = groupsQuery.data ?? [];
  const balances = balancesQuery.data ?? { total_owes: 0, total_owed: 0, net_balance: 0 };
  const rawBalances = rawBalancesQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const settlements = settlementsQuery.data ?? [];
  const selectedExpense = selectedExpenseCtx
    ? expenses.find(e => e.id === selectedExpenseCtx.expense.id) ?? selectedExpenseCtx.expense
    : null;
  const coreError = [usersQuery, groupsQuery, balancesQuery, rawBalancesQuery, expensesQuery, settlementsQuery].find(query => query.isError);

  const handleLogout = () => {
    setToken(null);
  };

  const invalidateFinancialQueries = () => {
    if (!currentUserId) return;
    queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    queryClient.invalidateQueries({ queryKey: groupsKeys.all });
    queryClient.invalidateQueries({ queryKey: balancesKeys.all });
    queryClient.invalidateQueries({ queryKey: expensesKeys.user(currentUserId) });
    queryClient.invalidateQueries({ queryKey: settlementsKeys.user(currentUserId) });
    queryClient.invalidateQueries({ queryKey: plansKeys.all });
  };

  const openSettleUpModal = (payeeOrOptions: number | SettleUpContext, amount: number | null = null, groupId: number | null = null) => {
    if (typeof payeeOrOptions === 'object' && payeeOrOptions !== null) {
      setSettleUpCtx(payeeOrOptions);
      return;
    }

    if (!currentUser) return;
    const friendId = payeeOrOptions;
    const signedAmount = Number(amount) || 0;
    const normalizedAmount = Math.abs(signedAmount);
    if (signedAmount < 0) {
      setSettleUpCtx({ payerId: currentUser.id, payeeId: friendId, amount: normalizedAmount, groupId });
    } else {
      setSettleUpCtx({ payerId: friendId, payeeId: currentUser.id, amount: normalizedAmount, groupId });
    }
  };

  if (token && currentUserQuery.isPending) {
    return <div className="h-screen bg-gray-50"><LoadingState /></div>;
  }

  if (token && currentUserQuery.isError && currentUserQuery.error?.status !== 401 && currentUserQuery.error?.status !== 403) {
    return <ErrorState title="Unable to load your account" message={currentUserQuery.error.message} />;
  }

  if (!currentUser) {
    return authView === 'login' ? 
      <LoginView onLoginSuccess={setToken} onSwitchToSignup={() => setAuthView('signup')} /> : 
      <SignupView onSignupSuccess={setToken} onSwitchToLogin={() => setAuthView('login')} />;
  }

  const openExpenseModal = (group: GroupDetail | null = null, plan: Plan | null = null) => { setExpenseGroupCtx(group); setExpensePlanCtx(plan); setShowAddExpense(true); };
  const handleTabChange = (tab: AppTab) => { setActiveTab(tab); setSelectedGroupId(null); setSelectedExpenseCtx(null); };

  const tabs: Array<{ id: AppTab; icon: string; label: string }> = [
    { id: 'dashboard', icon: 'grid_view', label: 'Dashboard' },
    { id: 'friends', icon: 'person', label: 'Friends' },
    { id: 'groups', icon: 'groups', label: 'Groups' },
    { id: 'activity', icon: 'history', label: 'Activity' },
    { id: 'preplanning', icon: 'event_available', label: 'Preplanning' },
  ];

  const handleAddExpenseSaved = () => {
    setShowAddExpense(false);
    invalidateFinancialQueries();
  };

  const handleCreateGroupSaved = () => {
    setShowCreateGroup(false);
    queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
  };

  const handleEditExpenseSaved = () => {
    setShowEditExpense(false);
    invalidateFinancialQueries();
  };

  const handleSettleUpSaved = () => {
    setSettleUpCtx(null);
    invalidateFinancialQueries();
  };

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
            {coreError ? (
               <ErrorState title="Unable to load app data" message={coreError.error.message} />
            ) : (
               <>
                  {activeTab === 'dashboard' && <DashboardView balances={balances} rawBalances={rawBalances} groups={groups} users={users} currentUserId={currentUser.id} />}
                  
                  {activeTab === 'groups' && !selectedGroupId && !selectedExpenseCtx && <GroupsView groups={groups} rawBalances={rawBalances} currentUserId={currentUser.id} onCreateGroup={() => setShowCreateGroup(true)} onAddExpense={openExpenseModal} onSelect={setSelectedGroupId} />}
                  {activeTab === 'groups' && selectedGroupId && !selectedExpenseCtx && <GroupDetailView groupId={selectedGroupId} currentUserId={currentUser.id} users={users} onAddExpense={openExpenseModal} onSelectExpense={(exp: ExpenseWithCreator, grp: GroupDetail) => setSelectedExpenseCtx({ expense: exp, from: 'group', groupName: grp.name })} onBack={() => setSelectedGroupId(null)} onSettleUp={(opts: SettleUpContext) => openSettleUpModal({ groupId: selectedGroupId, ...opts })} />}
                  
                  {activeTab === 'activity' && !selectedExpenseCtx && <ActivityView expenses={expenses} settlements={settlements} groups={groups} users={users} currentUserId={currentUser.id} onSelectExpense={(exp: ExpenseWithCreator) => setSelectedExpenseCtx({ expense: exp, from: 'activity' })} />}
                  
                  {activeTab === 'friends' && !selectedFriendId && <FriendsView users={users} rawBalances={rawBalances} balances={balances} currentUserId={currentUser.id} onSettleUp={openSettleUpModal} onSelectFriend={setSelectedFriendId} />}
                  {activeTab === 'friends' && selectedFriendId && <FriendDetailView friendId={selectedFriendId} users={users} rawBalances={rawBalances} groups={groups} currentUserId={currentUser.id} onBack={() => setSelectedFriendId(null)} onSettleUp={openSettleUpModal} />}
                  
                  {activeTab === 'preplanning' && (
                     <div className={!selectedExpenseCtx ? 'h-full w-full' : 'hidden'}>
                        <PreplanningHub onAddExpense={(plan: Plan) => openExpenseModal(null, plan)} onSelectExpense={(exp: ExpenseWithCreator) => setSelectedExpenseCtx({ expense: exp, from: 'preplanning' })} />
                     </div>
                  )}

                  {selectedExpenseCtx && selectedExpense && <ExpenseDetailView expense={selectedExpense} context={selectedExpenseCtx} users={users} currentUserId={currentUser.id} onEdit={() => setShowEditExpense(true)} onBack={() => setSelectedExpenseCtx(null)} />}
               </>
            )}
         </main>
      </div>

      {/* Modals */}
      {showAddExpense && <AddExpenseFlow users={users} groups={groups} currentUserId={currentUser.id} groupCtx={expenseGroupCtx} planCtx={expensePlanCtx} onClose={() => setShowAddExpense(false)} onSave={handleAddExpenseSaved} />}
      {showCreateGroup && <CreateGroupModal users={users} currentUserId={currentUser.id} onClose={() => setShowCreateGroup(false)} onSave={handleCreateGroupSaved} />}
      {showEditExpense && selectedExpense && <EditExpenseModal expense={selectedExpense} users={users} currentUserId={currentUser.id} onClose={() => setShowEditExpense(false)} onSave={handleEditExpenseSaved} />}
      {settleUpCtx && <SettleUpModal users={users} currentUserId={currentUser.id} defaultPayerId={settleUpCtx.payerId} defaultPayeeId={settleUpCtx.payeeId} defaultAmount={settleUpCtx.amount} defaultMaxAmount={settleUpCtx.maxAmount} defaultGroupId={settleUpCtx.groupId} onClose={() => setSettleUpCtx(null)} onSave={handleSettleUpSaved} />}
    </div>
  );
}
