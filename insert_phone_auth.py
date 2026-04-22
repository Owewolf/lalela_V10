import re

with open('src/components/LandingPage.tsx', 'r') as f:
    content = f.read()

# Replace the start of the `<form>` depending on authMethod:
form_pattern = r"(<form onSubmit=\{handleEmailLogin\} className=\"space-y-6\">)(.*?<button\s+type=\"button\"[^\>]+Continue with Google\s*</button>\s*</form>)"
match = re.search(form_pattern, content, flags=re.DOTALL)

email_form = match.group(0)

replacement = """
              {authMethod === 'phone' ? (
                <div className="space-y-6">
                  {joinMode === 'start' && !showPhoneStep ? (
                    <form onSubmit={(e) => { e.preventDefault(); setShowPhoneStep(true); }} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">First Name *</label>
                          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Last Name *</label>
                          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl font-bold" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-2">Email Address *</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl font-bold" />
                      </div>
                      <div className="space-y-4 pt-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} required className="w-5 h-5 appearance-none rounded-lg border-2 border-outline-variant/30 checked:border-primary checked:bg-primary transition-all cursor-pointer peer" />
                          <span className="text-xs font-medium text-on-surface-variant leading-relaxed">I agree to the Terms & Conditions and Privacy Policy *</span>
                        </label>
                      </div>
                      <button type="submit" className="w-full py-5 bg-secondary text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Next</button>
                    </form>
                  ) : (
                    <div>
                      {joinMode === 'start' && showPhoneStep && (
                        <button onClick={() => setShowPhoneStep(false)} className="text-sm font-bold text-outline hover:text-primary mb-4 block">&larr; Back</button>
                      )}
                      <PhoneAuth onSuccess={handlePhoneSuccess} />
                    </div>
                  )}
                </div>
              ) : (""" + email_form + "\n              )}"

content = content[:match.start()] + replacement + content[match.end():]

with open('src/components/LandingPage.tsx', 'w') as f:
    f.write(content)
