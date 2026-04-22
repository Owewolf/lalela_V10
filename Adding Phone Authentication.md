Adding **Phone Authentication** requires a careful integration into your existing `FirebaseContext.tsx` to maintain the unified registration flow. Per the **Master Instruction Prompt**, here is the advisory and proposed plan.

---

### **1. Proposed Approach & Options**

To enable phone authentication while staying within your tech stack (React 19, Firebase v12 modular SDK), we have two primary paths for the "human verification" requirement:


* **Option A: Visible reCAPTCHA:**
    * **Pros:** Highest security against SMS toll fraud and bot spam.
    * **Cons:** Higher friction; users must manually complete a challenge before receiving an SMS.

---

### **2. Expected Changes & Impact**

#### **What will be done:**
* **`src/context/FirebaseContext.tsx`**: We will add a `signInWithPhone` function and a `verifySmsCode` function. We must also manage a new piece of state: `confirmationResult` (type: `ConfirmationResult | null`).
* **`src/components/auth/PhoneAuth.tsx`**: A new component will be created to handle the phone number input and the 6-digit code entry, styled with **Tailwind v4** and **Lucide-react**.
* **`src/types.ts`**: Update `UserProfile` or related interfaces if we need to track specific phone-auth metadata.

#### **Why it is necessary:**
Phone authentication provides a low-friction entry point for mobile users and adds a layer of verified identity (mobile number) which is already a required field in your Firestore `users` collection (`mobile_number`).

#### **Expected Outcome:**
Users will be able to input their mobile number, receive a 6-digit OTP via SMS, and be authenticated into the LaLela platform, creating or linking to their Firestore user document.

---

### **3. Risk Analysis & Consequence Awareness**

* **SMS Quotas:** Upgraded "Identity Platform" projects on the Spark plan are limited to 3,000 Daily Active Users (DAUs). On the Blaze plan, costs apply after 50,000 Monthly Active Users (MAUs).
* **reCAPTCHA Anchor:** The `RecaptchaVerifier` requires a DOM element ID. If the element isn't rendered when the function is called, the auth flow will crash.
* **State Conflict:** Since your project uses a unified registration form, we must ensure that phone authentication properly triggers the immediate creation of the Firestore document (`/users/{uid}`) as per your **Rule 13**.

---
SUGGESTED 
### **4. Step-by-Step Execution Plan**

I will execute this one step at a time, pausing for your approval after each.

* **Step 1:** Modify `src/context/FirebaseContext.tsx` to include the logic for `RecaptchaVerifier`, `signInWithPhoneNumber`, and the state to hold the `confirmationResult`.
* **Step 2:** Create the `PhoneAuth.tsx` UI component in `src/components/auth/`.
* **Step 3:** Integrate the `PhoneAuth` component into the `LandingPage` registration flow.
* **Step 4:** Perform a Lint check (`npm run lint`) to ensure TypeScript 5.8 compliance.
* **Step 5:** Deploy using `deploy.sh`.


