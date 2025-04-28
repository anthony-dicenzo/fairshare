# Data Correction: House of Anthica - Paubs Removal

## Purpose

This document outlines the data correction performed to remove all references to user "Paubs" from the "House of Anthica" group (group IDs 2 and 3) in the FairShare expense-sharing application database.

## Background

A user needed to be removed from a group without affecting the balances of other users. This required a careful data correction approach that:

1. Removed all references to the user
2. Maintained data integrity
3. Ensured balances for other users remained unchanged
4. Properly recalculated all balances to ensure consistency

## Scripts Created

We created the following scripts to handle this data correction:

1. `fix-paubs-house-of-anthica.js` - The main script that removes all references to Paubs
2. `recalculate-house-of-anthica-balances.js` - A script to recalculate all balances after the removal

## Approach

### 1. User Removal Process

The user removal script:

- Identifies all references to "Paubs" (user ID: 7) in the House of Anthica groups (IDs: 2, 3)
- Takes a snapshot of current balances for verification
- Removes the user from:
  - Group membership tables
  - Expense participants
  - Expenses paid by the user
  - Payments involving the user
  - Balance records
- Creates activity log entries documenting the change
- Verifies the removal was complete
- Ensures other users' balances remain unchanged

### 2. Balance Recalculation Process

The balance recalculation script:

- For each affected group:
  - Identifies all active members
  - Gets all expenses and payments in the group
  - For each user:
    - Calculates what they owe others (from expenses)
    - Calculates what others owe them (from expenses they paid)
    - Accounts for payments made and received
    - Updates their balance in the database
  - Verifies the sum of all balances equals zero

## Running the Correction

The scripts were executed in the following order:

1. `node fix-paubs-house-of-anthica.js` - This removes all references to Paubs
2. `node recalculate-house-of-anthica-balances.js` - This recalculates all balances

## Results

### Before Correction

Group 2 (House of Anthica):
- adicenzo: $-1784.32
- Jes: $1784.32

Group 3 (House of Anthica):
- test2: $0

### After Correction

Group 2 (House of Anthica):
- adicenzo: $-1784.32
- Jes: $1784.32

Group 3 (House of Anthica):
- test2: $0

## Verification

Both scripts include verification steps to ensure:

1. All references to Paubs were successfully removed
2. Balances of other users remained unchanged
3. The sum of all balances in each group equals zero

## Future Data Corrections

For similar data corrections in the future:

1. Always take a snapshot of affected data before making changes
2. Use transactions to ensure atomicity (all changes succeed or all fail)
3. Include verification steps to confirm changes were made correctly
4. Document the changes with activity logs
5. Trigger balance recalculation after data correction

## Technical Implementation

The scripts use direct database access via the PostgreSQL driver to ensure complete control over the data correction process. This approach was chosen over using the application's ORM layer to ensure the changes were made consistently and to provide better visibility into the process.

---

**Note**: These scripts are specialized for this particular data correction and should not be used for general user removal in the application. The proper way to remove a user from a group is through the application's user interface or API.