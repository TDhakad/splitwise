import type {
  BalanceSummary,
  ExpenseCategory,
  ExpenseParticipantBase,
  ExpenseWithCreator,
  Group,
  GroupDetail,
  Plan,
  TotalsBalanceSummary,
  User,
} from './api';

export type ActiveTab = 'dashboard' | 'friends' | 'groups' | 'activity' | 'preplanning';
export type AppTab = ActiveTab;
export type AuthView = 'login' | 'signup';
export type PreplanningView = 'dashboard' | 'create' | 'detail' | 'insights';

export type SplitMethod = 'equal' | 'unequal' | 'percentage';
export type ItemSplitMethod = 'equal' | 'unequal' | 'shares';
export type ExpenseStep = 'add' | 'friends' | 'split' | 'review-receipt' | 'itemized-split';
export type ExpenseEntryMode = 'manual' | 'scan';

export type BooleanById = Record<number, boolean>;
export type StringById = Record<number, string>;
export type NumberById = Record<number, number>;

export interface SelectedExpenseContext {
  expense: ExpenseWithCreator;
  from: 'activity' | 'group' | 'preplanning';
  groupName?: string;
  planName?: string;
}

export type ExpenseSelectionContext = SelectedExpenseContext;

export interface SettleUpContext {
  payerId: number;
  payeeId: number;
  amount?: number | null;
  maxAmount?: number | null;
  groupId?: number | null;
}

export interface AppDataProps {
  users: User[];
  groups: GroupDetail[];
  currentUserId: number;
}

export interface DashboardProps extends AppDataProps {
  balances: TotalsBalanceSummary;
  rawBalances: BalanceSummary[];
}

export interface ReceiptLineItem {
  name: string;
  quantity?: number | string;
  price: number | string;
  assignedTo?: number[];
}

export interface ReceiptReviewData {
  items: ReceiptLineItem[];
  description?: string;
  subtotal?: number | string;
  discount?: number | string | null;
  tax?: number | string | null;
  tip?: number | string | null;
  total: number | string;
  totalAmount?: number;
  category?: ExpenseCategory;
  confidence?: number;
  date?: string | null;
  is_receipt?: boolean;
}

export interface ReceiptScanResponse {
  image_url: string;
  data: ReceiptReviewData;
}

export interface ExpenseActivity {
  id: string;
  type: 'expense';
  date: Date;
  user_id: number;
  userName: string;
  action: string;
  item: string;
  groupName?: string;
  net: number;
  icon: string;
  timeAgo: string;
  badgeColor: string;
  expenseObj: ExpenseWithCreator;
}

export interface SettlementActivity {
  id: string;
  type: 'settlement';
  date: Date;
  user_id: number;
  userName: string;
  action: string;
  item?: string;
  groupName?: string;
  amount: number;
  icon: string;
  timeAgo: string;
  badgeColor: string;
}

export interface GroupInviteActivity {
  id: string;
  type: 'group_invite';
  date: Date;
  user_id: number;
  userName: string;
  action: string;
  item?: string;
  icon: string;
  timeAgo: string;
  badgeColor: string;
}

export type ActivityItem = ExpenseActivity | SettlementActivity | GroupInviteActivity;

export type AddExpenseContextGroup = GroupDetail;

export interface AddExpenseProps extends AppDataProps {
  groupCtx: GroupDetail | null;
  planCtx: Plan | null;
  onClose: () => void;
  onSave: () => void;
}

export interface SettlementProps extends AppDataProps {
  defaultPayerId?: number | null;
  defaultPayeeId?: number | null;
  defaultAmount?: number | null;
  defaultMaxAmount?: number | null;
  defaultGroupId?: number | null;
  onClose: () => void;
  onSave: () => void;
}

export interface PlanNavigationProps {
  onNavigate: (view: PreplanningView, planId?: number | null) => void;
}

export type AddExpenseSavedParticipants = ExpenseParticipantBase[];

export interface GroupWithOptionalAvatar extends Group {
  avatar_url?: string | null;
  members?: User[];
}
