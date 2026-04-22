import re

with open('src/context/FirebaseContext.tsx', 'r') as f:
    content = f.read()

setup_match = """  const setupRecaptcha = useCallback((containerId: string) => {
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
      });
    }
  }, []);"""

setup_replace = """  const setupRecaptcha = useCallback((containerId: string) => {
    if (recaptchaVerifier.current) {
      try {
        recaptchaVerifier.current.clear();
      } catch (e) {}
      recaptchaVerifier.current = null;
    }
    try {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, containerId, {
          size: 'invisible',
        });
        // Important: pre-render it to ensure it catches errors early and avoids detached DOM
        recaptchaVerifier.current.render().catch(() => {});
    } catch (e) {
        console.error("Recaptcha setup error:", e);
    }
  }, []);"""

content = content.replace(setup_match, setup_replace)

clear_match = """  const clearPhoneAuth = useCallback(() => {
    setConfirmationResult(null);
  }, []);"""

clear_replace = """  const clearPhoneAuth = useCallback(() => {
    setConfirmationResult(null);
    if (recaptchaVerifier.current) {
      try {
        recaptchaVerifier.current.clear();
      } catch (e) {}
      recaptchaVerifier.current = null;
    }
  }, []);"""

content = content.replace(clear_match, clear_replace)

with open('src/context/FirebaseContext.tsx', 'w') as f:
    f.write(content)
