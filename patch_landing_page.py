import re

with open('src/components/LandingPage.tsx', 'r') as f:
    content = f.read()

# 1. Add PhoneAuth import
content = re.sub(
    r"import { APP_LOGO_PATH } from '../constants';",
    "import { APP_LOGO_PATH } from '../constants';\nimport { PhoneAuth } from './auth/PhoneAuth';",
    content
)

# 2. Add authMethod state
state_match = "const [joinMode, setJoinMode] = useState<'start' | 'login'>('start');\n"
state_replacement = "const [joinMode, setJoinMode] = useState<'start' | 'login'>('start');\n  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');\n"
content = content.replace(state_match, state_replacement)

# 3. Add handlePhoneSuccess
phone_success_func = """
  const handlePhoneSuccess = async (user: any) => {
    try {
      // Create user document immediately upon registration on LandingPage
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      
      const inviteJoinCode = localStorage.getItem('pending_join_code');
      
      if (!docSnap.exists() && joinMode === 'start') {
        const profileData = {
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
        };
        await setDoc(userDocRef, profileData);
        
        localStorage.setItem('pending_onboarding_name', `${name} ${lastName}`.trim());
        if (email) localStorage.setItem('pending_onboarding_contact', email);
        localStorage.setItem('pending_onboarding_mode', inviteJoinCode ? 'join' : 'start');
      }
    } catch (err: any) {
      console.error("Phone auth profile creation error:", err);
      setError(err.message);
    }
  };
"""
content = re.sub(
    r"const startResendCooldown = \(\) => {",
    phone_success_func + "\n  const startResendCooldown = () => {",
    content
)

with open('src/components/LandingPage.tsx', 'w') as f:
    f.write(content)
