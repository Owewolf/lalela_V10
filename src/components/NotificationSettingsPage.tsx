import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, ShieldAlert, Building2, MessageSquare, Tag, Megaphone, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { cn } from '../lib/utils';
import { NotificationPreferences, CommunityNotificationOverride } from '../types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface NotificationSettingsPageProps {
  onBack: () => void;
}

const defaultPreferences: NotificationPreferences = {
  globalEnabled: true,
  generalNotices: true,
  listingUpdates: true,
  communityActivity: true,
  businessActivity: true,
  priorityCommunityIds: [],
  communityOverrides: {},
};

type NotifTypeKey = 'generalNotices' | 'listingUpdates' | 'communityActivity' | 'businessActivity';

export const NotificationSettingsPage: React.FC<NotificationSettingsPageProps> = ({ onBack }) => {
  const { communities, updateNotificationPreferences } = useCommunity();
  const { user } = useFirebase();
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPreferences);
  const [saving, setSaving] = useState(false);
  const [expandedCommunityId, setExpandedCommunityId] = useState<string | null>(null);

  // Listen to user's notification_preferences in real-time
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data();
      if (data?.notification_preferences) {
        setPrefs({ ...defaultPreferences, ...data.notification_preferences as NotificationPreferences });
      }
    });
    return unsub;
  }, [user]);

  const save = async (updated: NotificationPreferences) => {
    setPrefs(updated);
    setSaving(true);
    try {
      await updateNotificationPreferences(updated);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Omit<NotificationPreferences, 'priorityCommunityIds' | 'communityOverrides'>) => {
    save({ ...prefs, [key]: !prefs[key] });
  };

  const toggleCommunityType = (communityId: string, key: NotifTypeKey) => {
    const currentOverride: CommunityNotificationOverride = prefs.communityOverrides?.[communityId] ?? {};
    // Effective value for this key (override wins, falls back to global)
    const currentValue = currentOverride[key] ?? prefs[key];
    const newOverride = { ...currentOverride, [key]: !currentValue };

    // If the override fully matches global defaults, remove the entry to keep prefs clean
    const matchesGlobal = (
      (newOverride.generalNotices ?? prefs.generalNotices) === prefs.generalNotices &&
      (newOverride.listingUpdates ?? prefs.listingUpdates) === prefs.listingUpdates &&
      (newOverride.communityActivity ?? prefs.communityActivity) === prefs.communityActivity &&
      (newOverride.businessActivity ?? prefs.businessActivity) === prefs.businessActivity
    );

    const updatedOverrides = { ...(prefs.communityOverrides ?? {}) };
    if (matchesGlobal) {
      delete updatedOverrides[communityId];
    } else {
      updatedOverrides[communityId] = newOverride;
    }
    save({ ...prefs, communityOverrides: updatedOverrides });
  };

  // Returns a displayable status string and colour class for a community's override
  const getCommunityStatus = (communityId: string): { label: string; colour: string } => {
    const override = prefs.communityOverrides?.[communityId];
    if (!override) return { label: 'Follows global', colour: 'text-outline' };
    const types: NotifTypeKey[] = ['generalNotices', 'listingUpdates', 'communityActivity', 'businessActivity'];
    const onCount = types.filter(k => override[k] ?? prefs[k]).length;
    if (onCount === 0) return { label: 'Muted', colour: 'text-error' };
    if (onCount === 4) return { label: 'All on', colour: 'text-primary' };
    return { label: `${onCount} of 4 on`, colour: 'text-tertiary' };
  };

  const notificationTypes: { key: NotifTypeKey; icon: React.ElementType; label: string; description: string }[] = [
    { key: 'generalNotices', icon: Megaphone, label: 'General Notices', description: 'Community announcements and general updates' },
    { key: 'listingUpdates', icon: Tag, label: 'Listing Updates', description: 'New listings, price changes, and marketplace activity' },
    { key: 'communityActivity', icon: MessageSquare, label: 'Community Activity', description: 'Posts, comments, and member activity' },
    { key: 'businessActivity', icon: Building2, label: 'Business Activity', description: 'Business updates, promotions, and reviews' },
  ];

  return (
    <main className="min-h-screen bg-surface pb-32">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-surface-container-low transition-colors">
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </button>
          <div>
            <h1 className="text-2xl font-headline font-bold text-on-surface">Notification Settings</h1>
            <p className="text-sm text-outline">Manage how you receive notifications</p>
          </div>
          {saving && <span className="ml-auto text-xs text-outline animate-pulse">Saving…</span>}
        </div>

        {/* Emergency Banner */}
        <section className="p-6 rounded-3xl bg-error/10 border border-error/20 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-error" />
            </div>
            <div>
              <h2 className="text-lg font-headline font-bold text-error">Emergency Notifications</h2>
              <p className="text-sm text-on-error-container">
                Emergency notifications are always enabled and cannot be turned off.
                These include security alerts and critical community warnings.
              </p>
            </div>
          </div>
        </section>

        {/* Notification Types */}
        <section className="p-6 rounded-3xl bg-surface-container-lowest space-y-4">
          <h2 className="text-lg font-headline font-bold text-on-surface">Notification Types</h2>
          <p className="text-sm text-outline mb-2">Default settings applied to all communities unless overridden below</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notificationTypes.map((item) => (
              <motion.div
                key={item.key}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  !prefs.globalEnabled && "opacity-50 pointer-events-none",
                  prefs[item.key]
                    ? "border-primary/20 bg-primary/5"
                    : "border-outline/10 bg-surface-container-low"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    prefs[item.key] ? "bg-primary/10 text-primary" : "bg-outline/10 text-outline"
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-on-surface text-sm">{item.label}</p>
                    <p className="text-xs text-outline truncate">{item.description}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={prefs[item.key]}
                    onChange={() => toggle(item.key)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Community Settings — per-community per-type overrides */}
        {communities.length > 1 && (
          <section className={cn("p-6 rounded-3xl bg-surface-container-lowest space-y-4", !prefs.globalEnabled && "opacity-50 pointer-events-none")}>
            <div>
              <h2 className="text-lg font-headline font-bold text-on-surface">Community Settings</h2>
              <p className="text-sm text-outline mt-1">
                Customise which notifications you receive per community. Tap a community to override its settings independently.
              </p>
            </div>
            <div className="space-y-2">
              {communities.map((community) => {
                const isExpanded = expandedCommunityId === community.id;
                const { label: statusLabel, colour: statusColour } = getCommunityStatus(community.id);
                const override = prefs.communityOverrides?.[community.id];

                return (
                  <div
                    key={community.id}
                    className={cn(
                      "rounded-2xl border overflow-hidden transition-colors",
                      isExpanded ? "border-primary/20 bg-primary/5" : "border-outline/10 bg-surface-container-low"
                    )}
                  >
                    {/* Collapsed header — always visible */}
                    <button
                      onClick={() => setExpandedCommunityId(isExpanded ? null : community.id)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-on-surface text-sm truncate">{community.name}</p>
                        <p className={cn("text-xs font-medium mt-0.5", statusColour)}>{statusLabel}</p>
                      </div>
                      <ChevronDown
                        className={cn("w-4 h-4 text-outline shrink-0 transition-transform duration-200", isExpanded && "rotate-180")}
                      />
                    </button>

                    {/* Expanded per-type toggles */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-1 border-t border-outline/10 pt-3">
                            {!override && (
                              <p className="text-xs text-outline italic mb-3">
                                Using global defaults — toggle any type below to customise this community.
                              </p>
                            )}
                            {notificationTypes.map((item) => {
                              const effectiveValue = override?.[item.key] ?? prefs[item.key];
                              return (
                                <div
                                  key={item.key}
                                  className={cn(
                                    "flex items-center justify-between py-3 px-3 rounded-xl transition-colors",
                                    effectiveValue ? "bg-primary/5" : "bg-surface-container"
                                  )}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                      effectiveValue ? "bg-primary/10 text-primary" : "bg-outline/10 text-outline"
                                    )}>
                                      <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-on-surface">{item.label}</p>
                                      {override?.[item.key] !== undefined && override[item.key] !== prefs[item.key] && (
                                        <p className="text-xs text-tertiary">Overriding global</p>
                                      )}
                                    </div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                                    <input
                                      type="checkbox"
                                      checked={effectiveValue}
                                      onChange={() => toggleCommunityType(community.id, item.key)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                  </label>
                                </div>
                              );
                            })}
                            {override && (
                              <button
                                onClick={() => {
                                  const updatedOverrides = { ...(prefs.communityOverrides ?? {}) };
                                  delete updatedOverrides[community.id];
                                  save({ ...prefs, communityOverrides: updatedOverrides });
                                }}
                                className="w-full mt-2 text-xs text-outline hover:text-error transition-colors text-center py-2"
                              >
                                Reset to global defaults
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};
