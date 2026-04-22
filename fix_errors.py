import re

with open('src/components/LandingPage.tsx', 'r') as f:
    text = f.read()

text = text.replace("setShowPhoneStep(false);", "")
text = text.replace("mobile_number: mobileNumber,", "mobile_number: isPhoneMode ? identifier : '',")
text = text.replace("phone: mobileNumber,", "phone: isPhoneMode ? identifier : '',")

# Delete the toggle code block
toggle_block = r'<div className="flex p-2 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl mb-6">.*?</div>'
text = re.sub(toggle_block, '', text, flags=re.DOTALL)

# Delete mobileNumber input chunk
mobile_input = r'<div className="space-y-2">\s*<label.*?Mobile Number \*\s*</label>\s*<input\s*type="tel"\s*value=\{mobileNumber\}\s*onChange=\{\(e\) => setMobileNumber\(e.target.value\)\}\s*placeholder="\+27\.\.\."\s*required\s*className="w-full.*?"\s*/>\s*</div>'
text = re.sub(mobile_input, '', text, flags=re.DOTALL)

with open('src/components/LandingPage.tsx', 'w') as f:
    f.write(text)
