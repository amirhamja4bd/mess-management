
````markdown
# MessMate — Cursor AI Implementation Instructions

## Project Name

MessMate — Shared Living Expense & Meal Management SaaS

---

# 0. PROJECT CONTEXT

MessMate is a multi-tenant SaaS platform for managing shared living expenses, meals, bills, payments, monthly accounting, and settlement.

The application is designed for:

- Bachelor mess
- Student mess
- Hostel
- Shared apartment
- Roommates
- Shared flat
- Other shared households

The core problem is that people living together need to manage:

- House rent
- Electricity
- Water
- WiFi
- Gas
- Garbage
- Cooking staff
- Grocery/bazar
- Other shared services
- Different meal schedules
- Different meal consumption
- Member contributions
- Advance payments
- Monthly balances
- Final settlement

The system must automatically calculate:

> Who owes money, who should receive money, how much each member consumed, how much each member paid, and the final monthly settlement.

---

# 1. CRITICAL PRODUCT PRINCIPLE

## NOTHING IMPORTANT SHOULD BE HARDCODED.

This is a mandatory requirement.

Do NOT hard-code business concepts such as:

- Breakfast
- Lunch
- Dinner
- Rent
- Electricity
- Water
- WiFi
- Gas
- Bazar
- Cooking
- Fixed roles
- Fixed distribution rules
- Fixed meal percentages
- Fixed payment methods

These should be configurable.

The application must support different organizations having completely different rules.

---

# 2. TECHNOLOGY STACK

Use the following stack unless the existing project already contains an equivalent implementation that should be preserved.

## Frontend

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui
- Responsive/mobile-first UI

## Backend

Use Next.js backend capabilities unless the existing project explicitly requires a separate backend.

Preferred:

- Next.js Route Handlers
- Server Actions where appropriate
- Service layer
- Repository/data-access layer where useful

## Database

- MongoDB

## ODM

- Mongoose

## Validation

- Zod

## Charts

- Recharts

## Authentication

Use a secure, production-ready authentication solution compatible with Next.js and MongoDB.

Do NOT implement insecure custom authentication.

---

# 3. ARCHITECTURAL PRINCIPLES

Follow:

```text
UI
 ↓
API / Server Actions
 ↓
Service Layer
 ↓
Business / Domain Logic
 ↓
Repository / Mongoose
 ↓
MongoDB
````

Business calculation logic MUST NOT depend on React components.

The monthly calculation engine MUST be testable independently.

Do not put large business calculations directly inside route handlers.

---

# 4. MULTI-TENANT MODEL

The application is SaaS and must support multiple organizations.

Use:

```text
User
Organization
OrganizationMember
```

A user can belong to multiple organizations.

Example:

```text
Amir
│
├── Mirpur Mess
│   └── OWNER
│
├── Dhanmondi Flat
│   └── ADMIN
│
└── University Mess
    └── MEMBER
```

Every organization-owned business record must contain:

```text
organizationId
```

Examples:

```text
Expense.organizationId
MealType.organizationId
MealEntry.organizationId
Payment.organizationId
MonthlyCycle.organizationId
Settlement.organizationId
```

Never trust organizationId coming from the client.

The server must verify that the authenticated user belongs to that organization and has permission to perform the requested action.

---

# 5. USER ROLES

Minimum roles:

## OWNER

Full organization control.

Can:

* Manage organization
* Manage admins
* Manage members
* Manage roles/permissions
* Manage settings
* Manage expenses
* Manage meals
* Manage payments
* Finalize monthly accounting
* Close month
* Manage subscription
* Delete/archive organization

## ADMIN

Permissions should be configurable.

Possible permissions:

```text
members.view
members.invite
members.manage

expenses.view
expenses.create
expenses.edit
expenses.delete
expenses.approve

meals.view
meals.create
meals.edit
meals.manage

payments.view
payments.create
payments.edit

reports.view
reports.export

settings.view
settings.manage
```

## MEMBER

Default member capabilities:

* View permitted organization data
* Add allowed expenses
* Mark meals
* Add payments if permitted
* View own balance
* View reports according to permission

Do not assume every organization must use exactly these permissions forever.

The permission system must be extensible.

---

# 6. DYNAMIC REQUIREMENTS

The following MUST be dynamic per organization.

## 6.1 Expense Categories

Examples only:

```text
Rent
Electricity
Water
WiFi
Gas
Garbage
Cooking
Grocery
Cleaning
Maintenance
Generator
Newspaper
Others
```

These are NOT fixed system categories.

Organization Admin can:

* Create
* Edit
* Archive
* Restore
* Reorder

Categories with historical transactions should normally be archived instead of physically deleted.

---

# 7. DYNAMIC MEAL SYSTEM

Meal types MUST NOT be hard-coded.

Organization A:

```text
Breakfast
Dinner
```

Organization B:

```text
Breakfast
Lunch
Dinner
```

Organization C:

```text
Lunch
Dinner
```

Organization D:

```text
Breakfast
Brunch
Lunch
Snacks
Dinner
Late Night Meal
```

All of these must work without changing application code.

---

# 8. DYNAMIC MEAL WEIGHTS

Each organization configures meal weights.

Example:

```text
Breakfast = 40%
Dinner = 60%
```

Another:

```text
Breakfast = 20%
Lunch = 40%
Dinner = 40%
```

Another:

```text
Lunch = 50%
Dinner = 50%
```

The system must validate configured weights according to the selected calculation rule.

Default meal-weight mode:

```text
Total = 100%
```

Do not hard-code 40/40/20.

---

# 9. DYNAMIC DISTRIBUTION METHODS

Expenses must support configurable distribution methods.

Minimum methods:

### EQUAL

Example:

```text
Expense = 20,000
Members = 4

Each = 5,000
```

### MEAL_BASED

Food expenses can be distributed based on meal consumption.

### SELECTED_MEMBERS

Only selected members participate.

### PERCENTAGE

Example:

```text
Amir = 30%
Rahim = 20%
Karim = 25%
Sakib = 25%
```

Must validate total = 100%.

### FIXED_AMOUNT

Example:

```text
Amir = 2,000
Rahim = 3,000
Karim = 2,500
Sakib = 2,500
```

Must validate total = expense amount.

### INDIVIDUAL

Entire expense belongs to one member.

The architecture should allow future distribution strategies.

---

# 10. MEAL ATTENDANCE

Daily meal tracking must be dynamic.

Example organization:

```text
Breakfast
Dinner
```

August 16:

```text
             Breakfast   Dinner
Amir             ✓          ✓
Rahim            ✕          ✓
Karim            ✓          ✕
Sakib            ✕          ✕
```

If:

```text
Breakfast = 40%
Dinner = 60%
```

Then:

```text
Amir = 1.00
Rahim = 0.60
Karim = 0.40
Sakib = 0.00
```

The system must calculate meal units based on configured meal weights.

---

# 11. MEAL OVERRIDE

The organization must be able to handle special days.

Examples:

* Breakfast cancelled
* Kitchen closed
* Everyone ate outside
* Special event
* Member away
* Meal unavailable

Example:

```text
August 16
Breakfast
Status = CANCELLED
Reason = Kitchen closed
```

Do not delete the configured meal type.

The cancellation applies only to the relevant date/period.

---

# 12. GROCERY / BAZAR

Support detailed grocery entries.

Example:

```text
Rice        25 kg    2,400
Oil          5 L       850
Vegetables             560
Chicken                900
----------------------------
Total                  4,710
```

Each grocery item may have:

* Name
* Quantity
* Unit
* Unit price
* Total
* Category
* Purchased by
* Date
* Notes

Receipt support should be designed for future implementation.

---

# 13. PAYMENTS

Members can record payments/contributions.

Payment should support:

* Member
* Organization
* Amount
* Date
* Payment method
* Reference
* Notes

Payment methods should be configurable.

Examples:

```text
Cash
bKash
Nagad
Bank
Other
```

Do not hard-code the payment method list.

---

# 14. ADVANCE PAYMENT

Support member advances.

Example:

```text
Amir paid advance = 10,000
```

The system must distinguish:

* Expense paid on behalf of organization
* Member contribution
* Advance
* Settlement payment
* Refund/credit

Do not mix these concepts in one generic field.

---

# 15. MONTHLY ACCOUNTING

The system works with accounting periods.

Example:

```text
August 2026
```

A monthly cycle contains:

* Expenses
* Meals
* Payments
* Adjustments
* Member summaries
* Settlement

Possible states:

```text
OPEN
CALCULATING
FINALIZED
CLOSED
```

Closed periods should not normally be editable.

---

# 16. CALCULATION ENGINE

THIS IS THE MOST IMPORTANT BUSINESS COMPONENT.

Build a dedicated calculation service.

Do NOT implement this directly inside React components.

Recommended concept:

```ts
calculateMonthlyAccounting({
  organizationId,
  periodId,
})
```

The calculation engine should calculate:

```text
Food Share
+
Common Expense Share
+
Individual Expense Share
+
Other Liability
-
Credits
-
Applicable Advances
-
Payments
=
Net Balance
```

The exact accounting rules must be explicit and testable.

---

# 17. FOOD CALCULATION

Example:

```text
Total Food Expense = 30,000

Amir meal units = 25
Rahim meal units = 20
Karim meal units = 15

Total units = 60
```

Calculation:

```text
Amir = 25 / 60 × 30,000
Rahim = 20 / 60 × 30,000
Karim = 15 / 60 × 30,000
```

Use deterministic rounding.

Never allow floating-point inconsistencies to create unexplained balance differences.

---

# 18. MEMBER BALANCE

For every member calculate:

```text
Total Liability
Total Paid
Total Credit
Total Applicable Advance
Net Balance
```

Standardize the interpretation:

```text
Positive balance = Member needs to pay
Negative balance = Member should receive
Zero = Settled
```

Document the sign convention in code and tests.

---

# 19. SETTLEMENT ENGINE

The system should generate simplified transactions.

Example:

```text
Amir should receive 3,500
Rahim should pay 2,000
Karim should pay 1,500
```

Generate:

```text
Rahim → Amir = 2,000
Karim → Amir = 1,500
```

Try to minimize unnecessary transactions.

Settlement generation must be deterministic.

---

# 20. HISTORICAL DATA

Never allow configuration changes to silently corrupt historical accounting.

Examples:

If August uses:

```text
Breakfast = 40%
Dinner = 60%
```

and September changes to:

```text
Breakfast = 30%
Dinner = 70%
```

August must continue using its historical configuration.

Use effective dates, period snapshots, or equivalent historical-safe design.

Same principle applies to:

* Meal types
* Meal weights
* Expense categories
* Distribution rules
* Member membership dates

---

# 21. MEMBER JOIN / LEAVE

Handle:

### Mid-month join

Member should only be included from the applicable effective date unless explicitly overridden.

### Mid-month leave

Member should only be liable for applicable dates/expenses.

Membership must have:

```text
joinedAt
leftAt / endedAt
status
```

---

# 22. SOFT DELETE / ARCHIVE

Financial data should not normally be hard deleted.

Prefer:

```text
isActive
archivedAt
deletedAt
```

or equivalent.

Historical records must remain auditable.

---

# ============================================================

# PHASE 1 — DATABASE DESIGN & MONGOOSE

# ============================================================

# CURSOR PROMPT 1

You are responsible ONLY for Phase 1: database architecture and Mongoose implementation.

Do NOT start frontend implementation.

Do NOT build polished UI.

Do NOT implement unrelated features.

First inspect the existing project structure and understand the current codebase.

Before modifying files:

1. Inspect package.json.
2. Inspect existing src/app structure.
3. Inspect existing database setup.
4. Inspect existing authentication if present.
5. Inspect environment configuration.
6. Identify existing reusable utilities.
7. Do not overwrite working code unnecessarily.

Then design the database based on the requirements in this README.

---

## Phase 1 Goals

Implement a production-ready MongoDB/Mongoose data layer for:

* Users
* Organizations
* Organization memberships
* Invitations
* Roles
* Permissions
* Expense categories
* Expenses
* Expense participants/distributions
* Meal types
* Meal configuration/history
* Meal entries
* Payments
* Adjustments
* Monthly accounting cycles
* Monthly member summaries
* Settlements
* Settlement transactions
* Audit logs
* Notifications
* Files/receipts where appropriate
* Subscription-ready structure if required by architecture

Do not over-engineer features that are not required for MVP.

---

## Phase 1 Mandatory Requirements

### 1. Multi-tenancy

Every organization-owned model must support organization isolation.

### 2. Relationships

Clearly model:

```text
User
Organization
OrganizationMember
```

and all business relationships.

### 3. Dynamic Configuration

Do not hard-code:

* Meal types
* Meal weights
* Expense categories
* Payment methods
* Distribution methods

Distribution methods may use a controlled enum for algorithm selection, but the business rules must remain extensible.

### 4. Historical Integrity

Design for:

* Effective dates
* Monthly snapshots
* Archived categories
* Archived meal types
* Membership periods

### 5. Indexes

Create appropriate MongoDB indexes for:

* organizationId
* organizationId + date
* organizationId + memberId
* organizationId + periodId
* email
* invitation token/hash
* other high-frequency queries

Do not create unnecessary indexes.

### 6. Validation

Use Mongoose validation and/or Zod at the application boundary.

Validate:

* Positive monetary amounts
* Percentages
* Fixed distribution totals
* Required organization membership
* Valid dates
* Valid references

### 7. Monetary Values

Avoid unsafe floating-point money calculations.

Choose and document a consistent representation.

For BDT, integer minor units such as paisa can be considered.

Example:

```text
৳100.50
=
10050 paisa
```

Use the chosen strategy consistently.

---

## Phase 1 Deliverables

Create/update:

```text
models/
lib/db/
schemas/
types/
```

as appropriate for the existing architecture.

Provide:

1. Mongoose models.
2. Types/interfaces.
3. Database connection.
4. Index definitions.
5. Validation schemas.
6. Seed/development data where useful.
7. Database documentation.
8. ER/domain relationship documentation.

Do not build the frontend yet.

---

## Phase 1 Verification

Before finishing:

* Run TypeScript checks.
* Run lint.
* Validate model compilation.
* Verify indexes.
* Verify references.
* Verify no circular model import problems.
* Verify MongoDB connection handling.
* Verify multi-tenant fields.
* Verify historical configuration design.

At the end, provide a concise implementation summary and list any assumptions.

---

# ============================================================

# PHASE 2 — COMPLETE BACKEND

# ============================================================

# CURSOR PROMPT 2

Phase 1 database implementation has been completed.

Now implement Phase 2: complete backend/business logic.

DO NOT redesign the frontend.

DO NOT spend time on visual UI.

First inspect the current Phase 1 implementation and reuse it.

Do not rewrite existing working database code without a clear reason.

---

## Phase 2 Goals

Implement the complete backend required for the MVP.

Architecture:

```text
Route Handler / Server Action
        ↓
Authentication
        ↓
Authorization
        ↓
Validation
        ↓
Service
        ↓
Business Logic
        ↓
Mongoose
        ↓
MongoDB
```

---

# Authentication

Implement:

* Sign up
* Login
* Logout
* Session handling
* Email verification if configured
* Forgot password
* Reset password
* Protected routes

Never trust client authentication state.

Server must verify authentication.

---

# Organization Backend

Implement:

* Create organization
* Get organization
* Update organization
* Archive organization
* Get user's organizations
* Switch active organization

When a user creates an organization:

```text
User
+
Organization
+
OrganizationMember(role=OWNER)
```

must be created consistently.

---

# Invitations

Implement:

* Create invitation
* Resend invitation
* Cancel invitation
* Accept invitation
* Reject/expire invitation
* Prevent duplicate active invitations
* Prevent unauthorized invitations

Invitation must be securely generated.

---

# Members

Implement:

* List members
* Get member
* Change role
* Update permissions
* Suspend member
* Remove member
* Restore member if supported

Every operation must check organization membership and permissions.

---

# Expense Categories

Implement:

* Create
* Update
* Archive
* Restore
* Reorder
* List

Do not hard-code category names.

---

# Expenses

Implement:

* Create
* Get
* List
* Update
* Archive
* Filter
* Pagination
* Date range
* Category filtering
* Member filtering
* Distribution preview

Validate distribution rules.

---

# Expense Distribution

Implement service strategies:

```text
EqualDistributionStrategy
MealBasedDistributionStrategy
SelectedMembersDistributionStrategy
PercentageDistributionStrategy
FixedAmountDistributionStrategy
IndividualDistributionStrategy
```

Do not put all calculations in one giant function.

Create an extensible strategy/service architecture.

---

# Meal Types

Implement:

* Create meal type
* Update
* Archive
* Restore
* Reorder
* Configure weight
* Effective date/history

Do not hard-code Breakfast/Lunch/Dinner.

---

# Meal Tracking

Implement:

* Record daily meal
* Bulk record meals
* Update meal
* Remove/void meal record
* View daily meals
* View monthly meals
* Member meal history

Support:

* Consumed
* Not consumed
* Cancelled
* Away
* Manual adjustment

---

# Meal Configuration

Implement validation for meal weights.

Example:

```text
Breakfast = 40
Dinner = 60
```

Must satisfy the organization's configured rule.

Changes must be historical-safe.

---

# Meal Calculation

Build a reusable service:

```ts
calculateMealUnits(...)
```

and:

```ts
calculateFoodDistribution(...)
```

These services must be independently testable.

---

# Payments

Implement:

* Create payment
* List payments
* Update payment
* Void/archive payment
* Payment history
* Member contribution summary

Support configurable payment methods.

---

# Monthly Accounting

Implement:

* Create/open period
* Get current period
* Calculate period
* Recalculate before finalization
* Finalize period
* Close period
* View historical periods

Closed periods must be protected.

---

# Monthly Calculation Engine

Implement a dedicated service:

```ts
calculateMonthlyAccounting()
```

It must:

1. Load applicable members.
2. Load expenses.
3. Resolve distribution rules.
4. Load meal configuration applicable to dates.
5. Calculate meal consumption.
6. Calculate food shares.
7. Calculate common shares.
8. Calculate individual shares.
9. Apply credits.
10. Apply valid payments/advances.
11. Calculate member balances.
12. Generate monthly summaries.
13. Detect rounding differences.
14. Produce deterministic output.

Do not calculate this in the frontend.

---

# Settlement

Implement:

```ts
generateSettlement()
```

Requirements:

* Identify members who owe.
* Identify members who should receive.
* Minimize unnecessary transfers.
* Preserve exact totals after rounding.
* Store generated settlement.
* Allow authorized users to mark transactions as paid.
* Allow settlement status tracking.

---

# Reports Backend

Provide APIs/services for:

* Dashboard summary
* Expense breakdown
* Category totals
* Member totals
* Meal analytics
* Payment summary
* Monthly summary
* Historical comparison
* Settlement summary

Use pagination where appropriate.

---

# Audit Log

Audit:

* Expense changes
* Payment changes
* Member role changes
* Permission changes
* Meal configuration changes
* Monthly finalization
* Month closing
* Settlement changes

---

# Authorization

Every protected endpoint must check:

```text
Authentication
→ Organization membership
→ Role
→ Permission
→ Resource ownership/scope
```

Prevent:

```text
Organization A user
      ↓
Organization B data
```

at every layer.

---

# Backend Error Handling

Create consistent error responses.

Handle:

* Validation errors
* Unauthorized
* Forbidden
* Not found
* Conflict
* Business rule violations
* Database errors

Do not expose sensitive internal errors.

---

# Backend Testing

Write tests for the most important business logic.

Minimum:

### Expense calculation

* Equal
* Meal based
* Percentage
* Fixed amount
* Selected members
* Individual

### Meal calculation

* 2 meals
* 3 meals
* Custom meals
* Different weights
* Cancelled meal
* Mid-month configuration change

### Accounting

* Member joins mid-month
* Member leaves mid-month
* Advance
* Payment
* Refund/credit
* Zero balance
* Positive balance
* Negative balance
* Rounding

### Settlement

Verify total money owed equals total money receivable.

---

# Phase 2 Completion Criteria

The backend is complete when:

* Authentication works.
* Organization creation works.
* Membership works.
* Authorization works.
* Dynamic configuration works.
* Expenses work.
* Meals work.
* Payments work.
* Monthly calculation works.
* Settlement works.
* Reports data is available.
* Historical periods are safe.
* Tests pass.
* TypeScript passes.
* Lint passes.
* No obvious security hole remains.

After completion, document:

* API endpoints.
* Service architecture.
* Business calculation rules.
* Permission rules.
* Known limitations.

Do not start polished frontend implementation in this phase.

---

# ============================================================

# PHASE 3 — FRONTEND DESIGN + BACKEND INTEGRATION

# ============================================================

# CURSOR PROMPT 3

Phase 1 database and Phase 2 backend are complete.

Now implement Phase 3:

> Frontend UI/UX + Backend Integration

Do NOT redesign backend business logic unless a genuine integration issue is discovered.

Use the existing APIs/services.

Before implementation:

1. Inspect the existing frontend.
2. Inspect available APIs.
3. Inspect types.
4. Inspect validation responses.
5. Understand authentication state.
6. Understand organization context.
7. Reuse existing components where appropriate.

---

# UI DESIGN PRINCIPLES

The application should feel like a modern SaaS product.

Design goals:

* Clean
* Professional
* Modern
* Minimal
* Mobile-first
* Fast
* Accessible
* Easy for non-technical users

Use:

* Tailwind CSS
* shadcn/ui
* Appropriate cards
* Tables
* Charts
* Dialogs
* Drawers
* Dropdowns
* Tabs
* Toasts
* Skeleton loaders
* Empty states
* Confirmation dialogs

Avoid excessive visual complexity.

---

# MAIN APPLICATION STRUCTURE

Create:

```text
Dashboard
Organizations/Mess Switcher
Expenses
Bazar
Meals
Payments
Monthly Accounting
Settlements
Reports
Members
Settings
```

---

# ORGANIZATION SWITCHER

If user belongs to multiple organizations:

```text
Mirpur Mess ▼
```

Show:

```text
Mirpur Mess
Dhanmondi Flat
University Mess
+ Create New
```

Changing organization must refresh all organization-specific data.

Never leak data from the previous organization.

---

# DASHBOARD

Show:

```text
Current Month
Total Expense
Food Expense
Common Expense
Total Paid
My Share
My Balance
```

Also show:

* Today's meals
* Recent expenses
* Recent payments
* Pending settlement
* Member balances
* Monthly trend

---

# QUICK ACTIONS

Provide prominent actions:

```text
+ Add Expense
+ Add Bazar
+ Mark Meals
+ Add Payment
```

These should be easy to access on mobile.

---

# EXPENSE UI

Expense list should support:

* Search
* Date filter
* Category filter
* Paid-by filter
* Pagination
* Sort

Expense form:

```text
Category
Description
Amount
Date
Paid By
Distribution Method
Participants
Notes
Receipt
```

Distribution UI must dynamically change based on selected method.

Example:

```text
Equal
→ No additional configuration

Meal Based
→ Meal-related explanation/preview

Selected Members
→ Member selector

Percentage
→ Percentage inputs + 100% validation

Fixed Amount
→ Amount inputs + total validation

Individual
→ Member selector
```

---

# DYNAMIC EXPENSE CATEGORY UI

Settings should allow:

```text
Expense Categories

Rent
Electricity
WiFi
Cooking
Grocery

[+ Add Category]
```

Support:

* Create
* Edit
* Archive
* Restore

Do not assume categories are fixed.

---

# MEAL MANAGEMENT UI

Meal configuration screen:

```text
Meal Types

Breakfast
40%

Dinner
60%

[+ Add Meal Type]
```

Support:

* Add
* Edit
* Archive
* Reorder
* Weight configuration

Do not display hard-coded Breakfast/Lunch/Dinner unless those records actually exist for the current organization.

---

# DAILY MEAL SCREEN

Build a simple mobile-friendly meal matrix.

Example:

```text
August 16

             Breakfast   Dinner
Amir             ✓          ✓
Rahim            ✕          ✓
Karim            ✓          ✕
```

Support:

* Individual marking
* Bulk marking
* Date navigation
* Meal filtering
* Override/cancel
* Member filtering

---

# BAZAR UI

Allow:

```text
Add Bazar
```

Then:

```text
Item
Quantity
Unit
Unit Price
Total
```

Allow multiple items.

Automatically calculate total.

---

# PAYMENT UI

Create:

```text
Add Payment
```

Fields:

```text
Member
Amount
Date
Payment Method
Reference
Notes
```

Payment method options must come from organization configuration.

---

# MONTHLY ACCOUNTING UI

Create a monthly summary page.

Example:

```text
August 2026

Total Expense       ৳58,420
Food                ৳31,200
Common              ৳27,220
Total Collected     ৳55,000
```

Member table:

```text
Member   Share    Paid    Balance
Amir     12,500   15,000  -2,500
Rahim    11,000    8,000   3,000
Karim    10,500   10,500       0
```

Clearly display:

```text
You will receive
```

or:

```text
You need to pay
```

rather than only showing confusing positive/negative numbers.

---

# SETTLEMENT UI

Show:

```text
Settlement

Rahim → Amir
৳2,000

Karim → Amir
৳1,500
```

Allow authorized members/admins to:

```text
Mark as Paid
```

Show settlement status:

```text
Pending
Partially Paid
Completed
```

---

# REPORTS UI

Create charts for:

* Category expenses
* Daily expenses
* Member contributions
* Meal consumption
* Meal cost
* Monthly trend

Use organization-specific dynamic data.

Do not hard-code chart labels or categories.

---

# MEMBERS UI

Show:

* Name
* Role
* Status
* Joined date
* Balance

Actions based on permission:

```text
Invite
Change Role
Manage Permissions
Suspend
Remove
```

---

# SETTINGS UI

Settings should contain:

```text
Organization
Expense Categories
Meal Types
Payment Methods
Distribution Rules
Members
Roles & Permissions
Accounting
Subscription
```

Only show settings that the current user has permission to manage.

---

# RESPONSIVE DESIGN

The application must work well on:

* Desktop
* Laptop
* Tablet
* Mobile

On mobile:

* Use cards instead of huge tables where appropriate.
* Use bottom sheets/drawers.
* Keep quick actions accessible.
* Avoid horizontal overflow.
* Make meal tracking especially easy.

---

# LOADING / ERROR / EMPTY STATES

Every data-driven page must handle:

### Loading

Use skeletons.

### Empty

Example:

```text
No expenses yet.

Start by adding your first expense.
[+ Add Expense]
```

### Error

Show a friendly message and retry option.

### Unauthorized

Show appropriate permission message.

---

# FRONTEND SECURITY

Never rely on hiding buttons for authorization.

Example:

Even if the UI hides:

```text
Delete Expense
```

the backend must still reject unauthorized deletion.

Frontend permission checks are UX only.

Backend authorization is the security boundary.

---

# FRONTEND DATA FLOW

Prefer:

```text
Server Component
      ↓
Server-side data fetching
      ↓
Client Component when interaction is needed
      ↓
API / Server Action
      ↓
Backend Service
```

Avoid unnecessary client-side state duplication.

---

# FRONTEND TYPES

Use shared or generated TypeScript types where practical.

Do not duplicate backend response structures manually across many components.

Handle:

* Loading
* Error
* Null
* Empty
* Permission denied
* Validation errors

---

# FRONTEND COMPLETION CRITERIA

The frontend is complete when:

1. Authentication UI works.
2. Organization onboarding works.
3. Organization switching works.
4. Dashboard works.
5. Dynamic expense categories work.
6. Expense CRUD works.
7. Dynamic meal configuration works.
8. Daily meal tracking works.
9. Bazar works.
10. Payment management works.
11. Monthly accounting works.
12. Settlement works.
13. Reports work.
14. Member management works.
15. Permissions are reflected in UI.
16. Mobile responsive behavior is good.
17. Loading/error/empty states exist.
18. Backend integration is complete.
19. No mock data remains in production flows.
20. TypeScript passes.
21. Lint passes.
22. Build passes.

---

# FINAL DEVELOPMENT RULES

## Rule 1

Do not skip business logic to make UI work.

## Rule 2

Do not hard-code dynamic organization settings.

## Rule 3

Do not trust client-provided organizationId.

## Rule 4

Do not duplicate monthly calculation logic in frontend.

## Rule 5

Do not destructively delete financial history.

## Rule 6

Do not change historical accounting silently.

## Rule 7

Do not implement all features inside one giant file.

## Rule 8

Keep services modular and testable.

## Rule 9

Do not use mock data once the relevant backend exists.

## Rule 10

Do not rewrite existing working code unnecessarily.

## Rule 11

Before creating a new abstraction, inspect whether the project already has one.

## Rule 12

Every major feature must support proper authorization.

## Rule 13

Every organization-specific query must be tenant-scoped.

## Rule 14

Financial calculations must be deterministic and tested.

## Rule 15

Dynamic configuration must be stored in MongoDB, not hard-coded in React/TypeScript.

---

# FINAL PRODUCT FLOW

The complete product should work like this:

```text
Landing Page
      ↓
Sign Up / Login
      ↓
Create Organization
      ↓
User becomes OWNER
      ↓
Configure Organization
      ├── Expense Categories
      ├── Meal Types
      ├── Meal Weights
      └── Payment Methods
      ↓
Invite Members
      ↓
Daily Usage
      ├── Add Expense
      ├── Add Bazar
      ├── Mark Meals
      └── Record Payments
      ↓
Monthly Accounting
      ↓
Calculate Member Shares
      ↓
Calculate Net Balances
      ↓
Generate Settlement
      ↓
Members Pay/Receive
      ↓
Close Month
      ↓
Historical Report
```

---

# IMPORTANT EXECUTION INSTRUCTION FOR CURSOR

When executing any phase:

1. Inspect the current codebase first.
2. Understand existing implementation before modifying it.
3. Create a clear implementation plan.
4. Implement incrementally.
5. Do not randomly modify unrelated files.
6. Do not delete working functionality.
7. Follow the requirements in this README.
8. If a requirement is ambiguous, inspect existing architecture and choose the most maintainable solution.
9. Keep dynamic organization-level configuration in the database.
10. Keep business calculations in services, not UI.
11. Add proper validation.
12. Add authorization checks.
13. Test the implementation.
14. Run type checking.
15. Run lint.
16. Run production build when appropriate.
17. Fix errors before declaring the phase complete.
18. At the end, summarize:

* Files changed
* Features implemented
* Tests performed
* Remaining limitations
* Recommended next step

Do not proceed to the next phase unless the current phase is stable.

---

# PHASE EXECUTION ORDER

Execute ONLY in this order:

```text
PHASE 1
Database Design + Mongoose
        ↓
PHASE 2
Complete Backend + Business Logic + APIs
        ↓
PHASE 3
Frontend UI/UX + Backend Integration
```

Do not skip directly to Phase 3.

The database and backend must be treated as the source of truth for the frontend.

```
