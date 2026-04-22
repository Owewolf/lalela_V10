import re

with open('src/components/LandingPage.tsx', 'r') as f:
    text = f.read()

# Make logic and state replacements
text = text.replace("const [identifier, setIdentifier] = useState('');", "const [email, setEmail] = useState('');\n  const [mobileNumber, setMobileNumber] = useState('');")
text = text.replace("const isPhoneMode = identifier.length > 0 && /^[+\\d\\s()-]+$/.test(identifier) && !identifier.includes('@');", "const isPhoneMode = mobileNumber.length > 0;")
text = text.replace("let cleanNumber = identifier.replace(/\\D/g, '');", "let cleanNumber = mobileNumber.replace(/\\D/g, '');")
text = text.replace("if (identifier.startsWith('+')) {\n      return identifier; \n    }", "if (mobileNumber.startsWith('+')) {\n      return mobileNumber; \n    }")
text = text.replace("user.phoneNumber || identifier", "user.phoneNumber || mobileNumber")

text = text.replace("const email = identifier;", "const email = email || ''; // Use state email")
text = text.replace("if (identifier.startsWith('+')) {\n      return identifier;", "if (mobileNumber.startsWith('+')) {\n      return mobileNumber;")
text = text.replace("setForgotEmail(identifier)", "setForgotEmail(email)")

def extract_between(s, start, end):
    try:
        a = s.index(start)
        b = s.index(end, a) + len(end)
        return s[a:b]
    except ValueError:
        return ""

# The problem was whitespace and literal matching
start_str = '<div className="space-y-2">\n                      <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Email or Phone Number {joinMode === \'start\' ? \'*\' : \'\'}</label>'

old_block = extract_between(text, start_str, '</div>\n                    </div>\n\n                    {!isPhoneMode')

if old_block:
    new_block = """<div className="space-y-6">
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Email Address {joinMode === 'start' ? '*' : ''}</label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (e.target.value) setMobileNumber(''); // Clear phone if email is used
                        }}
                        placeholder="your@email.com"
                        required={!isPhoneMode}
                        disabled={mobileNumber.length > 0}
                        className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-outline/20"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-surface px-2 text-[10px] font-black uppercase tracking-widest text-outline/60">OR</span>
                      </div>
                    </div>

                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Phone Number {joinMode === 'start' ? '*' : ''}</label>
                      <div className="flex gap-2 relative">
                        <select 
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          disabled={email.length > 0}
                          className="px-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold outline-none cursor-pointer disabled:opacity-50"
                        >
                          <option value="+27">🇿🇦 +27</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+91">🇮🇳 +91</option>
                        </select>
                        <input 
                          type="tel" 
                          value={mobileNumber}
                          onChange={(e) => {
                              setMobileNumber(e.target.value);
                              if (e.target.value) setEmail(''); // Clear email if phone is used
                          }}
                          placeholder="082 123 4567"
                          required={isPhoneMode}
                          disabled={email.length > 0}
                          className="flex-1 w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold outline-none transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  {!isPhoneMode"""
    text = text.replace(old_block, new_block)
    with open('src/components/LandingPage.tsx', 'w') as f:
        f.write(text)
    print("Replaced!")
else:
    print("WARNING: Could not find block")
