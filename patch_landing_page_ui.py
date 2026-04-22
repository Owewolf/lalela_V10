import re

with open('src/components/LandingPage.tsx', 'r') as f:
    content = f.read()

# Add showPhoneStep state
content = content.replace(
    "const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');",
    "const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');\n  const [showPhoneStep, setShowPhoneStep] = useState(false);"
)

# Reset showPhoneStep when joinMode or authMethod changes
content = content.replace(
    "const scrollToJoin = (mode: 'start' | 'login') => {",
    "const handleAuthToggle = (method: 'email' | 'phone') => { setAuthMethod(method); setShowPhoneStep(false); };\n  const scrollToJoin = (mode: 'start' | 'login') => {\n    setShowPhoneStep(false);"
)

content = content.replace(
    "onClick={() => setJoinMode('start')}",
    "onClick={() => { setJoinMode('start'); setShowPhoneStep(false); }}"
)
content = content.replace(
    "onClick={() => setJoinMode('login')}",
    "onClick={() => { setJoinMode('login'); setShowPhoneStep(false); }}"
)

# Insert the Auth Method Tabs
auth_tabs_html = """
              <div className="flex p-2 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl mb-6">
                <button 
                  onClick={() => handleAuthToggle('email')}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all",
                    authMethod === 'email' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-outline hover:text-primary"
                  )}
                >
                  Email
                </button>
                <button 
                  onClick={() => handleAuthToggle('phone')}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all",
                    authMethod === 'phone' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-outline hover:text-primary"
                  )}
                >
                  Phone
                </button>
              </div>
"""

# Find where to insert Auth Method Tabs (after the Welcome Back / Create Account text)
text_to_find = """                </p>
              </div>"""

content = content.replace(
    text_to_find,
    text_to_find + "\n\n" + auth_tabs_html
)

with open('src/components/LandingPage.tsx', 'w') as f:
    f.write(content)
