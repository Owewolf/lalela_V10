import React, { useState } from 'react';
import {
  ArrowLeft,
  Camera,
  X,
  MapPin,
  Send,
  Save,
  Calendar,
  AlertTriangle,
  Info,
  Tag,
  Siren,
} from 'lucide-react';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '../../lib/utils';
import { useCommunity } from '../../context/CommunityContext';
import { useFirebase } from '../../context/FirebaseContext';
import { POST_SUBTYPE_CONFIG } from '../../constants';
import { PostConfirmationModal } from '../PostConfirmationModal';
import { uploadImage } from '../../lib/uploadImage';

const NOTICE_CTA: Record<NoticeSubtype, { ctaLabel: string; themeColor: string; buttonBg: string }> = {
  warning: { ctaLabel: 'Send Warning', themeColor: 'bg-amber-600', buttonBg: 'bg-amber-600 text-white hover:bg-amber-700' },
  normal: { ctaLabel: 'Publish Notice', themeColor: 'bg-emerald-600', buttonBg: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  information: { ctaLabel: 'Share Information', themeColor: 'bg-blue-600', buttonBg: 'bg-blue-600 text-white hover:bg-blue-700' },
};
import type { CommunityNotice } from '../../types';

const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
};

const MapClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

type NoticeSubtype = 'warning' | 'normal' | 'information';

const NOTICE_DEFAULT_EXPIRY_DAYS = 30;

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + NOTICE_DEFAULT_EXPIRY_DAYS);
  return formatDateInput(date);
};

const getInitialExpiryDate = (postSubtype: NoticeSubtype, postToEdit?: CommunityNotice) => {
  if (postSubtype === 'warning') return '';
  if (!postToEdit?.expires_at) return getDefaultExpiryDate();

  const expiryDate = new Date(postToEdit.expires_at);
  return Number.isNaN(expiryDate.getTime()) ? getDefaultExpiryDate() : formatDateInput(expiryDate);
};

interface CreateNoticeFormProps {
  postSubtype: NoticeSubtype;
  onBack: () => void;
  postToEdit?: CommunityNotice;
}

const SUBTYPE_THEME: Record<NoticeSubtype, {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  bannerBg: string;
  bannerBorder: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
}> = {
  warning: {
    label: 'Warning Notice',
    subtitle: 'Immediate attention needed',
    icon: <AlertTriangle className="w-7 h-7" />,
    bannerBg: 'bg-amber-50',
    bannerBorder: 'border-amber-300/40',
    iconBg: 'bg-amber-500 text-white',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    accentColor: 'text-amber-600',
  },
  normal: {
    label: 'General Notice',
    subtitle: 'General community information',
    icon: <Tag className="w-7 h-7" />,
    bannerBg: 'bg-emerald-50',
    bannerBorder: 'border-emerald-300/40',
    iconBg: 'bg-emerald-500 text-white',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    accentColor: 'text-emerald-600',
  },
  information: {
    label: 'Info Notice',
    subtitle: 'Standard community notice',
    icon: <Info className="w-7 h-7" />,
    bannerBg: 'bg-blue-50',
    bannerBorder: 'border-blue-300/40',
    iconBg: 'bg-blue-500 text-white',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    accentColor: 'text-blue-600',
  },
};

export const CreateNoticeForm = ({ postSubtype, onBack, postToEdit }: CreateNoticeFormProps) => {
  const { currentCommunity, addPost, updatePost } = useCommunity();
  const { user, userProfile } = useFirebase();

  const isReadOnly = userProfile?.status === 'READ-ONLY' || (
    userProfile?.license_type === 'COMMUNITY_GRANTED' &&
    userProfile?.license_status === 'UNLICENSED' &&
    userProfile?.member_expiry_date &&
    (userProfile.member_expiry_date.toDate ? userProfile.member_expiry_date.toDate() : new Date(userProfile.member_expiry_date)) < new Date()
  );

  if (isReadOnly) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-lg font-bold text-on-surface mb-2">Read-Only Mode</h2>
        <p className="text-sm text-outline mb-6 max-w-sm">
          Your membership has expired. Upgrade your license to create notices and interact with the community.
        </p>
        <button onClick={onBack} className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white">
          Go Back
        </button>
      </div>
    );
  }

  const [title, setTitle] = useState(postToEdit?.title || '');
  const [description, setDescription] = useState(postToEdit?.description || '');
  const [locationName, setLocationName] = useState(postToEdit?.locationName || '');
  const [latitude, setLatitude] = useState<number | undefined>(postToEdit?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(postToEdit?.longitude);
  const [locationSource, setLocationSource] = useState<'profile_default' | 'user_selected' | 'current_location'>(postToEdit?.source || 'profile_default');
  const [postsImage, setPostsImage] = useState<string>(postToEdit?.posts_image || '');
  const [postsImage2, setPostsImage2] = useState<string>(postToEdit?.posts_image_2 || '');
  const [expiresAt, setExpiresAt] = useState(() => getInitialExpiryDate(postSubtype, postToEdit));
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef2 = React.useRef<HTMLInputElement>(null);

  const theme = SUBTYPE_THEME[postSubtype];
  const config = POST_SUBTYPE_CONFIG[postSubtype];

  // Set default location from community coverage area, then profile, then current
  React.useEffect(() => {
    if (!postToEdit) {
      if (currentCommunity?.coverageArea) {
        setLatitude(currentCommunity.coverageArea.latitude);
        setLongitude(currentCommunity.coverageArea.longitude);
        setLocationName(currentCommunity.coverageArea.location_name || 'Community Area');
        setLocationSource('profile_default');
      } else if (userProfile?.defaultLocation) {
        setLatitude(userProfile.defaultLocation.latitude);
        setLongitude(userProfile.defaultLocation.longitude);
        setLocationName(userProfile.defaultLocation.name);
      } else if (userProfile?.locationSharingEnabled) {
        handleUseCurrentLocation();
      }
    }
  }, [currentCommunity?.coverageArea, userProfile?.defaultLocation, userProfile?.locationSharingEnabled, postToEdit]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationName('Current Location');
        setLocationSource('current_location');
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('Image must be smaller than 4MB');
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadImage(file, 'posts', user?.uid ?? 'anon', postsImage);
      setPostsImage(url);
    } catch {
      alert('Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSecondImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('Image must be smaller than 4MB');
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadImage(file, 'posts', user?.uid ?? 'anon', postsImage2);
      setPostsImage2(url);
    } catch {
      alert('Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePost = async () => {
    if (!title) return;

    const postData = {
      type: 'notice' as const,
      postSubtype,
      title,
      description,
      category: 'Community',
      authorName: postToEdit?.authorName || userProfile?.name || user?.displayName || 'Community Member',
      author_id: postToEdit?.author_id || user?.uid,
      authorRole: postToEdit?.authorRole || (currentCommunity?.userRole || 'Member'),
      authorImage: postToEdit?.authorImage || userProfile?.profile_image || user?.photoURL || `https://picsum.photos/seed/${user?.uid}/200/200`,
      urgency: config.urgency,
      urgency_level: config.urgency_level,
      locationName,
      latitude,
      longitude,
      source: locationSource,
      posts_image: postsImage,
      posts_image_2: postsImage2 || undefined,
      expires_at: postSubtype === 'warning' ? undefined : expiresAt,
    };

    if (postToEdit) {
      await updatePost({ ...postToEdit, ...postData });
    } else {
      await addPost(postData);
    }
    onBack();
  };

  return (
    <div className="min-h-screen bg-surface">
      <main className="max-w-2xl mx-auto px-6 pt-8 pb-32 space-y-8">
        {/* Type Banner */}
        <div className={cn("p-6 rounded-[2.5rem] flex items-center gap-4 border shadow-sm", theme.bannerBg, theme.bannerBorder)}>
          <div className={cn("w-14 h-14 rounded-3xl flex items-center justify-center shadow-inner", theme.iconBg)}>
            {theme.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className={cn("font-headline font-black text-xl", theme.accentColor)}>
                {theme.label}
              </h2>
              <div className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border", theme.badgeBg, theme.badgeText)}>
                {currentCommunity?.name}
              </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              {theme.subtitle}
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Location Map — Warning notices */}
          {postSubtype === 'warning' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Warning Location
                </label>
                <div className="flex items-center gap-2">
                  {locationSource !== 'profile_default' && currentCommunity?.coverageArea && (
                    <button
                      onClick={() => {
                        setLatitude(currentCommunity.coverageArea!.latitude);
                        setLongitude(currentCommunity.coverageArea!.longitude);
                        setLocationName(currentCommunity.coverageArea!.location_name || 'Community Area');
                        setLocationSource('profile_default');
                      }}
                      className="text-[10px] font-bold text-secondary hover:underline"
                    >
                      Reset to Community
                    </button>
                  )}
                  <button
                    onClick={handleUseCurrentLocation}
                    className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-1 rounded-lg hover:bg-amber-500/20 transition-colors"
                  >
                    Use My Location
                  </button>
                </div>
              </div>
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-amber-300/40 shadow-lg bg-surface-container-low">
                <MapContainer
                  center={[latitude || currentCommunity?.coverageArea?.latitude || -26.2041, longitude || currentCommunity?.coverageArea?.longitude || 28.0473]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {latitude && longitude && <RecenterMap center={[latitude, longitude]} />}
                  <MapClickHandler onLocationSelect={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    setLocationSource('user_selected');
                    setLocationName('Selected Location');
                  }} />

                  {latitude && longitude && (
                    <>
                      <Marker
                        position={[latitude, longitude]}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const marker = e.target;
                            const position = marker.getLatLng();
                            setLatitude(position.lat);
                            setLongitude(position.lng);
                            setLocationSource('user_selected');
                            setLocationName('Selected Location');
                          },
                        }}
                      />
                      <Circle
                        center={[latitude, longitude]}
                        radius={currentCommunity?.coverageArea?.radius ? currentCommunity.coverageArea.radius * 1000 : 5000}
                        pathOptions={{ color: '#F59E0B', fillColor: '#F59E0B', fillOpacity: 0.06, weight: 1, dashArray: '5, 10' }}
                      />
                    </>
                  )}
                </MapContainer>

                <div className="absolute top-4 left-4 right-4 z-[1000]">
                  <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-amber-200/50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                        {locationSource === 'profile_default' ? 'Community Default' :
                         locationSource === 'current_location' ? 'Your Location' : 'Custom Location'}
                      </p>
                      <p className="text-[9px] text-slate-400">Tap map to set pin or drag marker</p>
                    </div>
                    {locationSource !== 'profile_default' && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-bold text-amber-600 uppercase">Set</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div className="group">
            <label className="block text-sm font-semibold mb-3 ml-1 text-on-surface-variant">Add Photos (max 2, up to 4MB each)</label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative w-full aspect-video bg-surface-container-low border-2 border-dashed border-outline-variant/50 rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors cursor-pointer group-hover:bg-surface-container overflow-hidden",
                  isUploading && "animate-pulse"
                )}
              >
                {postsImage ? (
                  <>
                    <img src={postsImage} alt="Notice" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPostsImage('');
                        setPostsImage2('');
                      }}
                      className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <Camera className="w-10 h-10 text-outline-variant group-hover:text-primary transition-colors" />
                    <p className="text-sm font-medium text-on-surface-variant">Upload first image</p>
                  </>
                )}
              </div>
              {postsImage && (
                <div
                  onClick={() => !postsImage2 && fileInputRef2.current?.click()}
                  className={cn(
                    "relative w-full aspect-video bg-surface-container-low border-2 border-dashed border-outline-variant/50 rounded-3xl flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden",
                    !postsImage2 && "cursor-pointer hover:border-primary group-hover:bg-surface-container",
                    isUploading && "animate-pulse"
                  )}
                >
                  {postsImage2 ? (
                    <>
                      <img src={postsImage2} alt="Notice" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setPostsImage2(''); }}
                        className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera className="w-10 h-10 text-outline-variant group-hover:text-primary transition-colors" />
                      <p className="text-sm font-medium text-on-surface-variant">Upload second image</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold mb-1 ml-1 text-on-surface-variant">Post Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this notice about?"
              className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-secondary focus:ring-0 px-4 py-4 rounded-t-2xl transition-all font-headline text-lg"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold mb-1 ml-1 text-on-surface-variant">Message Body</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Provide details for your community..."
              className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-secondary focus:ring-0 px-4 py-4 rounded-t-2xl transition-all resize-none"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold mb-1 ml-1 text-on-surface-variant">Location</label>
            <div className="relative">
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder={postSubtype === 'warning' ? "Location set via map above" : "Set location (optional)"}
                className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-secondary focus:ring-0 px-4 py-4 rounded-t-2xl pl-10 transition-all text-sm"
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              {postSubtype !== 'warning' && (
                <button
                  onClick={handleUseCurrentLocation}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-lg hover:bg-secondary/20 transition-colors"
                >
                  Use Current
                </button>
              )}
            </div>
          </div>

          {/* Expiry */}
          {postSubtype !== 'warning' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold mb-1 ml-1 text-on-surface-variant">Expiration Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={expiresAt}
                  min={formatDateInput(new Date())}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-secondary focus:ring-0 px-4 py-4 rounded-t-2xl transition-all"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5 pointer-events-none" />
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer Actions */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-surface/70 backdrop-blur-md px-6 pb-8 pt-4 border-t border-surface-container">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={!title || (postSubtype !== 'warning' && !expiresAt)}
            className={cn(
              "flex-1 py-4 rounded-full font-headline font-extrabold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2",
              title && (postSubtype === 'warning' || expiresAt) ? NOTICE_CTA[postSubtype].buttonBg : "bg-surface-container text-outline cursor-not-allowed"
            )}
          >
            {postToEdit ? 'Update Notice' : NOTICE_CTA[postSubtype].ctaLabel}
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>

      <PostConfirmationModal
        isOpen={showConfirmModal}
        ctaLabel={postToEdit ? 'Update Notice' : NOTICE_CTA[postSubtype].ctaLabel}
        postType={theme.label}
        communityName={currentCommunity?.name || 'Community'}
        title={title}
        themeColor={NOTICE_CTA[postSubtype].themeColor}
        onConfirm={() => {
          setShowConfirmModal(false);
          handlePost();
        }}
        onCancel={() => setShowConfirmModal(false)}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef2}
        onChange={handleSecondImageUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};
