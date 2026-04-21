import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Siren, AlertTriangle, ArrowRight, Compass, MessageSquare, CheckCircle2, Tag, Shield, Navigation, Crosshair, Users, Store, Filter, Info, ExternalLink, Plus, Heart, MoreVertical, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { cn } from '../lib/utils';
import { InteractiveCoverageMap } from './InteractiveCoverageMap';
import { CommunityNotice } from '../types';

const emergencyIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-error p-2 rounded-full border-2 border-white shadow-xl text-white animate-pulse z-[1000]"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export const HomePage = ({ 
  initialCenter, 
  onCenterReset,
  onOpenEmergencyHub,
  onOpenChat,
  onStartEmergencyPost,
  onStartIncidentReport,
  onEditPost,
  onOpenCharityHub,
  onManageCharity,
  onSuggestCharity
}: { 
  initialCenter?: { lat: number, lng: number } | null, 
  onCenterReset?: () => void,
  onOpenEmergencyHub?: (post: any) => void,
  onOpenChat?: (post: any) => void,
  onStartEmergencyPost?: () => void,
  onStartIncidentReport?: (urgency: 'general' | 'info' | 'warning' | 'emergency') => void,
  onEditPost?: (post: CommunityNotice) => void,
  onOpenCharityHub?: () => void,
  onManageCharity?: () => void,
  onSuggestCharity?: () => void,
}) => {
  const mapSectionRef = React.useRef<HTMLDivElement>(null);

  const scrollToMapAndCenter = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(15);
    setMapFilterOverride('notices');
    setResetTrigger(t => t + 1);
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const { currentCommunity, communities, setCurrentCommunity, posts, members, toggleEmergencyMode, updateLiveLocation, securityResponders, communityBusinesses, charities, removePost } = useCommunity();
  const { user, userProfile } = useFirebase();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-26.2041, 28.0473]);
  const [mapZoom, setMapZoom] = useState(14);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [mapFilter, setMapFilter] = useState<'all' | 'members' | 'listings' | 'notices' | 'businesses'>('all');
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [showIncidentMenu, setShowIncidentMenu] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [mapFilterOverride, setMapFilterOverride] = useState<'members' | 'listings' | 'notices' | 'businesses' | undefined>(undefined);
  const [mapUnlocked, setMapUnlocked] = useState(false);

  useEffect(() => {
    if (initialCenter) {
      setMapCenter([initialCenter.lat, initialCenter.lng]);
      setMapZoom(15);
      setMapFilterOverride('notices');
      setResetTrigger(t => t + 1);
      onCenterReset?.();
      setTimeout(() => {
        mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else if (currentCommunity?.coverageArea) {
      setMapCenter([currentCommunity.coverageArea.latitude, currentCommunity.coverageArea.longitude]);
    }
  }, [initialCenter, currentCommunity?.id]);

  useEffect(() => {
    setIsEmergencyActive(!!currentCommunity?.isEmergencyMode);
    if (currentCommunity?.isEmergencyMode) {
      const latestEmergency = posts.find(p => p.urgency === 'emergency' || p.urgency_level === 'emergency');
      if (latestEmergency?.latitude && latestEmergency?.longitude) {
        setMapCenter([latestEmergency.latitude, latestEmergency.longitude]);
      }
    }
  }, [currentCommunity?.isEmergencyMode, posts]);

  // Live location tracking for members who share location and security personnel
  const lastLocationUpdate = React.useRef<number>(0);
  useEffect(() => {
    const shouldTrack = userProfile?.isSecurityMember || userProfile?.locationSharingEnabled;
    if (!shouldTrack) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        // Only update every 10 seconds to save quota
        if (now - lastLocationUpdate.current > 10000) {
          lastLocationUpdate.current = now;
          updateLiveLocation(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userProfile?.isSecurityMember, userProfile?.locationSharingEnabled, currentCommunity?.id]);

  // Re-lock map when it scrolls out of view
  useEffect(() => {
    const ref = mapSectionRef.current;
    if (!ref) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) setMapUnlocked(false); },
      { threshold: 0.1 }
    );
    observer.observe(ref);
    return () => observer.disconnect();
  }, []);

  const userRole = currentCommunity?.userRole || 'Member';

  const calculateDistance = (lat?: number, lng?: number) => {
    if (!lat || !lng || !currentCommunity?.coverageArea) return null;
    const lat1 = currentCommunity.coverageArea.latitude;
    const lon1 = currentCommunity.coverageArea.longitude;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat - lat1) * Math.PI / 180;
    const dLon = (lng - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d.toFixed(1);
  };

  const getUrgencyPriority = (level?: string, urgency?: string) => {
    const l = level || (urgency === 'high' ? 'warning' : urgency === 'normal' ? 'info' : urgency === 'low' ? 'general' : urgency);
    switch (l) {
      case 'emergency': return 4;
      case 'warning': return 3;
      case 'info': return 2;
      case 'general': return 1;
      default: return 0;
    }
  };

  const alert = currentCommunity?.alerts?.[0];
  const notices = [...posts]
    .filter(p => p.type === 'notice' && p.urgency !== 'emergency' && p.urgency_level !== 'emergency')
    .sort((a, b) => {
      const priorityA = getUrgencyPriority(a.urgency_level, a.urgency);
      const priorityB = getUrgencyPriority(b.urgency_level, b.urgency);
      if (priorityA !== priorityB) return priorityB - priorityA;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
  const listings = [...posts]
    .filter(p => p.type === 'listing')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);

  const communityData = (currentCommunity as unknown as Record<string, unknown>) ?? {};
  const selectedCharityId = typeof communityData.selected_charity === 'string' ? communityData.selected_charity : undefined;
  const selectedCharity = charities.find(c => c.id === selectedCharityId)
    ?? charities.find(c => c.isFeatured)
    ?? (charities.length === 1 ? charities[0] : undefined);

  const approvedPublicCharityListings = React.useMemo(() => {
    if (!selectedCharity) return [] as CommunityNotice[];

    return posts.filter((post) => {
      if (post.type !== 'listing') return false;
      if (!post.isPublic) return false;
      if (post.charityId !== selectedCharity.id) return false;

      const normalizedStatus = typeof post.status === 'string' ? post.status.toLowerCase() : '';
      return normalizedStatus === 'active' || normalizedStatus === 'pinned';
    });
  }, [posts, selectedCharity]);

  const potentialRaisedFromListings = React.useMemo(() => {
    const getListingContribution = (listing: CommunityNotice) => {
      if (typeof listing.charity_amount === 'number' && Number.isFinite(listing.charity_amount)) {
        return Math.max(0, listing.charity_amount);
      }

      const basePrice = typeof listing.community_price === 'number'
        ? listing.community_price
        : typeof listing.price === 'number'
          ? listing.price
          : 0;

      const publicPrice = typeof listing.public_price === 'number'
        ? listing.public_price
        : typeof listing.price === 'number'
          ? listing.price
          : basePrice;

      return Math.max(0, publicPrice - basePrice);
    };

    return approvedPublicCharityListings.reduce((sum, listing) => sum + getListingContribution(listing), 0);
  }, [approvedPublicCharityListings]);

  const publicListingContributionCount = approvedPublicCharityListings.length;
  const fundraisingGoal = typeof selectedCharity?.fundraisingGoal === 'number' ? selectedCharity.fundraisingGoal : undefined;
  const hasFundraisingGoal = typeof fundraisingGoal === 'number' && fundraisingGoal > 0;
  const proposedAmount = hasFundraisingGoal
    ? fundraisingGoal
    : Math.max(potentialRaisedFromListings, 1);
  const potentialProgressPercent = Math.min(
    100,
    Math.max((potentialRaisedFromListings / proposedAmount) * 100, 0)
  );
  const charityDescription = typeof communityData.charity_description === 'string'
    ? communityData.charity_description
    : selectedCharity?.description;
  const charityImage = typeof communityData.charity_image === 'string'
    ? communityData.charity_image
    : selectedCharity?.logo || selectedCharity?.coverImage;
  const hasNoNotices = notices.length === 0;
  const canManageCharity = userRole === 'Admin' || userRole === 'Moderator';

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const getPostBorder = (post: any) => {
    if (post.type !== 'notice') return 'border-surface-container';
    const urgency = post.urgency_level || (post.urgency === 'high' ? 'warning' : post.urgency === 'normal' ? 'info' : post.urgency === 'low' ? 'general' : post.urgency);
    switch (urgency) {
      case 'emergency': return 'border-error/50 ring-1 ring-error/10 shadow-lg shadow-error/5';
      case 'warning': return 'border-amber-400/50 ring-1 ring-amber-400/10 shadow-lg shadow-amber-400/5';
      case 'info': return 'border-blue-400/50 ring-1 ring-blue-400/10';
      case 'general': return 'border-emerald-400/30 opacity-90';
      default: return 'border-surface-container';
    }
  };

  const getUrgencyColor = (level?: string, urgency?: string) => {
    const l = level || (urgency === 'high' ? 'warning' : urgency === 'normal' ? 'info' : urgency === 'low' ? 'general' : urgency);
    switch (l) {
      case 'emergency': return 'text-error bg-error/10 border-error/20';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'general': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-on-surface-variant bg-surface-container-low border-outline-variant/20';
    }
  };

  const getUrgencyIcon = (level?: string, urgency?: string) => {
    const l = level || (urgency === 'high' ? 'warning' : urgency === 'normal' ? 'info' : urgency === 'low' ? 'general' : urgency);
    switch (l) {
      case 'emergency': return <Siren className="w-3 h-3" />;
      case 'warning': return <AlertTriangle className="w-3 h-3" />;
      case 'info': return <Info className="w-3 h-3" />;
      case 'general': return <Tag className="w-4 h-4" />;
      default: return <Compass className="w-3 h-3" />;
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 pt-8 space-y-10 pb-32">
      {/* Quick Action Buttons */}
      <section className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => {
            if (isEmergencyActive) {
              setShowEmergencyDialog(true);
            } else {
              onStartEmergencyPost?.();
            }
          }}
          disabled={currentCommunity?.status === 'READ-ONLY'}
          className={cn(
            "clay-gradient flex flex-col items-center justify-center py-4 px-4 rounded-2xl text-white gap-2 transition-transform active:scale-95 shadow-lg relative overflow-hidden",
            currentCommunity?.status === 'READ-ONLY' && "opacity-50 grayscale cursor-not-allowed",
            isEmergencyActive && "ring-4 ring-error animate-pulse"
          )}
        >
          <Siren className="w-6 h-6 fill-current" />
          <span className="font-semibold text-sm">{isEmergencyActive ? 'ACTIVE EMERGENCY' : 'Emergency Help'}</span>
          {isEmergencyActive && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-ping" />
          )}
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowIncidentMenu(!showIncidentMenu)}
            disabled={currentCommunity?.status === 'READ-ONLY'}
            className={cn(
              "w-full bg-primary-container text-white flex flex-col items-center justify-center py-4 px-4 rounded-2xl gap-2 transition-transform active:scale-95 shadow-lg",
              currentCommunity?.status === 'READ-ONLY' && "opacity-50 grayscale cursor-not-allowed"
            )}
          >
            <Plus className="w-6 h-6" />
            <span className="font-semibold text-sm">Create Notice</span>
          </button>

          <AnimatePresence>
            {showIncidentMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-surface-container overflow-hidden z-[100]"
              >
                <div className="p-3 border-b border-surface-container bg-surface-container-low">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest text-center">Select Urgency Level</p>
                </div>
                <div className="grid grid-cols-1 divide-y divide-surface-container">
                  {[
                    { level: 'warning', label: 'Warning', color: 'text-amber-500', sub: 'Immediate attention needed' },
                    { level: 'info', label: 'Info', color: 'text-blue-500', sub: 'Standard community notice' },
                    { level: 'general', label: 'General', color: 'text-emerald-500', sub: 'General information' }
                  ].map((urgency) => (
                    <button
                      key={urgency.level}
                      onClick={() => {
                        onStartIncidentReport?.(urgency.level as any);
                        setShowIncidentMenu(false);
                      }}
                      className="flex flex-col items-center py-3 px-4 hover:bg-surface-container transition-colors"
                    >
                      <span className={cn("font-bold text-sm", urgency.color)}>{urgency.label}</span>
                      <span className="text-[9px] text-outline">{urgency.sub}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Emergency Dialog */}
      <AnimatePresence>
        {showEmergencyDialog && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="bg-error/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Siren className="w-8 h-8 text-error animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-primary">Emergency in Progress</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  A community emergency is already active. Would you like to join the coordination hub or report a new emergency?
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const latestEmergency = posts.find(p => p.urgency === 'emergency');
                    if (latestEmergency) {
                      onOpenEmergencyHub?.(latestEmergency);
                    }
                    setShowEmergencyDialog(false);
                  }}
                  className="w-full bg-error text-white py-4 rounded-full font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Join Coordination Hub
                </button>
                <button 
                  onClick={() => {
                    onStartEmergencyPost?.();
                    setShowEmergencyDialog(false);
                  }}
                  className="w-full bg-surface-container-high text-primary py-4 rounded-full font-bold active:scale-95 transition-all"
                >
                  Report New Emergency
                </button>
                <button 
                  onClick={() => setShowEmergencyDialog(false)}
                  className="w-full py-2 text-sm font-semibold text-outline hover:text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero: Emergency Alert */}
      {alert && (
        <section className="relative overflow-hidden bg-error rounded-3xl p-6 text-tertiary-fixed shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 bg-tertiary-fixed/20 px-3 py-1 rounded-full">
              <AlertTriangle className="w-4 h-4 fill-current" />
              <span className="text-[10px] font-bold tracking-widest uppercase">{alert.priority} Priority Alert</span>
            </div>
            <span className="text-xs font-medium opacity-80 italic">{alert.timestamp}</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold leading-tight font-headline">{alert.title}</h2>
            <p className="text-tertiary-fixed/90 font-light leading-relaxed">{alert.description}</p>
          </div>
          <div className="mt-6 flex gap-3">
            <button className="bg-tertiary-fixed text-error font-bold px-6 py-3 rounded-full text-sm hover:bg-white transition-colors">
              Acknowledge
            </button>
            <button className="bg-white/10 text-white font-medium px-6 py-3 rounded-full text-sm backdrop-blur-sm hover:bg-white/20 transition-colors">
              View Details
            </button>
          </div>
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-tertiary-fixed/10 rounded-full blur-3xl"></div>
        </section>
      )}

      {/* Community Pulse Map Section */}
      <section ref={mapSectionRef} className={cn(
        "bg-surface-container-low rounded-3xl p-6 shadow-sm transition-all duration-500 space-y-6",
        isEmergencyActive && "ring-4 ring-error/30 bg-error/5"
      )}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-headline">Interactive Coverage Map</h3>
            <p className="text-xs text-outline font-medium">Live discovery layer for your community radius</p>
          </div>
        </div>

        <div className="relative">
          <InteractiveCoverageMap 
            center={mapCenter}
            zoom={mapZoom}
            resetTrigger={resetTrigger}
            isEmergencyActive={isEmergencyActive}
            showFilters={true}
            showLegend={true}
            showPulseOverlay={true}
            showEmergencyOverlay={true}
            height={notices.length > 0 ? "300px" : "420px"}
            initialFilter={mapFilterOverride}
            isLocked={!mapUnlocked}
            onUnlock={() => setMapUnlocked(true)}
            onOpenEmergencyHub={() => {
              const latestEmergency = posts.find(p => p.urgency === 'emergency' || p.urgency_level === 'emergency');
              if (latestEmergency) {
                onOpenEmergencyHub?.(latestEmergency);
              }
            }}
          />
        </div>

        {!isEmergencyActive && (
          <div className="flex justify-end px-2">
            <button 
              onClick={() => {
                if (currentCommunity?.coverageArea) {
                  const { latitude, longitude, radius } = currentCommunity.coverageArea;
                  setMapCenter([latitude, longitude]);
                  // Calculate zoom so the coverage circle fits vertically
                  // At zoom z, the vertical span ≈ 40075 * cos(lat) / 2^z (but for latitude: 40075 / 2^z in km for the full 256px tile)
                  // We want 2 * radius (diameter) to fit the map height. Map height is ~500px ≈ 256 * 2 tiles.
                  // Formula: zoom = log2(20037.5 / radius) — adjusted for half-tile display
                  const radiusKm = radius || 2;
                  const zoomLevel = Math.round(Math.log2(20037.5 / radiusKm) - 1);
                  setMapZoom(Math.max(10, Math.min(18, zoomLevel)));
                  setResetTrigger(t => t + 1);
                  setMapUnlocked(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-primary rounded-xl text-xs font-bold hover:bg-surface-container-highest transition-all active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              Reset Map View
            </button>
          </div>
        )}
      </section>

      {/* Recent Notices: Bento Grid */}
      <section className="space-y-6">
        <div className="flex items-end justify-between px-2">
          <h3 className="text-xl font-bold font-headline">Community Notices</h3>
          <button className="text-secondary font-semibold text-sm flex items-center gap-1 hover:underline">
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {notices.length === 0 ? (
            <div className="md:col-span-3 flex flex-col items-center justify-center gap-3 py-10 px-6 bg-surface-container-lowest rounded-3xl border border-surface-container shadow-sm text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <Shield className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-primary text-lg">All Secure</p>
                <p className="text-sm text-on-surface-variant mt-1">No active notices right now. Your community is all clear.</p>
              </div>
              {currentCommunity?.status !== 'READ-ONLY' && (
                <button
                  onClick={() => onStartIncidentReport?.('general')}
                  className="mt-2 px-5 py-2 bg-surface-container-high text-primary rounded-full text-xs font-bold hover:bg-surface-container-highest transition-all active:scale-95"
                >
                  Post a Notice
                </button>
              )}
            </div>
          ) : (
            notices.map((notice) => (
            <div 
              key={notice.id}
              className={cn(
                "bg-surface-container-lowest rounded-3xl flex flex-col justify-between hover:bg-surface-bright transition-all group shadow-sm border relative overflow-hidden",
                getPostBorder(notice),
                notice.isLarge ? "md:col-span-2 min-h-[280px]" : "min-h-[200px]"
              )}
            >
              {/* Map for Emergency/Warning notices */}
              {(notice.urgency === 'emergency' || notice.urgency_level === 'emergency' || notice.urgency_level === 'warning' || notice.urgency === 'high') && notice.latitude && notice.longitude && (
                <div 
                  className="w-full h-40 overflow-hidden border-b border-outline-variant/10 relative cursor-pointer"
                  onClick={() => scrollToMapAndCenter(notice.latitude!, notice.longitude!)}
                  title="View on Interactive Map"
                >
                  <MapContainer 
                    center={[notice.latitude, notice.longitude]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    dragging={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[notice.latitude, notice.longitude]} icon={emergencyIcon} />
                    <Circle 
                      center={[notice.latitude, notice.longitude]} 
                      radius={10000} 
                      pathOptions={{ 
                        color: (notice.urgency === 'emergency' || notice.urgency_level === 'emergency') ? '#ff4d4d' : '#f59e0b', 
                        fillColor: (notice.urgency === 'emergency' || notice.urgency_level === 'emergency') ? '#ff4d4d' : '#f59e0b', 
                        fillOpacity: 0.05, weight: 1, dashArray: '5, 10' 
                      }} 
                    />
                  </MapContainer>
                  <div className={cn(
                    "absolute top-2 right-2 z-[1000] text-white px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-lg",
                    (notice.urgency === 'emergency' || notice.urgency_level === 'emergency') ? "bg-error animate-pulse" : "bg-amber-500"
                  )}>
                    {(notice.urgency === 'emergency' || notice.urgency_level === 'emergency') ? 'Live Situation' : 'Warning Zone'}
                  </div>
                </div>
              )}
              <div className="p-6 flex flex-col justify-between flex-1">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <span className="bg-primary-fixed text-on-primary-fixed text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tighter">
                        {notice.category}
                      </span>
                    </div>
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      getUrgencyColor(notice.urgency_level, notice.urgency)
                    )}>
                      {getUrgencyIcon(notice.urgency_level, notice.urgency)}
                      {notice.urgency_level || notice.urgency || 'Info'}
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === notice.id ? null : notice.id)}
                      className="p-2 rounded-full bg-surface-container-low text-outline hover:text-primary hover:bg-surface-container-high transition-all active:scale-95"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {activeMenuId === notice.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                          className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-outline-variant/10 z-50 py-2 overflow-hidden"
                        >
                          {(notice.author_id === user?.uid || currentCommunity?.userRole === 'Admin') && (
                            <>
                              {notice.author_id === user?.uid && (
                                <button 
                                  onClick={() => {
                                    onEditPost?.(notice);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-bold text-primary hover:bg-surface-container-low transition-colors flex items-center gap-2"
                                >
                                  <Tag className="w-4 h-4" />
                                  Edit Notice
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setPostToDelete(notice.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm font-bold text-error hover:bg-error/5 transition-colors flex items-center gap-2"
                              >
                                <AlertTriangle className="w-4 h-4" />
                                Delete Notice
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => setActiveMenuId(null)}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center gap-2"
                          >
                            <Share2 className="w-4 h-4" />
                            Share
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <h4 className={cn(
                  "font-bold leading-snug group-hover:text-secondary transition-colors font-headline",
                  notice.isLarge ? "text-2xl" : "text-lg"
                )}>
                  {notice.title}
                </h4>
                {notice.posts_image && !(notice.latitude && notice.longitude && (notice.urgency === 'emergency' || notice.urgency_level === 'emergency' || notice.urgency_level === 'warning' || notice.urgency === 'high')) && (
                  <div className="w-full aspect-video rounded-2xl overflow-hidden border border-outline-variant/10">
                    <img 
                      src={notice.posts_image} 
                      alt={notice.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                {(notice.locationName || notice.latitude) && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-secondary bg-secondary/5 px-2 py-1 rounded-md w-fit">
                    <MapPin className="w-3 h-3" />
                    <span>{notice.locationName || 'Location Provided'}</span>
                    {calculateDistance(notice.latitude, notice.longitude) && (
                      <span className="text-outline-variant ml-1">• {calculateDistance(notice.latitude, notice.longitude)}km away</span>
                    )}
                  </div>
                )}
                <p className="text-on-surface-variant line-clamp-2 text-sm">
                  {notice.description}
                </p>
              </div>
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden">
                    <img 
                      alt={notice.authorName} 
                      src={notice.authorImage} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold">{notice.authorName}</p>
                    <p className="text-[10px] text-outline">{notice.authorRole} • {formatDate(notice.timestamp)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(notice.urgency === 'emergency' || notice.urgency_level === 'emergency' || notice.priority === 'emergency') && (
                    <button 
                      className="p-2 rounded-full bg-error/10 text-error hover:bg-error/20 transition-all active:scale-95"
                      title="Join Emergency Coordination"
                      onClick={() => onOpenEmergencyHub?.(notice)}
                    >
                      <Siren className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    className="p-2 rounded-full bg-primary/5 text-primary hover:bg-primary/10 transition-all active:scale-95"
                    title={`Chat with ${notice.authorName}`}
                    onClick={() => onOpenChat?.(notice)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
              </div>
            </div>
            ))
          )}
        </div>
      </section>

      {/* Community Charity Reflection Block */}
      <section className="space-y-4">
        <div className="px-2">
          <h3 className="text-lg font-bold font-headline text-primary">Community Charity</h3>
          <p className="text-xs text-on-surface-variant">Listen, connect, and act together.</p>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenCharityHub?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenCharityHub?.();
            }
          }}
          className={cn(
            "relative overflow-hidden w-full text-left rounded-3xl border bg-surface-container-lowest p-4 shadow-sm transition-all active:scale-[0.99] hover:bg-surface-bright",
            hasNoNotices ? "ring-1 ring-primary/15 border-primary/20" : "border-surface-container"
          )}
        >
          {selectedCharity && charityImage && (
            <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true">
              <img
                src={charityImage}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div
            className="absolute inset-0 bg-gradient-to-br from-white via-surface/98 to-primary/26 sm:from-white/94 sm:via-surface/90 sm:to-primary/14 pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10">
          {selectedCharity ? (
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-container-low shrink-0 border border-outline-variant/10">
                {charityImage ? (
                  <img
                    src={charityImage}
                    alt={selectedCharity.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-outline">
                    <Heart className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <h4 className="text-base font-bold text-primary truncate">{selectedCharity.name}</h4>
                <p className="text-sm text-on-surface-variant line-clamp-3">
                  {charityDescription || 'Supporting this month as a community-backed initiative.'}
                </p>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-primary/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${potentialProgressPercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-primary whitespace-nowrap">
                      R{proposedAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canManageCharity) {
                        onManageCharity?.();
                        return;
                      }
                      onSuggestCharity?.();
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide text-white transition-opacity",
                      canManageCharity ? "bg-primary hover:opacity-90" : "bg-secondary hover:opacity-90"
                    )}
                  >
                    {canManageCharity ? 'Manage Charity' : 'Suggest Charity'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-base font-bold text-primary">Suggest a charity</h4>
              <p className="text-sm text-on-surface-variant">Admins can assign a charity to spotlight community impact.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canManageCharity) {
                      onManageCharity?.();
                      return;
                    }
                    onSuggestCharity?.();
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide text-white transition-opacity",
                    canManageCharity ? "bg-primary hover:opacity-90" : "bg-secondary hover:opacity-90"
                  )}
                >
                  {canManageCharity ? 'Manage Charity' : 'Suggest Charity'}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </section>


      {/* Recent Listings Section */}
      {listings.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between px-2">
            <h3 className="text-xl font-bold font-headline">Recent Listings</h3>
            <button className="text-secondary font-semibold text-sm flex items-center gap-1 hover:underline">
              View Market <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div 
                key={listing.id}
                className={cn(
                  "bg-surface-container-lowest rounded-3xl p-6 flex flex-col justify-between hover:bg-surface-bright transition-all group shadow-sm border relative",
                  getPostBorder(listing)
                )}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="bg-secondary-fixed text-on-secondary-fixed text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tighter">
                        {listing.category}
                      </span>
                      {listing.price && (
                        <span className="text-secondary font-bold text-sm">
                          R{listing.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === listing.id ? null : listing.id)}
                        className="p-2 rounded-full bg-surface-container-low text-outline hover:text-primary hover:bg-surface-container-high transition-all active:scale-95"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {activeMenuId === listing.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-outline-variant/10 z-50 py-2 overflow-hidden"
                          >
                            {(listing.author_id === user?.uid || currentCommunity?.userRole === 'Admin') && (
                              <>
                                {listing.author_id === user?.uid && (
                                  <button 
                                    onClick={() => {
                                      onEditPost?.(listing);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm font-bold text-primary hover:bg-surface-container-low transition-colors flex items-center gap-2"
                                  >
                                    <Tag className="w-4 h-4" />
                                    Edit Post
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    setPostToDelete(listing.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-bold text-error hover:bg-error/5 transition-colors flex items-center gap-2"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                  Delete Post
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => setActiveMenuId(null)}
                              className="w-full px-4 py-2 text-left text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center gap-2"
                            >
                              <Share2 className="w-4 h-4" />
                              Share
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <h4 className="font-bold text-lg leading-snug group-hover:text-secondary transition-colors font-headline">
                    {listing.title}
                  </h4>
                  {(listing.locationName || listing.latitude) && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-secondary bg-secondary/5 px-2 py-1 rounded-md w-fit">
                      <MapPin className="w-3 h-3" />
                      <span>{listing.locationName || 'Location Provided'}</span>
                      {calculateDistance(listing.latitude, listing.longitude) && (
                        <span className="text-outline-variant ml-1">• {calculateDistance(listing.latitude, listing.longitude)}km away</span>
                      )}
                    </div>
                  )}
                  <p className="text-on-surface-variant line-clamp-2 text-sm">
                    {listing.description}
                  </p>

                  {listing.isPublic && listing.charityId && (
                    <div className="mt-4 p-3 bg-secondary/5 rounded-2xl border border-secondary/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-secondary/10 p-1.5 rounded-full text-secondary">
                          <Heart className="w-3 h-3 fill-current" />
                        </div>
                        <span className="text-[10px] font-bold text-primary truncate max-w-[120px]">
                          {charities.find(c => c.id === listing.charityId)?.name || 'Charity Impact'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-secondary uppercase tracking-widest">Contribution</p>
                        <p className="text-xs font-bold text-primary">R{listing.charity_amount?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden">
                      <img 
                        alt={listing.authorName} 
                        src={listing.authorImage} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{listing.authorName}</p>
                      <p className="text-[10px] text-outline">{listing.authorRole} • {formatDate(listing.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      className="p-2 rounded-full bg-secondary/5 text-secondary hover:bg-secondary/10 transition-all active:scale-95"
                      title={`Chat with ${listing.authorName}`}
                      onClick={() => onOpenChat?.(listing)}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-error" />
                </div>
                <h3 className="text-xl font-bold font-headline">Delete Post?</h3>
                <p className="text-sm text-on-surface-variant">This action cannot be undone. The post will be permanently removed.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPostToDelete(null)}
                  className="flex-1 py-3 rounded-full font-bold text-sm bg-surface-container-high text-primary hover:bg-surface-container-highest transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removePost(postToDelete);
                    setPostToDelete(null);
                  }}
                  className="flex-1 py-3 rounded-full font-bold text-sm bg-error text-white hover:bg-error/90 transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};
