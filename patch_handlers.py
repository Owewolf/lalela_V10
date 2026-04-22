import re

with open('src/components/LandingPage.tsx', 'r') as f:
    content = f.read()

# Replace the toggle UI entirely
toggle_ui_block = r'<div className="flex p-2 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl mb-6">[\s\S]*?</button>\s*</div>'
content = re.sub(toggle_ui_block, '', content)

# 1. We replace handleEmailLogin with handleAuthSubmit
handle_email_login_def = r'const handleEmailLogin = async \(e: React.FormEvent\) => \{'

handle_auth_submit_logic = """
  // Derived helper for phone vs email
  const isPhoneMode = identifier.length > 0 && (/^[+\d]/.test(identifier) && !identifier.includes('@'));
  
  const getFormattedPhoneNumber = () => {
    let cleaned = identifier.replace(/[\s\(\)-]/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('+')) cleaned = countryCode + cleaned;
    return cleaned;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (isPhoneMode) {
         // PHONE AUTHENTICATION LOGIC
         if (joinMode === 'start') {
            if (!agreedToTerms) throw new Error("You must agree to the Terms & Conditions.");
         }
         const phoneNum = getFormattedPhoneNumber();
         await signInWithPhone(phoneNum);
         setIsOtpSent(true);
         // Notice: The user is not signed in yet. They must submit the OTP next.
      } else {
         // EMAIL AUTHENTICATION LOGIC
         const emailValue = identifier;
         const blacklistDoc = await getDoc(doc(db, 'blacklisted_emails', emailValue));
         if (blacklistDoc.exists()) {
           throw new Error("This account has been permanently deleted and cannot be reused.");
         }
         if (joinMode === 'login') {
           await signInWithEmailAndPassword(auth, emailValue, password);
         } else {
           if (password !== confirmPassword) throw new Error("Passwords do not match.");
           if (!agreedToTerms) throw new Error("You must agree to the Terms & Conditions.");
           const userCredential = await createUserWithEmailAndPassword(auth, emailValue, password);
           const userDocRef = doc(db, 'users', userCredential.user.uid);
           await setDoc(userDocRef, {
             id: userCredential.user.uid,
             name: `${name} ${lastName}`.trim(),
             first_name: name,
             last_name: lastName,
             email: emailValue,
             mobile_number: '',
             phone: '',
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
           });
           try { await sendEmailVerification(userCredential.user); } catch (vErr) { console.error("Failed to send verification email:", vErr); }
           const inviteJoinCode = localStorage.getItem('pending_join_code');
           localStorage.setItem('pending_onboarding_name', `${name} ${lastName}`.trim());
           localStorage.setItem('pending_onboarding_contact', emailValue);
           localStorage.setItem('pending_onboarding_mode', inviteJoinCode ? 'join' : 'start');
         }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await verifySmsCode(otpCode);
      await handlePhoneSuccess(result.user);
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError(err.message || 'OTP verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };
"""

# I need to match the ENTIRE handleEmailLogin body and replace it.
# To be safe, I'll use regex to grab the block, but regex matching nested braces is hard.
# Instead, I'll just find the start of handleEmailLogin and comment the rest.
# Or better, just cut from handleEmailLogin to handleGoogleLogin? Google Login is above.
pass
