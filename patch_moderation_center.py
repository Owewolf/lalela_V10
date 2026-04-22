import re

with open('src/components/ModerationCenter.tsx', 'r') as f:
    content = f.read()

# 1. Add "MessageSquare" to lucide-react imports if not there
import_match = r"import {([^}]+)} from 'lucide-react';"
match = re.search(import_match, content)
if match and "MessageSquare" not in match.group(1):
    new_imports = match.group(1) + ", MessageSquare"
    content = content.replace(match.group(1), new_imports)

# 2. Add handleSendInviteSms
sms_handler = """
  const handleSendInviteSms = () => {
    if (!activeCommunityLink) return;
    const inviteUrl = `${window.location.origin}?join=${activeCommunityLink.id}`;
    const communityName = currentCommunity?.name || 'our community';
    const message = `You've been invited to join ${communityName} on Lalela! Follow this link to join: ${inviteUrl}`;
    
    // Check if what they typed in the input is a phone number
    const recipient = inviteEmailRecipient.trim();
    const isPhone = /^[\d\+\-\s]+$/.test(recipient);
    
    const smsUri = `sms:${isPhone ? recipient : ''}?body=${encodeURIComponent(message)}`;
    window.open(smsUri, '_self');
  };
"""

content = re.sub(
    r"const handleSendInviteEmail = async \(\) => \{",
    sms_handler + "\n  const handleSendInviteEmail = async () => {",
    content
)

# 3. Add SMS button next to the Email button
btn_match = """                {activeCommunityLink && (
                  <button
                    onClick={handleSendInviteEmail}
                    disabled={isSendingInviteEmail}
                    className="py-3 px-4 bg-surface-container-low text-primary rounded-xl font-bold text-xs border border-outline-variant/10 hover:bg-surface-container-high transition-all flex items-center gap-2"
                  >
                    {isSendingInviteEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {isSendingInviteEmail ? 'Sending' : 'Email'}
                  </button>
                )}"""

btn_replace = """                {activeCommunityLink && (
                  <>
                    <button
                      onClick={handleSendInviteSms}
                      className="py-3 px-4 bg-surface-container-low text-primary rounded-xl font-bold text-xs border border-outline-variant/10 hover:bg-surface-container-high transition-all flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      SMS
                    </button>
                    <button
                      onClick={handleSendInviteEmail}
                      disabled={isSendingInviteEmail}
                      className="py-3 px-4 bg-surface-container-low text-primary rounded-xl font-bold text-xs border border-outline-variant/10 hover:bg-surface-container-high transition-all flex items-center gap-2"
                    >
                      {isSendingInviteEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      {isSendingInviteEmail ? 'Sending' : 'Email'}
                    </button>
                  </>
                )}"""

content = content.replace(btn_match, btn_replace)

# 4. Change the placeholder of the input to show they can enter Email or SMS
content = content.replace(
    "placeholder=\"Enter user's email address\"",
    "placeholder=\"Enter user's email address (or phone for SMS)\""
)

with open('src/components/ModerationCenter.tsx', 'w') as f:
    f.write(content)
