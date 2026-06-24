/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Outlet, Link, useNavigate, useLocation } from '@tanstack/react-router';
import { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import AddExpenseFlow from './AddExpenseFlow';
import CreateGroupModal from './CreateGroupModal';
import EditExpenseModal from './EditExpenseModal';
import SettleUpModal from './SettleUpModal';
import LoginView from './LoginView';
import SignupView from './SignupView';
import ExpenseDetailView from './ExpenseDetailView';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';
import { useCurrentUser } from '../features/auth/api';
import { useUsers, usersKeys } from '../features/users/api';
import { useGroups, groupsKeys } from '../features/groups/api';
import { useBalanceSummary, useRawBalances, balancesKeys } from '../features/balances/api';
import { useUserExpenses, expensesKeys } from '../features/expenses/api';
import { settlementsKeys } from '../features/settlements/api';
import { plansKeys } from '../features/preplanning/api';
import type { GroupDetail, Plan } from '../types/api';
import type { AuthView, ExpenseSelectionContext, SettleUpContext } from '../types/ui';

// Provide layout context to children
interface LayoutContextType {
  currentUserId: number | null;
  users: any[];
  groups: any[];
  rawBalances: any[];
  balances: any;
  setShowCreateGroup: (v: boolean) => void;
  openExpenseModal: (group?: GroupDetail | null, plan?: Plan | null) => void;
  setSelectedExpenseCtx: (ctx: ExpenseSelectionContext | null) => void;
  openSettleUpModal: (opts: number | SettleUpContext, amount?: number | null, groupId?: number | null) => void;
}
const LayoutContext = createContext<LayoutContextType | null>(null);
export const useLayoutContext = () => {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayoutContext must be used within LayoutContext.Provider');
  return ctx;
};

export default function Layout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = location.pathname.split('/')[1] || 'dashboard';

  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [authView, setAuthView] = useState<AuthView>('login');

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [expenseGroupCtx, setExpenseGroupCtx] = useState<GroupDetail | null>(null);
  const [expensePlanCtx, setExpensePlanCtx] = useState<Plan | null>(null);
  const [selectedExpenseCtx, setSelectedExpenseCtx] = useState<ExpenseSelectionContext | null>(null);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [settleUpCtx, setSettleUpCtx] = useState<SettleUpContext | null>(null);

  const currentUserQuery = useCurrentUser(token);
  const currentUser = currentUserQuery.data ?? null;
  const currentUserId = currentUser?.id ?? null;
  const hasUser = Boolean(currentUserId);

  const usersQuery = useUsers(hasUser);
  const groupsQuery = useGroups(hasUser);
  const balancesQuery = useBalanceSummary(currentUserId ?? undefined);
  const rawBalancesQuery = useRawBalances(currentUserId ?? undefined);
  
  // Expenses and settlements are fetched in ActivityView to distribute data fetching
  const expensesQuery = useUserExpenses(currentUserId ?? undefined);

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

  const selectedExpense = selectedExpenseCtx
    ? expenses.find((e: any) => e.id === selectedExpenseCtx.expense.id) ?? selectedExpenseCtx.expense
    : null;

  // Handle URL-based modals
  const modalParam = searchParams.get('modal');
  const showAddExpense = modalParam === 'add-expense';

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

  const openExpenseModal = (group: GroupDetail | null = null, plan: Plan | null = null) => { 
    setExpenseGroupCtx(group); 
    setExpensePlanCtx(plan); 
    navigate({ search: { modal: 'add-expense' } as any });
  };

  const closeExpenseModal = () => {
    navigate({ search: {} as any });
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

  const tabs = [
    { id: 'dashboard', icon: 'grid_view', label: 'Dashboard', to: '/' },
    { id: 'friends', icon: 'person', label: 'Friends', to: '/friends' },
    { id: 'groups', icon: 'groups', label: 'Groups', to: '/groups' },
    { id: 'activity', icon: 'history', label: 'Activity', to: '/activity' },
    { id: 'preplanning', icon: 'event_available', label: 'Preplanning', to: '/preplanning' },
  ];

  const handleAddExpenseSaved = () => {
    closeExpenseModal();
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

  const handleExpenseDeleted = () => {
    setShowEditExpense(false);
    setSelectedExpenseCtx(null);
  };

  const handleSettleUpSaved = () => {
    setSettleUpCtx(null);
    invalidateFinancialQueries();
  };

  const contextValue: LayoutContextType = {
    currentUserId, users, groups, rawBalances, balances,
    setShowCreateGroup, openExpenseModal, setSelectedExpenseCtx, openSettleUpModal
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      <div className="flex h-dvh bg-[#F8F9FA] font-sans text-gray-900 selection:bg-[#007A64] selection:text-white">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0 relative z-20">
           <div className="p-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-[#007A64] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
                    <MSIcon name="account_balance_wallet" fill={1} className="text-xl" />
                 </div>
                 <div>
                    <h1 className="font-bold text-lg leading-tight tracking-tight text-[#007A64]">HisabKitab</h1>
                 </div>
              </div>
              <p className="mt-3 text-[10px] font-bold text-gray-500 tracking-[0.15em] uppercase">Plan. Split. Settle.</p>
           </div>

           <div className="px-4 py-2">
              <button onClick={() => openExpenseModal()} className="w-full bg-[#007A64] hover:bg-[#00604f] text-white rounded-xl py-3.5 px-4 font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-sm">
                 <MSIcon name="add" /> Add Expense
              </button>
           </div>

           <nav className="flex-1 px-4 py-6 space-y-1.5">
              {tabs.map(t => {
                 const isActive = activeTab === t.id || (activeTab === '' && t.id === 'dashboard');
                 return (
                 <Link key={t.id} to={t.to}
                    className={clsx('w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold transition-all',
                       isActive ? 'bg-[#EAF5F2] text-[#007A64]' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900')}>
                    <MSIcon name={t.icon} fill={isActive ? 1 : 0} className="text-[22px]" />
                    {t.label}
                 </Link>
              )})}
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
           {!selectedExpenseCtx && (
              <header className="md:hidden h-[98px] bg-white/95 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-30 shadow-sm">
                 <div className="flex items-center gap-3 min-w-0">
                    <button className="w-12 h-12 rounded-full bg-[#007A64] flex items-center justify-center text-white font-bold text-base shadow-sm ring-2 ring-white shrink-0">
                       {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </button>
                    <div className="min-w-0">
                       <p className="text-[11px] font-bold text-gray-500 tracking-[0.12em] uppercase">HisabKitab</p>
                       <h1 className="text-2xl font-bold leading-tight text-gray-900 truncate">Plan. Split. Settle.</h1>
                    </div>
                 </div>
                 <button onClick={() => openExpenseModal()} className="bg-[#007A64] hover:bg-[#00604f] text-white rounded-2xl px-4 py-3 font-bold flex items-center gap-2 transition-all shadow-md active:scale-95">
                    <MSIcon name="add" className="text-xl" />
                    <span className="leading-tight">Add<br />Expense</span>
                 </button>
              </header>
           )}

           <header className="hidden md:flex h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 items-center justify-between px-8 shrink-0 z-10 sticky top-0">
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

           <main className="flex-1 overflow-hidden relative pb-20 md:pb-0">
              {selectedExpenseCtx && selectedExpense ? (
                  <ExpenseDetailView expense={selectedExpense} context={selectedExpenseCtx} users={users} currentUserId={currentUser.id} onEdit={() => setShowEditExpense(true)} onBack={() => setSelectedExpenseCtx(null)} onDeleted={handleExpenseDeleted} />
              ) : (
                  <Outlet />
              )}
           </main>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
           <div className="grid grid-cols-5 gap-1">
              {tabs.map(t => {
                 const isActive = activeTab === t.id || (activeTab === '' && t.id === 'dashboard');
                 return (
                 <Link
                    key={t.id}
                    to={t.to}
                    className={clsx(
                       'min-h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-all',
                       isActive
                          ? 'bg-[#007A64] text-white shadow-md'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    )}
                 >
                    <MSIcon name={t.icon} fill={isActive ? 1 : 0} className="text-[22px]" />
                    <span className="leading-none">{t.id === 'preplanning' ? 'Plans' : t.label}</span>
                 </Link>
              )})}
           </div>
        </nav>

        {/* Modals */}
        {showAddExpense && <AddExpenseFlow users={users} groups={groups} currentUserId={currentUser.id} groupCtx={expenseGroupCtx} planCtx={expensePlanCtx} onClose={closeExpenseModal} onSave={handleAddExpenseSaved} />}
        {showCreateGroup && <CreateGroupModal users={users} currentUserId={currentUser.id} onClose={() => setShowCreateGroup(false)} onSave={handleCreateGroupSaved} />}
        {showEditExpense && selectedExpense && <EditExpenseModal expense={selectedExpense} users={users} currentUserId={currentUser.id} onClose={() => setShowEditExpense(false)} onSave={handleEditExpenseSaved} onDeleted={handleExpenseDeleted} />}
        {settleUpCtx && <SettleUpModal users={users} currentUserId={currentUser.id} defaultPayerId={settleUpCtx.payerId} defaultPayeeId={settleUpCtx.payeeId} defaultAmount={settleUpCtx.amount} defaultMaxAmount={settleUpCtx.maxAmount} defaultGroupId={settleUpCtx.groupId} onClose={() => setSettleUpCtx(null)} onSave={handleSettleUpSaved} />}
      </div>
    </LayoutContext.Provider>
  );
}
