# QA Automation & Test Plan: ConciergePro

## 1. Executive Summary
This document serves as the master Test Plan for automating the validation of Role-Based Access Control (RBAC), UI filtering, and End-to-End (E2E) user journeys within ConciergePro. As a Senior QA Engineer, my goal is to ensure that data isolation is mathematically proven across user roles, and that the operational lifecycle (from registration to check-out) is thoroughly automated.

**Status**: 📝 Planning Phase (Awaiting Approval)

---

## 2. Phase 1: Unit Testing (Core Logic & RBAC)
*Focus: Ensuring the underlying logic for data access and property matching is bulletproof.*

| Test Suite | Scenario | Status |
| :--- | :--- | :--- |
| `villaMatcher.test.ts` | Exact, alias, and subset property matching. | ✅ Pass |
| `rbac.test.ts` | **Admin Access**: Empty arrays `[]` grant global visibility. | ⏳ Pending |
| `rbac.test.ts` | **Front Desk Access**: Restricted to specific `assignedUnits`. | ⏳ Pending |
| `rbac.test.ts` | **Supervisor Access**: Restricted to specific `assignedComplexes`. | ⏳ Pending |
| `rbac.test.ts` | **Edge Cases**: Malformed user objects, missing roles, uppercase emails. | ⏳ Pending |

---

## 3. Phase 2: End-to-End (E2E) User Journeys
*Focus: Automating the complete lifecycle of users and guests using programmatic Firestore injections and UI verification.*

### Scenario A: Registration & Role Assignment
1. **Action**: Register 3 new dummy users (Admin, Supervisor, Front Desk).
2. **Action**: Super Admin assigns `Dragon Stone Suites` to Supervisor, and `Hutan Villa 1` to Front Desk.
3. **Verification**: Users successfully transition from "Pending" to "Active" with correct data boundaries.

### Scenario B: Dummy Data Generation (Check-in, Minibar, Check-out)
1. **Action**: Front Desk user submits a Pre-Check-In report and Minibar log for `Hutan Villa 1`.
2. **Action**: Supervisor submits a Pre-Check-In report for `Dragon Stone Suites A1`.
3. **Verification**: Data successfully writes to Firestore `pre_checkin` and `minibar` collections with correct authorship tracking.

### Scenario C: RBAC Dashboard Isolation Verification
1. **Action**: Front Desk user logs in.
2. **Verification**: Can ONLY see `Hutan Villa 1` reports. Cannot see `Dragon Stone Suites` reports.
3. **Action**: Supervisor logs in.
4. **Verification**: Can ONLY see `Dragon Stone Suites` reports. Cannot see `Hutan` reports.

### Scenario D: Admin Global Visibility (Guest Insights)
1. **Action**: Admin (`roman@evdekimi.com`) logs in.
2. **Verification**: Admin dashboard displays ALL reports created by the Front Desk and Supervisor users across all properties.
3. **Verification**: Guest Insights specifically consolidates these reports accurately.

---

## 4. Phase 3: UI Automation (Filters & Multi-Selection)
*Focus: Ensuring the front-end components correctly slice and dice the data.*

| Component | Test Case | Status |
| :--- | :--- | :--- |
| **Home/Dashboard** | Filter reservations by multiple complexes simultaneously. | ⏳ Pending |
| **Home/Dashboard** | Clear all filters resets view to default assigned units. | ⏳ Pending |
| **Guest Insights** | Search by guest name or confirmation code respects active filters. | ⏳ Pending |
| **User Mgmt** | Selecting a complex automatically selects/deselects all its units. | ⏳ Pending |
| **User Mgmt** | Filter users by Role (Admin, Supervisor, Frontdesk). | ⏳ Pending |

---

## Next Steps
Once this plan is approved, I will:
1. Write and execute the `rbac.test.ts` unit tests.
2. Create a Node.js script to automate the creation of the dummy users, reservations, and reports in Firestore (Scenarios A & B).
3. Automate the verification queries to prove Scenario C & D (Dashboard visibility and Admin global access).
