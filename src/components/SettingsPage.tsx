import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  BellRing, 
  Users, 
  ChevronRight, 
  ShieldCheck, 
  UserCog, 
  History, 
  MapPin, 
  ReceiptText, 
  HeartHandshake, 
  LogOut,
  Camera,
  ChevronDown,
  Store,
  Plus,
  Edit,
  Trash2,
  Globe,
  Building2,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Heart,
  HandHeart,
  BadgeCheck,
  TrendingUp,
  ArrowLeft,
  Shield,
  AlertCircle as UrgencyIcon,
  Search,
  LayoutDashboard,
  Gavel
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { cn } from '../lib/utils';
import { APP_LOGO_ALT_PATH, APP_LOGO_PATH, BUSINESS_CATEGORIES } from '../constants';
import { Charity, CharityCategory, CharityUrgency, CharityStatus, NotificationPreferences } from '../types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { usePlacesAutocomplete, geocodeByAddress } from '../hooks/usePlacesAutocomplete';

const AddressAutocomplete = ({ 
  defaultValue, 
  onSelect,
  className 
}: { 
  defaultValue: string, 
  onSelect: (address: string, lat: number, lng: number) => void,
  className?: string
}) => {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
    defaultValue
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleSelect = async (suggestion: any) => {
    const { description } = suggestion;
    setValue(description, false);
    clearSuggestions();

    try {
      const { lat, lng } = await geocodeByAddress(description);
      onSelect(description, lat, lng);
    } catch (error) {
      console.error("Error fetching geocode: ", error);
    }
  };

  return (
    <div className="relative w-full">
      <input
        name="address"
        value={value}
        onChange={handleInput}
        disabled={!ready}
        placeholder="123 Community St, Suburb"
        className={className}
        required
      />
      {status === "OK" && (
        <ul className="absolute z-[100] w-full bg-surface-container-lowest mt-1 rounded-xl shadow-xl border border-outline-variant/20 overflow-hidden max-h-60 overflow-y-auto">
          {data.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-3 hover:bg-surface-container-low cursor-pointer text-sm text-on-surface transition-colors border-b border-outline-variant/10 last:border-0"
            >
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const NotificationToggleRow: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
  const { user, updateUserProfile } = useFirebase();
  const { updateNotificationPreferences } = useCommunity();
  const [globalEnabled, setGlobalEnabled] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data();
      if (data?.notification_preferences) {
        setGlobalEnabled((data.notification_preferences as NotificationPreferences).globalEnabled);
      }
    });
    return unsub;
  }, [user]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !globalEnabled;
    setGlobalEnabled(newVal);
    if (newVal) {
      // Turning ON → save and navigate to settings
      await updateNotificationPreferences({
        globalEnabled: true,
        generalNotices: true,
        listingUpdates: true,
        communityActivity: true,
        businessActivity: true,
        priorityCommunityIds: [],
      });
      onNavigate();
    } else {
      // Turning OFF → just disable
      const userDoc = await import('firebase/firestore').then(m => m.getDoc(doc(db, 'users', user!.uid)));
      const currentPrefs = userDoc.data()?.notification_preferences as NotificationPreferences | undefined;
      await updateNotificationPreferences({
        ...(currentPrefs || {
          generalNotices: true,
          listingUpdates: true,
          communityActivity: true,
          businessActivity: true,
          priorityCommunityIds: [],
        }),
        globalEnabled: false,
      });
    }
  };

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors group cursor-pointer"
      onClick={globalEnabled ? onNavigate : undefined}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
          globalEnabled ? "bg-surface-container-low text-primary" : "bg-outline/10 text-outline"
        )}>
          <BellRing className="w-5 h-5" />
        </div>
        <div>
          <span className="font-medium text-on-surface">Notifications</span>
          <p className="text-xs text-outline">
            {globalEnabled ? 'Tap to manage' : 'All non-emergency paused'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer shrink-0" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={globalEnabled}
            onChange={() => {}}
            onClick={handleToggle as any}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
        {globalEnabled && (
          <ChevronRight className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
        )}
      </div>
    </motion.div>
  );
};

interface SettingsPageProps {
  onNavigateToAdmin: () => void;
  onNavigateToAccountSecurity: () => void;
  onNavigateToBenefitsPricing: () => void;
  onNavigateToCommunityDashboard: (communityId: string, role: string, options?: { guidedSetup?: boolean }) => void;
  onNavigateToNotificationSettings: () => void;
  initialManageCharity?: boolean;
  onCloseManageCharity?: () => void;
}

type CharitySubView = 'list' | 'add' | 'edit' | 'suggestions';

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  onNavigateToAdmin,
  onNavigateToAccountSecurity,
  onNavigateToBenefitsPricing,
  onNavigateToCommunityDashboard,
  onNavigateToNotificationSettings,
  initialManageCharity = false,
  onCloseManageCharity
}) => {
  const { userProfile, updateUserProfile, signOut, user } = useFirebase();
  const { 
    currentCommunity, 
    setCurrentCommunity, 
    communities,
    createCommunity,
    licenseCommunity,
    userBusinesses,
    addUserBusiness,
    updateUserBusiness,
    removeUserBusiness,
    charities,
    addCharity,
    updateCharity,
    removeCharity,
    charitySuggestions,
    approveCharitySuggestion,
    rejectCharitySuggestion,
    addCharitySuggestion
  } = useCommunity();

  const [isAddingBusiness, setIsAddingBusiness] = React.useState(false);
  const [formLat, setFormLat] = React.useState<number | string>('');
  const [formLng, setFormLng] = React.useState<number | string>('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>(BUSINESS_CATEGORIES[0].label);
  const [isManagingCharity, setIsManagingCharity] = React.useState(initialManageCharity);
  const [charitySubView, setCharitySubView] = React.useState<CharitySubView>('list');
  const [selectedCharity, setSelectedCharity] = React.useState<Charity | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = React.useState<string | null>(null);
  const [adminFeedback, setAdminFeedback] = React.useState('');
  const [isProcessingSuggestion, setIsProcessingSuggestion] = React.useState<'approve' | 'reject' | null>(null);
  const [isSuggestingCharity, setIsSuggestingCharity] = React.useState(false);
  const [suggestionError, setSuggestionError] = React.useState('');

  React.useEffect(() => {
    if (initialManageCharity) {
      setIsManagingCharity(true);
    }
  }, [initialManageCharity]);

  const handleCloseCharity = () => {
    setIsManagingCharity(false);
    setCharitySubView('list');
    setSelectedCharity(null);
    onCloseManageCharity?.();
  };

  const enabledCategories = React.useMemo(() => {
    const enabledCategoryIds = currentCommunity?.enabledCategories;
    if (!enabledCategoryIds) return BUSINESS_CATEGORIES;
    return BUSINESS_CATEGORIES.filter(cat => enabledCategoryIds.includes(cat.id));
  }, [currentCommunity?.enabledCategories]);

  React.useEffect(() => {
    if (enabledCategories.length > 0 && !enabledCategories.some(c => c.label === selectedCategory)) {
      setSelectedCategory(enabledCategories[0].label);
    }
  }, [enabledCategories, selectedCategory]);

  const [isCreatingCommunity, setIsCreatingCommunity] = React.useState(false);
  const [isManagementDropdownOpen, setIsManagementDropdownOpen] = React.useState(false);

  const [editingBusinessId, setEditingBusinessId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (editingBusinessId) {
      const business = userBusinesses.find(b => b.id === editingBusinessId);
      if (business) {
        setFormLat(business.latitude);
        setFormLng(business.longitude);
      }
    } else if (isAddingBusiness) {
      setFormLat(userProfile?.defaultLocation?.latitude || currentCommunity?.coverageArea?.latitude || -26.2041);
      setFormLng(userProfile?.defaultLocation?.longitude || currentCommunity?.coverageArea?.longitude || 28.0473);
    }
  }, [editingBusinessId, isAddingBusiness, userBusinesses, userProfile, currentCommunity]);

  const [isSelectorOpen, setIsSelectorOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isAdminOrModerator = currentCommunity?.userRole === 'Admin' || currentCommunity?.userRole === 'Moderator';
  const hasTrialCommunity = communities.some(c => c.owner_id === userProfile?.id && c.type === 'TRIAL');
  const canCreateNewCommunity = !hasTrialCommunity;

  const isPurelyInvited = communities.length > 0 && !communities.some(c => c.owner_id === userProfile?.id);
  const isUnlicensedPlatformMember = isPurelyInvited && userProfile?.license_status === 'UNLICENSED';

  const renderCharityManagement = () => {
    if (charitySubView === 'suggestions') {
      return (
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCharitySubView('list')}
              className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <h3 className="text-2xl font-headline font-bold text-primary">Charity Suggestions</h3>
          </div>

          <div className="space-y-6">
            {charitySuggestions.filter(s => s.status === 'pending').length === 0 ? (
              <div className="text-center py-12 bg-surface-container-low rounded-[2.5rem]">
                <HeartHandshake className="w-12 h-12 text-outline/20 mx-auto mb-4" />
                <p className="text-outline font-bold">No pending suggestions</p>
                <p className="text-xs text-outline/60">Community members haven't suggested any charities yet.</p>
              </div>
            ) : (
              charitySuggestions.filter(s => s.status === 'pending').map((suggestion) => (
                <div key={suggestion.id} className="bg-surface-container-lowest p-6 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-bold text-on-surface">{suggestion.name}</h4>
                      <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Suggested by {suggestion.suggested_by_name}</p>
                    </div>
                    <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
                      {suggestion.suggested_donation_amount ?? 0}% Suggested
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      <span className="font-bold text-on-surface">Mission:</span> {suggestion.description}
                    </p>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      <span className="font-bold text-on-surface">Reason:</span> {suggestion.reason}
                    </p>
                    {suggestion.website && (
                      <a href={suggestion.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Official Website
                      </a>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => {
                        setSelectedSuggestionId(suggestion.id);
                        setIsProcessingSuggestion('reject');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-error/5 text-error text-[10px] font-bold hover:bg-error/10 transition-colors"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedSuggestionId(suggestion.id);
                        setIsProcessingSuggestion('approve');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[10px] font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Approve & Set Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Processing Modal */}
          <AnimatePresence>
            {isProcessingSuggestion && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsProcessingSuggestion(null)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-md bg-surface-container-lowest rounded-[2.5rem] shadow-2xl overflow-hidden border border-outline-variant/10"
                >
                  <div className="p-8">
                    <h4 className="text-xl font-bold text-primary mb-4">
                      {isProcessingSuggestion === 'approve' ? 'Approve Suggestion' : 'Reject Suggestion'}
                    </h4>
                    <p className="text-xs text-on-surface-variant mb-6">
                      {isProcessingSuggestion === 'approve' 
                        ? 'Provide feedback to the member and confirm the final charity details.' 
                        : 'Explain why this suggestion is being declined.'}
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Admin Feedback</label>
                        <textarea 
                          value={adminFeedback}
                          onChange={(e) => setAdminFeedback(e.target.value)}
                          placeholder="Your message to the community member..."
                          rows={4}
                          className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => setIsProcessingSuggestion(null)}
                          className="flex-1 py-3 rounded-xl bg-surface-container-low text-outline text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={async () => {
                            if (!selectedSuggestionId) return;
                            const suggestion = charitySuggestions.find(s => s.id === selectedSuggestionId);
                            if (!suggestion) return;

                            try {
                              if (isProcessingSuggestion === 'approve') {
                                await approveCharitySuggestion(selectedSuggestionId, adminFeedback, {
                                  community_id: currentCommunity?.id || '',
                                  name: suggestion.name,
                                  description: suggestion.description,
                                  category: 'Community Support',
                                  percentage: (suggestion.suggested_donation_amount && suggestion.suggested_donation_amount >= 1 && suggestion.suggested_donation_amount <= 100)
                                    ? suggestion.suggested_donation_amount
                                    : 5,
                                  latitude: currentCommunity?.coverageArea?.latitude ?? 0,
                                  longitude: currentCommunity?.coverageArea?.longitude ?? 0,
                                  location_name: currentCommunity?.coverageArea?.location_name ?? 'Community Coverage Area',
                                  tags: ['Verified', 'Member Suggested'],
                                  isVerified: true,
                                  isFeatured: false,
                                  urgency: 'Normal',
                                  status: 'Active',
                                  linkedBusinessIds: []
                                });
                              } else {
                                await rejectCharitySuggestion(selectedSuggestionId, adminFeedback);
                              }
                            } catch (error) {
                              console.error('Charity suggestion processing failed:', error);
                            }
                            setIsProcessingSuggestion(null);
                            setAdminFeedback('');
                            setSelectedSuggestionId(null);
                          }}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-white text-xs font-bold shadow-lg",
                            isProcessingSuggestion === 'approve' ? "bg-primary shadow-primary/20" : "bg-error shadow-error/20"
                          )}
                        >
                          Confirm {isProcessingSuggestion === 'approve' ? 'Approval' : 'Rejection'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (charitySubView === 'add' || charitySubView === 'edit') {
      return (
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setCharitySubView('list');
                setSelectedCharity(null);
              }}
              className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <h3 className="text-2xl font-headline font-bold text-primary">
              {charitySubView === 'add' ? 'Add New Charity' : 'Edit Charity'}
            </h3>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const rawFundraisingGoal = (formData.get('fundraisingGoal') as string)?.trim();
              const charityData = {
                community_id: currentCommunity?.id || '',
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                category: formData.get('category') as CharityCategory,
                percentage: Number(formData.get('percentage')),
                latitude: Number(formData.get('latitude')),
                longitude: Number(formData.get('longitude')),
                location_name: formData.get('location_name') as string,
                contactPhone: formData.get('contactPhone') as string,
                contactEmail: formData.get('contactEmail') as string,
                website: formData.get('website') as string,
                logo: formData.get('logo') as string,
                coverImage: formData.get('coverImage') as string,
                tags: (formData.get('tags') as string).split(',').map(t => t.trim()),
                isVerified: formData.get('isVerified') === 'on',
                isFeatured: formData.get('isFeatured') === 'on',
                urgency: formData.get('urgency') as CharityUrgency,
                status: 'Active' as CharityStatus,
                linkedBusinessIds: selectedCharity?.linkedBusinessIds || [],
                fundraisingGoal: rawFundraisingGoal ? Number(rawFundraisingGoal) : undefined,
                campaignCompleted: selectedCharity?.campaignCompleted || false
              };

              if (charityData.isFeatured) {
                const otherFeatured = charities.filter(c => 
                  c.isFeatured && 
                  c.id !== selectedCharity?.id && 
                  c.community_id === charityData.community_id
                );
                for (const c of otherFeatured) {
                  await updateCharity({ ...c, isFeatured: false });
                }
              }

              if (charitySubView === 'add') {
                await addCharity(charityData);
              } else if (selectedCharity) {
                await updateCharity({ ...charityData, id: selectedCharity.id, createdAt: selectedCharity.createdAt });
              }
              setCharitySubView('list');
              setSelectedCharity(null);
            }}
            className="grid grid-cols-1 gap-8"
          >
            <div className="space-y-6">
              <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
                <h4 className="text-lg font-bold text-primary">Basic Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Charity Name</label>
                    <input name="name" defaultValue={selectedCharity?.name} required className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Description / Mission</label>
                    <textarea name="description" defaultValue={selectedCharity?.description} required rows={4} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Category</label>
                      <select name="category" defaultValue={selectedCharity?.category} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20">
                        <option>Community Support</option>
                        <option>Education</option>
                        <option>Health</option>
                        <option>Animal Welfare</option>
                        <option>Disaster Relief</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Urgency</label>
                      <select name="urgency" defaultValue={selectedCharity?.urgency} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20">
                        <option>Normal</option>
                        <option>High</option>
                        <option>Critical</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
                <h4 className="text-lg font-bold text-primary">Location & Coverage</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Location Name</label>
                    <input name="location_name" defaultValue={selectedCharity?.location_name ?? currentCommunity?.coverageArea?.location_name ?? 'Community Coverage Area'} required className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Latitude</label>
                      <input name="latitude" type="number" step="any" defaultValue={selectedCharity?.latitude ?? currentCommunity?.coverageArea?.latitude} required className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Longitude</label>
                      <input name="longitude" type="number" step="any" defaultValue={selectedCharity?.longitude ?? currentCommunity?.coverageArea?.longitude} required className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
                <h4 className="text-lg font-bold text-primary">Media & Links</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Logo URL</label>
                    <input name="logo" defaultValue={selectedCharity?.logo} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Cover Image URL</label>
                    <input name="coverImage" defaultValue={selectedCharity?.coverImage} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Website</label>
                    <input name="website" defaultValue={selectedCharity?.website} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
                <h4 className="text-lg font-bold text-primary">Settings & Impact</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Donation Percentage (%)</label>
                    <input name="percentage" type="number" defaultValue={selectedCharity?.percentage || 5} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20" />
                    <p className="text-[10px] text-outline mt-1 italic">Added to marketplace listings when supporting this cause.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Fundraising Goal (R)</label>
                    <input
                      name="fundraisingGoal"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={selectedCharity?.fundraisingGoal ?? ''}
                      placeholder="e.g. 50000"
                      className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[10px] text-outline mt-1 italic">Used in the Charity Hub to track campaign progress against a target.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Tags (comma separated)</label>
                    <input name="tags" defaultValue={selectedCharity?.tags.join(', ')} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isVerified" defaultChecked={selectedCharity?.isVerified} className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary" />
                      <span className="text-sm font-bold text-on-surface">Verified</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isFeatured" defaultChecked={selectedCharity?.isFeatured} className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary" />
                      <span className="text-sm font-bold text-on-surface">Featured</span>
                    </label>
                  </div>
                </div>
              </section>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setCharitySubView('list');
                    setSelectedCharity(null);
                  }}
                  className="flex-1 py-4 rounded-2xl bg-surface-container-low text-outline font-bold hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-2 py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {charitySubView === 'add' ? 'Create Charity' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-headline font-bold text-primary">Charity Management</h3>
            <p className="text-xs text-on-surface-variant font-medium">Manage community causes, verification, and featured listings.</p>
          </div>
          <button 
            onClick={() => setCharitySubView('add')}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Charity
          </button>
        </div>

        {/* Suggestions Queue Link */}
        {charitySuggestions.filter(s => s.status === 'pending').length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setCharitySubView('suggestions')}
            className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between group hover:bg-amber-500/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-lg">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-amber-700">Pending Suggestions</p>
                <p className="text-[10px] text-amber-600 font-medium">
                  {charitySuggestions.filter(s => s.status === 'pending').length} new charity suggestions from members
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        )}

        <div className="grid grid-cols-1 gap-6">
          {charities.filter(c => c.status !== 'Archived').map((charity) => (
            <motion.div 
              key={charity.id}
              layoutId={charity.id}
              className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden group"
            >
              <div className="h-32 bg-surface-container-low relative">
                {charity.coverImage ? (
                  <img src={charity.coverImage} alt={charity.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-outline/20">
                    <Heart className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  {charity.isVerified && (
                    <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
                      <BadgeCheck className="w-4 h-4" />
                    </div>
                  )}
                  {charity.isFeatured && (
                    <div className="bg-amber-500 text-white p-1.5 rounded-full shadow-lg">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">{charity.category}</span>
                    <h4 className="font-bold text-lg text-on-surface">{charity.name}</h4>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-md text-[9px] font-bold uppercase",
                    charity.urgency === 'Critical' ? "bg-error text-white" :
                    charity.urgency === 'High' ? "bg-amber-500 text-white" : "bg-surface-container-high text-outline"
                  )}>
                    {charity.urgency}
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                  {charity.description}
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-outline">
                    <MapPin className="w-3 h-3" />
                    {charity.location_name}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-outline">
                    <HandHeart className="w-3 h-3" />
                    {charity.percentage}% Impact
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <ReceiptText className="w-3 h-3" />
                    R {(charity.totalRaised || 0).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedCharity(charity);
                      setCharitySubView('edit');
                    }}
                    className="flex-1 py-2 rounded-xl bg-surface-container-low text-outline text-[10px] font-bold hover:bg-surface-container-high transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => removeCharity(charity.id)}
                    className="p-2 rounded-xl bg-error/5 text-error hover:bg-error/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {charities.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mx-auto text-outline/30">
                <Heart className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-primary">No Charities Yet</h4>
                <p className="text-sm text-on-surface-variant">Start by adding a charitable cause to your community.</p>
              </div>
              <button 
                onClick={() => setCharitySubView('add')}
                className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Add Your First Charity
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const toggleCommunityForBusiness = (businessId: string, communityId: string) => {
    const business = userBusinesses.find(b => b.id === businessId);
    if (!business) return;

    const newCommunityIds = business.communityIds.includes(communityId)
      ? business.communityIds.filter(id => id !== communityId)
      : [...business.communityIds, communityId];
    
    updateUserBusiness({ ...business, communityIds: newCommunityIds });
  };

  return (
    <main className="max-w-2xl mx-auto px-6 pt-6 pb-32">
      {/* User Profile Section - Identity Hub */}
      <section className="mb-10 bg-surface-container-lowest rounded-[2rem] p-8 shadow-sm border border-surface-container">
        <div className="flex items-center gap-8 mb-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-surface-container-high border-4 border-surface-container-lowest shadow-ambient">
              <img 
                alt="User Avatar" 
                className="w-full h-full object-cover" 
                src={userProfile?.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.id}`}
                referrerPolicy="no-referrer"
              />
            </div>
            <button className="absolute bottom-1 right-1 p-2 clay-gradient rounded-full text-white border-2 border-background shadow-lg hover:scale-110 transition-transform">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-3xl font-bold font-headline text-on-surface leading-tight">{userProfile?.name}</h2>
              <button 
                onClick={onNavigateToAccountSecurity} 
                className="p-1 text-outline hover:text-primary transition-colors"
                title="Edit Profile"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 text-on-surface-variant font-medium">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{currentCommunity?.name}</span>
              </div>
              <span className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                currentCommunity?.type === 'LICENSED' 
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                  : "bg-amber-100 text-amber-700 border-amber-200"
              )}>
                {currentCommunity?.type === 'LICENSED' ? (
                  <>
                    <ShieldCheck className="w-3 h-3" />
                    Licensed
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Unlicensed
                  </>
                )}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className={cn(
                "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                currentCommunity?.userRole === 'Admin' ? "bg-error/10 text-error" : currentCommunity?.userRole === 'Moderator' ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  currentCommunity?.userRole === 'Admin' ? "bg-error" : currentCommunity?.userRole === 'Moderator' ? "bg-secondary" : "bg-primary"
                )}></span>
                {currentCommunity?.userRole || 'MEMBER'}
              </div>

              {currentCommunity?.isSecurityMember && (
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm bg-secondary/10 text-secondary border border-secondary/20">
                  <Shield className="w-3 h-3" />
                  Security Responder
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Community Switcher & Management */}
        <div className="mt-8 pt-8 border-t border-surface-container space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Community Switcher</h3>
          </div>

          {/* Single Dropdown for Switching & Management */}
          <div className="relative">
            <div
              onClick={() => setIsManagementDropdownOpen(!isManagementDropdownOpen)}
              className="w-full flex items-center justify-between p-4 bg-surface-container-lowest border border-surface-container rounded-2xl hover:border-primary/30 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <img
                  src={APP_LOGO_PATH}
                  alt="Lalela logo"
                  className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-primary/20"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline leading-none mb-1">Active Community</p>
                  <h4 className="text-sm font-bold text-on-surface">
                    {currentCommunity?.name || 'Select Community'}
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {currentCommunity && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToCommunityDashboard(currentCommunity.id, currentCommunity.userRole || 'Member');
                      }}
                      className="px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                    >
                      Admin Dashboard
                    </button>
                    {currentCommunity.userRole && (
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                        (currentCommunity.userRole === 'Admin' || currentCommunity.userRole === 'Moderator') ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                      )}>
                        {currentCommunity.userRole}
                      </span>
                    )}
                  </div>
                )}
                <ChevronDown className={cn("w-5 h-5 text-outline transition-transform duration-300", isManagementDropdownOpen && "rotate-180")} />
              </div>
            </div>

            <AnimatePresence>
              {isManagementDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-2 z-50 bg-surface-container-lowest border border-surface-container rounded-2xl shadow-xl overflow-hidden"
                >
                  <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                    {communities.map(c => {
                      const isAdminOrMod = c.owner_id === userProfile?.id || c.userRole === 'Admin' || c.userRole === 'Moderator';
                      const isActive = c.id === currentCommunity?.id;
                      
                      return (
                        <div
                          key={c.id}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all group/item",
                            isActive ? "bg-primary/5" : "hover:bg-surface-container-low"
                          )}
                        >
                          <button
                            onClick={() => {
                              setCurrentCommunity(c.id);
                              setIsManagementDropdownOpen(false);
                            }}
                            className="flex-1 flex items-center gap-3 text-left"
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center transition-colors",
                              isActive ? "bg-primary" : "bg-surface-container group-hover/item:bg-primary/10"
                            )}>
                              <img
                                src={isActive ? APP_LOGO_PATH : APP_LOGO_ALT_PATH}
                                alt="Lalela logo"
                                className="w-5 h-5 object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <p className={cn(
                                "text-sm font-bold transition-colors",
                                isActive ? "text-primary" : "text-on-surface group-hover/item:text-primary"
                              )}>{c.name}</p>
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                isAdminOrMod ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                              )}>
                                {c.userRole || 'Member'}
                              </span>
                              <span className={cn(
                                "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ml-2",
                                c.type === 'LICENSED' 
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                              )}>
                                {c.type === 'LICENSED' ? 'Licensed' : 'Unlicensed'}
                              </span>
                            </div>
                          </button>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToCommunityDashboard(c.id, c.userRole || 'Member');
                                setIsManagementDropdownOpen(false);
                              }}
                              className={cn(
                                "px-2 py-1 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg",
                                isActive 
                                  ? "bg-emerald-500 text-white shadow-sm opacity-100" 
                                  : "text-outline hover:text-primary opacity-0 group-hover/item:opacity-100"
                              )}
                            >
                              Admin Dashboard
                            </button>
                            {isActive && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* My Businesses Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-outline">My Businesses</h3>
          <button 
            onClick={() => setIsAddingBusiness(true)}
            className="flex items-center gap-1.5 text-primary text-xs font-bold hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add Business
          </button>
        </div>

        <div className="space-y-4">
          {userBusinesses.filter(b => b.status !== 'INACTIVE').map((biz) => (
            <div key={biz.id} className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container overflow-hidden relative group">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-container-high shrink-0 shadow-sm">
                  <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-lg text-on-surface truncate pr-2">{biz.name}</h4>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingBusinessId(biz.id);
                          setIsAddingBusiness(true);
                          setSelectedCategory(biz.category);
                        }}
                        className="p-2 rounded-full hover:bg-surface-container-low text-outline hover:text-primary transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removeUserBusiness(biz.id)}
                        className="p-2 rounded-full hover:bg-error/10 text-outline hover:text-error transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
                    <Building2 className="w-3 h-3" />
                    <span>{biz.category}</span>
                  </div>
                  {biz.charityId && (
                    <div className="flex items-center gap-2 text-[10px] text-secondary font-bold mt-1">
                      <HeartHandshake className="w-3 h-3" />
                      <span>Supporting {charities.find(c => c.id === biz.charityId)?.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-px bg-outline-variant/20" />
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-outline mb-3">
                    Active Communities
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {communities.map(comm => (
                      <button
                        key={comm.id}
                        onClick={() => toggleCommunityForBusiness(biz.id, comm.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border",
                          biz.communityIds.includes(comm.id)
                            ? "bg-secondary/10 border-secondary/20 text-secondary"
                            : "bg-surface-container-low border-transparent text-outline hover:bg-surface-container-high"
                        )}
                      >
                        <Globe className={cn("w-3 h-3", biz.communityIds.includes(comm.id) ? "text-secondary" : "text-outline")} />
                        {comm.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {userBusinesses.filter(b => b.status !== 'INACTIVE').length === 0 && (
            <div className="bg-surface-container-low/50 border-2 border-dashed border-outline-variant/30 rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-3">
              <Store className="w-12 h-12 text-outline-variant" />
              <div>
                <p className="font-bold text-on-surface-variant">No businesses added yet</p>
                <p className="text-xs text-outline">Add your business to start trading in the community market.</p>
              </div>
              <button 
                onClick={() => setIsAddingBusiness(true)}
                className="mt-2 px-6 py-2.5 bg-primary text-white rounded-full text-xs font-bold shadow-sm active:scale-95 transition-all"
              >
                Add My First Business
              </button>
            </div>
          )}
        </div>
      </section>

      {/* General Settings */}
      <div className="space-y-2 mb-10">
        <h3 className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-outline">General Settings</h3>
        
        {[
          { icon: Lock, label: 'Account & Security', onClick: onNavigateToAccountSecurity },
          { icon: Sparkles, label: 'Benefits & Pricing', onClick: onNavigateToBenefitsPricing },
        ].map((item, idx) => (
          <motion.button 
            key={idx}
            onClick={item.onClick}
            whileHover={{ x: 4 }}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-on-surface">{item.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
          </motion.button>
        ))}
        {/* Notifications row with toggle */}
        <NotificationToggleRow
          onNavigate={onNavigateToNotificationSettings}
        />
      </div>

      {/* Community License */}
      <div className="mb-12 p-6 rounded-3xl bg-primary-container text-on-primary-container">
        <h3 className="pb-6 text-[10px] font-bold uppercase tracking-widest text-on-primary-container/60">Community License</h3>
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">Plan</p>
              <p className="text-3xl font-headline font-extrabold text-white">
                {currentCommunity?.type === 'LICENSED' ? 'Premium' : 'Trial'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">License Status</p>
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20",
                currentCommunity?.type === 'LICENSED' ? "bg-surface-tint" : "bg-amber-500/20"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  currentCommunity?.type === 'LICENSED' ? "bg-green-400" : "bg-amber-400"
                )}></span>
                <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">
                  {currentCommunity?.type === 'LICENSED' ? 'Premium Active' : 'Trial Mode'}
                </span>
              </div>
            </div>
          </div>
          
          {currentCommunity?.type === 'TRIAL' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 rounded-2xl p-4 border border-white/20"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-secondary-fixed shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">Unlock Full Potential</h4>
                  <p className="text-[11px] text-white/70 leading-relaxed mt-1">
                    License your community to remove member limits, enable advanced moderation tools, and start your second community.
                  </p>
                  <button 
                    onClick={() => licenseCommunity(currentCommunity.id)}
                    className="mt-4 w-full py-2.5 bg-white text-primary rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    License Now
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              onClick={async () => {
                if (isUnlicensedPlatformMember) {
                  try {
                    await updateUserProfile({ license_status: 'LICENSED', license_type: 'SELF' });
                    const wantsCommunity = window.confirm("Your personal platform license is now active! Would you also like to create a new community of your own?");
                    if (wantsCommunity) {
                      setIsCreatingCommunity(true);
                    }
                  } catch (err) {
                    console.error('Failed to update license', err);
                  }
                } else if (canCreateNewCommunity) {
                  setIsCreatingCommunity(true);
                } else {
                  const trialCommunity = communities.find(c => c.owner_id === userProfile?.id && c.type === 'TRIAL');
                  if (trialCommunity) licenseCommunity(trialCommunity.id);
                }
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-white text-primary text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              {isUnlicensedPlatformMember ? 'License' : 'Upgrade'}
            </button>
          </div>
        </div>
      </div>

      {/* Suggest Charity Modal (for Members) */}
      <AnimatePresence>
        {isSuggestingCharity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 overflow-y-auto py-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSuggestionError(''); setIsSuggestingCharity(false); }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-headline font-bold text-primary">Suggest a Charity</h2>
                    <p className="text-xs text-on-surface-variant mt-1">Propose a cause you care about for your community.</p>
                  </div>
                  <button 
                    onClick={() => { setSuggestionError(''); setIsSuggestingCharity(false); }}
                    className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-outline" />
                  </button>
                </div>

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const suggestedPercentageRaw = Number(formData.get('amount'));

                    if (!user?.uid || !currentCommunity?.id) {
                      setSuggestionError('Unable to submit suggestion right now. Please refresh and try again.');
                      return;
                    }

                    if (!Number.isInteger(suggestedPercentageRaw) || suggestedPercentageRaw < 1 || suggestedPercentageRaw > 100) {
                      setSuggestionError('Suggested percentage must be a whole number between 1 and 100.');
                      return;
                    }

                    setSuggestionError('');
                    await addCharitySuggestion({
                      community_id: currentCommunity.id,
                      suggested_by_id: user.uid,
                      suggested_by_name: user.displayName || userProfile?.name || 'Community Member',
                      name: formData.get('name') as string,
                      description: formData.get('description') as string,
                      reason: formData.get('reason') as string,
                      suggested_donation_amount: suggestedPercentageRaw,
                      website: formData.get('website') as string,
                    });
                    (e.currentTarget as HTMLFormElement).reset();
                    setIsSuggestingCharity(false);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Charity Name</label>
                    <input 
                      name="name" 
                      required 
                      placeholder="e.g. Rural Water Initiative"
                      className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Description</label>
                    <textarea 
                      name="description" 
                      required 
                      rows={3}
                      placeholder="What is their mission?"
                      className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all resize-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Suggested Percentage (%)</label>
                      <input 
                        name="amount" 
                        type="number"
                        required
                        min={1}
                        max={100}
                        step={1}
                        placeholder="e.g. 5"
                        className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      />
                      <p className="text-[10px] text-outline/80 mt-1 ml-1">Enter a whole number from 1 to 100.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Website (Optional)</label>
                      <input 
                        name="website" 
                        type="url"
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Reason for Suggestion</label>
                    <textarea 
                      name="reason" 
                      required 
                      rows={2}
                      placeholder="Why should we support them?"
                      className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all resize-none" 
                    />
                  </div>
                  {suggestionError && (
                    <p className="text-xs text-error font-semibold">{suggestionError}</p>
                  )}
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => { setSuggestionError(''); setIsSuggestingCharity(false); }}
                      className="flex-1 py-3.5 rounded-2xl bg-surface-container-low text-outline font-bold hover:bg-surface-container-high transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Submit Suggestion
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Action */}
      <button 
        onClick={signOut}
        className="w-full py-4 text-center text-error font-bold flex items-center justify-center gap-2 hover:bg-error/5 rounded-2xl transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Sign out of Lalela
      </button>

      {/* Add Business Modal */}
      <AnimatePresence>
        {isAddingBusiness && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 overflow-y-auto py-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddingBusiness(false);
                setEditingBusinessId(null);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-surface rounded-[2.5rem] p-8 shadow-2xl overflow-hidden my-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold font-headline text-primary">
                  {editingBusinessId ? 'Edit Business' : 'Add Business'}
                </h3>
                <button 
                  onClick={() => {
                    setIsAddingBusiness(false);
                    setEditingBusinessId(null);
                  }}
                  className="p-2 rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <X className="w-6 h-6 text-outline" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const businessData = {
                    name: formData.get('name') as string,
                    category: formData.get('category') as string,
                    subcategory: formData.get('subcategory') as string,
                    description: formData.get('description') as string,
                    address: formData.get('address') as string,
                    latitude: parseFloat(formData.get('latitude') as string) || (userProfile?.defaultLocation?.latitude || currentCommunity?.coverageArea?.latitude || -26.2041),
                    longitude: parseFloat(formData.get('longitude') as string) || (userProfile?.defaultLocation?.longitude || currentCommunity?.coverageArea?.longitude || 28.0473),
                    contactPhone: formData.get('phone') as string,
                    contactEmail: formData.get('email') as string,
                    charityId: formData.get('charityId') as string || undefined,
                    charityPercentage: formData.get('charityPercentage') ? parseFloat(formData.get('charityPercentage') as string) : undefined,
                    status: 'ACTIVE' as const
                  };

                  if (editingBusinessId) {
                    const existing = userBusinesses.find(b => b.id === editingBusinessId);
                    if (existing) {
                      updateUserBusiness({ ...existing, ...businessData });
                    }
                  } else {
                    addUserBusiness({
                      ...businessData,
                      image: `https://picsum.photos/seed/${Math.random()}/400/400`,
                      owner_id: user?.uid || '',
                      communityIds: [currentCommunity?.id || ''],
                    });
                  }
                  setIsAddingBusiness(false);
                  setEditingBusinessId(null);
                }}
                className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Business Name</label>
                  <input 
                    name="name"
                    required
                    defaultValue={editingBusinessId ? userBusinesses.find(b => b.id === editingBusinessId)?.name : ''}
                    placeholder="e.g. Thabo's Pottery"
                    className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Category</label>
                    <select 
                      name="category"
                      required
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                    >
                      {enabledCategories.map(cat => (
                        <option key={cat.id} value={cat.label}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Subcategory</label>
                    <select 
                      name="subcategory"
                      required
                      defaultValue={editingBusinessId ? userBusinesses.find(b => b.id === editingBusinessId)?.subcategory : ''}
                      className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                    >
                      {enabledCategories.find(c => c.label === selectedCategory)?.types.map(type => (
                        <option key={type} value={type}>
                          {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Linked Charity (Optional)</label>
                    <select 
                      name="charityId"
                      defaultValue={editingBusinessId ? userBusinesses.find(b => b.id === editingBusinessId)?.charityId : ''}
                      className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                    >
                      <option value="">No linked charity</option>
                      {charities.map(charity => (
                        <option key={charity.id} value={charity.id}>
                          {charity.name} ({charity.percentage}%)
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-on-surface-variant px-1">
                      Linking a charity shows your support and impact in the community.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Charity Percentage</label>
                    <input 
                      type="number"
                      name="charityPercentage"
                      min="0"
                      max="100"
                      step="0.1"
                      defaultValue={editingBusinessId ? userBusinesses.find(b => b.id === editingBusinessId)?.charityPercentage : ''}
                      placeholder="e.g. 5"
                      className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                    />
                    <p className="text-[10px] text-primary px-1 font-medium">
                      You are pledging this percentage of your sales to the featured charity!
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Address</label>
                  <AddressAutocomplete 
                    defaultValue={editingBusinessId ? userBusinesses.find(b => b.id === editingBusinessId)?.address || '' : (userProfile?.address || userProfile?.defaultLocation?.name || '')}
                    onSelect={(address, lat, lng) => {
                      setFormLat(lat);
                      setFormLng(lng);
                    }}
                    className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Latitude</label>
                    <input 
                      name="latitude"
                      type="number"
                      step="any"
                      value={formLat}
                      onChange={(e) => setFormLat(e.target.value)}
                      required
                      className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Longitude</label>
                    <input 
                      name="longitude"
                      type="number"
                      step="any"
                      value={formLng}
                      onChange={(e) => setFormLng(e.target.value)}
                      required
                      className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Phone</label>
                    <input 
                      name="phone"
                      defaultValue={editingBusinessId ? userBusinesses.find(b => b.id === editingBusinessId)?.contactPhone : ''}
                      placeholder="+27 82 123 4567"
                      className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Email</label>
                    <input 
                      name="email"
                      type="email"
                      defaultValue={editingBusinessId ? userBusinesses.find(b => b.id === editingBusinessId)?.contactEmail : ''}
                      placeholder="hello@business.com"
                      className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Description</label>
                  <textarea 
                    name="description"
                    required
                    rows={3}
                    defaultValue={editingBusinessId ? userBusinesses.find(b => b.id === editingBusinessId)?.description : ''}
                    placeholder="Tell the community about your business..."
                    className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full clay-gradient py-4 rounded-2xl text-white font-bold shadow-lg active:scale-95 transition-all mt-4"
                >
                  {editingBusinessId ? 'Save Changes' : 'Create Business Profile'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Charity Management Modal */}
      <AnimatePresence>
        {isManagingCharity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 overflow-y-auto py-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseCharity}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-surface rounded-[2.5rem] p-8 shadow-2xl overflow-hidden my-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold font-headline text-primary">Community Charity</h3>
                <button 
                  onClick={handleCloseCharity}
                  className="p-2 rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <X className="w-6 h-6 text-outline" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {renderCharityManagement()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Community Modal */}
      <AnimatePresence>
        {isCreatingCommunity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingCommunity(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-surface rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold font-headline text-primary">New Community</h3>
                <button 
                  onClick={() => setIsCreatingCommunity(false)}
                  className="p-2 rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <X className="w-6 h-6 text-outline" />
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  try {
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const newCommunityId = await createCommunity(name);
                    setIsCreatingCommunity(false);
                    // Route B: existing user — skip profile, go straight to guided community setup
                    if (newCommunityId) {
                      onNavigateToCommunityDashboard(newCommunityId, 'Admin', { guidedSetup: true });
                    }
                  } catch (err: any) {
                    setError(err.message);
                  }
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Community Name</label>
                  <input 
                    name="name"
                    required
                    placeholder="e.g. Parkwood Heights"
                    className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
                  />
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    Your new community will start in <strong>Trial Mode</strong> for 30 days. You can license it anytime to unlock full features.
                  </p>
                </div>

                <button 
                  type="submit"
                  className="w-full clay-gradient py-4 rounded-2xl text-white font-bold shadow-lg active:scale-95 transition-all mt-4"
                >
                  Launch Community
                </button>

                {error && (
                  <p className="text-xs text-error font-medium bg-error/5 p-3 rounded-xl border border-error/10">
                    {error}
                  </p>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};
