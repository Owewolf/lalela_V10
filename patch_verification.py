import re

with open('src/components/LandingPage.tsx', 'r') as f:
    content = f.read()

import_match = "signOut as firebaseSignOut"
import_replace = "signOut as firebaseSignOut,\n  sendEmailVerification"
content = content.replace(import_match, import_replace)

profile_match = """          role: 'user',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          is_admin: false,
          is_active: true
        });

        // Store contact for any immediate Onboarding steps needing it"""

profile_replace = """          role: 'user',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          is_admin: false,
          is_active: true
        });

        // Send email verification
        try {
           await sendEmailVerification(userCredential.user);
        } catch (vErr) {
           console.error("Failed to send verification email:", vErr);
        }

        // Store contact for any immediate Onboarding steps needing it"""
content = content.replace(profile_match, profile_replace)

with open('src/components/LandingPage.tsx', 'w') as f:
    f.write(content)
