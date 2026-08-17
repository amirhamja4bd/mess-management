/**
 * Response shapes returned by the MessMate API. Money values are integer
 * paisa; dates are ISO strings; ObjectIds are 24-char strings. Populated
 * references appear as nested objects (with `_id`).
 */

export interface Expense {
  _id: string;
  organizationId: string;
  categoryId: { _id: string; name: string; isFood?: boolean } | string;
  description: string;
  amount: number;
  expenseDate: string;
  paidByMemberId: { _id: string; userId?: { _id: string; name: string; email?: string } } | string;
  distribution: {
    method: string;
    details?: string;
    participants: Array<{ organizationMemberId: string; percent?: number; amount?: number }>;
  };
  items: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    total?: number;
    category?: string;
    notes?: string;
  }>;
  status: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  voidedAt?: string | null;
  voidedById?: string | null;
  voidReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Member {
  _id: string;
  organizationId: string;
  userId: { _id: string; name: string; email: string; avatarUrl?: string | null } | string;
  roleKey: string;
  roleId?: { _id: string; name: string } | string | null;
  permissions: string[];
  status: string;
  joinedAt: string;
  leftAt?: string | null;
}

export interface Invitation {
  _id: string;
  email: string;
  roleKey: string;
  status: string;
  message?: string;
  expiresAt?: string;
  invitedByUserId?: { _id: string; name: string } | string;
  createdAt?: string;
}

export interface Payment {
  _id: string;
  organizationMemberId: { _id: string; userId?: { _id: string; name: string } } | string;
  amount: number;
  paymentDate: string;
  methodId?: string | null;
  methodName?: string;
  type: string;
  status: string;
  reference?: string;
  notes?: string;
  createdAt?: string;
}

export interface Adjustment {
  _id: string;
  organizationMemberId: { _id: string; userId?: { _id: string; name: string } } | string;
  amount: number;
  adjustmentDate: string;
  type: string;
  reason?: string;
  status: string;
  createdAt?: string;
}

export interface MonthlyCycle {
  _id: string;
  organizationId: string;
  periodKey: string;
  startDate: string;
  endDate: string;
  status: string;
  totals: {
    totalExpense: number;
    foodExpense: number;
    commonExpense: number;
    individualExpense: number;
    totalPayments: number;
    totalAdjustments: number;
    totalSettlement: number;
    roundingAdjustment: number;
  };
  snapshot?: {
    mealConfig: Array<{ mealTypeId: string; name: string; weight: number }>;
    categories: Array<{ categoryId: string; name: string; isFood: boolean }>;
    paymentMethods: Array<{ methodId: string; name: string }>;
    members: Array<{ memberId: string; userId: string; name: string }>;
  };
  calculatedAt?: string | null;
  finalizedAt?: string | null;
  closedAt?: string | null;
  createdAt?: string;
}

export interface MemberMonthlySummary {
  _id: string;
  organizationMemberId:
    | string
    | { _id: string; userId?: { _id: string; name: string; email?: string } };
  totals: {
    foodShare: number;
    commonShare: number;
    individualShare: number;
    otherLiability: number;
    totalLiability: number;
    totalPaid: number;
    totalCredit: number;
    applicableAdvance: number;
    netBalance: number;
    roundingAdjustment: number;
  };
  mealStats?: Array<{ mealTypeId: string; name: string; weight: number; count: number; units: number }>;
  paymentStats?: {
    totalContribution: number;
    totalAdvance: number;
    totalSettlementPaid: number;
    totalRefund: number;
  };
}

export interface Settlement {
  _id: string;
  cycleId: { _id: string; periodKey?: string } | string;
  status: string;
  totalOwed: number;
  totalReceivable: number;
  generatedAt: string;
  completedAt?: string | null;
  notes?: string;
}

export interface SettlementTransaction {
  _id: string;
  settlementId: string;
  fromMemberId: { _id: string; userId?: { _id: string; name: string } } | string;
  toMemberId: { _id: string; userId?: { _id: string; name: string } } | string;
  amount: number;
  status: string;
  paidAt?: string | null;
}

export interface MealEntry {
  _id: string;
  organizationMemberId: { _id: string; userId?: { _id: string; name: string } } | string;
  mealTypeId: { _id: string; name: string } | string;
  date: string;
  status: string;
  overrideReason?: string;
}

export interface MealType {
  _id: string;
  name: string;
  sortOrder: number;
  status: "ACTIVE" | "ARCHIVED";
  archivedAt?: string | null;
}

export interface ExpenseCategory {
  _id: string;
  name: string;
  isFood: boolean;
  color?: string;
  icon?: string;
  sortOrder: number;
  status: "ACTIVE" | "ARCHIVED";
  archivedAt?: string | null;
}

export interface PaymentMethod {
  _id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Role {
  _id: string;
  key: string;
  name: string;
  kind: string;
  permissions: string[];
  isActive: boolean;
}

export interface DashboardReport {
  periodKey: string;
  cycleStatus: string | null;
  totals: {
    totalExpense: number;
    expenseCount: number;
    totalPayments: number;
    paymentCount: number;
    totalAdjustments: number;
    adjustmentCount: number;
  };
  topBalances: Array<{ organizationMemberId: string; netBalance: number }>;
  recentExpenses: Expense[];
}

export interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: unknown;
  actorUserId: { _id: string; name: string; email?: string } | string;
  createdAt: string;
}

export interface ExpenseCategoryTotalsReport {
  periodKey: string;
  items: Array<{ categoryId: string; name: string; isFood: boolean; total: number }>;
  grandTotal: number;
  breakdown: Array<{ categoryId: string; name: string; isFood: boolean; total: number; percent: number }>;
}

export interface MealAnalyticsReport {
  periodKey: string;
  totals: { entries: number; consumed: number; notConsumed: number };
  byMealType: Array<{ mealTypeId: string; name: string; count: number; cancelled: number; consumed: number }>;
  byMember: Array<{ organizationMemberId: string; name: string; count: number }>;
}

export interface PaymentSummaryReport {
  periodKey: string;
  totals: { total: number; contribution: number; advance: number; settlement: number; refund: number };
  byMember: Array<{ organizationMemberId: string; name: string; total: number; count: number }>;
}

export interface SettlementSummaryReport {
  periodKey: string;
  settlement: Settlement | null;
  transactions: SettlementTransaction[];
}

export interface ExpenseBreakdownItem {
  _id: string;
  categoryId: string;
  categoryName: string;
  isFood: boolean;
  description: string;
  amount: number;
  expenseDate: string;
  paidByMemberId: string;
  paidByName: string;
  distributionMethod: string;
  status: string;
}

export interface ExpenseBreakdownReport {
  periodKey: string;
  totals: { totalExpense: number; count: number };
  items: ExpenseBreakdownItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface MemberTotalsReport {
  periodKey: string;
  members: Array<{
    organizationMemberId: string;
    name: string;
    foodShare: number;
    commonShare: number;
    individualShare: number;
    totalCharged: number;
    expenseCount: number;
    totalPaid: number;
    paymentCount: number;
    balance: number;
  }>;
}

export interface HistoricalComparisonReport {
  current: {
    periodKey: string;
    totalExpense: number;
    foodExpense: number;
    commonExpense: number;
    individualExpense: number;
    totalPayments: number;
    totalAdjustments: number;
    mealEntries: number;
    mealUnits: number;
    memberCount: number;
  };
  previous: {
    periodKey: string;
    totalExpense: number;
    foodExpense: number;
    commonExpense: number;
    individualExpense: number;
    totalPayments: number;
    totalAdjustments: number;
    mealEntries: number;
    mealUnits: number;
    memberCount: number;
  };
  deltas: {
    totalExpense: number;
    foodExpense: number;
    commonExpense: number;
    individualExpense: number;
    totalPayments: number;
    totalAdjustments: number;
    mealEntries: number;
    mealUnits: number;
  };
}
