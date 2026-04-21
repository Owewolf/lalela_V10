
# **HOME PAGE SCALING & RENDERING BRIEF (MOBILE-FIRST)**

## **Objective**

Create a mobile friendly homepage that:

* Feels dense but not cramped
* Scrolls smoothly without friction
* Prioritizes the map as the core feature
* Uses dynamic UI behavior (like X.com) to maximize usable screen space
* Maintains clarity even when content is empty

---

# **1. CORE UX PRINCIPLES**

### **1.1 Single Primary Focus**

* The **Interactive Coverage Map** is the primary element
* Quick actions are secondary
* Notices are supporting content

### **1.2 No Dead Space**

* Empty states must still feel intentional
* Layout should expand/shrink dynamically based on content

### **1.3 Scroll = Control**

* The user must never feel “stuck”
* Vertical scrolling must always take priority over embedded interactions

---

# **2. PAGE STRUCTURE (FINAL HIERARCHY)**


[Top Header]
[EMERGENCY CTA] [NOTICE CTA]
[Coverage Map - Primary Feature]
[Community Notices / Empty State]
[Community Listings / Empty State]
[Bottom Navigation - Auto Hide/Show]
```

---

# **3. HEADER**

UNCHANGED

---

# **4. QUICK ACTION BUTTONS (CRITICAL FIX)**

### Current Issue:

* Too large → creates visual imbalance

### Fix:

* Reduce height by **20–30%**
* Treat as **utility actions**, not hero components

### Specs:

* Height: ~80–100px
* Border radius: consistent with system
* Icon + label (scaled down slightly)

### Layout:

* 2-column grid
* Gap: 12–16px

---

# **5. INTERACTIVE COVERAGE MAP (PRIMARY COMPONENT)**

## **5.1 Role**

* Acts as a **preview**, not an immediately interactive element

---

## **5.2 Scroll Conflict Fix (MANDATORY)**

### Problem:

* Map captures gestures → blocks page scroll

### Solution:

Disable interaction by default:

```js
dragging: false
scrollWheelZoom: false
touchZoom: false
doubleClickZoom: false
```

---

## **5.3 Interaction Model**

### Default State:

* Static preview
* Overlay: “Tap to explore map”

### On Tap:

* Open:

  * Fullscreen map OR
  * Expanded modal view

---

## **5.4 Dynamic Height**

### With Notices:

* Standard height (~250–300px)

### Without Notices:

* Expand map (~350–450px)

This fills empty space and keeps UI balanced.

---

# **6. COMMUNITY NOTICES SECTION**

## **6.1 With Content**

* Display stacked cards

### Card Styling:

* Remove heavy borders
* Use:

  * Soft shadow OR subtle background contrast
* Internal padding: 12–16px

---

## **6.2 Empty State (IMPORTANT)**

Instead of blank space:

Display:

* Friendly message (e.g. “All Secure”)
* Optional subtle icon
* Encourage action (create notice)

--# **7. COMMUNITY LISTING SECTION**

## **7.1 With Content**

* Display stacked cards

### Card Styling:

* Remove heavy borders
* Use:

  * Soft shadow OR subtle background contrast
* Internal padding: 12–16px

---

## **7.2 Empty State (IMPORTANT)**

blank space:

-

# **8. SPACING SYSTEM (GLOBAL RULESET)**

Use a strict spacing scale:

* 8px → XS
* 12px → SM
* 16px → MD
* 24px → LG
* 32px → XL

---

## **Apply Consistently**

* Header → Actions: **16px**
* Actions → Map: **24px**
* Section Title → Content: **12–16px**
* Between cards: **16px**

No arbitrary spacing allowed.

---

# **9. BOTTOM NAVIGATION (X-STYLE BEHAVIOR)**

## **9.1 Behavior Model (IMPORTANT CORRECTION)**

* When user **scrolls DOWN** → Bottom bar **HIDES**
* When user **scrolls UP** → Bottom bar **SHOWS**

This maximizes visible content when the user is exploring downwards.

---

## **9.2 Animation Specs**

* Transition: smooth slide
* Duration: ~200–300ms
* No jitter or flicker

---

## **9.3 Implementation Logic**

Track scroll direction:

```js
let lastScrollY = window.scrollY;

window.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;

  if (currentScrollY > lastScrollY) {
    // scrolling UP
    showBottomBar();
  } else {
    // scrolling DOWN
    hideBottomBar();
  }

  lastScrollY = currentScrollY;
});
```

---

## **9.4 Layout Protection**

* Add bottom padding to content:

  * ~80–100px
* Prevent overlap with floating nav

---

# **10. SCROLL PERFORMANCE & FLUIDITY**

### Requirements:

* No scroll blocking elements
* No lag on gesture
* Map must NEVER interrupt scroll

---

# **11. MICRO-INTERACTIONS (POLISH LAYER)**

Add subtle motion:

* Map loads → fade in
* Cards → slight upward motion
* Button tap → quick scale feedback

---

# **12. RESPONSIVE BEHAVIOR**

### Mobile First:

* Everything optimized for thumb reach
* Critical actions within bottom half of screen

### Scaling:

* Maintain spacing ratios across screen sizes
* Avoid fixed heights where possible (use min/max)

---

# **13. FINAL EXPERIENCE GOAL**

The page should feel:

* **Tight** but not **CROWDED****(no wasted space)
* **Fast** (no friction scrolling)
* **Intentional** (clear hierarchy)
* **Controlled** (user always in charge of interaction)

---

# **KEY TRANSFORMATION SUMMARY**

### Before:

* Oversized buttons
* Map blocks scroll
* Empty space feels broken
* Static bottom nav

### After:

* Balanced layout
* Map becomes controlled feature
* Dynamic spacing adapts to content
* Bottom nav behaves like X (context-aware)

Ensure you follow the copilot-instruction.md
