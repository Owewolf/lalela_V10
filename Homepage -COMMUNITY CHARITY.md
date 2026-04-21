# **6.5 COMMUNITY CHARITY SECTION (NEW – INSERT BETWEEN NOTICES & LISTINGS)**

## **6.5.1 Purpose**

Introduce a **Community Charity Reflection Block** that surfaces the **selected community charity** from the Charity Hub.

This section must:

* Reinforce community purpose (listen → connect → act)
* Create emotional engagement
* Provide visibility into impact and contribution
* Act as a soft call-to-action (not aggressive)

---

## **6.5.2 Placement (CRITICAL)**

Update page structure:

```
[Community Notices / Empty State]
[Community Charity Section]   ← NEW
[Community Listings / Empty State]
```

---

## **6.5.3 Data Source (IMPORTANT)**

This section must dynamically pull from:

* **Selected Community Charity (locked)**
* Managed via existing **Charity Hub / Admin panel**

Do NOT create a new system — reuse:

* `selected_charity`
* `charity_description`
* `charity_image/logo`
*  impact_stats ---if available

---

## **6.5.4 Layout & Design**

### **Card-Based Layout (Single Highlight Card)**

**Structure:**

```
[Charity Image / Logo]
[Charity Name]
[Short Description (2–3 lines max)]
[Optional: Impact Line]
[Subtle CTA]  ---'Suggest a Charity' for Members ---- 'Manage Charity' for Admin
```

---

### **Styling Rules**

* Match Notices/Listings styling consistency
* No heavy borders
* Use:

  * Soft background contrast OR
  * Light shadow
* Padding: **16px**
* Border radius: consistent system-wide

---

### **Typography Hierarchy**

* Charity Name → Medium emphasis (not headline)
* Description → Subtle, readable
* Impact/CTA → smallest, secondary tone

---

## **6.5.5 Content Behavior**

### **With Charity Assigned**

Display:

* Charity logo/image
* Name
* Short mission/description
* Optional:

  * “Supporting this month”
  * “Community-backed initiative”

CTA (soft):

* “View Charity”
* “Learn More”
* “Support Initiative”

---

### **Empty State (NO CHARITY SELECTED)**

Do NOT leave blank.

Display:

* Message:

  * “Suggest a charity”
* Optional prompt:

  * “Admins can assign a charity”

Keep tone neutral and clean.

---

## **6.5.6 Interaction Model**

* Entire card is **clickable/tappable**
* On tap:

  * Navigate to:

    * Charity detail page OR
    * Charity Hub view

---

## **6.5.7 Dynamic Behavior**

* Section height must adapt to content
* If:

  * Notices are empty → this section becomes more visually prominent
* Maintain spacing consistency:

  * Notices → Charity: **16–24px**
  * Charity → Listings: **16–24px**

---

## **6.5.8 Performance & UX**

* Lightweight (no heavy media loading)
* Image should be optimized (lazy load if needed)
* Must NOT interrupt scroll behavior

---

## **6.5.9 Experience Goal**

This section should feel:

* **Purpose-driven, not promotional**
* **Integrated, not bolted-on**
* **Calm but meaningful**
* A reminder that the community is **doing something real**

---

This is a **supporting but emotionally anchoring component**, not a dominant feature.

