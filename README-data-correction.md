# FairShare Balance Correction Script for House of Anthica

## Purpose

This collection of scripts is designed to resolve a specific issue: removing all references to the user "Paubs" (user ID 7) from the "House of Anthica" groups (group IDs 2 and 3), while ensuring that the balances of other group members remain unchanged.

## Script Files

1. **data-correction-script.js** - The core script that removes all records related to Paubs from the database
2. **recalculate-balances.js** - Triggers balance recalculation after removing Paubs' data
3. **fix-house-of-anthica.js** - Master script that orchestrates both data correction and balance recalculation

## How to Run

Execute the master script to perform the complete correction in one step:

```bash
node fix-house-of-anthica.js
```

## What the Script Does

1. **Preliminary Steps:**
   - Captures the current balances of all group members before making changes
   - Identifies all data related to Paubs in the specified groups

2. **Data Removal:**
   - Removes expense participants where Paubs is included
   - Removes expenses where Paubs is the payer
   - Removes payments where Paubs is involved (as payer or recipient)
   - Removes user balances associated with Paubs
   - Removes any group memberships for Paubs

3. **Balance Recalculation:**
   - Recalculates all balances for each group to ensure consistency
   - Verifies that the sum of all balances within a group is zero
   - Confirms that other users' balances remain unchanged

4. **Verification:**
   - Compares previous and current balances for all users
   - Ensures data integrity throughout the process

## Safety Measures

- All operations are performed within database transactions for atomicity
- The script verifies balances before and after the correction
- Detailed logging provides an audit trail of all changes

## Notes

- This script specifically targets groups with IDs 2 and 3, both named "House of Anthica"
- The script preserves activity logs related to Paubs for audit purposes
- After running, the script provides a detailed report of all changes made

## Warning

This is a one-time data correction script. Running it multiple times is not recommended as it may have unintended consequences. Always back up your database before running data correction scripts.