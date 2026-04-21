## **Mobile Responsiveness & Navigation Refactor Brief (Lalela App)**

### **Objective**

Improve the mobile experience by simplifying navigation, reducing header clutter, and consolidating functionality into a scalable, intuitive menu system. The goal is to  improve the navigation for mobile users while keeping the bottom menu 

---

### **Core Change**

Use the current **header icon (community switcher)** as a  **hamburger menu** that opens a **mobile sidebar navigation panel**.  ---######DONT REPLACE THE ICON /IMAGE############

## **Lalela App — Mobile Navigation & Architecture Refactor Brief (From Scratch)**

### **Overview**

This document defines a complete redesign of the mobile navigation system and route structure for the Lalela application. The goal is to simplify navigation, strengthen community context awareness, and consolidate all user-related settings into a single **Session Control (Profile Identity) block**.

The system is designed to be **community-first, mobile-first, and identity-driven**, with clear separation between:

* App navigation
* Community context
* User identity & settings
* Authentication actions

---

# **1. Core Navigation Concept**

The sidebar becomes the **primary mobile navigation system**, but is now split into:

### **A. App Navigation (Top Section)**

### **B. Community Context Entry Point (Dynamic Dashboard Access)**

### **C. Session Control (User Identity + Profile Management + Settings)**

### **D. Authentication Actions**

---

# **2. Sidebar Navigation Structure**

## **2.1 App Navigation (Top Section)**

These are global app-level modules:

* Home
* Communities
* Posts
* Chat
* Market

> These items are NOT community-specific and remain stable regardless of selected community.

---

## **2.2 Community Context Dashboard (DYNAMIC)**

### **Important Change**

The previous static item **“Community Dashboard” is removed and replaced dynamically.**

### **New Behaviour**

* When a user selects a community inside **Communities**
* The sidebar updates this slot dynamically to:

```text
[Selected Community Name]
```

### **Example**

If selected community = “Ubuntu Farm Co-op”:

```text
Ubuntu Farm Co-op
```

---

### **Functionality**

Clicking this item:

* Opens the **selected community dashboard**
* Context is fully based on the active community
* Permissions applied dynamically:

  * Admin → full management dashboard
  * Member → limited community view

### **Route Mapping**

```id="community-dashboard-dynamic"
/app/community/:communityId/dashboard
```

---

# **3. Communities Module (Context Switcher)**

```id="communities"
/app/communities
```

### **Purpose**

* List of all joined communities
* Switch active community
* Set global app context (`activeCommunityId`)

### **Behaviour**

* Selecting a community:

  * Updates global state
  * Renames sidebar dashboard entry to community name
  * Refreshes Posts, Chat, Market views to that community context

---

# **4. Session Control Section (REBUILT)**

This section replaces Settings entirely and becomes the **user identity + profile management hub**.

It sits at the bottom of the sidebar.

---

## **4.1 User Identity Block**

### **Elements**

* User Avatar
* User Name
* Membership Indicator:

  * ✔ (tick only if licensed)
  * No label, no text

### **Example**

Licensed:

```text
[Avatar] John Doe ✔
```

Unlicensed:

```text
[Avatar] John Doe
```

---

## **4.2 Profile & Settings**

### **New Behaviour**

Settings is integrated into the user identity block.

Clicking the Session Control area opens:

```id="profile"
/app/profile
```

### **Profile Features**

* Update avatar
* Edit user name
* Manage account details
* View licensing status
* Notification preferences (optional expansion)

---

## **4.3 Route Mapping**

```id="app-profile"
/app/profile
```

---

# **5. Authentication Controls**

## Logged Out State:

* Login
* + Create Community

## Logged In State:

* Logout

---

## **Behaviour**

* Logout clears:

  * Auth session
  * Active community
  * Cached user state
* Redirects → `/login`

---

# **6. Global State Model (Critical)**

The app depends on:

### **Authentication**

* `authUser`

### **Community Context**

* `activeCommunityId`
* `activeCommunityName`

### **User Profile**

* `avatar`
* `displayName`
* `isLicensed`

---

# **7. Route Structure (Final Clean Map)**

## Authentication

```text
/login
/register
```

---

## App Core

```text
/app/home
/app/communities
/app/posts
/app/chat
/app/market
```

---

## Dynamic Community Dashboard

```text
/app/community/:communityId/dashboard
```

---

## Profile (NEW)

```text
/app/profile
```

---

# **8. UX / Design Principles**

### **Navigation Philosophy**

* Community-first experience
* Identity always visible
* Minimal top-level clutter
* Context-aware navigation (everything depends on selected community)

---

### **Key UX Rules**

* Sidebar adapts based on selected community
* Community dashboard is never static
* Settings is no longer a separate concept — it is part of the user identity
* Tick icon only for licensing (no labels, no noise)
* Profile is the single source of truth for user configuration

---

# **9. Final Outcome**

This refactor produces:

* A **fully dynamic community-driven navigation system**
* A **clean separation between app features and user identity**
* A **simplified mobile UX with fewer navigation layers**
* A **scalable structure for future community expansion**
* A unified **Profile-first user model**

---

I want you to Ensure all * Firebase schema update (user + community model alignment)


