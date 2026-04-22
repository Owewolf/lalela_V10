import re

with open('src/components/Onboarding.tsx', 'r') as f:
    content = f.read()

# Modify mode === 'join' layout to show both Community Name and Invite Code securely locked into place

old_form_code = """                      {mode === 'start' ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-outline px-1">Community Name</label>
                          <input
                            type="text"
                            required
                            value={communityName}
                            onChange={(e) => setCommunityName(e.target.value)}
                            placeholder="e.g. Parkwood Heights"
                            className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-outline px-1">Invite Code</label>
                          <input
                            type="text"
                            required
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            placeholder="Enter your invite code"
                            className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary"
                          />
                        </div>
                      )}"""

new_form_code = """                      {mode === 'start' ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-outline px-1">Community Name</label>
                          <input
                            type="text"
                            required
                            value={communityName}
                            onChange={(e) => setCommunityName(e.target.value)}
                            placeholder="e.g. Parkwood Heights"
                            className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-outline px-1">Community Name</label>
                            <input
                              type="text"
                              value={invitedCommunityName || 'Loading community...'}
                              readOnly
                              className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl font-bold text-primary opacity-70 cursor-not-allowed"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-outline px-1">Invite Code</label>
                            <input
                              type="text"
                              required
                              value={inviteCode}
                              onChange={(e) => setInviteCode(e.target.value)}
                              readOnly={isInviteJoinFlow}
                              placeholder="Enter your invite code"
                              className={cn(
                                "w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary",
                                isInviteJoinFlow && "opacity-70 cursor-not-allowed"
                              )}
                            />
                          </div>
                        </>
                      )}"""

content = content.replace(old_form_code, new_form_code)

old_blue_box = """                      {mode === 'join' && (
                        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-800">1-Year Member Access</h4>
                            <p className="text-[11px] text-blue-700 leading-relaxed">
                              You'll have full platform access for a 1-year trial. After that, pay R149 once-off for lifetime membership, or R349 once-off to create and lead your own community at any time.
                            </p>
                          </div>
                        </div>
                      )}"""

new_blue_box = """                      {mode === 'join' && (
                        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-800">Community Membership</h4>
                            <p className="text-[11px] text-blue-700 leading-relaxed">
                              You have been invited to join this community. Note that to activate lifetime community membership, your fee will only be R149 once-off securely via our system.
                            </p>
                          </div>
                        </div>
                      )}"""

content = content.replace(old_blue_box, new_blue_box)

with open('src/components/Onboarding.tsx', 'w') as f:
    f.write(content)

