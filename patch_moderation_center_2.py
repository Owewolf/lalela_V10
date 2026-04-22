import re

with open('src/components/ModerationCenter.tsx', 'r') as f:
    content = f.read()

sms_handler = """
  const handleSendInviteSms = () => {
    if (!activeCommunityLink) return;
    const inviteUrl = `${window.location.origin}?join=${activeCommunityLink.id}`;
    const communityName = currentCommunity?.name || 'our community';
    const message = `You've been invited to join ${communityName} on Lalela! Follow this link to join: ${inviteUrl}`;
    
    const recipient = inviteEmailRecipient.trim();
    const isPhone = /^[\d\+\-\s]+$/.test(recipient);
    
    const smsUri = `sms:${isPhone ? recipient : ''}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUri;
  };

  const handleSendInviteEmail = async () => {"""

content = content.replace("  const handleSendInviteEmail = async () => {", sms_handler)

btn_match = """                {activeCommunityLink && (
                  <button"""

btn_replace = """                {activeCommunityLink && (
                  <>
                    <button
                      onClick={handleSendInviteSms}
                      className="py-3 px-4 bg-surface-container-low text-primary rounded-xl font-bold text-xs border border-outline-variant/10 hover:bg-surface-container-high transition-all flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      SMS
                    </button>
                    <button"""
content = content.replace(btn_match, btn_replace)

btn_match_2 = """                    {isSendingInviteEmail ? 'Sending' : 'Email'}
                  </button>
                )}"""
btn_replace_2 = """                    {isSendingInviteEmail ? 'Sending' : 'Email'}
                  </button>
                  </>
                )}"""
content = content.replace(btn_match_2, btn_replace_2)

with open('src/components/ModerationCenter.tsx', 'w') as f:
    f.write(content)

