import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, Smartphone, Camera, Siren, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useFirebase } from '../../context/FirebaseContext';
import { useCommunity } from '../../context/CommunityContext';
import { auth } from '../../firebase';
import { uploadImage } from '../../lib/uploadImage';
import { LocationSettings } from './LocationSettings';

interface ProfileSectionProps {
  initialEdit?: boolean;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ initialEdit = false }) => {
  const { userProfile, updateUserProfile } = useFirebase();
  const { communities, toggleCommunityResponder, members } = useCommunity();
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || userProfile?.defaultLocation?.name || '',
    email: userProfile?.email || '',
    profile_image: userProfile?.profile_image || '',
    defaultLocation: userProfile?.defaultLocation || { name: '', latitude: 0, longitude: 0 }
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showResponderSelector, setShowResponderSelector] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'Image must be smaller than 2MB' });
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadImage(file, 'profiles', userProfile?.id ?? 'anon', formData.profile_image);
      setFormData(prev => ({ ...prev, profile_image: url }));
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Sync formData with userProfile when not editing
  useEffect(() => {
    if (!isEditing && userProfile) {
      setFormData({
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        address: userProfile.address || userProfile.defaultLocation?.name || '',
        email: userProfile.email || '',
        profile_image: userProfile.profile_image || '',
        defaultLocation: userProfile.defaultLocation || { name: '', latitude: 0, longitude: 0 }
      });
    }
  }, [userProfile, isEditing]);

  const resetForm = () => {
    setFormData({
      name: userProfile?.name || '',
      phone: userProfile?.phone || '',
      address: userProfile?.address || userProfile?.defaultLocation?.name || '',
      email: userProfile?.email || '',
      profile_image: userProfile?.profile_image || '',
      defaultLocation: userProfile?.defaultLocation || { name: '', latitude: 0, longitude: 0 }
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setStatus(null);
    resetForm();
  };

  const handleUpdateProfile = async () => {
    try {
      setIsSaving(true);
      await updateUserProfile({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        profile_image: formData.profile_image,
        defaultLocation: formData.defaultLocation
      });
      setIsEditing(false);
      setStatus({ type: 'success', message: 'Your profile has been updated.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const isResponderInAny = communities.some(c => {
    // We need to check the member role or a specific flag
    // The user wants to toggle it.
    // Let's check if the user is a security member in the current community context
    // Actually, we should check the 'members' collection for each community.
    // But 'members' in context is only for the current community.
    // We might need to fetch responder status for all communities.
    // For now, let's assume we can check if they are a responder in the current community at least.
    return false; // Placeholder
  });

  return (
    <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-primary">Account Information</h3>
        </div>
        {!isEditing ? (
          <button 
            onClick={() => {
              setStatus(null);
              setIsEditing(true);
            }}
            className="text-xs font-bold text-secondary hover:underline px-4 py-2 bg-secondary/5 rounded-lg transition-colors"
          >
            Edit Profile
          </button>
        ) : (
          <div className="px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-widest">
            Editing Profile
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className={cn(
            "w-24 h-24 rounded-full overflow-hidden border-4 border-primary/10 shadow-inner relative",
            isUploading && "animate-pulse"
          )}>
            <img 
              src={formData.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.id}`} 
              alt={userProfile?.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {isEditing && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
          )}
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
        <div className="flex-1 space-y-2">
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest">Profile Image URL (Optional)</label>
                <input 
                  type="text" 
                  value={formData.profile_image}
                  onChange={(e) => setFormData({...formData, profile_image: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          ) : (
            <h4 className="text-xl font-bold text-on-surface">{userProfile?.name}</h4>
          )}
          <div className="flex items-center gap-2 text-xs text-outline font-medium">
            <span>{userProfile?.email}</span>
            {auth.currentUser?.emailVerified && (
              <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Verified</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-outline uppercase tracking-widest">Phone Number</label>
          {isEditing ? (
            <input 
              type="tel" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="+27 82 123 4567"
            />
          ) : (
            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-xl">
              <Smartphone className="w-4 h-4 text-outline" />
              <p className="text-sm font-bold text-on-surface">{userProfile?.phone || 'Not set'}</p>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-outline uppercase tracking-widest">Physical Address</label>
          {isEditing ? (
            <div className="space-y-2">
              <input 
                type="text" 
                readOnly
                aria-readonly="true"
                title="Use the map below to refine and update your saved location"
                value={formData.address}
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm text-outline cursor-not-allowed"
                placeholder="Use the map below to choose your location"
              />
              <p className="text-[10px] text-outline italic px-1">
                Use the location map below to search, scroll, drop a pin, and refine your exact saved address.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-xl">
              <p className="text-sm font-bold text-on-surface">{userProfile?.address || 'Not set'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Responder Toggle */}
      <div className={cn(
        "pt-6 border-t border-outline-variant/10 space-y-4 transition-all",
        userProfile?.isSecurityMember && "bg-error-container/5 -mx-8 px-8 py-6 rounded-b-[2.5rem]"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              userProfile?.isSecurityMember ? "bg-error text-white" : "bg-error/10 text-error"
            )}>
              <Siren className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">Emergency Responder</h3>
              <p className="text-[10px] text-outline">Receive and respond to community alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowResponderSelector(!showResponderSelector)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                showResponderSelector ? "bg-primary text-white" : "bg-surface-container-high text-outline"
              )}
            >
              Manage
            </button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={userProfile?.isSecurityMember} 
                onChange={(e) => updateUserProfile({ isSecurityMember: e.target.checked })}
              />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
            </label>
          </div>
        </div>

        {userProfile?.isSecurityMember && (
          <div className="space-y-4">
            <div className="bg-surface-container-lowest rounded-xl p-4 flex items-center justify-between border border-error/10">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <span className="text-[10px] font-bold text-outline">
                  Status: {communities.some(c => c.isEmergencyMode) ? 'ACTIVE RESPONSE' : 'On-Call'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  communities.some(c => c.isEmergencyMode) ? "bg-error animate-pulse" : "bg-secondary"
                )} />
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">
                  {communities.some(c => c.isEmergencyMode) ? 'Emergency Active' : 'Ready'}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-4 flex items-center justify-between border border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-primary">Emergency Location Visibility</span>
                <span className="text-[10px] text-outline">Show my live location on emergency maps</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={userProfile?.emergencyLocationOptIn} 
                  onChange={(e) => updateUserProfile({ emergencyLocationOptIn: e.target.checked })}
                />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error"></div>
              </label>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showResponderSelector && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-surface-container-low rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Select Communities</p>
                {communities.map(community => (
                  <div key={community.id} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-on-surface">{community.name}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={community.isSecurityMember} 
                        onChange={(e) => toggleCommunityResponder(community.id, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LocationSettings 
        isEditing={isEditing}
        locationName={formData.defaultLocation.name}
        latitude={formData.defaultLocation.latitude}
        longitude={formData.defaultLocation.longitude}
        onLocationChange={(loc) => setFormData(prev => ({
          ...prev, 
          address: loc.name,
          defaultLocation: loc
        }))}
      />

      {isEditing && (
        <div className="pt-6 border-t border-outline-variant/10 sticky bottom-4 z-20">
          <div className="bg-surface-container-low/95 backdrop-blur-sm rounded-[1.75rem] p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-lg border border-outline-variant/10">
            <div>
              <p className="text-sm font-bold text-on-surface">Profile changes are ready to save</p>
              <p className="text-xs text-outline">Save your updates to apply them to your account information.</p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 md:min-w-[320px]">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="w-full sm:flex-1 px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm font-bold transition-colors hover:bg-surface-container-highest disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={isSaving || isUploading}
                className="w-full sm:flex-1 px-4 py-3 rounded-xl bg-secondary text-white text-sm font-bold shadow-lg shadow-secondary/20 transition-all hover:bg-secondary-container disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2",
            status.type === 'success' ? "bg-emerald-500/10 text-emerald-600" : "bg-error/10 text-error"
          )}
        >
          {status.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
          {status.message}
        </motion.div>
      )}
    </section>
  );
};
