/* eslint-disable react-refresh/only-export-components */
import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import LoadingState from './components/ui/LoadingState';

const DashboardView = lazy(() => import('./components/DashboardView'));
const GroupsView = lazy(() => import('./components/GroupsView'));
const GroupDetailView = lazy(() => import('./components/GroupDetailView'));
const FriendsView = lazy(() => import('./components/FriendsView'));
const FriendDetailView = lazy(() => import('./components/FriendDetailView'));
const ActivityView = lazy(() => import('./components/ActivityView'));
const PreplanningHub = lazy(() => import('./components/Preplanning/PreplanningHub'));

export const rootRoute = createRootRoute({
  component: () => <Layout />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <Suspense fallback={<div className="h-full bg-[#F8F9FA]"><LoadingState /></div>}>
      <DashboardViewWrapper />
    </Suspense>
  ),
});

const groupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups',
  component: () => (
    <Suspense fallback={<div className="h-full bg-[#F8F9FA]"><LoadingState /></div>}>
      <GroupsViewWrapper />
    </Suspense>
  ),
});

const groupDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/$groupId',
  component: () => (
    <Suspense fallback={<div className="h-full bg-[#F8F9FA]"><LoadingState /></div>}>
      <GroupDetailViewWrapper />
    </Suspense>
  ),
});

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  component: () => (
    <Suspense fallback={<div className="h-full bg-[#F8F9FA]"><LoadingState /></div>}>
      <FriendsViewWrapper />
    </Suspense>
  ),
});

const friendDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends/$friendId',
  component: () => (
    <Suspense fallback={<div className="h-full bg-[#F8F9FA]"><LoadingState /></div>}>
      <FriendDetailViewWrapper />
    </Suspense>
  ),
});

const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activity',
  component: () => (
    <Suspense fallback={<div className="h-full bg-[#F8F9FA]"><LoadingState /></div>}>
      <ActivityViewWrapper />
    </Suspense>
  ),
});

const preplanningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/preplanning',
  component: () => (
    <Suspense fallback={<div className="h-full bg-[#F8F9FA]"><LoadingState /></div>}>
      <PreplanningHubWrapper />
    </Suspense>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  groupsRoute,
  groupDetailRoute,
  friendsRoute,
  friendDetailRoute,
  activityRoute,
  preplanningRoute
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Wrapper components that extract data from query hooks and pass them as props
// because the original views expect fully populated props.
import { useUserExpenses } from './features/expenses/api';
import { useUserSettlements } from './features/settlements/api';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useLayoutContext } from './components/Layout';

function DashboardViewWrapper() {
  const { currentUserId, users, groups, rawBalances, balances } = useLayoutContext();
  if (!currentUserId) return null;
  return <DashboardView balances={balances} rawBalances={rawBalances} groups={groups} users={users} currentUserId={currentUserId} />;
}

function GroupsViewWrapper() {
  const { currentUserId, groups, rawBalances, setShowCreateGroup, openExpenseModal } = useLayoutContext();
  const navigate = useNavigate({ from: '/groups' });
  if (!currentUserId) return null;
  return <GroupsView groups={groups} rawBalances={rawBalances} currentUserId={currentUserId} onCreateGroup={() => setShowCreateGroup(true)} onAddExpense={openExpenseModal} onSelect={(id) => navigate({ to: '/groups/$groupId', params: { groupId: id.toString() } })} />;
}

function GroupDetailViewWrapper() {
  const { groupId } = useParams({ from: '/groups/$groupId' });
  const { currentUserId, users, openExpenseModal, setSelectedExpenseCtx, openSettleUpModal } = useLayoutContext();
  const navigate = useNavigate();
  if (!currentUserId) return null;
  return <GroupDetailView groupId={parseInt(groupId)} currentUserId={currentUserId} users={users} onAddExpense={openExpenseModal} onSelectExpense={(exp, grp) => setSelectedExpenseCtx({ expense: exp, from: 'group', groupName: grp.name })} onBack={() => navigate({ to: '/groups' })} onSettleUp={(opts) => openSettleUpModal({ groupId: parseInt(groupId), ...opts })} />;
}

function FriendsViewWrapper() {
  const { currentUserId, users, rawBalances, balances, openSettleUpModal } = useLayoutContext();
  const navigate = useNavigate();
  if (!currentUserId) return null;
  return <FriendsView users={users} rawBalances={rawBalances} balances={balances} currentUserId={currentUserId} onSettleUp={openSettleUpModal} onSelectFriend={(id) => navigate({ to: '/friends/$friendId', params: { friendId: id.toString() } })} />;
}

function FriendDetailViewWrapper() {
  const { friendId } = useParams({ from: '/friends/$friendId' });
  const { currentUserId, users, rawBalances, groups, openSettleUpModal } = useLayoutContext();
  const navigate = useNavigate();
  if (!currentUserId) return null;
  return <FriendDetailView friendId={parseInt(friendId)} users={users} rawBalances={rawBalances} groups={groups} currentUserId={currentUserId} onBack={() => navigate({ to: '/friends' })} onSettleUp={openSettleUpModal} />;
}

function ActivityViewWrapper() {
  const { currentUserId, users, groups, setSelectedExpenseCtx } = useLayoutContext();
  const expensesQuery = useUserExpenses(currentUserId ?? undefined);
  const settlementsQuery = useUserSettlements(currentUserId ?? undefined);
  const expenses = expensesQuery.data ?? [];
  const settlements = settlementsQuery.data ?? [];
  if (!currentUserId) return null;
  return <ActivityView expenses={expenses} settlements={settlements} groups={groups} users={users} currentUserId={currentUserId} onSelectExpense={(exp) => setSelectedExpenseCtx({ expense: exp, from: 'activity' })} />;
}

function PreplanningHubWrapper() {
  const { currentUserId, openExpenseModal, setSelectedExpenseCtx } = useLayoutContext();
  if (!currentUserId) return null;
  return <PreplanningHub currentUserId={currentUserId} onAddExpense={(plan) => openExpenseModal(null, plan)} onSelectExpense={(exp) => setSelectedExpenseCtx({ expense: exp, from: 'preplanning' })} />;
}
