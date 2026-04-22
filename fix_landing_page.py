import re

with open('src/components/LandingPage.tsx', 'r') as f:
    content = f.read()

# Make sure we add required fields to Phone / Email registration initial writes so they pass the `isValidUser` rule.
# Required fields in firestore.rules: 'id', 'name', 'email', 'license_status', 'status' (from `isValidUser`)

phone_profile_match = """        const profileData = {
          first_name: name,
          last_name: lastName,
          email: email,
          mobile_number: user.phoneNumber || '',
          agreed_to_terms: agreedToTerms,
          marketing_consent: marketingConsent,
          email_verified: false,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          is_admin: false,
          is_active: true
        };"""

phone_profile_replace = """        const profileData = {
          id: user.uid,
          name: `${name} ${lastName}`.trim(),
          first_name: name,
          last_name: lastName,
          email: email,
          mobile_number: user.phoneNumber || '',
          phone: user.phoneNumber || '',
          agreed_to_terms: agreedToTerms,
          marketing_consent: marketingConsent,
          email_verified: false,
          license_status: 'UNLICENSED',
          status: 'ACTIVE',
          role: 'user',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          is_admin: false,
          is_active: true
        };"""

content = content.replace(phone_profile_match, phone_profile_replace)

email_profile_match = """        // Create the user document immediately
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          first_name: name,
          last_name: lastName,
          email: email,
          mobile_number: mobileNumber,
          agreed_to_terms: agreedToTerms,
          marketing_consent: marketingConsent,
          email_verified: false,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          is_admin: false,
          is_active: true
        });"""

email_profile_replace = """        // Create the user document immediately
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          name: `${name} ${lastName}`.trim(),
          first_name: name,
          last_name: lastName,
          email: email,
          mobile_number: mobileNumber,
          phone: mobileNumber,
          agreed_to_terms: agreedToTerms,
          marketing_consent: marketingConsent,
          email_verified: false,
          license_status: 'UNLICENSED',
          status: 'ACTIVE',
          role: 'user',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          is_admin: false,
          is_active: true
        });"""

content = content.replace(email_profile_match, email_profile_replace)

with open('src/components/LandingPage.tsx', 'w') as f:
    f.write(content)
