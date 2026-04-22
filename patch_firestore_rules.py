import re

with open('firestore.rules', 'r') as f:
    content = f.read()

# Add the new fields to allowedFields for isValidUser
old_allowed = "'id', 'name', 'email', 'phone', 'address', 'license_status', 'status', 'role',"
new_allowed = "'id', 'name', 'email', 'phone', 'address', 'license_status', 'status', 'role', 'first_name', 'last_name', 'mobile_number', 'agreed_to_terms', 'marketing_consent', 'email_verified', 'is_admin', 'is_active', 'updated_at',"

content = content.replace(old_allowed, new_allowed)

# Note: email was required, but with phone auth, it might not be. Wait, the unified registration in LandingPage.tsx forces email.
# However, if email is empty (not possible because it's required during the phone step if they are creating an account).
# In LandingPage.tsx, we write it immediately:
# const profileData = {
#    first_name: name,
#    last_name: lastName,
#    email: email,
#    mobile_number: user.phoneNumber || '',
# ...
# The rule requires 'id', 'name', 'email', 'license_status', 'status'.
# But our LandingPage insert doesn't include 'id', 'name', 'license_status', 'status'!
# Let's fix LandingPage to include these, or change the rule.

with open('firestore.rules', 'w') as f:
    f.write(content)
