### Lalela Monetization & Licensing Brief (Unified)

This brief defines a clear, once-off pricing model for the Lalela platform, while preserving all existing trial (licensing) periods exactly as they are. The goal is to keep the system simple, transparent, and consistent across both user experience and backend logic.

At its core, Lalela operates on a **pay-once, access-for-life** principle. There are no subscriptions, no renewals, and no hidden costs. Instead, users either join the platform as members or take on a leadership role by creating communities—each with a clearly defined, once-off cost.

---

### Licensing Model (Unchanged and Enforced)

The platform continues to operate with two independent trial periods that act as time-based access controls:

* **Community Trial (30 days)**
  Every newly created community is granted a 30-day trial from the moment of creation. During this period, the community is fully functional. Once the trial expires, a once-off payment is required to keep the community active.

* **Membership Trial (1 year)**
  Every new user receives a 1-year membership trial. This allows full access to the platform without immediate payment. After the trial ends, a once-off membership fee is required to retain access.

These trials must remain unchanged and must be enforced independently of each other across all system flows.

---

### Pricing Structure

Lalela separates **membership** and **community creation** as two distinct actions, while allowing them to overlap where necessary.

* **Community Creation (Includes Membership)**
  Creating a community costs **R349 once-off**. This action automatically grants the user lifetime platform membership.
  The 30-day community trial still applies before payment is enforced, and if the user is new, the 1-year membership trial also remains active.

* **Membership Only**
  Users who do not wish to create a community can become members for **R149 once-off**. This grants lifetime access to the platform.
  The 1-year membership trial applies before payment is required.

* **Additional Community Creation**
  Any additional community created—regardless of whether the user is already a member—costs **R349 once-off per community**.
  Each new community includes its own 30-day trial period.

---

### System Logic

The platform must consistently reflect the following logic:

* Creating a community automatically grants membership, but the price for that action remains R349.
* A user can start on a free membership trial, upgrade to paid membership, or create a community at any time.
* Trials do not change pricing—they only delay when payment is required.
* Membership status and community ownership must be tracked separately, with their respective trial timers enforced independently.

---

### User Experience & Messaging

The experience should feel simple, fair, and empowering. Users should clearly understand what they are paying for and why.

Key messaging principles:

* Emphasize **“Pay once, belong for life.”**
* Position community creation as a leadership action with a higher, intentional cost.
* Keep membership accessible and inclusive.
* Use trials as a way to explore the platform before committing, not as a pricing complication.

All UI elements should clearly communicate:

* Current trial status (active, expired, remaining time)
* When payment is required
* That all payments are once-off with no recurring obligations

---

### Implementation Requirements

* Maintain strict enforcement of both trial timers (30-day community and 1-year membership).
* Ensure backend logic cleanly separates:

  * Membership state (trial vs paid)
  * Community state (trial vs paid)
* Prevent conflicts between trial expiration and payment status.
* Update all frontend flows to reflect:

  * Clear pricing
  * Trial visibility
  * Simple upgrade paths
* Ensure all deployment assets and updates align with the platform’s existing structure and release process.

---

This structure keeps Lalela straightforward: users can explore freely, commit once, and remain part of the platform indefinitely—whether as members or community leaders.

