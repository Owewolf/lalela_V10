import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, Timestamp, getDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { uploadImage } from '../lib/uploadImage';
import { useFirebase } from '../context/FirebaseContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { motion, AnimatePresence } from 'motion/react';
import { Users, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Camera, MapPin, User as UserIcon, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePlacesAutocomplete, geocodeByAddress } from '../hooks/usePlacesAutocomplete';
import { PostConfirmationModal } from './PostConfirmationModal';

type OnboardingStep = 'profile' | 'community';

/** Inline Places autocomplete for onboarding location field */
const OnboardingPlacesInput: React.FC<{
  onSelect: (address: string, lat: number, lng: number) => void;
  defaultValue?: string;
}> = ({ onSelect, defaultValue = '' }) => {
  const { ready, value, suggestions: { status, data }, setValue, clearSuggestions } = usePlacesAutocomplete({ debounce: 300, defaultValue });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  // Recalculate dropdown position whenever suggestions appear
  React.useEffect(() => {
    if (status === 'OK' && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [status, value]);

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();
    try {
      const { lat, lng } = await geocodeByAddress(description);
      onSelect(description, lat, lng);
    } catch (err) {
      console.error('Geocode error:', err);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!ready}
          placeholder="Search for your address..."
          className="w-full pl-10 pr-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary placeholder:font-normal placeholder:text-outline"
        />
      </div>
      {status === 'OK' && ReactDOM.createPortal(
        <ul className="scrollbar-hide bg-white text-on-surface rounded-xl shadow-xl border border-outline-variant ring ring-outline-variant/20 max-h-48 overflow-y-auto" style={dropdownStyle}>
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="px-4 py-3 text-sm cursor-pointer hover:bg-surface-container/40 transition-colors first:rounded-t-xl last:rounded-b-xl border-b border-surface-container/20 last:border-0"
            >
              {description}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
};

export const Onboarding: React.FC = () => {
  const { user, userProfile, loading } = useFirebase();
  const { isLoaded: mapsLoaded } = useGoogleMaps();

  // Step tracking
  const [step, setStep] = useState<OnboardingStep>('profile');
  const [mode, setMode] = useState<'join' | 'start'>('start');

  // Profile fields (Step 1)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationLat, setLocationLat] = useState(0);
  const [locationLng, setLocationLng] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Community fields (Step 2)
  const [communityName, setCommunityName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [invitedCommunityName, setInvitedCommunityName] = useState<string | null>(null);
  const [isInviteJoinFlow, setIsInviteJoinFlow] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);

  // Profile step validation
  const isProfileValid = fullName.trim().length > 0 && locationName.trim().length > 0 && locationLat !== 0;
  // We encourage but don't block on profile image since some users may prefer not to upload one initially

  // Load pending data from localStorage
  useEffect(() => {
    const pendingName = localStorage.getItem('pending_onboarding_name');
    const pendingEmail = localStorage.getItem('pending_onboarding_email');
    const pendingPhone = localStorage.getItem('pending_onboarding_phone');
    const pendingContact = localStorage.getItem('pending_onboarding_contact');
    const pendingMode = localStorage.getItem('pending_onboarding_mode') as 'join' | 'start';
    const pendingInvite = localStorage.getItem('pending_onboarding_invite');
    const pendingJoinCode = localStorage.getItem('pending_join_code');

    // If there's a pending invite link code, force JOIN mode and fetch community name
    if (pendingJoinCode) {
      setIsInviteJoinFlow(true);
      setMode('join');
      setInviteCode(pendingJoinCode);
      // Look up the invite link to get the community name
      getDoc(doc(db, 'community_invite_links', pendingJoinCode)).then((snap) => {
        if (snap.exists()) {
          const linkData = snap.data();
          if (linkData.community_name) {
            setInvitedCommunityName(linkData.community_name);
          }
        }
      }).catch(() => {});
    } else if (pendingMode) {
      setMode(pendingMode);
    }

    if (pendingName) setFullName(pendingName);
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
    if (pendingPhone) {
      setPhone(pendingPhone);
    }
    if (!pendingEmail && !pendingPhone && pendingContact) {
      // Route contact to the correct field — phone numbers go to phone state, not email
      if (pendingContact.includes('@')) {
        setEmail(pendingContact);
      } else {
        setPhone(pendingContact);
      }
    }

    if (pendingInvite) {
      if (pendingMode === 'join') setInviteCode(pendingInvite);
      else setCommunityName(pendingInvite);
    } else if (pendingName && !communityName) {
      setCommunityName(`${pendingName}'s Community`);
    }
  }, []);

  // Pre-fill from existing profile or Firebase auth
  useEffect(() => {
    if (userProfile) {
      if (!fullName) {
        if (userProfile.first_name || userProfile.last_name) {
          setFullName(`${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim());
        } else if (userProfile.name) {
          setFullName(userProfile.name);
        }
      }
      if (!email && userProfile.email) setEmail(userProfile.email);
      if (!phone && (userProfile.mobile_number || userProfile.phone)) setPhone(userProfile.mobile_number || userProfile.phone);
      if (!profileImage && userProfile.profile_image) setProfileImage(userProfile.profile_image);
      if (!locationName && userProfile.address) setLocationName(userProfile.address);
      if (locationLat === 0 && userProfile.defaultLocation?.latitude) setLocationLat(userProfile.defaultLocation.latitude);
      if (locationLng === 0 && userProfile.defaultLocation?.longitude) setLocationLng(userProfile.defaultLocation.longitude);
    } else if (user) {
      if (!fullName && user.displayName) setFullName(user.displayName);
      if (!email && user.email) setEmail(user.email);
      if (!profileImage && user.photoURL) setProfileImage(user.photoURL);
    }
  }, [user, userProfile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB');
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadImage(file, 'profiles', user?.uid ?? 'anon');
      setProfileImage(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLocationSelect = (address: string, lat: number, lng: number) => {
    setLocationName(address);
    setLocationLat(lat);
    setLocationLng(lng);
  };

  // Step 1 → Step 2 transition
  const handleProfileNext = () => {
    if (!isProfileValid) return;
    setError(null);
    setStep('community');
  };

  // Firestore error handler
  enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
  function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, currentUser?: User | null) {
    const activeUser = currentUser || auth.currentUser;
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: { userId: activeUser?.uid, email: activeUser?.email },
      operationType, path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  // Step 2: Create profile + community/membership
  const handleConfirmSubmit = async () => {
    if (!user) return;
    if (mode === 'start' && !communityName.trim()) return;
    if (mode === 'join' && !inviteCode.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const resolvedName = fullName || user.displayName || 'Anonymous';
      const parsedNameParts = resolvedName.trim().split(/\s+/).filter(Boolean);
      const resolvedFirstName = parsedNameParts[0] || resolvedName;
      const resolvedLastName = parsedNameParts.length > 1 ? parsedNameParts.slice(1).join(' ') : '';
      const typedEmail = (email || '').trim().toLowerCase();
      const authEmail = (user.email || '').trim().toLowerCase();
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const resolvedEmail = emailPattern.test(typedEmail)
        ? typedEmail
        : (emailPattern.test(authEmail) ? authEmail : '');
      const resolvedPhone = (phone || '').trim();
      const resolvedImage = profileImage || user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(resolvedName)}`;
      const { getDocs, collection, query, where, getDoc } = await import('firebase/firestore');

      // Build profile data (written LAST to avoid race condition with onSnapshot)
      const profileData: Record<string, any> = {
        id: user.uid,
        name: resolvedName,
        first_name: resolvedFirstName,
        last_name: resolvedLastName,
        email: resolvedEmail,
        phone: resolvedPhone,
        mobile_number: resolvedPhone,
        address: locationName,
        profile_image: resolvedImage,
        license_status: 'UNLICENSED',
        status: 'ACTIVE',
        role: 'user',
        profile_completed: true,
        community_created: mode === 'start',
        defaultLocation: { name: locationName, latitude: locationLat, longitude: locationLng },
        updated_at: serverTimestamp()
      };

      if (mode === 'start') {
        profileData.onboarding_completed = false; // Owner must complete admin setup
        profileData.license_type = 'SELF';
      } else {
        const memberExpiry = new Date();
        memberExpiry.setFullYear(memberExpiry.getFullYear() + 1);
        profileData.onboarding_completed = true; // Invited users skip admin setup
        profileData.license_type = 'COMMUNITY_GRANTED';
        profileData.member_expiry_date = Timestamp.fromDate(memberExpiry);
        profileData.access_type = '1-Year Member';
        profileData.expiry_date = Timestamp.fromDate(memberExpiry);
      }

      let selectedCommunityId: string | null = null;

      // 1. Create community/membership FIRST (before user profile triggers navigation)
      if (mode === 'start') {
        // Check existing trial community
        let snapshot;
        try {
          const q = query(collection(db, 'communities'), where('owner_id', '==', user.uid), where('type', '==', 'TRIAL'));
          snapshot = await getDocs(q);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, 'communities', user);
        }

        if (snapshot && !snapshot.empty) {
          const existingCommunity = snapshot.docs[0].data() as Record<string, any>;
          const existingCommunityId = typeof existingCommunity.id === 'string' && existingCommunity.id.length > 0
            ? existingCommunity.id
            : snapshot.docs[0].id;
          selectedCommunityId = existingCommunityId;

          // Ensure owner membership exists so subsequent app logic treats this user as the active admin.
          const trialEndDate = existingCommunity.trial_end_date instanceof Timestamp
            ? existingCommunity.trial_end_date.toDate()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          try {
            await setDoc(doc(db, 'communities', existingCommunityId, 'members', user.uid), {
              user_id: user.uid,
              community_id: existingCommunityId,
              role: 'ADMIN',
              joined_at: serverTimestamp(),
              license_expiry: Timestamp.fromDate(trialEndDate),
              status: 'ACTIVE',
              name: resolvedName,
              image: resolvedImage,
              email: resolvedEmail
            }, { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `communities/${existingCommunityId}/members/${user.uid}`, user);
          }
        } else {
          const communityId = `comm_${Math.random().toString(36).substr(2, 9)}`;
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 30);
          selectedCommunityId = communityId;

          // Create Community
          try {
            await setDoc(doc(db, 'communities', communityId), {
              id: communityId,
              name: communityName,
              owner_id: user.uid,
              type: 'TRIAL',
              trial_end_date: Timestamp.fromDate(trialEndDate),
              status: 'ACTIVE',
              onboarding_steps_completed: [],
              guided_setup_required: true,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `communities/${communityId}`, user);
          }

          // Create Membership (Admin)
          try {
            await setDoc(doc(db, 'communities', communityId, 'members', user.uid), {
              user_id: user.uid,
              community_id: communityId,
              role: 'ADMIN',
              joined_at: serverTimestamp(),
              license_expiry: Timestamp.fromDate(trialEndDate),
              status: 'ACTIVE',
              name: resolvedName,
              image: resolvedImage,
              email: resolvedEmail
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `communities/${communityId}/members/${user.uid}`, user);
          }
        }
      } else {
        // JOIN MODE — try invite link first, then fall back to community ID
        let communityId = inviteCode;

        const linkRef = doc(db, 'community_invite_links', inviteCode);
        const linkSnap = await getDoc(linkRef);

        if (linkSnap.exists()) {
          const linkData = linkSnap.data();
          if (!linkData.active) throw new Error('This invite link has been revoked.');
          const expiresAt = linkData.expires_at instanceof Timestamp ? linkData.expires_at.toDate() : new Date(linkData.expires_at);
          if (new Date() > expiresAt) throw new Error('This invite link has expired.');
          communityId = linkData.community_id;
          // Increment uses
          await updateDoc(linkRef, { uses: increment(1) });
        } else {
          // Fall back to direct community ID lookup
          const communityDocRef = doc(db, 'communities', inviteCode);
          const communitySnap = await getDoc(communityDocRef);
          if (!communitySnap.exists()) {
            throw new Error('Invalid invite code. Community not found.');
          }
        }

        // Clear pending join code if present
        localStorage.removeItem('pending_join_code');
        selectedCommunityId = communityId;

        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        try {
          await setDoc(doc(db, 'communities', communityId, 'members', user.uid), {
            user_id: user.uid,
            community_id: communityId,
            role: 'Member',
            joined_at: serverTimestamp(),
            license_expiry: Timestamp.fromDate(expiryDate),
            status: 'ACTIVE',
            name: resolvedName,
            image: resolvedImage,
            email: resolvedEmail
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `communities/${communityId}/members/${user.uid}`, user);
        }
      }

      if (selectedCommunityId) {
        profileData.last_community_id = selectedCommunityId;
      }

      // 2. Create/update public profile (non-critical)
      try {
        await setDoc(doc(db, 'users_public', user.uid), {
          name: resolvedName,
          profile_image: resolvedImage,
          updated_at: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to update public profile:', err);
      }

      // 3. Write user profile LAST — this triggers onSnapshot and navigates away from onboarding
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const existingData = userSnap.data() as Record<string, any>;
        const existingEmail = typeof existingData.email === 'string' ? existingData.email : undefined;
        if (existingEmail !== undefined) {
          // Keep immutable email aligned with existing profile value unless auth email is already verified.
          profileData.email = existingEmail || resolvedEmail;
        }
      }

      if (!userSnap.exists()) {
        try {
          profileData.created_at = serverTimestamp();
          await setDoc(userDocRef, profileData);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`, user);
        }
      } else {
        try {
          await setDoc(userDocRef, profileData, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`, user);
        }
      }

      // Clear localStorage
      localStorage.removeItem('pending_onboarding_name');
      localStorage.removeItem('pending_onboarding_email');
      localStorage.removeItem('pending_onboarding_phone');
      localStorage.removeItem('pending_onboarding_contact');
      localStorage.removeItem('pending_onboarding_mode');
      localStorage.removeItem('pending_onboarding_invite');
    } catch (err: any) {
      console.error('Onboarding Error:', err);
      try {
        const parsed = JSON.parse(err.message);
        setError(`Permission Error: ${parsed.error} at ${parsed.path}`);
      } catch {
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrepareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (mode === 'start' && !communityName.trim()) return;
    if (mode === 'join' && !inviteCode.trim()) return;

    setError(null);
    setShowSubmitConfirmation(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const steps: { key: OnboardingStep; label: string }[] = [
    { key: 'profile', label: 'Your Profile' },
    { key: 'community', label: mode === 'start' ? 'Create Community' : 'Join Community' },
  ];

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 organic-pattern overflow-y-auto">
      <div className="max-w-md w-full relative my-auto">
        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />

        <AnimatePresence mode="wait">
          {user && (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-container-lowest p-8 sm:p-10 rounded-[3rem] border border-outline-variant/10 shadow-2xl relative z-10 space-y-6 overflow-visible"
            >
              {/* Progress Stepper */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {steps.map((s, i) => (
                  <React.Fragment key={s.key}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                        step === s.key ? 'bg-primary text-white scale-110' : 
                          steps.findIndex(x => x.key === step) > i ? 'bg-emerald-500 text-white' : 'bg-surface-container-low text-outline'
                      )}>
                        {steps.findIndex(x => x.key === step) > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={cn(
                        'text-[9px] font-bold uppercase tracking-wider',
                        step === s.key ? 'text-primary' : 'text-outline'
                      )}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={cn(
                        'h-0.5 w-8 rounded-full mb-4',
                        steps.findIndex(x => x.key === step) > i ? 'bg-emerald-500' : 'bg-surface-container-low'
                      )} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* ========== STEP 1: PROFILE SETUP ========== */}
                {step === 'profile' && (
                  <motion.div key="step-profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-headline font-bold text-primary">Complete Your Profile</h2>
                        <p className="text-xs text-on-surface-variant font-medium">Set your name and location to continue</p>
                      </div>
                    </div>

                    {/* Profile Image Upload */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-surface-container-low border-2 border-outline-variant/20">
                          {profileImage ? (
                            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-outline">
                              <UserIcon className="w-10 h-10" />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
                        >
                          {isUploading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                        </button>
                        <input ref={fileInputRef} type="file" onChange={handleImageUpload} accept="image/*" className="hidden" />
                      </div>
                      <p className="text-[10px] text-outline">Upload a profile photo (max 200KB)</p>
                    </div>

                    <div className="space-y-4">
                      {/* Name */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline px-1 flex items-center gap-1">
                          Full Name <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className={cn(
                            'w-full px-6 py-4 bg-surface-container-low border-2 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary',
                            !fullName.trim() ? 'border-error/30' : 'border-transparent'
                          )}
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline px-1">Email / WhatsApp</label>
                        <input
                          type="text"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full px-6 py-4 bg-surface-container-low border-2 border-transparent rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline px-1">Phone Number</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+27..."
                          className="w-full px-6 py-4 bg-surface-container-low border-2 border-transparent rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary"
                        />
                      </div>

                      {/* Location (Google Places) */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline px-1 flex items-center gap-1">
                          Location <span className="text-error">*</span>
                        </label>
                        {mapsLoaded ? (
                          <OnboardingPlacesInput onSelect={handleLocationSelect} defaultValue={locationName} />
                        ) : (
                          <input
                            type="text"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            placeholder="e.g. 123 Main St, Cape Town"
                            className="w-full px-6 py-4 bg-surface-container-low border-2 border-transparent rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-primary"
                          />
                        )}
                        {locationName && locationLat !== 0 && (
                          <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 px-1">
                            <CheckCircle2 className="w-3 h-3" /> Location set
                          </p>
                        )}
                        {!locationName && (
                          <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 px-1">
                            <AlertCircle className="w-3 h-3" /> Set your location to continue
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mode selector */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isInviteJoinFlow) return;
                          setMode('start');
                        }}
                        disabled={isInviteJoinFlow}
                        className={cn(
                          'flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50',
                          mode === 'start' ? 'bg-primary text-white shadow-lg' : 'bg-surface-container-low text-outline hover:bg-surface-container'
                        )}
                      >
                        <Sparkles className="w-4 h-4 inline mr-1" />Create Community (R349)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('join')}
                        className={cn(
                          'flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition-all',
                          mode === 'join' ? 'bg-primary text-white shadow-lg' : 'bg-surface-container-low text-outline hover:bg-surface-container'
                        )}
                      >
                        <Users className="w-4 h-4 inline mr-1" />Join Free (Trial)
                      </button>
                    </div>

                    {isInviteJoinFlow && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-[11px] font-medium text-blue-800">
                        This account is being set up from a community invite, so onboarding stays in join mode.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleProfileNext}
                      disabled={!isProfileValid}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      Continue <ArrowRight className="w-5 h-5" />
                    </button>

                    {error && (
                      <p className="text-xs text-error font-medium bg-error/5 p-3 rounded-xl border border-error/10">{error}</p>
                    )}
                  </motion.div>
                )}

                {/* ========== STEP 2: COMMUNITY ========== */}
                {step === 'community' && (
                  <motion.div key="step-community" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
                        {mode === 'start' ? <Sparkles className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                      </div>
                      <div>
                        <h2 className="text-2xl font-headline font-bold text-primary">
                          {mode === 'start' ? 'Start Your Community' : invitedCommunityName ? `Join ${invitedCommunityName}` : 'Join a Community'}
                        </h2>
                        <p className="text-xs text-on-surface-variant font-medium">
                          {mode === 'start' ? 'Name your community to get started.' : invitedCommunityName ? `You've been invited to join ${invitedCommunityName}.` : 'Enter your invite code to join.'}
                        </p>
                      </div>
                    </div>

                    {/* Profile preview */}
                    <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-2xl">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container">
                        {profileImage ? (
                          <img src={profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-outline"><UserIcon className="w-5 h-5" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-primary truncate">{fullName}</p>
                        <p className="text-[10px] text-outline truncate flex items-center gap-1"><MapPin className="w-3 h-3" />{locationName}</p>
                      </div>
                      <button type="button" onClick={() => setStep('profile')} className="text-[10px] text-primary font-bold hover:underline">Edit</button>
                    </div>

                    <form onSubmit={handlePrepareSubmit} className="space-y-6">
                      {mode === 'start' ? (
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
                      )}

                      {mode === 'start' && (
                        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-emerald-800">30-Day Trial Activated</h4>
                            <p className="text-[11px] text-emerald-700 leading-relaxed">
                              Full access to all features. Invite up to 100 members and set up your local market.
                            </p>
                          </div>
                        </div>
                      )}

                      {mode === 'join' && (
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
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => { setStep('profile'); setError(null); }}
                          className="py-4 px-6 bg-surface-container-low text-on-surface rounded-2xl font-bold flex items-center gap-2 hover:bg-surface-container transition-all"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || (mode === 'start' ? !communityName.trim() : !inviteCode.trim())}
                          className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              {mode === 'start' ? 'Create & Launch' : 'Join Community'}
                              <ArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </button>
                      </div>

                      {error && (
                        <p className="text-xs text-error font-medium bg-error/5 p-3 rounded-xl border border-error/10">{error}</p>
                      )}
                    </form>

                    <PostConfirmationModal
                      isOpen={showSubmitConfirmation}
                      ctaLabel={mode === 'start' ? 'Create & Launch' : 'Join Community'}
                      postType={mode === 'start' ? 'Community' : 'Membership'}
                      communityName={mode === 'start' ? (communityName.trim() || 'New Community') : (invitedCommunityName || 'Joined Community')}
                      title={mode === 'start' ? communityName.trim() : inviteCode.trim()}
                      themeColor={mode === 'start' ? 'bg-primary' : 'bg-blue-600'}
                      customTitle={mode === 'start' ? 'Confirm Community Launch' : 'Confirm Join Community'}
                      customMessage={
                        mode === 'start'
                          ? 'Confirm you want to create and launch this community.'
                          : 'Confirm you want to join this community with the provided invite code.'
                      }
                      cancelLabel="No, cancel"
                      confirmLabel={isSubmitting ? (mode === 'start' ? 'Launching...' : 'Joining...') : 'Yes, confirm'}
                      confirmDisabled={isSubmitting}
                      onConfirm={handleConfirmSubmit}
                      onCancel={() => {
                        if (isSubmitting) return;
                        setShowSubmitConfirmation(false);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
