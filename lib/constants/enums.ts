export const USER_STATUS = {
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  DELETED: "DELETED",
} as const;
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const ROLE_KIND = {
  SYSTEM: "SYSTEM",
  CUSTOM: "CUSTOM",
} as const;
export type RoleKind = (typeof ROLE_KIND)[keyof typeof ROLE_KIND];

export const ROLE_KEY = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;
export type RoleKey = (typeof ROLE_KEY)[keyof typeof ROLE_KEY];

export const MEMBERSHIP_STATUS = {
  ACTIVE: "ACTIVE",
  PENDING: "PENDING",
  SUSPENDED: "SUSPENDED",
  LEFT: "LEFT",
} as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];

export const INVITATION_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

export const EXPENSE_CATEGORY_STATUS = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type ExpenseCategoryStatus = (typeof EXPENSE_CATEGORY_STATUS)[keyof typeof EXPENSE_CATEGORY_STATUS];

export const DISTRIBUTION_METHOD = {
  EQUAL: "EQUAL",
  MEAL_BASED: "MEAL_BASED",
  SELECTED_MEMBERS: "SELECTED_MEMBERS",
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
  INDIVIDUAL: "INDIVIDUAL",
} as const;
export type DistributionMethod = (typeof DISTRIBUTION_METHOD)[keyof typeof DISTRIBUTION_METHOD];

export const EXPENSE_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  VOIDED: "VOIDED",
} as const;
export type ExpenseStatus = (typeof EXPENSE_STATUS)[keyof typeof EXPENSE_STATUS];

export const MEAL_ENTRY_STATUS = {
  CONSUMED: "CONSUMED",
  NOT_CONSUMED: "NOT_CONSUMED",
  AWAY: "AWAY",
  CANCELLED: "CANCELLED",
  ADJUSTED: "ADJUSTED",
} as const;
export type MealEntryStatus = (typeof MEAL_ENTRY_STATUS)[keyof typeof MEAL_ENTRY_STATUS];

export const MEAL_DAY_STATUS = {
  ACTIVE: "ACTIVE",
  CANCELLED: "CANCELLED",
  UNAVAILABLE: "UNAVAILABLE",
} as const;
export type MealDayStatus = (typeof MEAL_DAY_STATUS)[keyof typeof MEAL_DAY_STATUS];

export const PAYMENT_TYPE = {
  CONTRIBUTION: "CONTRIBUTION",
  ADVANCE: "ADVANCE",
  SETTLEMENT_PAYMENT: "SETTLEMENT_PAYMENT",
  REFUND: "REFUND",
  CREDIT: "CREDIT",
} as const;
export type PaymentType = (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE];

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  VOIDED: "VOIDED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const ADJUSTMENT_TYPE = {
  CREDIT: "CREDIT",
  DEBIT: "DEBIT",
} as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPE)[keyof typeof ADJUSTMENT_TYPE];

export const ADJUSTMENT_STATUS = {
  ACTIVE: "ACTIVE",
  VOIDED: "VOIDED",
} as const;
export type AdjustmentStatus = (typeof ADJUSTMENT_STATUS)[keyof typeof ADJUSTMENT_STATUS];

export const MONTHLY_CYCLE_STATUS = {
  OPEN: "OPEN",
  CALCULATING: "CALCULATING",
  FINALIZED: "FINALIZED",
  CLOSED: "CLOSED",
} as const;
export type MonthlyCycleStatus = (typeof MONTHLY_CYCLE_STATUS)[keyof typeof MONTHLY_CYCLE_STATUS];

export const SETTLEMENT_STATUS = {
  PENDING: "PENDING",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  COMPLETED: "COMPLETED",
} as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUS)[keyof typeof SETTLEMENT_STATUS];

export const SETTLEMENT_TRANSACTION_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
} as const;
export type SettlementTransactionStatus = (typeof SETTLEMENT_TRANSACTION_STATUS)[keyof typeof SETTLEMENT_TRANSACTION_STATUS];

export const SUBSCRIPTION_STATUS = {
  TRIALING: "TRIALING",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
} as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const MEAL_WEIGHT_MODE = {
  PERCENTAGE_OF_100: "PERCENTAGE_OF_100",
} as const;
export type MealWeightMode = (typeof MEAL_WEIGHT_MODE)[keyof typeof MEAL_WEIGHT_MODE];

export const FILE_PURPOSE = {
  RECEIPT: "RECEIPT",
  AVATAR: "AVATAR",
  OTHER: "OTHER",
} as const;
export type FilePurpose = (typeof FILE_PURPOSE)[keyof typeof FILE_PURPOSE];

export const NOTIFICATION_STATUS = {
  UNREAD: "UNREAD",
  READ: "READ",
} as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

export const NOTIFICATION_TYPE = {
  INVITATION: "INVITATION",
  EXPENSE: "EXPENSE",
  MEAL: "MEAL",
  PAYMENT: "PAYMENT",
  ACCOUNTING: "ACCOUNTING",
  SETTLEMENT: "SETTLEMENT",
  SYSTEM: "SYSTEM",
} as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const ORGANIZATION_STATUS = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS];
