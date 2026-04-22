import re

with open('src/context/FirebaseContext.tsx', 'r') as f:
    content = f.read()

# Add imports
imports_pattern = r"(import \{([\s\S]*?)\} from 'firebase/auth';)"
content = re.sub(imports_pattern, r"import {\2, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';", content)

# Update Interface
interface_pattern = r"interface FirebaseContextType \{([\s\S]*?)\}"
new_interface = """interface FirebaseContextType {\\1
  confirmationResult: ConfirmationResult | null;
  setupRecaptcha: (containerId: string) => void;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  verifySmsCode: (code: string) => Promise<any>;
  clearPhoneAuth: () => void;
}"""
content = re.sub(interface_pattern, new_interface, content)

# Add state and functions inside provider
provider_pattern = r"const \[isAuthReady, setIsAuthReady\] = useState\(false\);"
new_state = """const [isAuthReady, setIsAuthReady] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifier = React.useRef<RecaptchaVerifier | null>(null);

  const setupRecaptcha = useCallback((containerId: string) => {
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
      });
    }
  }, []);

  const signInWithPhone = useCallback(async (phoneNumber: string) => {
    if (!recaptchaVerifier.current) {
      throw new Error('reCAPTCHA not initialized');
    }
    const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier.current);
    setConfirmationResult(result);
  }, []);

  const verifySmsCode = useCallback(async (code: string) => {
    if (!confirmationResult) {
      throw new Error('No SMS verification in progress');
    }
    const result = await confirmationResult.confirm(code);
    setConfirmationResult(null);
    return result;
  }, [confirmationResult]);

  const clearPhoneAuth = useCallback(() => {
    setConfirmationResult(null);
  }, []);"""
content = re.sub(provider_pattern, new_state, content)

# Add to value object
value_pattern = r"value=\{\{([\s\S]*?)\}\}"
new_value = r"value={{\1, confirmationResult, setupRecaptcha, signInWithPhone, verifySmsCode, clearPhoneAuth }}"
content = re.sub(value_pattern, new_value, content)

with open('src/context/FirebaseContext.tsx', 'w') as f:
    f.write(content)
