
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