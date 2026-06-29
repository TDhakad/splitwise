import { useMemo, useState } from 'react';
import clsx from 'clsx';
import MSIcon from './MSIcon';
import { SettlementDetailModal } from './SettlementDetailModal';
import { avatarColor, initials } from '../lib/utils';
import { useUserExpenses } from '../features/expenses/api';
import { useUserSettlements } from '../features/settlements/api';
import type { BalanceSummary, ExpenseWithCreator, GroupDetail, Settlement, User } from '../types/api';
import type { SettleUpContext } from '../types/ui';

interface FriendDebt {
  id: string;
  groupId: number | null | undefined;
  groupName: string;
  net: number;
}

interface LedgerTransaction {
  id: string;
  type: 'expense' | 'settlement';
  date: Date;
  title: string;
  subtitle: string;
  detail: string;
  impactText: string;
  impactTone: 'positive' | 'negative' | 'neutral';
  icon: string;
  category?: string | null;
  expense?: ExpenseWithCreator;
  settlement?: Settlement;
}

interface FriendDetailViewProps {
  friendId: number;
  users: User[];
  rawBalances: BalanceSummary[];
  groups: GroupDetail[];
  currentUserId: number;
  onBack: () => void;
  onSettleUp: (options: SettleUpContext) => void;
  onOpenGroup: (groupId: number) => void;
  onSelectExpense: (expense: ExpenseWithCreator, contextName: string, friendName: string) => void;
}

export default function FriendDetailView({ friendId, users, rawBalances, groups, currentUserId, onBack, onSettleUp, onOpenGroup, onSelectExpense }: FriendDetailViewProps) {
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const friend = users.find(u => u.id === friendId) || { name: 'Unknown', id: friendId, email: '' };
  const friendFirstName = friend.name.split(' ')[0] || friend.name;

  const expensesQuery = useUserExpenses(currentUserId);
  const settlementsQuery = useUserSettlements(currentUserId);

  const netBalance = useMemo(() => {
    let net = 0;
    rawBalances.forEach(b => {
      if (b.from_user_id === currentUserId && b.to_user_id === friendId) net -= b.amount;
      if (b.to_user_id === currentUserId && b.from_user_id === friendId) net += b.amount;
    });
    return net;
  }, [rawBalances, currentUserId, friendId]);

  const simplifiedDebts = useMemo(() => {
    const debts: FriendDebt[] = [];
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
          net,
        });
      }
    });
    return debts.sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [rawBalances, currentUserId, friendId, groups]);

  const effectiveSelectedDebtId = selectedDebtId && simplifiedDebts.some(debt => debt.id === selectedDebtId)
    ? selectedDebtId
    : simplifiedDebts[0]?.id ?? null;
  const selectedDebt = simplifiedDebts.find(debt => debt.id === effectiveSelectedDebtId) ?? null;
  const ledgerTitle = selectedDebt
    ? selectedDebt.groupId
      ? `${selectedDebt.groupName} with ${friendFirstName}`
      : `Personal expenses with ${friendFirstName}`
    : '';

  const ledgerTransactions = selectedDebt
    ? buildLedgerTransactions(selectedDebt, expensesQuery.data ?? [], settlementsQuery.data ?? [], currentUserId, friendId, friendFirstName, users)
    : [];

  const handleDebtKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, debtId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedDebtId(debtId);
    }
  };

  const openSettlement = (debt: FriendDebt, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (debt.net > 0) {
      onSettleUp({ payerId: friendId, payeeId: currentUserId, amount: debt.net, maxAmount: debt.net, groupId: debt.groupId });
    } else {
      onSettleUp({ payerId: currentUserId, payeeId: friendId, amount: Math.abs(debt.net), maxAmount: Math.abs(debt.net), groupId: debt.groupId });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F9FB] relative overflow-hidden">
      <header className="h-20 bg-white border-b border-gray-100 flex items-center px-8 shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
          <MSIcon name="arrow_back" style={{ fontSize: 18 }} /> Back to Friends
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className={clsx('w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-md', avatarColor(friend.id))}>
                {initials(friend.name)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{friend.name}</h1>
                <p className="text-gray-500 font-medium">{friend.email || 'Friend'}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 min-w-[250px]">
              <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-2">Total Balance</p>
              {netBalance > 0 ? (
                <>
                  <p className="text-lg font-bold text-[#007A64] mb-3">{friendFirstName} owes you ${netBalance.toFixed(2)}</p>
                  <button onClick={() => onSettleUp({ payerId: friendId, payeeId: currentUserId, amount: netBalance, maxAmount: netBalance })} className="w-full bg-[#EAF5F2] text-[#007A64] hover:bg-[#007A64] hover:text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm">
                    Record Payment
                  </button>
                </>
              ) : netBalance < 0 ? (
                <>
                  <p className="text-lg font-bold text-[#D93F3C] mb-3">You owe ${Math.abs(netBalance).toFixed(2)}</p>
                  <button onClick={() => onSettleUp({ payerId: currentUserId, payeeId: friendId, amount: Math.abs(netBalance), maxAmount: Math.abs(netBalance) })} className="w-full bg-[#007A64] text-white hover:bg-[#00604f] px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm">
                    Settle Up
                  </button>
                </>
              ) : (
                <p className="text-lg font-bold text-gray-500">Settled up</p>
              )}
            </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Simplified Debts</h2>
                <p className="text-sm font-medium text-gray-500 mt-1">Select a context to see the transactions behind the balance.</p>
              </div>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                {simplifiedDebts.length} Active
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_150px_170px] bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                <div className="px-6 py-4">Group / Context</div>
                <div className="px-6 py-4 text-right">Balance</div>
                <div className="px-6 py-4 text-right">Action</div>
              </div>
              <div className="divide-y divide-gray-100">
                {simplifiedDebts.map(debt => {
                  const isSelected = effectiveSelectedDebtId === debt.id;
                  return (
                    <div
                      key={debt.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDebtId(debt.id)}
                      onKeyDown={(event) => handleDebtKeyDown(event, debt.id)}
                      className={clsx(
                        'p-4 md:px-6 md:py-4 transition-colors flex flex-col md:grid md:grid-cols-[1fr_150px_170px] md:items-center gap-4 md:gap-0 cursor-pointer outline-none focus:ring-2 focus:ring-[#007A64]/30',
                        isSelected ? 'bg-[#EAF5F2]/70' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', isSelected ? 'bg-white text-[#007A64] border-[#c1e0d7]' : 'bg-gray-100 text-gray-500 border-gray-200')}>
                          <MSIcon name={debt.groupId ? 'group' : 'person'} className="text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{debt.groupName}</p>
                          <p className="text-xs font-medium text-gray-500">{debt.groupId ? 'Group context' : 'Personal context'}</p>
                        </div>
                        <MSIcon name="chevron_right" className={clsx('ml-auto md:hidden', isSelected ? 'text-[#007A64]' : 'text-gray-400')} />
                      </div>

                      <div className="md:text-right shrink-0 md:px-6">
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
                      </div>

                      <div className="w-full md:text-right shrink-0 md:px-6 flex items-center gap-2">
                        <button
                          onClick={(event) => openSettlement(debt, event)}
                          className={clsx(
                            'px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm w-full',
                            debt.net > 0
                              ? 'bg-[#EAF5F2] text-[#007A64] hover:bg-[#007A64] hover:text-white'
                              : 'bg-[#007A64] text-white hover:bg-[#00604f]'
                          )}
                        >
                          {debt.net > 0 ? 'Record Payment' : 'Settle Up'}
                        </button>
                        <MSIcon name="chevron_right" className={clsx('hidden md:block shrink-0', isSelected ? 'text-[#007A64]' : 'text-gray-400')} />
                      </div>
                    </div>
                  );
                })}
                {simplifiedDebts.length === 0 && (
                  <div className="px-6 py-12 text-center text-gray-500 text-sm">
                    You and {friendFirstName} are completely settled up.
                  </div>
                )}
              </div>
            </div>
          </section>

          {selectedDebt && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-gray-200 bg-gradient-to-br from-white to-[#F8FBFA]">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#EAF5F2] text-[#007A64] flex items-center justify-center border border-[#c1e0d7]">
                        <MSIcon name={selectedDebt.groupId ? 'home' : 'person'} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{ledgerTitle}</h3>
                    </div>
                    <p className="mt-3 text-base font-medium text-gray-700">
                      Context Balance:{' '}
                      <span className={clsx('font-bold', selectedDebt.net > 0 ? 'text-[#007A64]' : 'text-[#D93F3C]')}>
                        {selectedDebt.net > 0
                          ? `${friendFirstName} owes you $${selectedDebt.net.toFixed(2)}`
                          : `You owe ${friendFirstName} $${Math.abs(selectedDebt.net).toFixed(2)}`}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 lg:justify-end">
                    {selectedDebt.groupId && (
                      <button onClick={() => onOpenGroup(selectedDebt.groupId!)} className="min-h-11 px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                        <MSIcon name="open_in_new" className="text-lg" />
                        Open Group
                      </button>
                    )}
                    <button onClick={() => openSettlement(selectedDebt)} className="min-h-11 px-5 py-2.5 rounded-xl bg-[#007A64] text-white font-bold text-sm hover:bg-[#00604f] transition-colors flex items-center justify-center gap-2 shadow-sm">
                      <MSIcon name="payments" className="text-lg" />
                      {selectedDebt.net > 0 ? 'Record Payment' : 'Settle Up'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden md:grid grid-cols-[1fr_260px] bg-[#EEF3FF] border-b border-gray-200 text-[11px] font-bold text-gray-700 tracking-wider uppercase">
                <div className="px-6 py-4">Expense</div>
                <div className="px-6 py-4 text-right">Details</div>
              </div>

              <div className="divide-y divide-gray-100">
                {ledgerTransactions.map(transaction => (
                  <button
                    key={transaction.id}
                    onClick={() => {
                      if (transaction.expense) onSelectExpense(transaction.expense, ledgerTitle, friend.name);
                      if (transaction.settlement) setSelectedSettlement(transaction.settlement);
                    }}
                    className={clsx(
                      'w-full p-5 md:px-6 md:py-4 flex flex-col md:grid md:grid-cols-[1fr_260px] md:items-center gap-4 text-left transition-colors',
                      transaction.type === 'settlement' ? 'bg-gray-50/70 hover:bg-gray-100/70' : 'hover:bg-[#F8FBFA]'
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={clsx('w-11 h-11 rounded-full flex items-center justify-center shrink-0 border', transaction.type === 'settlement' ? 'bg-white text-gray-500 border-gray-200' : 'bg-[#EAF5F2] text-[#007A64] border-[#c1e0d7]')}>
                        <MSIcon name={transaction.icon} />
                      </div>
                      <div className="min-w-0">
                        <p className={clsx('font-bold text-gray-900 truncate', transaction.type === 'settlement' && 'italic')}>{transaction.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs font-medium text-gray-600">{transaction.subtitle}</span>
                          {transaction.category && (
                            <span className="text-[11px] font-semibold text-gray-700 bg-gray-200 rounded-full px-2 py-0.5">{transaction.category}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className="md:text-right">
                        <p className={clsx('text-base font-semibold', transaction.type === 'settlement' ? 'text-gray-600' : 'text-gray-900')}>{transaction.detail}</p>
                        <p className={clsx(
                          'text-sm font-bold mt-1',
                          transaction.impactTone === 'positive' && 'text-[#007A64]',
                          transaction.impactTone === 'negative' && 'text-[#D93F3C]',
                          transaction.impactTone === 'neutral' && 'text-gray-400 line-through'
                        )}>
                          {transaction.impactText}
                        </p>
                      </div>
                      <MSIcon name="chevron_right" className="text-gray-400 shrink-0" />
                    </div>
                  </button>
                ))}
                {ledgerTransactions.length === 0 && (
                  <div className="px-6 py-12 text-center text-gray-500 text-sm">
                    No transactions found for this context.
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <SettlementDetailModal
        isOpen={!!selectedSettlement}
        onClose={() => setSelectedSettlement(null)}
        settlement={selectedSettlement}
        users={users}
        currentUserId={currentUserId}
      />
    </div>
  );
}

function pairwiseExpenseImpact(expense: ExpenseWithCreator, currentUserId: number, friendId: number) {
  const creditors = expense.participants
    .map(participant => ({ userId: participant.user_id, amount: participant.amount_paid - participant.amount_owed }))
    .filter(item => item.amount > 0.005);
  const debtors = expense.participants
    .map(participant => ({ userId: participant.user_id, amount: participant.amount_owed - participant.amount_paid }))
    .filter(item => item.amount > 0.005);

  let impact = 0;
  debtors.forEach(debtor => {
    let remainingDebt = debtor.amount;
    creditors.forEach(creditor => {
      if (remainingDebt <= 0.005 || creditor.amount <= 0.005) return;
      const settledAmount = Math.min(remainingDebt, creditor.amount);
      remainingDebt -= settledAmount;
      creditor.amount -= settledAmount;

      if (debtor.userId === friendId && creditor.userId === currentUserId) impact += settledAmount;
      if (debtor.userId === currentUserId && creditor.userId === friendId) impact -= settledAmount;
    });
  });
  return impact;
}

function buildLedgerTransactions(
  selectedDebt: FriendDebt,
  expenses: ExpenseWithCreator[],
  settlements: Settlement[],
  currentUserId: number,
  friendId: number,
  friendFirstName: string,
  users: User[]
) {
  const matchesContext = (groupId: number | null | undefined) => selectedDebt.groupId ? groupId === selectedDebt.groupId : groupId == null;
  const transactionRows: LedgerTransaction[] = [];

  expenses.forEach(expense => {
    if (!matchesContext(expense.group_id) || expense.is_deleted) return;
    const currentParticipant = expense.participants.find(participant => participant.user_id === currentUserId);
    const friendParticipant = expense.participants.find(participant => participant.user_id === friendId);
    if (!currentParticipant || !friendParticipant) return;

    const impact = pairwiseExpenseImpact(expense, currentUserId, friendId);
    if (Math.abs(impact) <= 0.005) return;

    const payers = expense.participants.filter(participant => participant.amount_paid > 0.005);
    const payerText = payers.length === 1
      ? `${displayUserName(payers[0].user_id, users, currentUserId)} paid $${payers[0].amount_paid.toFixed(2)}`
      : 'Multiple people paid';

    transactionRows.push({
      id: `expense-${expense.id}`,
      type: 'expense',
      date: new Date(expense.date),
      title: expense.description,
      subtitle: formatShortDate(expense.date),
      detail: payerText,
      impactText: impact > 0
        ? `${friendFirstName} owes you $${impact.toFixed(2)}`
        : `You owe ${friendFirstName} $${Math.abs(impact).toFixed(2)}`,
      impactTone: impact > 0 ? 'positive' : 'negative',
      icon: categoryIcon(expense.category),
      category: expense.category,
      expense,
    });
  });

  settlements.forEach(settlement => {
    if (!matchesContext(settlement.group_id)) return;
    const isFriendPayment = settlement.payer_id === friendId && settlement.payee_id === currentUserId;
    const isCurrentUserPayment = settlement.payer_id === currentUserId && settlement.payee_id === friendId;
    if (!isFriendPayment && !isCurrentUserPayment) return;

    transactionRows.push({
      id: `settlement-${settlement.id}`,
      type: 'settlement',
      date: new Date(settlement.date),
      title: isFriendPayment ? `${friendFirstName} paid you` : `You paid ${friendFirstName}`,
      subtitle: formatShortDate(settlement.date),
      detail: 'Payment recorded',
      impactText: `$${settlement.amount.toFixed(2)}`,
      impactTone: 'neutral',
      icon: 'sync_alt',
      settlement,
    });
  });

  return transactionRows.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function displayUserName(userId: number, users: User[], currentUserId: number) {
  if (userId === currentUserId) return 'You';
  return users.find(user => user.id === userId)?.name ?? 'Someone';
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function categoryIcon(category?: string | null) {
  if (category === 'Dining') return 'restaurant';
  if (category === 'Transport') return 'directions_car';
  if (category === 'Groceries') return 'shopping_cart';
  if (category === 'Accommodation') return 'home';
  if (category === 'Entertainment') return 'local_activity';
  return 'receipt_long';
}
