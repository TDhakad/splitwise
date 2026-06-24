export type Currency = 'USD';

export type ExpenseCategory =
  | 'Dining'
  | 'Accommodation'
  | 'Transport'
  | 'Groceries'
  | 'Entertainment'
  | 'General';

export interface UserBase {
  email: string;
  name: string;
  avatar_url?: string | null;
}

export interface UserCreate extends UserBase {
  password?: string | null;
  auth_provider?: 'local' | 'google';
  auth_provider_id?: string | null;
}

export interface User extends UserBase {
  id: number;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface GoogleAuthRequest {
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
}

export interface GroupBase {
  name: string;
  description?: string | null;
  simplify_debts?: boolean;
}

export type GroupCreate = GroupBase;

export interface Group extends GroupBase {
  id: number;
  created_by: number;
  created_at: string;
}

export interface GroupDetail extends Group {
  members: User[];
}

export interface BalanceSummary {
  from_user_id: number;
  to_user_id: number;
  amount: number;
  group_id?: number | null;
}

export interface TotalsBalanceSummary {
  total_owes: number;
  total_owed: number;
  net_balance: number;
}

export interface ExpenseParticipantBase {
  user_id: number;
  amount_paid: number;
  amount_owed: number;
}

export interface ExpenseParticipant extends ExpenseParticipantBase {
  id: number;
}

export interface ReceiptBreakdownTotals {
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
}

export interface ReceiptBreakdownShare {
  user_id: number;
  amount: number;
}

export type ReceiptBreakdownSplitType = 'individual' | 'shared' | 'custom';

export interface ReceiptBreakdownItem {
  name: string;
  quantity?: number | string | null;
  price: number;
  split_type: ReceiptBreakdownSplitType;
  shares: ReceiptBreakdownShare[];
}

export interface ReceiptBreakdownMemberTotal extends ReceiptBreakdownTotals {
  user_id: number;
}

export interface ReceiptBreakdown {
  distribution_method: 'proportional_by_item_subtotal';
  totals: ReceiptBreakdownTotals;
  items: ReceiptBreakdownItem[];
  member_totals: ReceiptBreakdownMemberTotal[];
}

export interface ExpenseCreate {
  group_id?: number | null;
  plan_id?: number | null;
  description: string;
  total_amount: number;
  currency?: Currency;
  date?: string | null;
  category?: ExpenseCategory | null;
  has_receipt?: boolean;
  receipt_breakdown?: ReceiptBreakdown | null;
  participants: ExpenseParticipantBase[];
}

export interface Expense extends Omit<ExpenseCreate, 'currency' | 'date' | 'category' | 'has_receipt'> {
  id: number;
  group_id: number | null;
  plan_id?: number | null;
  created_by: number;
  currency: string;
  date: string;
  category?: string | null;
  has_receipt?: boolean;
  receipt_breakdown?: ReceiptBreakdown | null;
  participants: ExpenseParticipant[];
}

export interface ExpenseWithCreator extends Expense {
  creator_name?: string | null;
  group_name?: string | null;
}

export interface SettlementCreate {
  group_id?: number | null;
  payer_id: number;
  payee_id: number;
  amount: number;
  currency?: Currency;
}

export interface SettlementUpdate {
  amount: number;
}

export interface Settlement extends Required<SettlementCreate> {
  group_id: number | null;
  id: number;
  date: string;
  status: string;
}

export interface AuditLog {
  id: number;
  user_id?: number | null;
  action: string;
  target_type: string;
  target_id: number;
  changes?: string | null;
  timestamp: string;
}

export interface FriendshipCreate {
  email: string;
}

export interface Friendship {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FriendshipWithUsers extends Friendship {
  requester: User;
  addressee: User;
}

export interface PlanAllocationBase {
  category: ExpenseCategory;
  allocated_amount: number;
}

export type PlanAllocationCreate = PlanAllocationBase;

export interface PlanAllocation extends PlanAllocationBase {
  id: number;
  plan_id: number;
}

export interface PlanPredecisionBase {
  title: string;
  category: ExpenseCategory;
  expected_amount: number;
  status?: 'expected' | 'realized';
}

export type PlanPredecisionCreate = PlanPredecisionBase;

export interface PlanPredecision extends Required<PlanPredecisionBase> {
  id: number;
  plan_id: number;
}

export interface PlanBase {
  name: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  status?: 'draft' | 'active' | 'completed';
  type?: 'trip' | 'monthly_budget' | 'custom';
  group_id?: number | null;
}

export type PlanCreate = PlanBase;

export interface PlanUpdate {
  name?: string;
  start_date?: string;
  end_date?: string;
  total_budget?: number;
  status?: 'draft' | 'active' | 'completed';
  type?: 'trip' | 'monthly_budget' | 'custom';
  group_id?: number | null;
}

export interface Plan extends Required<Omit<PlanBase, 'group_id'>> {
  group_id: number | null;
  id: number;
  user_id: number;
  created_at: string;
  updated_at?: string | null;
  total_spent: number;
}

export interface PlanDetail extends Plan {
  allocations: PlanAllocation[];
  predecisions: PlanPredecision[];
  tracked_groups: Group[];
  expenses: ExpenseWithCreator[];
  total_allocated: number;
  allocations_spent: Record<string, number>;
}

export interface ReceiptItem {
  name: string;
  price: number;
  assignedTo: number[];
}

export interface ReceiptData {
  description: string;
  totalAmount: number;
  category: ExpenseCategory;
  items: ReceiptItem[];
  confidence?: number;
}

export interface ReceiptScanResponse {
  description?: string;
  total_amount?: number;
  totalAmount?: number;
  category?: ExpenseCategory;
  items?: Array<{
    name?: string;
    description?: string;
    price?: number;
    amount?: number;
    assignedTo?: number[];
  }>;
}
