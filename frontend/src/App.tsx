import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
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
import type { AuthView, ExpenseSelectionContext, SettleUpContext } from './types/ui';

function AuthenticatedApp({ token, setToken }: { token: string; setToken: (t: string | null) => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [expenseGroupCtx, setExpenseGroupCtx] = useState<GroupDetail | null>(null);
  const [expensePlanCtx, setExpensePlanCtx] = useState<Plan | null>(null);
  const [editExpenseId, setEditExpenseId] = useState<number | null>(null);
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

  const friendUsers = usersQuery.data ?? [];
  const users = currentUser ? [currentUser, ...friendUsers.filter(u => u.id !== currentUser.id)] : [];
  const groups = groupsQuery.data ?? [];
  const balances = balancesQuery.data ?? { total_owes: 0, total_owed: 0, net_balance: 0 };
  const rawBalances = rawBalancesQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const settlements = settlementsQuery.data ?? [];
  const selectedExpense = editExpenseId
    ? expenses.find(e => e.id === editExpenseId)
    : null;
  const coreError = [usersQuery, groupsQuery, balancesQuery, rawBalancesQuery, expensesQuery, settlementsQuery].find(query => query.isError);

  const invalidateFinancialQueries = () => {
    if (!currentUserId) return;
    queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    queryClient.invalidateQueries({ queryKey: groupsKeys.all });
    queryClient.invalidateQueries({ queryKey: balancesKeys.all });
    queryClient.invalidateQueries({ queryKey: expensesKeys.user(currentUserId) });
    queryClient.invalidateQueries({ queryKey: settlementsKeys.user(currentUserId) });
    queryClient.invalidateQueries({ queryKey: plansKeys.all });
  };

  const handleLogout = () => {
    setToken(null);
  };

  const openExpenseModal = (group: GroupDetail | null = null, plan: Plan | null = null) => { 
    setExpenseGroupCtx(group); 
    setExpensePlanCtx(plan); 
    setShowAddExpense(true); 
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

  const handleAddExpenseSaved = () => {
    setShowAddExpense(false);
    invalidateFinancialQueries();
  };

  const handleCreateGroupSaved = () => {
    setShowCreateGroup(false);
    queryClient.invalidateQueries({ queryKey: groupsKeys.list() });
  };

  const handleEditExpenseSaved = () => {
    setEditExpenseId(null);
    invalidateFinancialQueries();
  };

  const handleExpenseDeleted = () => {
    setEditExpenseId(null);
    navigate(-1); // Go back after deletion if viewing expense details
  };

  const handleSettleUpSaved = () => {
    setSettleUpCtx(null);
    invalidateFinancialQueries();
  };

  if (currentUserQuery.isPending) {
    return <div className="h-screen bg-gray-50"><LoadingState /></div>;
  }

  if (currentUserQuery.isError && currentUserQuery.error?.status !== 401 && currentUserQuery.error?.status !== 403) {
    return <ErrorState title="Unable to load your account" message={currentUserQuery.error.message} />;
  }

  if (!currentUser) return null; // Handled by parent wrapper logic

  if (coreError) {
    return (
      <AppLayout currentUser={currentUser} onLogout={handleLogout} onAddExpense={openExpenseModal}>
        <ErrorState title="Unable to load app data" message={coreError.error.message} />
      </AppLayout>
    );
  }

  return (
    <>
      <AppLayout currentUser={currentUser} onLogout={handleLogout} onAddExpense={openExpenseModal}>
        <Routes>
          <Route path="/" element={
            <DashboardView balances={balances} rawBalances={rawBalances} groups={groups} users={users} currentUserId={currentUser.id} />
          } />
          <Route path="/groups" element={
            <GroupsView groups={groups} rawBalances={rawBalances} currentUserId={currentUser.id} onCreateGroup={() => setShowCreateGroup(true)} onAddExpense={openExpenseModal} />
          } />
          <Route path="/groups/:id" element={
            <GroupDetailViewWrapper users={users} currentUserId={currentUser.id} onAddExpense={openExpenseModal} onSettleUp={(opts: SettleUpContext) => openSettleUpModal(opts)} />
          } />
          <Route path="/activity" element={
            <ActivityView expenses={expenses} settlements={settlements} groups={groups} users={users} currentUserId={currentUser.id} />
          } />
          <Route path="/friends" element={
            <FriendsView users={users} rawBalances={rawBalances} balances={balances} currentUserId={currentUser.id} onSettleUp={openSettleUpModal} />
          } />
          <Route path="/friends/:id" element={
            <FriendDetailViewWrapper users={users} rawBalances={rawBalances} groups={groups} currentUserId={currentUser.id} onSettleUp={openSettleUpModal} />
          } />
          <Route path="/preplanning/*" element={
            <PreplanningHub currentUserId={currentUser.id} onAddExpense={(plan: Plan) => openExpenseModal(null, plan)} />
          } />
          <Route path="/expenses/:id" element={
            <ExpenseDetailViewWrapper expenses={expenses} users={users} currentUserId={currentUser.id} onEdit={(id: number) => setEditExpenseId(id)} onDeleted={handleExpenseDeleted} />
          } />
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>

      {/* Modals */}
      {showAddExpense && <AddExpenseFlow users={users} groups={groups} currentUserId={currentUser.id} groupCtx={expenseGroupCtx} planCtx={expensePlanCtx} onClose={() => setShowAddExpense(false)} onSave={handleAddExpenseSaved} />}
      {showCreateGroup && <CreateGroupModal users={users} currentUserId={currentUser.id} onClose={() => setShowCreateGroup(false)} onSave={handleCreateGroupSaved} />}
      {editExpenseId && selectedExpense && <EditExpenseModal expense={selectedExpense} users={users} currentUserId={currentUser.id} onClose={() => setEditExpenseId(null)} onSave={handleEditExpenseSaved} onDeleted={handleExpenseDeleted} />}
      {settleUpCtx && <SettleUpModal users={users} currentUserId={currentUser.id} defaultPayerId={settleUpCtx.payerId} defaultPayeeId={settleUpCtx.payeeId} defaultAmount={settleUpCtx.amount} defaultMaxAmount={settleUpCtx.maxAmount} defaultGroupId={settleUpCtx.groupId} onClose={() => setSettleUpCtx(null)} onSave={handleSettleUpSaved} />}
    </>
  );
}

// Wrappers to extract URL params
import { useParams, useLocation } from 'react-router-dom';

function ExpenseDetailViewWrapper({ expenses, users, currentUserId, onEdit, onDeleted }: any) {
  const { id } = useParams<{ id: string }>();
  const expenseId = parseInt(id || '', 10);
  const location = useLocation();
  const navigate = useNavigate();
  
  const expense = expenses.find((e: any) => e.id === expenseId);
  
  if (isNaN(expenseId) || !expense) return <Navigate to="/" replace />;
  
  const context = {
    expense,
    from: location.state?.from || 'activity',
    groupName: location.state?.groupName,
    planName: location.state?.planName
  };
  
  return <ExpenseDetailView expense={expense} context={context} users={users} currentUserId={currentUserId} onEdit={(exp: any) => onEdit(exp.id)} onBack={() => navigate(-1)} onDeleted={onDeleted} />;
}

function GroupDetailViewWrapper({ users, currentUserId, onAddExpense, onSettleUp }: any) {
  const { id } = useParams<{ id: string }>();
  const groupId = parseInt(id || '', 10);
  const navigate = useNavigate();
  if (isNaN(groupId)) return <Navigate to="/groups" replace />;
  // Note: we removed onSelectExpense, onBack from original props and rely on routing
  return <GroupDetailView groupId={groupId} currentUserId={currentUserId} users={users} onAddExpense={onAddExpense} onSettleUp={(opts: any) => onSettleUp({ ...opts, groupId })} onBack={() => navigate('/groups')} onSelectExpense={(exp: any, grp: any) => navigate(`/expenses/${exp.id}`, { state: { from: 'group', groupName: grp.name } })} />;
}

function FriendDetailViewWrapper({ users, rawBalances, groups, currentUserId, onSettleUp }: any) {
  const { id } = useParams<{ id: string }>();
  const friendId = parseInt(id || '', 10);
  const navigate = useNavigate();
  if (isNaN(friendId)) return <Navigate to="/friends" replace />;
  return <FriendDetailView friendId={friendId} users={users} rawBalances={rawBalances} groups={groups} currentUserId={currentUserId} onBack={() => navigate('/friends')} onSettleUp={onSettleUp} />;
}

export default function App() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [authView, setAuthView] = useState<AuthView>('login');

  useEffect(() => {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
      queryClient.clear();
    }
  }, [queryClient, token]);

  if (!token) {
    return authView === 'login' ? 
      <LoginView onLoginSuccess={setToken} onSwitchToSignup={() => setAuthView('signup')} /> : 
      <SignupView onSignupSuccess={setToken} onSwitchToLogin={() => setAuthView('login')} />;
  }

  return (
    <BrowserRouter>
      <AuthenticatedApp token={token} setToken={setToken} />
    </BrowserRouter>
  );
}
