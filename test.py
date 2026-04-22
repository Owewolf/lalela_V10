with open('src/App.tsx', 'r') as f:
    content = f.read()

import re
m = re.search(r"  // Handle pending join after user authenticates[\s\S]*?\}, \[joinViaInviteLink, setCurrentCommunity, stashPendingInviteJoin, user, userProfile\]\);", content)
if m:
    print(m.group(0))

