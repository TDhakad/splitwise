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

export interface GroupCreate extends GroupBase {
  member_ids?: number[];
  member_emails?: string[];
}

export interface Group extends GroupBase {
  id: number;
  created_by: number;
  created_at: string;
}

export interface GroupDetail extends Group {
  members: User[];
}

export interface GroupMemberCreate {
  user_id?: number;
  email?: string;
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
  is_deleted?: boolean;
  deleted_by?: number | null;
  deleted_at?: string | null;
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

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  actor_user_id?: number | null;
  target_type: string;
  target_id?: number | null;
  payload: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationList {
  notifications: Notification[];
  unread_count: number;
}

export interface SpendingMonthlyTotal {
  month: string;
  amount_cents: number;
}

export interface SpendingCategoryTotal {
  category: string;
  amount_cents: number;
}

export interface SpendingHabits {
  total_cents: number;
  average_monthly_cents: number;
  transaction_count: number;
  average_transaction_cents: number;
  top_category?: string | null;
}

export interface SpendingAnalytics {
  monthly: SpendingMonthlyTotal[];
  categories: SpendingCategoryTotal[];
  habits: SpendingHabits;
}

export interface NetHistoryPoint {
  month: string;
  net_cents: number;
}

export interface AgingBucket {
  label: string;
  receivable_cents: number;
  payable_cents: number;
}

export interface AgingItem {
  counterparty_id: number;
  group_id: number | null;
  amount_cents: number;
  direction: 'receivable' | 'payable';
  age_days: number;
}

export interface StandingAnalytics {
  net_history: NetHistoryPoint[];
  aging: {
    buckets: AgingBucket[];
    items: AgingItem[];
  };
}

export interface ReceiptItemStat {
  name: string;
  count: number;
  amount_cents: number;
}

export interface ReceiptItemAnalytics {
  total_spent_cents: number;
  purchase_count: number;
  top_items: ReceiptItemStat[];
}

export interface GroupStat {
  group_id: number;
  name: string;
  expense_count: number;
  avg_settlement_days: number;
  balance_fairness_score: number;
}

export interface GroupAnalytics {
  groups: GroupStat[];
}

export interface SettlementPrediction {
  counterparty_id: number;
  group_id: number | null;
  amount_cents: number;
  direction: 'receivable' | 'payable';
  predicted_settlement_days: number;
  reliability_score: number;
}

export interface PredictionAnalytics {
  predictions: SettlementPrediction[];
}

export interface BrandPreference {
  brand: string;
  amount_cents: number;
}

export interface ShoppingCategory {
  category: string;
  amount_cents: number;
}

export interface MonthlyReceiptVolume {
  month: string;
  receipt_count: number;
}

export interface ShoppingInsights {
  brand_preferences: BrandPreference[];
  shopping_categories: ShoppingCategory[];
  monthly_receipt_volume: MonthlyReceiptVolume[];
}

export interface CashflowForecast {
  month: string;
  estimated_incoming_cents: number;
  estimated_outgoing_cents: number;
  net_flow_cents: number;
}

export interface CashflowAnalytics {
  current_receivables_cents: number;
  current_payables_cents: number;
  avg_monthly_spend_cents: number;
  avg_settlement_delay_days: number;
  monthly_forecasts: CashflowForecast[];
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
