import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = re.sub(r"  const completeEmailLinkSignIn = async \(\) => \{[\s\S]*?  \};\n", "", content)

# Remove the emailLinkPrompt UI component
ui_prompt = r"  if \(emailLinkPrompt\) \{[\s\S]*?    \);\n  \}\n"
content = re.sub(ui_prompt, "", content)

# Remove the loading || emailLinkProcessing check and simplify
content = re.sub(r"  if \(loading \|\| emailLinkProcessing\) \{", "  if (loading) {", content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

