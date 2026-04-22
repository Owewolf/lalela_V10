import re

with open('src/components/LandingPage.tsx', 'r') as f:
    content = f.read()

# 1. State changes
content = re.sub(r"const \[authMethod, setAuthMethod\] = useState<'email' \| 'phone'>\('email'\);", "", content)
content = re.sub(r"const \[showPhoneStep, setShowPhoneStep\] = useState\(false\);", "", content)
content = re.sub(r"const \[mobileNumber, setMobileNumber\] = useState\('\+27'\);", "const [countryCode, setCountryCode] = useState('+27');", content)

# 2. Add identifier state right after setJoinMode
content = content.replace(
    "const [email, setEmail] = useState('');",
    "const [identifier, setIdentifier] = useState('');\n  const [email, setEmail] = useState('');"
)

# 3. Add useFirebase, since we'll do the phone auth logic directly in LandingPage or mount PhoneAuth cleverly.
# Wait, let's see if useFirebase is imported.
if "useFirebase" not in content:
    content = content.replace("import { auth, db } from '../firebase';", "import { auth, db } from '../firebase';\nimport { useFirebase } from '../context/FirebaseContext';")

# 4. Integrate useFirebase hooks
hook_injection = """
  const { setupRecaptcha, signInWithPhone, verifySmsCode, confirmationResult, clearPhoneAuth } = useFirebase();
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  // Clean up reCAPTCHA on unmount
  React.useEffect(() => {
    setupRecaptcha('recaptcha-container');
    return () => { clearPhoneAuth(); };
  }, [setupRecaptcha, clearPhoneAuth]);
"""
content = re.sub(r"const handleAuthToggle = [^\n]+\n", hook_injection, content)

with open('src/components/LandingPage.tsx', 'w') as f:
    f.write(content)
