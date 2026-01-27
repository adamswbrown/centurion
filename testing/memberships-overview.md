# TeamUp Membership Types and Terms

This document summarizes the membership types and terms available in the platform, based on the data from the TeamUp API (see testing/memberships.json).

---

## Membership Types

### 1. Recurring Plan
- **Description:** Ongoing memberships, often with a commitment period and a set number of sessions per week.
- **Examples:**
  - **2025 6 Months x 3**: 6-month commitment, 3 HIIT and 3 CORE sessions per week.
  - **Daily Nutrition Accountability**: Ongoing nutrition accountability program.
- **Features:**
  - May include penalty systems
  - Can allow repeat purchases
  - May have active members

### 2. Pack
- **Description:** Bundles of a fixed number of sessions or services, paid as a one-time fee.
- **Examples:**
  - **1 Session Pass**: Single session, £9.99
  - **10 Personal Training Sessions**: Pack of 10 PT sessions, £275.00
  - **5 Personal Training Sessions**: Pack of 5 PT sessions, £150.00
  - **3 Personal Training Sessions**: Pack of 3 PT sessions, £110.00
  - **Intro Personal Training Session**: Single introductory PT session, £30.00
  - **Sports Massage**: Single 45-minute massage, £40.00
  - **3 Pack Sports Massages**: 3 massages, £110.00
- **Features:**
  - Some allow repeat purchases
  - Some are for new customers only
  - Some are not shareable

### 3. Prepaid Plan
- **Description:** Time-limited program with a fixed price, paid upfront.
- **Examples:**
  - **8 WEEK CHALLENGE**: 8-week program, £250.00, duration 56 days

---

## Key Terms and Features

- **for_sale**: Membership is available for purchase
- **allow_repeat_purchases**: Can be bought multiple times
- **visible_to_customers**: Shown to customers
- **purchasable_only_by_provider**: Only staff can assign/purchase
- **new_customers_only**: Restricts to new customers
- **has_active_members / active_member_count**: Shows if there are active members
- **price / one_time_fee / display_price**: Pricing info, including currency
- **allotment, plans, terms**: API links to session allotments, payment plans, and terms
- **is_draft**: Not finalized if true
- **incomplete_reasons**: Lists setup issues (e.g., “no_allotment_set”)
- **shareable**: Can be shared between users

---

## Example Memberships Table

| Name                          | Type            | Price     | Repeatable | For Sale | Active Members | Description                                  |
|-------------------------------|-----------------|-----------|------------|----------|---------------|----------------------------------------------|
| 2025 6 Months x 3             | Recurring Plan  | N/A       | Yes        | Yes      | 4             | 6-month, 3 HIIT + 3 CORE/week                |
| 1 Session Pass                | Pack            | £9.99     | Yes        | Yes      | No            | Single session                               |
| 10 Personal Training Sessions | Pack            | £275.00   | Yes        | Yes      | 2             | 10 PT sessions                               |
| 5 Personal Training Sessions  | Pack            | £150.00   | Yes        | Yes      | 2             | 5 PT sessions                                |
| 3 Personal Training Sessions  | Pack            | £110.00   | Yes        | Yes      | 2             | 3 PT sessions                                |
| Intro Personal Training       | Pack            | £30.00    | No         | Yes      | No            | Intro PT session, movement assessment        |
| Sports Massage                | Pack            | £40.00    | Yes        | Yes      | 4             | 45-min massage                               |
| 3 Pack Sports Massages        | Pack            | £110.00   | Yes        | Yes      | No            | 3 massages                                   |
| 8 WEEK CHALLENGE              | Prepaid Plan    | £250.00   | Yes        | Yes      | No            | 8-week challenge, 56 days                    |
| Daily Nutrition Accountability| Recurring Plan  | N/A       | No         | Yes      | No            | Ongoing nutrition accountability             |

---

For more details, see the raw data in `testing/memberships.json` or the TeamUp API documentation.
