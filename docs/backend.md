# MessMate — Backend API (Phase 2)

REST API reference for the MessMate mess-management platform. Builds on the
Phase 1 data layer documented in [`docs/database.md`](./database.md).

## 1. Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, route handlers) |
| Validation | Zod 4 (`lib/schemas/*`, route-level schemas in `lib/api/schemas.ts`) |
| Auth | NextAuth v5 (Credentials + JWT sessions), plus custom register / verify / reset flows |
| Database | MongoDB via Mongoose 9 |
| Tests | Vitest (unit tests for `lib/core/*`) |

## 2. Getting started

```bash
cp .env.example .env        # then fill AUTH_SECRET etc. (or use the committed .env)
yarn install
yarn db:seed --fresh        # seeds demo org + owner (amir@example.com)
yarn dev
```

Environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | dev optional | MongoDB connection string (defaults to `mongodb://127.0.0.1:27017/messmate`; required in production) |
| `AUTH_SECRET` | yes | JWT/session secret. Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | no | Public base URL used in emails / invite links |
| `REQUIRE_EMAIL_VERIFICATION` | no | `"true"` blocks login until `emailVerifiedAt` is set |
| `SMTP_HOST` | no | If set, auth emails are sent via SMTP; otherwise they are logged |

## 3. Conventions

### 3.1 Response envelope

Successful responses are wrapped in a data envelope; failures use an error shape.

```jsonc
// 2xx
{ "success": true, "data": { ... } }

// list responses (when paginated)
{ "success": true, "data": { "items": [], "pagination": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 } } }

// 4xx / 5xx
{ "success": false, "error": { "code": "NOT_FOUND", "message": "...", "details": { } } }
```

### 3.2 HTTP → error mapping

| Situation | Status |
| --- | --- |
| Zod validation failure | `400 VALIDATION_ERROR` (`details` = issues) |
| Business rule violation | `400` with domain code (e.g. `CANNOT_VOID_FINALIZED`) |
| Not authenticated | `401 UNAUTHORIZED` |
| Missing permission | `403 FORBIDDEN` |
| Resource not found | `404 NOT_FOUND` |
| Invalid id format | `400 INVALID_ID` |
| Mongo duplicate key | `409 CONFLICT` |
| Unhandled | `500 INTERNAL_ERROR` |

### 3.3 Money

All amounts are **integer paisa** (see `docs/database.md`). The client converts
taka → paisa before sending; the server never parses decimal money.

### 3.4 Accounting sign convention

- `netBalance > 0` → the member **owes** money.
- `netBalance < 0` → the member **should receive** money.
- Core formula: `netBalance = openingBalance + liability + debits − contributions − credits`.

### 3.5 Routing & authorization

- Route handlers live under `app/api/**/route.ts` and are wrapped by
  `withAuthHandler` / `withOrgHandler` (`lib/api/with-handler.ts`), which resolve
  the session, validate the `{ organizationId }` path param, load the `OrgContext`
  and enforce permission checks via `requirePermission`.
- Permissions are matched to routes by resource (e.g. `members.view`,
  `members.manage`, `meals.create`, `expenses.approve`, `accounting.finalize`,
  `settlement.manage`, `reports.view`, `settings.manage`). The exact check is
  annotated per route below.
- The `activeOrganizationId` switch route (`POST /api/organizations/{id}/switch`)
  sets an `httpOnly` cookie so subsequent `{ organizationId }`-free reads are
  possible from the frontend.

### 3.6 Auth flows

- **Register** (`POST /api/auth/register`) creates the user (+ default org),
  optionally sends a verification email, and returns the user.
- **Login** (`POST /api/auth/login`) delegates to NextAuth `signIn` with
  `redirect: false`; invalid credentials → `401 INVALID_CREDENTIALS`.
- **NextAuth catch-all** (`/api/auth/[...nextauth]`) exposes the standard
  `handlers`; sessions are JWT (`strategy: "jwt"`, 30 days).
- **Verify email** uses a signed JWT (`lib/auth/tokens.ts`); the token doubles
  as the reset token when emailed from the reset flow.
- **Forgot password** always returns success (email enumeration is not leaked).
- **Invitations** (`/api/auth/invitations/accept|reject`) are public and accept
  an `invitationToken` from the invite email.

## 4. Routes

### 4.1 Auth & account

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | public | body: `email`, `password`, `name`, optional `organizationName` |
| `POST` | `/api/auth/login` | public | body: `email`, `password` |
| `POST` | `/api/auth/logout` | public | signs out current session |
| `POST` | `/api/auth/forgot-password` | public | body: `email` |
| `POST` | `/api/auth/reset-password` | public | body: `token`, `password` |
| `POST` | `/api/auth/verify-email` | public | body: `token` |
| `GET/PATCH` | `/api/me` | auth | profile read / update (`name`, `email`) |
| `GET` | `/api/me/organizations` | auth | memberships incl. role + active id |
| `POST` | `/api/auth/invitations/accept` | public | body: `invitationToken` |
| `POST` | `/api/auth/invitations/reject` | public | body: `invitationToken` |

### 4.2 Organizations

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/organizations` | auth | list (paginated) |
| `POST` | `/api/organizations` | auth | create; body: `name`, optional `currency`, `settings` |
| `GET` | `/api/organizations/{organizationId}` | `settings.view` | detail |
| `PATCH` | `/api/organizations/{organizationId}` | `settings.manage` | update settings |
| `DELETE` | `/api/organizations/{organizationId}` | `settings.manage` | archive (soft delete) |
| `POST` | `/api/organizations/{organizationId}/restore` | `settings.manage` | un-archive |
| `POST` | `/api/organizations/{organizationId}/switch` | auth | set active org cookie |

### 4.3 Members, roles & invitations

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/organizations/{id}/members` | `members.view` | paginated; filters: `status`, `roleId`, `q` |
| `GET` | `/api/organizations/{id}/members/{memberId}` | `members.view` | detail + role |
| `PATCH` | `/api/organizations/{id}/members/{memberId}` | `members.manage` | change role |
| `DELETE` | `/api/organizations/{id}/members/{memberId}` | `members.manage` | remove member |
| `PATCH` | `/api/organizations/{id}/members/{memberId}/permissions` | `members.manage` | override role permissions |
| `POST` | `/api/organizations/{id}/members/{memberId}/suspend` | `members.manage` | suspend |
| `POST` | `/api/organizations/{id}/members/{memberId}/restore` | `members.manage` | re-activate |
| `GET` | `/api/organizations/{id}/roles` | `settings.view` | list roles |
| `POST` | `/api/organizations/{id}/roles` | `settings.manage` | create custom role |
| `PATCH` | `/api/organizations/{id}/roles/{roleId}` | `settings.manage` | update role/permissions |
| `GET` | `/api/organizations/{id}/invitations` | `members.view` | list pending |
| `POST` | `/api/organizations/{id}/invitations` | `members.invite` | invite by email |
| `POST` | `/api/organizations/{id}/invitations/{invitationId}/resend` | `members.invite` | re-email |
| `POST` | `/api/organizations/{id}/invitations/{invitationId}/cancel` | `members.invite` | revoke |

### 4.4 Configuration

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| `GET/POST` | `/api/organizations/{id}/expense-categories` | `settings.view`/`settings.manage` | list / create |
| `PATCH` | `/api/organizations/{id}/expense-categories/{categoryId}` | `settings.manage` | rename / isFood / status |
| `DELETE` | `/api/organizations/{id}/expense-categories/{categoryId}` | `settings.manage` | soft delete |
| `POST` | `/api/organizations/{id}/expense-categories/reorder` | `settings.manage` | body: `orderedIds` |
| `POST` | `/api/organizations/{id}/expense-categories/{categoryId}/restore` | `settings.manage` | un-delete |
| `GET/POST` | `/api/organizations/{id}/meal-types` | `settings.view`/`settings.manage` | list / create |
| `PATCH` | `/api/organizations/{id}/meal-types/{mealTypeId}` | `settings.manage` | edit |
| `DELETE` | `/api/organizations/{id}/meal-types/{mealTypeId}` | `settings.manage` | soft delete |
| `POST` | `/api/organizations/{id}/meal-types/reorder` | `settings.manage` | body: `orderedIds` |
| `POST` | `/api/organizations/{id}/meal-types/{mealTypeId}/restore` | `settings.manage` | un-delete |
| `GET/POST` | `/api/organizations/{id}/meal-config` | `meals.view`/`meals.manage` | current effective config / set slice |
| `GET` | `/api/organizations/{id}/meal-config/history` | `meals.view` | past slices |
| `GET` | `/api/organizations/{id}/payment-methods` | `settings.view` | list |
| `POST` | `/api/organizations/{id}/payment-methods` | `settings.manage` | create |
| `PATCH` | `/api/organizations/{id}/payment-methods/{methodId}` | `settings.manage` | rename / active |
| `DELETE` | `/api/organizations/{id}/payment-methods/{methodId}` | `settings.manage` | soft delete |

### 4.5 Meals

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/organizations/{id}/meal-day-status` | `meals.view` | date / meal-type statuses |
| `POST` | `/api/organizations/{id}/meal-day-status` | `meals.manage` | set ACTIVE/CANCELLED |
| `POST` | `/api/organizations/{id}/meal-day-status/clear` | `meals.manage` | clear a date |
| `GET` | `/api/organizations/{id}/meal-entries` | `meals.view` | paginated; `from`/`to`, `memberId`, `status` |
| `POST` | `/api/organizations/{id}/meal-entries` | `meals.create` | mark consumed |
| `POST` | `/api/organizations/{id}/meal-entries/bulk` | `meals.create` | mark many members for a date |
| `POST` | `/api/organizations/{id}/meal-entries/absent` | `meals.create` | mark absent (reason) |
| `POST` | `/api/organizations/{id}/meal-entries/manual` | `meals.edit` | manual add/override + reason |
| `GET/PATCH/DELETE` | `/api/organizations/{id}/meal-entries/{entryId}` | `meals.view`/`meals.edit` | read / update / void (reason) |

### 4.6 Expenses & payments

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/organizations/{id}/expenses` | `expenses.view` | paginated; `from`/`to`, `categoryId`, `method` |
| `POST` | `/api/organizations/{id}/expenses` | `expenses.create` | distribution resolved server-side |
| `POST` | `/api/organizations/{id}/expenses/distribution-preview` | `expenses.view` | preview allocations without saving |
| `GET` | `/api/organizations/{id}/expenses/{expenseId}` | `expenses.view` | detail + allocations |
| `PATCH` | `/api/organizations/{id}/expenses/{expenseId}` | `expenses.edit` | update amount/date/distribution |
| `DELETE` | `/api/organizations/{id}/expenses/{expenseId}` | `expenses.delete` | void (reason) |
| `POST` | `/api/organizations/{id}/expenses/{expenseId}/approve` | `expenses.approve` | mark approved |
| `GET` | `/api/organizations/{id}/payments` | `payments.view` | paginated; `from`/`to`, `type`, `status` |
| `POST` | `/api/organizations/{id}/payments` | `payments.create` | create (contribution/advance/...) |
| `GET` | `/api/organizations/{id}/payments/summary` | `payments.view` | totals by type/status for a period |
| `GET/PATCH/DELETE` | `/api/organizations/{id}/payments/{paymentId}` | `payments.view`/`payments.edit` | read / update / void |

### 4.7 Adjustments

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/organizations/{id}/adjustments` | `reports.view` | list |
| `POST` | `/api/organizations/{id}/adjustments` | `accounting.finalize` | credit/debit entry |
| `GET/PATCH/DELETE` | `/api/organizations/{id}/adjustments/{adjustmentId}` | `reports.view`/`accounting.finalize` | read / update / void |

### 4.8 Monthly cycles

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/organizations/{id}/monthly-cycles` | `reports.view` | list; `periodKey` filter |
| `GET` | `/api/organizations/{id}/monthly-cycles/current` | `reports.view` | ongoing cycle (auto-creates) |
| `GET` | `/api/organizations/{id}/monthly-cycles/period?periodKey=` | `reports.view` | cycle for a period, falls back to current |
| `GET` | `/api/organizations/{id}/monthly-cycles/{cycleId}` | `reports.view` | detail + member summaries |
| `POST` | `/api/organizations/{id}/monthly-cycles/{cycleId}/calculate` | `accounting.finalize` | run the accounting engine |
| `POST` | `/api/organizations/{id}/monthly-cycles/{cycleId}/finalize` | `accounting.finalize` | lock cycle + roll opening balances |
| `POST` | `/api/organizations/{id}/monthly-cycles/{cycleId}/close` | `accounting.close` | close cycle (blocked if unsettled) |

### 4.9 Settlements

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/organizations/{id}/settlements` | `settlement.manage` | list |
| `POST` | `/api/organizations/{id}/settlements` | `settlement.manage` | generate from `cycleId` |
| `GET` | `/api/organizations/{id}/settlements/{settlementId}` | `settlement.manage` | detail + transactions |
| `GET` | `/api/organizations/{id}/settlements/{settlementId}/summary` | `settlement.manage` | per-member owed / received |
| `POST` | `/api/organizations/{id}/settlements/transactions/{transactionId}/paid` | `settlement.manage` | mark transfer done |
| `POST` | `/api/organizations/{id}/settlements/transactions/{transactionId}/unpaid` | `settlement.manage` | revert to pending |

### 4.10 Reports

All under `/api/organizations/{id}/reports/*`, permission `reports.view`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `…/reports/dashboard` | headless overview: balances, meal units, totals |
| `GET` | `…/reports/monthly-summary?periodKey=` | summary for a period |
| `GET` | `…/reports/expense-category-totals?periodKey=` | totals per category |
| `GET` | `…/reports/expense-breakdown?periodKey=&page=&limit=&categoryId=` | paginated per-expense list for a period |
| `GET` | `…/reports/member-totals?periodKey=` | live per-member charged vs paid (independent of finalization) |
| `GET` | `…/reports/meal-analytics?periodKey=&memberId=` | per-member meal stats |
| `GET` | `…/reports/payment-summary?periodKey=` | payment totals |
| `GET` | `…/reports/settlement-summary?periodKey=` | settlement state |
| `GET` | `…/reports/historical-comparison?periodKey=` | current vs previous period totals + deltas |

### 4.11 Audit log

`GET /api/organizations/{id}/audit-logs` (permission `reports.view`) — paginated
organization audit trail with optional `entityType`, `entityId`, `action`,
`actorUserId`, `from`, `to` filters. `actorUserId` is populated with the actor's
`name`/`email`.

Audit events are written fire-and-forget by the services (they never fail the
triggering operation) for:

| Action | Trigger |
| --- | --- |
| `expense.create` / `expense.update` / `expense.void` / `expense.approve` | expense lifecycle |
| `payment.create` / `payment.update` / `payment.void` | payment lifecycle |
| `member.role_changed` / `member.permissions_updated` / `member.suspended` / `member.removed` / `member.restored` | membership changes |
| `meal_type.*` (create/update/archive/restore/reorder) | meal-type changes |
| `meal_config.changed` | meal-weight config changes |
| `cycle.calculated` / `cycle.finalized` / `cycle.closed` | monthly accounting lifecycle |
| `settlement.generated` / `settlement_transaction.paid` / `settlement_transaction.unpaid` | settlement lifecycle |

## 5. Accounting engine

The pure calculation core lives in `lib/core/` and is fully unit-tested:

- `period.ts` — `YYYY-MM` period keys, `accountingPeriodStartDay` (1–28), inclusive-start / exclusive-end ranges.
- `meal-units.ts` — consumes only `CONSUMED`/`ADJUSTED` entries; respects weight
  history and cancelled meal days; reports entries without a config slice as `unresolved`.
- `rounding.ts` — largest-remainder integer allocation; allocations always sum exactly to the total.
- `distribution.ts` — EQUAL, MEAL_BASED, SELECTED_MEMBERS, PERCENTAGE, FIXED_AMOUNT, INDIVIDUAL.
- `accounting.ts` — deterministic monthly balances with the sign convention in §3.4;
  any residual (sum of balances ≠ 0) is absorbed into the member with the largest
  `|balance|` and recorded as `roundingAdjustment` so settlement books always balance.
- `settlement.ts` — minimal greedy two-pointer transfer plan; throws if books are unbalanced.

## 6. Tests

```bash
yarn test        # vitest run — 65 unit tests across lib/core
yarn typecheck   # tsc --noEmit (includes tests)
yarn lint        # eslint
yarn build       # production build (all API routes registered)
```

## 7. Known limitations

- Day boundaries are UTC-based; timezone-aware periods are not yet supported.
- Email delivery requires `SMTP_HOST`; otherwise emails are logged to the server console.
