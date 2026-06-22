# HisabKitab

HisabKitab is a shared-expense and financial planning application for people who regularly split costs with friends, roommates, families, travel groups, or event partners. It helps users capture expenses, understand who owes what, settle up cleanly, and plan spending before the money is gone.

The product combines everyday expense sharing with lightweight planning tools, so users can move from "What did we spend?" to "What should we budget?" in one place.

## Why It Matters

Shared spending is easy to start and hard to unwind. Group trips, household costs, dinners, groceries, and event budgets often turn into screenshots, mental math, reminders, and awkward follow-ups.

HisabKitab makes that easier by giving every participant a clear, auditable view of:

- who paid
- who participated
- how each split was calculated
- what is still owed
- where the money went
- how current spending compares with planned budgets

## Product Strengths

### Clear Shared Expense Tracking

Users can create individual or group expenses, assign participants, choose how costs are split, and immediately see the resulting balances. The app supports equal splits, exact amounts, percentages, and itemized receipt-based splits.

This removes manual calculation and reduces the chance of disputes.

### Receipt Scanning With Item-Level Splits

Receipt scanning helps convert a bill into editable line items. Users can assign each item to one or more people, split items equally or custom, and see tax, tip, and discount applied proportionally based on each person's item subtotal.

After saving, the receipt breakdown remains available on the expense detail screen, so users can later understand why someone owes a specific amount.

### Built-In Settlement Flow

Balances are calculated automatically across users and groups. Users can settle debts directly from the app, and the system protects against invalid overpayments or wrong-direction settlements.

For groups, debt simplification can reduce the number of payments needed to settle everyone up.

### Planning Before Spending

The preplanning feature lets users create budgets for trips, events, monthly spending, or custom plans. Users can define total budgets, track groups, allocate money by category, add expected spending decisions, and connect real expenses back to the plan.

This turns the app from a reimbursement tracker into a planning tool.

### Privacy-Conscious Sharing

Users only see groups, expenses, balances, and plans they are allowed to access. Friend requests require intentional connection, and group expenses are limited to group members.

That keeps private financial activity from leaking across unrelated groups.

### Accountability And Auditability

Expense activity is tracked, and receipt itemization is persisted after save. Users can review how a split was built instead of trusting a final number with no explanation.

This is especially useful for group trips, roommate bills, and shared purchases where people may check details later.

## Key Features

- Secure user accounts and protected routes
- Friend discovery through explicit friend requests
- Group creation and group member management
- Dashboard for net balance, owed amounts, and group balance overview
- Manual expense entry
- Equal, exact, percentage, and itemized splits
- Receipt scan review flow
- Editable receipt item assignments after save
- Persisted receipt breakdown with subtotal, tax, tip, discount, and per-user totals
- Expense detail view with split explanation and activity history
- Expense editing and deletion
- Settlement recording with validation
- Group debt simplification
- Activity and transaction history
- Financial planning dashboard
- Plan creation and editing
- Budget allocation by category
- Predecision tracking for expected expenses
- Linking expenses to plans
- Moving transactions between planning categories

## How It Makes Life Easier

### For Trips

Create a trip group, scan restaurant and grocery receipts, split items only among the people who used them, and settle once at the end. The app keeps the math transparent and reduces back-and-forth messages.

### For Roommates

Track rent-adjacent expenses, groceries, utilities, and household supplies. Each person can see what they owe and why, without maintaining a spreadsheet.

### For Couples And Families

Use plans to budget monthly categories, then connect real expenses to those budgets. This makes shared spending visible without mixing every financial account.

### For Events

Plan a budget, allocate money by category, track actual expenses, and identify overages before they become surprises.

### For Any Shared Bill

Scan the receipt, assign items, review tax/tip allocation, and save a clear record. If someone asks later, the detail is still there.

## Example Workflow

1. Create a group for a trip, apartment, or event.
2. Add members.
3. Add expenses manually or by scanning a receipt.
4. Assign receipt items to the right people.
5. Review final participant totals, including tax and tip.
6. Save the expense.
7. Open the expense later to see the itemized breakdown.
8. Track balances on the dashboard.
9. Settle up when ready.
10. Use plans and allocations to compare real spending against budget.

## Business Value

HisabKitab is valuable because it addresses both sides of shared spending:

- operational clarity: who paid, who owes, what changed
- planning clarity: what was budgeted, what has been spent, what is still unallocated

That combination makes it useful beyond casual expense splitting. It can support travel groups, households, event organizers, and small shared-budget teams that need transparency without adopting heavyweight accounting software.

## Trust And Reliability

The application is built with production-minded practices:

- typed frontend models
- server-state caching through query hooks
- async backend request handling
- database-backed authorization checks
- bounded list queries
- Alembic migrations
- automated backend and frontend checks
- focused regression tests for balances, settlements, authorization, receipt breakdowns, and planning access

## Positioning

HisabKitab is best positioned as a transparent shared-finance companion:

> Split bills fairly, understand every balance, and plan shared spending before it becomes messy.
