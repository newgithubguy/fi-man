# Smoke Test Checklist

This document provides a fast manual smoke test for Finance Calendar after deployments or major changes.

## Scope

Covers critical user flows:
- Authentication and app load
- Account management
- Transaction create/edit/delete
- Recurring transaction behavior
- Transfers between accounts
- Calendar interactions and layout controls
- Graph navigation back to calendar day
- Import/export basics

## Test Environment

- Run app locally or in Docker
- Use a clean test account if possible
- Browser: latest Chrome, Edge, or Firefox

## Pre-Test Setup

1. Open the app and sign in.
2. Ensure at least two accounts exist (for transfer tests).
3. Keep one browser tab on calendar; open graph in another tab when needed.

---

## A. App Load and Navigation

- [ ] App loads without console/runtime errors.
- [ ] Month/year controls render and change calendar view.
- [ ] Clicking a day selects that day and updates transaction list title.

Expected:
- Calendar and summary cards render.
- No blank screen, no flicker loops during normal interactions.

---

## B. Account Management

- [ ] Create a new account using + button.
- [ ] Rename an account using the edit icon.
- [ ] Click ⭐ on a non-primary account to make it primary.
- [ ] Refresh page.

Expected:
- Primary account remains first after refresh.
- Active account remains usable and loads its transactions.

---

## C. Basic Transaction Flow

- [ ] Add one income transaction (+ amount).
- [ ] Add one expense transaction (- amount).
- [ ] Edit amount on one transaction and save.
- [ ] Remove one transaction.

Expected:
- Amount and list update immediately.
- Daily total, month change, end of month, and end of year balances update correctly.

---

## D. Recurring Transaction Flow

Create a monthly recurring transaction dated this month.

- [ ] Verify it appears on current date and future occurrences.
- [ ] Edit a future occurrence amount.
- [ ] Choose Apply to All Occurrences.

Expected:
- Change applies from selected occurrence forward.
- Past occurrences remain unchanged.

Also validate single-occurrence path:
- [ ] Edit a recurring occurrence and apply to this occurrence only.

Expected:
- Only that date changes; series remains intact.

---

## E. Transfer Flow

- [ ] Add a transfer from Account A to Account B.
- [ ] Confirm matching opposite transaction appears in target account.
- [ ] Edit source transfer amount/date.

Expected:
- Linked transaction updates in target account.
- Removing one removes linked counterpart.

---

## F. Calendar / Panel Layout and Resize

- [ ] Move panel stack left, right, then bottom (drag handle and buttons).
- [ ] Drag calendar position left/right/bottom.
- [ ] Resize calendar window.
- [ ] Resize Add Transaction and Transactions windows (width and height).

Expected:
- No screen flicker or interaction lockups.
- Layout switches cleanly.
- Window widths do not exceed top panel width.
- Bottom layout lines up consistently.

---

## G. Graph to Calendar Day Navigation

- [ ] Open Graph page.
- [ ] Click a day data point on line/bar chart.

Expected:
- App navigates to calendar and selects the clicked date.
- Calendar month/year updates to match selected date.

---

## H. Import / Export Sanity

- [ ] Export CSV for a date range.
- [ ] Re-import same CSV in Merge mode.
- [ ] Re-import in Replace mode (in a test account).

Expected:
- Export file downloads successfully.
- Import preview appears with valid/duplicate counts.
- Replace mode overwrites as expected.

---

## I. Persistence Check

- [ ] Refresh browser.
- [ ] Sign out and back in.
- [ ] Restart server/container and reload app.

Expected:
- Data, account order, and key settings persist.

---

## Pass / Fail Summary

- Build/Deploy version tested:
- Date/time tested:
- Tester:
- Result: PASS / FAIL
- Notes:
