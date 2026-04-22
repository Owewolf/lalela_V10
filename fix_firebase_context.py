import re

with open('src/context/FirebaseContext.tsx', 'r') as f:
    text = f.read()

# Replace react imports
text = re.sub(
    r"import React, \{ createContext, useContext, useEffect, useState \} from 'react';",
    r"import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';",
    text
)

with open('src/context/FirebaseContext.tsx', 'w') as f:
    f.write(text)

