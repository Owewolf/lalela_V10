import re

with open('subagent_output.txt', 'r') as f:
    text = f.read()

match = re.search(r'```tsx\n(.*?)```', text, re.DOTALL)
if match:
    with open('src/components/LandingPage.tsx', 'w') as out:
        out.write(match.group(1).strip() + '\n')
    print("Success")
else:
    print("Failed to find codeblock")
