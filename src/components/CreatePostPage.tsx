import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Plus, 
  X, 
  Info, 
  Calendar, 
  MapPin, 
  Send, 
  Save,
  CheckCircle2,
  AlertTriangle,
  Siren,
  Tag,
  Crosshair
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '../lib/utils';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { PostConfirmationModal } from './PostConfirmationModal';
import { BUSINESS_CATEGORIES } from '../constants';
import { uploadImage } from '../lib/uploadImage';
import type { CommunityNotice } from '../types';

const getCtaConfig = (postType: PostType, urgency: Urgency, isEditing: boolean) => {
  if (isEditing) return { ctaLabel: 'Update Post', themeColor: 'bg-primary' };
  if (postType === 'listing') return { ctaLabel: 'Post Listing', themeColor: 'bg-secondary' };
  switch (urgency) {
    case 'emergency': return { ctaLabel: 'Post Emergency', themeColor: 'bg-error' };
    case 'warning': return { ctaLabel: 'Send Warning', themeColor: 'bg-amber-600' };
    case 'info': return { ctaLabel: 'Share Information', themeColor: 'bg-blue-600' };
    case 'general': return { ctaLabel: 'Publish Notice', themeColor: 'bg-emerald-600' };
    default: return { ctaLabel: 'Save Notice', themeColor: 'bg-primary' };
  }
};

type PostType = 'listing' | 'notice';
type Urgency = 'emergency' | 'warning' | 'info' | 'general';
type EmergencyCategory = 'fire' | 'medical' | 'accident' | 'crime';

const EMERGENCY_CATEGORIES: { id: EmergencyCategory; emoji: string; label: string; title: string }[] = [
  { id: 'fire', emoji: '🔥', label: 'Fire', title: '🔥 Fire Emergency' },
  { id: 'medical', emoji: '🚑', label: 'Medical', title: '🚑 Medical Emergency' },
  { id: 'accident', emoji: '🚗', label: 'Accident', title: '🚗 Accident Report' },
  { id: 'crime', emoji: '🚨', label: 'Crime / Security', title: '🚨 Crime/Security Alert' },
];

const securityIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-secondary p-1.5 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

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

export const CreatePostPage = ({ 
  onBack, 
  postToEdit,
  initialType,
  initialUrgency,
  onEmergencyPosted
}: { 
  onBack: () => void, 
  postToEdit?: any,
  initialType?: PostType,
  initialUrgency?: Urgency,
  onEmergencyPosted?: (post: any) => void
}) => {
  const { currentCommunity, charities, addPost, updatePost, securityResponders } = useCommunity();
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
          Your trial has expired. Pay R149 once-off for lifetime membership to create posts and interact with the community.
        </p>
        <button onClick={onBack} className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white">
          Go Back
        </button>
      </div>
    );
  }
  const [postType, setPostType] = useState<PostType>(postToEdit?.type || initialType || 'listing');
  const [urgency, setUrgency] = useState<Urgency>(
    postToEdit?.urgency_level || 
    (initialUrgency as Urgency) || 
    (postToEdit?.urgency === 'high' ? 'warning' : postToEdit?.urgency === 'normal' ? 'info' : postToEdit?.urgency === 'low' ? 'general' : postToEdit?.urgency) ||
    'info'
  );
  const [isPublic, setIsPublic] = useState(postToEdit?.isPublic || false);
  const [isCommunityPick, setIsCommunityPick] = useState(postToEdit?.isCommunityPick || false);
  const [isFree, setIsFree] = useState(postToEdit?.price === 0);
  const [price, setPrice] = useState<string>(postToEdit?.price?.toString() || '');
  const [selectedCharityId, setSelectedCharityId] = useState<string>(postToEdit?.charityId || '');
  const [customCharityPercentage, setCustomCharityPercentage] = useState<string>(postToEdit?.charityPercentage?.toString() || '');
  const [title, setTitle] = useState(postToEdit?.title || '');
  const [description, setDescription] = useState(postToEdit?.description || '');
  const [category, setCategory] = useState(postToEdit?.category || 'All');
  const [locationName, setLocationName] = useState(postToEdit?.locationName || '');
  const [latitude, setLatitude] = useState<number | undefined>(postToEdit?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(postToEdit?.longitude);
  const [postsImage, setPostsImage] = useState<string>(postToEdit?.posts_image || '');
  const [locationSource, setLocationSource] = useState<'profile_default' | 'user_selected' | 'current_location'>(postToEdit?.source || 'profile_default');
  const [isUploading, setIsUploading] = useState(false);
  const [emergencyCategory, setEmergencyCategory] = useState<EmergencyCategory | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (postsImage) {
      alert('Listings allow only one image');
      return;
    }

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

  React.useEffect(() => {
    if (!postToEdit) {
      if (userProfile?.defaultLocation) {
        setLatitude(userProfile.defaultLocation.latitude);
        setLongitude(userProfile.defaultLocation.longitude);
        setLocationName(userProfile.defaultLocation.name);
      } else if (userProfile?.locationSharingEnabled) {
        handleUseCurrentLocation();
      }
    }
  }, [userProfile?.defaultLocation, userProfile?.locationSharingEnabled, postToEdit]);

  const availableCharities = charities.filter(c => c.status !== 'Archived');
  const featuredCharity = availableCharities.find(c => c.isFeatured) ?? (availableCharities.length === 1 ? availableCharities[0] : undefined);
  const selectedCharity = featuredCharity ?? availableCharities.find(c => c.id === selectedCharityId);

  React.useEffect(() => {
    if (featuredCharity && selectedCharityId !== featuredCharity.id) {
      setSelectedCharityId(featuredCharity.id);
      if (!customCharityPercentage || parseFloat(customCharityPercentage) < featuredCharity.percentage) {
        setCustomCharityPercentage(featuredCharity.percentage.toString());
      }
    }
    if (!featuredCharity && selectedCharityId) {
      setSelectedCharityId('');
    }
  }, [featuredCharity, selectedCharityId, customCharityPercentage]);

  const enabledListingCategories = React.useMemo(() => {
    const enabledIds = currentCommunity?.enabledCategories ?? BUSINESS_CATEGORIES.map(c => c.id);
    return BUSINESS_CATEGORIES
      .filter(cat => enabledIds.includes(cat.id))
      .map(cat => cat.label);
  }, [currentCommunity?.enabledCategories]);

  React.useEffect(() => {
    if (category === 'All') return;
    if (!enabledListingCategories.includes(category)) {
      setCategory('All');
    }
  }, [enabledListingCategories, category]);

  const basePercentage = selectedCharity?.percentage || 0;
  const parsedCustom = parseFloat(customCharityPercentage) || 0;
  const charityPercentage = Math.max(parsedCustom, basePercentage);
  const numericPrice = parseFloat(price) || 0;
  const charityAmount = (numericPrice * charityPercentage) / 100;
  const publicPrice = numericPrice + charityAmount;

  const renderEmergencyForm = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Emergency Map — auto-location */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Your Location
          </label>
          {locationSource !== 'profile_default' && (
            <button 
              onClick={() => {
                if (userProfile?.defaultLocation) {
                  setLatitude(userProfile.defaultLocation.latitude);
                  setLongitude(userProfile.defaultLocation.longitude);
                  setLocationName(userProfile.defaultLocation.name);
                  setLocationSource('profile_default');
                }
              }}
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Reset to Profile Location
            </button>
          )}
        </div>
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-slate-200 shadow-lg bg-slate-50">
          <MapContainer 
            center={[latitude || -26.2041, longitude || 28.0473]} 
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
                  radius={10000} 
                  pathOptions={{ color: '#6B8DD6', fillColor: '#6B8DD6', fillOpacity: 0.06, weight: 1, dashArray: '5, 10' }} 
                />
                <Circle 
                  center={[latitude, longitude]} 
                  radius={20000} 
                  pathOptions={{ color: '#6B8DD6', fillColor: '#6B8DD6', fillOpacity: 0.03, weight: 1, dashArray: '10, 20' }} 
                />
              </>
            )}

            {/* Security Responders */}
            {securityResponders.map((responder) => (
              <Marker 
                key={responder.user_id} 
                position={[responder.latitude, responder.longitude]} 
                icon={securityIcon}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-blue-700 text-xs">{responder.name}</p>
                    <p className="text-[10px] text-slate-500">Emergency Responder</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <div className="absolute top-4 left-4 right-4 z-[1000]">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-slate-200/50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  {locationSource === 'profile_default' ? 'Default Location' : 'Custom Location Active'}
                </p>
                <p className="text-[9px] text-slate-400">Tap map to move pin or drag marker</p>
              </div>
              {locationSource === 'user_selected' && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-bold text-blue-600 uppercase">Position Set</span>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-slate-200/50">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Situational View</p>
              <p className="text-[9px] text-slate-400 leading-tight">Showing 10km & 20km impact radii and active security personnel.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Category Selector */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-600 ml-1">What's happening?</label>
        <div className="grid grid-cols-2 gap-3">
          {EMERGENCY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setEmergencyCategory(cat.id)}
              className={cn(
                "flex flex-col items-center justify-center p-5 rounded-3xl transition-all border-2 active:scale-95",
                emergencyCategory === cat.id
                  ? "bg-blue-50 border-blue-300 shadow-md"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span className="text-3xl mb-2">{cat.emoji}</span>
              <span className={cn(
                "text-sm font-bold",
                emergencyCategory === cat.id ? "text-blue-700" : "text-slate-600"
              )}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Optional Body Text */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-600 ml-1">Additional Details <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe what's happening..."
          className="w-full bg-white border-2 border-slate-200 focus:border-blue-300 focus:ring-0 px-4 py-4 rounded-2xl transition-all resize-none text-slate-700 placeholder:text-slate-300"
        />
      </div>
    </motion.div>
  );

  const renderListingForm = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Photos */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 space-y-4 shadow-sm border border-surface-container">
        <h3 className="font-headline font-bold text-primary">Photos</h3>
        <div className="grid grid-cols-3 gap-3">
          {!postsImage && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "aspect-square bg-surface-container-low rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-all",
                isUploading && "animate-pulse"
              )}
            >
              <Camera className="w-8 h-8 mb-1" />
              <span className="text-[10px] font-medium">Add Photo</span>
            </div>
          )}
          {postsImage && (
            <div className="aspect-square bg-surface-container-low rounded-2xl overflow-hidden relative group">
              <img 
                src={postsImage} 
                alt="Listing" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setPostsImage('')}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-on-surface-variant px-1">Max 1 photo, up to 4MB.</p>
      </section>

      {/* Details */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 space-y-6 shadow-sm border border-surface-container">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-primary ml-1">Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Handmade Pottery"
            className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-secondary focus:ring-0 px-4 py-3 rounded-t-xl transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-primary ml-1">Description</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Tell the community about what you're listing..."
            className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-secondary focus:ring-0 px-4 py-3 rounded-t-xl transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary ml-1">Price (R)</label>
              <input 
                type="number" 
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isFree}
                className={cn(
                  "w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-secondary focus:ring-0 px-4 py-3 rounded-t-xl transition-all",
                  isFree && "opacity-50"
                )}
              />
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-medium">Free Item</span>
              <button 
                onClick={() => {
                  setIsFree(!isFree);
                  if (!isFree) setPrice('0');
                }}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-colors",
                  isFree ? "bg-secondary" : "bg-surface-container-high"
                )}
              >
                <span className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                  isFree ? "right-1" : "left-1"
                )} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-primary ml-1">Post Visibility</label>
            <div className="bg-surface-container-low p-1 rounded-full flex items-center border border-outline-variant/20">
              <button 
                onClick={() => setIsPublic(false)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-semibold rounded-full transition-all",
                  !isPublic ? "bg-surface-container-lowest shadow-sm text-primary" : "text-on-surface-variant"
                )}
              >
                Local
              </button>
              <button 
                onClick={() => setIsPublic(true)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-semibold rounded-full transition-all",
                  isPublic ? "bg-surface-container-lowest shadow-sm text-primary" : "text-on-surface-variant"
                )}
              >
                Public
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant px-1 mt-1">
              Local listings are only seen by community members.
            </p>
          </div>
        </div>

        {/* CAT Card */}
        <AnimatePresence>
          {isPublic && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-primary/5 border border-primary/10 rounded-3xl p-5 space-y-4"
            >
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-primary shrink-0" />
                <p className="text-[11px] text-on-surface leading-relaxed">
                  Public listings include a community contribution (CAT) added to your price. The charity is locked to the active community cause selected by your admin.
                </p>
              </div>

              {selectedCharity ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1">Active Charity</label>
                    <div className="w-full bg-white border-0 border-b-2 border-primary/20 px-4 py-3 rounded-t-xl text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-on-surface">{selectedCharity.name}</span>
                        <span className="text-xs font-bold text-primary whitespace-nowrap">{basePercentage}% minimum</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1">Contribution Percentage (%)</label>
                    <input 
                      type="number"
                      min={basePercentage}
                      value={customCharityPercentage}
                      onChange={(e) => {
                        setCustomCharityPercentage(e.target.value);
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (val < basePercentage) {
                          setCustomCharityPercentage(basePercentage.toString());
                        }
                      }}
                      className="w-full bg-white border-0 border-b-2 border-primary/20 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-xl transition-all text-sm"
                    />
                    <p className="text-[10px] text-on-surface-variant px-1">
                      Your admin sets the minimum community contribution. You can increase it, but you cannot go below {basePercentage}%.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[11px] text-amber-700 leading-relaxed">
                  Public CAT pricing is unavailable until an admin selects the active charity in the Charity Hub.
                </div>
              )}

              <div className="bg-white/50 rounded-2xl p-4 border border-outline-variant/10">
                <div className="flex flex-col gap-2 text-[11px]">
                  <div className="flex justify-between text-on-surface-variant">
                    <span className="font-bold">Charity Name</span>
                    <span className="text-right max-w-[60%] truncate">{selectedCharity?.name || 'No active charity selected'}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span className="font-bold">Local Amount</span>
                    <span>R {numericPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-secondary font-bold">
                    <span>Amount Going To Charity{selectedCharity ? ` (${charityPercentage}%)` : ''}</span>
                    <span>+ R {selectedCharity ? charityAmount.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="h-px bg-outline-variant/20 my-1" />
                  <div className="flex justify-between font-bold text-primary text-sm">
                    <span>Public Marketplace Price</span>
                    <span>R {(selectedCharity ? publicPrice : numericPrice).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <p className="text-[10px] font-semibold text-on-surface-variant">
                  Community members will always see your local price (R {numericPrice.toFixed(2)}).
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-primary ml-1">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-secondary focus:ring-0 px-4 py-3 rounded-t-xl transition-all text-sm"
            >
              <option value="All">All</option>
              {enabledListingCategories.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-primary ml-1">Location</label>
            <div className="relative">
              <input 
                type="text" 
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Set location"
                className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-secondary focus:ring-0 px-4 py-3 rounded-t-xl pl-10 transition-all text-sm"
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              <button 
                onClick={handleUseCurrentLocation}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-lg hover:bg-secondary/20 transition-colors"
              >
                Use Current
              </button>
            </div>
          </div>
        </div>

      </section>

      {/* Guidelines */}
      <aside className="bg-tertiary-fixed/20 rounded-3xl p-6 flex items-start gap-4">
        <Info className="w-6 h-6 text-tertiary shrink-0" />
        <div className="space-y-1">
          <h4 className="font-bold text-tertiary text-sm">Community Guidelines</h4>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            By posting, you agree to our fair-trade policy. Keep our community safe, rooted, and respectful. Listings stay active for 30 days.
          </p>
        </div>
      </aside>
    </motion.div>
  );

  const handlePost = async () => {
    const isEmergency = postType === 'notice' && urgency === 'emergency';
    const emergencyTitle = isEmergency && emergencyCategory
      ? EMERGENCY_CATEGORIES.find(c => c.id === emergencyCategory)!.title
      : '';

    if (isEmergency) {
      if (!emergencyCategory) return;
    } else {
      if (!title || !description) return;
    }

    if (postType === 'listing' && isPublic && !featuredCharity) {
      return;
    }

    const urgencyMap: Record<Urgency, NonNullable<CommunityNotice['urgency']>> = {
      emergency: 'emergency',
      warning: 'high',
      info: 'normal',
      general: 'low',
    };

    const resolvedUrgency: CommunityNotice['urgency'] | undefined = postType === 'notice'
      ? urgencyMap[urgency]
      : undefined;

    const postData: Omit<CommunityNotice, 'id' | 'timestamp'> = {
      type: postType,
      postSubtype: isEmergency ? 'emergency' as const : 'listing' as const,
      title: isEmergency ? emergencyTitle : title,
      description: isEmergency ? (description || emergencyTitle) : description,
      category: postType === 'listing' ? category : 'Community',
      authorName: postToEdit?.authorName || userProfile?.name || user?.displayName || 'Community Member',
      author_id: postToEdit?.author_id || user?.uid,
      authorRole: postToEdit?.authorRole || (currentCommunity?.userRole || 'Member'),
      authorImage: postToEdit?.authorImage || userProfile?.profile_image || user?.photoURL || `https://picsum.photos/seed/${user?.uid}/200/200`,
      charityId: isPublic ? selectedCharityId : undefined,
      charityPercentage: isPublic ? charityPercentage : undefined,
      charity_amount: postType === 'listing' ? (isPublic ? charityAmount : 0) : undefined,
      isPublic,
      isCommunityPick,
      price: postType === 'listing' ? numericPrice : undefined,
      community_price: postType === 'listing' ? numericPrice : undefined,
      public_price: postType === 'listing' ? (isPublic ? (numericPrice + charityAmount) : numericPrice) : undefined,
      urgency: resolvedUrgency,
      urgency_level: postType === 'notice' ? urgency : undefined,
      locationName,
      latitude,
      longitude,
      source: locationSource,
      posts_image: postsImage,
    };

    if (postToEdit) {
      await updatePost({
        ...postToEdit,
        ...postData,
      });
      onBack();
    } else {
      const postId = await addPost(postData);
      if (postId && postData.urgency === 'emergency') {
        onEmergencyPosted?.({ ...postData, id: postId, timestamp: new Date().toISOString() });
      } else {
        onBack();
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <main className="max-w-2xl mx-auto px-6 pt-8 pb-32 space-y-8">
        {/* Type Banner */}
        <div className={cn(
          "p-6 rounded-[2.5rem] flex items-center gap-4 border shadow-sm",
          postType === 'listing' 
            ? "bg-secondary-container/10 border-secondary/20" 
            : urgency === 'emergency'
              ? "bg-slate-50 border-slate-200"
              : "bg-primary-container/10 border-primary/20"
        )}>
          <div className={cn(
            "w-14 h-14 rounded-3xl flex items-center justify-center shadow-inner",
            postType === 'listing' ? "bg-secondary text-white" : urgency === 'emergency' ? "bg-slate-500 text-white" : "bg-primary text-white"
          )}>
            {postType === 'listing' ? <Tag className="w-7 h-7" /> : <Siren className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className={cn("font-headline font-black text-xl", urgency === 'emergency' ? "text-slate-700" : "text-primary")}>
                {postType === 'listing' ? 'Marketplace Listing' : urgency === 'emergency' ? 'Emergency Notice' : 'Community Notice'}
              </h2>
              <div className={cn(
                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                urgency === 'emergency' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-primary/10 text-primary border-primary/20"
              )}>
                {currentCommunity?.name}
              </div>
            </div>
            <p className={cn("text-[11px] font-bold uppercase tracking-widest", urgency === 'emergency' ? "text-slate-400" : "text-on-surface-variant")}>
              {postType === 'listing' ? 'Share items with your community' : urgency === 'emergency' ? 'Stay calm. Report what\u2019s happening.' : 'Alert neighbors about local events'}
            </p>
          </div>
        </div>

        {postType === 'listing' ? renderListingForm() : renderEmergencyForm()}
      </main>

      {/* Footer Actions */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-surface/70 backdrop-blur-md px-6 pb-8 pt-4 border-t border-surface-container">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => setShowConfirmModal(true)}
            disabled={urgency === 'emergency' && !emergencyCategory}
            className={cn(
              "flex-1 py-4 rounded-full font-headline font-extrabold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2",
              urgency === 'emergency'
                ? emergencyCategory
                  ? "bg-error text-white hover:bg-error/90"
                  : "bg-surface-container text-outline cursor-not-allowed"
                : postType === 'listing'
                  ? "clay-gradient text-white"
                  : urgency === 'warning'
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : urgency === 'info'
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {getCtaConfig(postType, urgency, !!postToEdit).ctaLabel}
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Post Confirmation Modal */}
      <PostConfirmationModal
        isOpen={showConfirmModal}
        ctaLabel={getCtaConfig(postType, urgency, !!postToEdit).ctaLabel}
        postType={postType === 'listing' ? 'Listing' : urgency === 'emergency' ? 'Emergency' : urgency === 'warning' ? 'Warning' : urgency === 'info' ? 'Information' : 'Notice'}
        communityName={currentCommunity?.name || 'Community'}
        title={urgency === 'emergency' && emergencyCategory ? EMERGENCY_CATEGORIES.find(c => c.id === emergencyCategory)?.title || '' : title}
        themeColor={getCtaConfig(postType, urgency, !!postToEdit).themeColor}
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
    </div>
  );
};
