### **Unified Registration, Invite-Based Authentication & Firebase Integration Brief**

---

## **Objective**

Consolidate onboarding into a **single, unified registration experience** that:

* Captures all user data **once, on first interaction**
* Supports both **direct registration** and **invite-based entry**
* Eliminates all redundant steps and repeated data capture
* Aligns cleanly with **Firebase Auth + Firestore**
* Prepares the system for **multi-identifier authentication (email + phone)**

---

## **Core Principle**

There must be **one form, one submission, one user record**.

No return loops. No re-entering data. No fragmented onboarding.

---

## **1. Entry Routes (Critical)**

### **A. Direct Registration (Standard Flow)**

User accesses platform normally and completes full form:

**Fields:**

* First Name
* Last Name
* Mobile Number
* Email Address
* Password
* Confirm Password
* Terms & Conditions (required)
* Marketing Consent (optional)

**Behavior:**

* All fields editable
* Full user record created immediately on submission

---

### **B. Invite-Based Registration (Dynamic Flow)**

User enters via invite link containing:

* **Email invite** → email is prefilled + **locked**
* **Mobile invite** → phone is prefilled + **locked**

**Behavior:**

* Locked field becomes the **primary identifier**
* User completes remaining required fields:

  * First Name
  * Last Name
  * Missing contact field (email or phone)
  * Password

**Rules:**

* Locked field is **non-editable**
* Invite identifier is **never re-captured or overridden**
* No duplicate accounts for same identifier
* User is tagged as `invite_source = true`

---

## **2. Unified Frontend Form**

### **Form Behavior**

Single reusable component that adapts based on context:

| Mode   | Behavior              |
| ------ | --------------------- |
| Direct | All inputs editable   |
| Invite | Email OR phone locked |

---

### **UI Requirements**

* Clean, modern layout (rounded inputs, clear spacing)
* Password visibility toggle
* Inline validation:

  * Required fields enforced
  * Email format validation
  * Phone normalization (**+27 format**)
  * Password strength + match validation
* Terms & Conditions must be accepted before submission

---

## **3. Backend & Firebase Auth Refactor**

### **Remove Entirely**

* Email-first capture step
* Verification-return-password loop
* Any repeated prompts for name/email

---

### **New Flow (Single Submission)**

**API Endpoint (logical structure):**

```http
POST /auth/register
```

**Payload:**

```json
{
  "first_name": "",
  "last_name": "",
  "email": "",
  "phone": "",
  "password": ""
}
```

---

### **Execution Flow**

1. **Create user in Firebase Auth**

   * Primary method:
     `createUserWithEmailAndPassword(email, password)`

2. **Store user in Firestore**

```json
users: {
  uid: {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    auth_provider: "email",
    invite_source: true/false,
    created_at: timestamp
  }
}
```

3. **Post-processing**

* Trigger email verification (non-blocking)
* Do NOT require user to leave and return
* Do NOT re-request any captured data

---

## **4. Invite System Handling**

### **Invite Link Structure**

Contains token with:

* Identifier (email OR phone)
* Optional context (e.g., community)

---

### **On Page Load**

* Validate invite token
* Extract identifier
* Prefill relevant field
* Lock field (non-editable)

---

### **Constraints**

* Locked identifier must:

  * Be persisted exactly as received
  * Not be modifiable in frontend or backend
* Prevent duplicate user creation for same identifier
* Attach invite metadata to user record

---

## **5. Authentication Strategy (Future-Proofing)**

Design login layer to support:

```plaintext
identifier (email OR phone) + password
```

---

### **Implementation Requirements**

* `phone` field must be:

  * Stored in normalized format (+27…)
  * Indexed and/or unique (application-level enforcement)

* Authentication logic must be abstracted to allow:

  * Email + password (current)
  * Phone + password (future)
  * Phone OTP (future phase)
  * Multi-provider linking (future)

---

## **6. Validation & Security**

### **Frontend + Backend Enforcement**

* Required fields must be completed
* Password rules enforced consistently
* Email uniqueness check
* Phone format validation
* Terms checkbox required

---

### **Firebase Security Rules**

Ensure:

* Users can only write to their own `uid`
* No partial user objects allowed
* Invite-locked fields cannot be modified after creation
* All required fields validated before write

---

## **7. Data Integrity & Cleanup**

* Eliminate ALL duplicate data capture points

* Ensure:

  * Name, email, phone captured **once only**
  * No secondary onboarding flows
  * No fallback flows that re-request the same data

* Existing infrastructure must be:

  * **Rewired, not rebuilt**

---

## **8. Expected Outcome**

* Single-step registration (direct or invite-based)
* Zero repeated input requests
* Clean, predictable onboarding flow
* Invite system correctly binds identity
* Firebase Auth and Firestore working as a unified system
* Backend ready for future phone-based authentication

---

## **Final Note**

This is not a feature expansion.
This is a **flow correction and consolidation task**.

Focus areas:

* Form unification
* Invite-aware UX
* Clean Firebase integration
* Removal of all redundancy

Execution should result in a **seamless, one-pass registration experience**.

