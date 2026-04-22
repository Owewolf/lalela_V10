import re

with open('src/context/FirebaseContext.tsx', 'r') as f:
    content = f.read()

# Add useCallback import if not present
if "useCallback" not in content:
    content = re.sub(r"import React, \{([\s\S]*?)\} from 'react';", r"import React, {\1, useCallback } from 'react';", content)

with open('src/context/FirebaseContext.tsx', 'w') as f:
    f.write(content)
