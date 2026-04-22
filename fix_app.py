import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_if = "if (!pendingCode || !user || !userProfile) return;"
new_if = "if (!pendingCode || !user || !userProfile || !userProfile.profile_completed) return;"

content = content.replace(old_if, new_if)

with open('src/App.tsx', 'w') as f:
    f.write(content)
