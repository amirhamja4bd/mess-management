# MessMate - Mess Management System

A modern web app for managing shared living expenses, meal tracking, and financial settlements in shared households (messes, hostels, apartments).

## Features

- **Expense Tracking** - Log and split expenses with flexible distribution methods
- **Meal Management** - Track daily meals, mark attendance, manage meal types
- **Payment Processing** - Record contributions and track balances
- **Settlement Resolution** - Generate settlement reports to resolve who owes whom
- **Member Management** - Invite members, assign roles, manage permissions
- **Financial Reports** - View breakdowns by category, member, and time period
- **Multi-Organization** - Support for multiple messes/households per user

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend:** Next.js API Routes, MongoDB with Mongoose
- **Auth:** NextAuth.js with JWT sessions
- **UI Components:** Base UI (Nova style)

## Prerequisites

- **Node.js** 18+ (recommended: 20)
- **Yarn** package manager
- **MongoDB** 6+ with replica set support (required for transactions)

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB connection string (local replica set required for transactions)
MONGODB_URI=mongodb://127.0.0.1:27017/messmate

# Public app URL (for email links, invite links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-secret-here

# Optional: require email verification before login
# REQUIRE_EMAIL_VERIFICATION=true
```

### 3. Start MongoDB with Replica Set

MongoDB transactions require a replica set. For local development:

```bash
# Start mongod with replica set
mongod --port 27017 --dbpath /tmp/messmate-data --replSet messmate_rs

# In another terminal, initialize the replica set
mongosh --port 27017 --eval "rs.initiate({ _id: 'messmate_rs', members: [{ _id: 0, host: 'localhost:27017' }] })"
```

### 4. Start Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use the App

### Step 1: Create Your Account

1. Go to `http://localhost:3000`
2. Click **"Register"** or go to `/register`
3. Enter your name, email, and password
4. Click **"Create account"**

### Step 2: Create Your First Organization

After registering, you'll be redirected to create an organization:

1. Enter your mess/hostel name (e.g., "Sunset Apartments")
2. Click **"Create organization"**
3. You'll become the **Owner** of this organization

### Step 3: Invite Members

1. Go to **Members** from the sidebar
2. Click **"Invite member"**
3. Enter the member's email address
4. Choose their role (Member or Admin)
5. Click **"Send invitation"**
6. They'll receive an email with an invite link

### Step 4: Set Up Expense Categories

1. Go to **Settings** from the sidebar
2. Click the **"Categories"** tab
3. Click **"Add category"** to create expense categories
   - Examples: "Rent", "Groceries", "Utilities", "Maintenance"
4. Mark categories as "Food related" if they should be included in meal cost calculations

### Step 5: Set Up Payment Methods

1. In **Settings**, click the **"Payment Methods"** tab
2. Click **"Add method"** to add payment options
   - Examples: "Cash", "Bank Transfer", "bKash", "Nagad"

### Step 6: Add Expenses

1. Go to **Expenses** from the sidebar
2. Click **"Add expense"**
3. Fill in the details:
   - **Description** - What was purchased (e.g., "Rice 20kg")
   - **Category** - Select the expense category
   - **Date** - When the expense occurred
   - **Paid by** - Who paid for it
   - **Amount** - Total amount in taka
4. Choose a **distribution method**:
   - **Equal** - Split equally among all members
   - **Meal based** - Split based on meal consumption
   - **By category** - Distribute based on category
5. Click **"Save"**

### Step 7: Track Daily Meals

1. Go to **Meals** from the sidebar
2. Use the date picker to select the date
3. For each meal type (Breakfast, Lunch, Dinner):
   - Click **"Mark consumed"** next to each member who ate
   - Use **"All consumed"** to mark everyone ate
   - Use **"All absent"** to mark everyone absent
   - Set day status (Active/Cancelled) if needed

### Step 8: Record Payments

1. Go to **Payments** from the sidebar
2. Click **"Record payment"**
3. Select:
   - **Member** - Who made the payment
   - **Amount** - How much they paid
   - **Method** - How they paid (Cash, Bank Transfer, etc.)
   - **Period** - Which accounting period this payment is for
4. Click **"Save"**

### Step 9: Generate Reports

1. Go to **Reports** from the sidebar
2. Select the time period (month)
3. Browse different tabs:
   - **Overview** - Pie chart of expenses by category
   - **Expenses** - Detailed expense breakdown
   - **Meals** - Meal consumption statistics
   - **Payments** - Payment summary by member
   - **Members** - Individual member balances

### Step 10: Settle Balances

1. Go to **Settlements** from the sidebar
2. Click **"Generate settlement"** for a finalized period
3. Review the settlement summary showing who owes whom
4. Click **"Mark paid"** as members settle their balances
5. Use **"Undo"** if a payment needs to be reversed

## User Roles

### Owner
- Full access to all features
- Can manage organization settings
- Can assign any role to members

### Admin
- Can manage members and invitations
- Can approve/void expenses
- Can manage settings
- Cannot delete the organization

### Member
- Can view expenses and meals
- Can add expenses
- Can track their own meals
- Cannot manage other members or settings

## Common Workflows

### Weekly Mess Routine

1. **Monday**: Update meal types if needed in Settings
2. **Daily**: Mark meal attendance in Meals page
3. **Weekly**: Add expenses in Expenses page
4. **Monthly**: Record payments, generate reports, settle balances

### Adding a New Expense

1. Click "Add expense"
2. Enter description, category, date, and amount
3. Select who paid
4. Choose how to split (usually "Equal" or "Meal based")
5. Save

### Recording a Payment

1. Go to Payments
2. Click "Record payment"
3. Select member, amount, and method
4. Save

### Resolving Balances

1. Go to Settlements
2. Generate settlement for the period
3. Review who owes whom
4. Mark payments as paid as they happen

## API Endpoints

The app provides REST APIs for all features:

- `GET/POST /api/organizations` - List/create organizations
- `GET/POST /api/organizations/[id]/expenses` - List/create expenses
- `GET/POST /api/organizations/[id]/payments` - List/create payments
- `GET/POST /api/organizations/[id]/meal-entries` - List/create meal entries
- `GET/POST /api/organizations/[id]/settlements` - List/create settlements
- `GET/POST /api/organizations/[id]/members` - List members
- `GET/POST /api/organizations/[id]/invitations` - List/create invitations

## Development

### Available Scripts

```bash
yarn dev          # Start development server
yarn build        # Build for production
yarn start        # Start production server
yarn lint         # Run ESLint
yarn typecheck    # Run TypeScript checker
yarn test         # Run tests
```

### Project Structure

```
app/
  (app)/              # Authenticated pages
    dashboard/        # Main dashboard
    expenses/         # Expense management
    meals/            # Meal tracking
    payments/         # Payment recording
    settlements/      # Balance settlements
    reports/          # Financial reports
    members/          # Member management
    settings/         # Organization settings
  (auth)/             # Authentication pages
    login/            # Login page
    register/         # Registration page
  api/                # API routes
components/           # Reusable UI components
lib/                  # Shared utilities and services
  auth/               # Authentication logic
  models/             # MongoDB schemas
  services/           # Business logic
  frontend/           # Client-side utilities
```

## Troubleshooting

### "Transaction numbers are only allowed on a replica set member"

MongoDB transactions require a replica set. Make sure you started mongod with `--replSet` and initialized it.

### "Invalid csrf token" or session errors

Clear your browser cookies and try again. The auth secret in `.env` must be consistent.

### "Organization not found"

You may need to create an organization first. Register a new account and you'll be prompted to create one.

### Email not sending

For development, check the server console for the verification link. In production, configure SMTP settings.

## License

MIT
