import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Remove states
content = re.sub(r"  const \[needsPasswordSetup, setNeedsPasswordSetup\] = useState\(false\);\n", "", content)
content = re.sub(r"  const \[setupPassword, setSetupPassword\] = useState\(''\);\n", "", content)
content = re.sub(r"  const \[setupPasswordConfirm, setSetupPasswordConfirm\] = useState\(''\);\n", "", content)
content = re.sub(r"  const \[setupPasswordError, setSetupPasswordError\] = useState<string \| null>\(null\);\n", "", content)
content = re.sub(r"  const \[setupPasswordLoading, setSetupPasswordLoading\] = useState\(false\);\n", "", content)
content = re.sub(r"  const \[emailLinkPrompt, setEmailLinkPrompt\] = useState\(false\);\n", "", content)
content = re.sub(r"  const \[emailLinkInput, setEmailLinkInput\] = useState\(''\);\n", "", content)
content = re.sub(r"  const \[emailLinkError, setEmailLinkError\] = useState<string \| null>\(null\);\n", "", content)
content = re.sub(r"  const \[emailLinkProcessing, setEmailLinkProcessing\] = useState\(false\);\n", "", content)

# 2. Remove emailLink helper functions
content = re.sub(r"  const getPendingEmailLink = useCallback\(\(\) => \{[\s\S]*?  \}, \[\]\);\n\n  const clearPendingEmailLink = useCallback\(\(\) => \{\n    sessionStorage\.removeItem\('pendingEmailSignInLink'\);\n  \}, \[\]\);\n", "", content)

# 3. Remove useEffect that handles email link sign in
email_link_effect = r"  // Handle email link sign-in completion\n  useEffect\(\(\) => \{[\s\S]*?  \}, \[clearPendingEmailLink, getPendingEmailLink\]\);\n"
content = re.sub(email_link_effect, "", content)

# 4. Remove handleSetPassword function
handle_set_pw = r"  const handleSetPassword = async \(\) => \{[\s\S]*?  \};\n"
content = re.sub(handle_set_pw, "", content)

# 5. Remove needsPasswordSetup UI block
ui_block = r"  // Password setup screen after email link sign-in\.\n  // New users should set a password before continuing into onboarding\.\n  if \(needsPasswordSetup && user\) \{[\s\S]*?  \}\n\n  if \(shouldShowOnboarding\) \{"
content = re.sub(ui_block, "  if (shouldShowOnboarding) {", content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

