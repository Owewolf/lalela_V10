import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Tag, 
  CheckCircle2, 
  AlertTriangle, 
  Siren, 
  Clock,
  User,
  MoreVertical,
  Heart,
  MessageSquare,
  Share2,
  ArrowRight,
  MapPin,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { cn } from '../lib/utils';
import { CommunityNotice } from '../types';

const securityIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-secondary p-1.5 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const emergencyIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-error p-2 rounded-full border-2 border-white shadow-xl text-white animate-pulse z-[1000]"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface PostsPageProps {
  onCreatePost: () => void;
  onEditPost: (post: CommunityNotice) => void;
  onOpenChat?: (post: CommunityNotice) => void;
  onOpenEmergencyHub?: (post: CommunityNotice) => void;
  onViewOnMap?: (lat: number, lng: number) => void;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

export const PostsPage: React.FC<PostsPageProps> = ({ onCreatePost, onEditPost, onOpenChat, onOpenEmergencyHub, onViewOnMap }) => {
  const { posts, currentCommunity, removePost, charities, securityResponders } = useCommunity();
  const { user, userProfile } = useFirebase();
  const [filter, setFilter] = useState<'all' | 'listing' | 'notice'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  React.useEffect(() => {
    if (userProfile?.defaultLocation) {
      setUserLocation({
        lat: userProfile.defaultLocation.latitude,
        lng: userProfile.defaultLocation.longitude
      });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  }, [userProfile?.defaultLocation]);

  const calculateDistance = (lat?: number, lng?: number) => {
    if (!lat || !lng || !currentCommunity?.coverageArea) return null;
    const lat1 = currentCommunity.coverageArea.latitude;
    const lon1 = currentCommunity.coverageArea.longitude;
    const R = 6371;
    const dLat = (lat - lat1) * Math.PI / 180;
    const dLon = (lng - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

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

  const notices = posts
    .filter(p => p.type === 'notice')
    .sort((a, b) => {
      const priorityA = getUrgencyPriority(a.urgency_level, a.urgency);
      const priorityB = getUrgencyPriority(b.urgency_level, b.urgency);
      if (priorityA !== priorityB) return priorityB - priorityA;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const listings = posts
    .filter(p => p.type === 'listing')
    .filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           post.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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

  const getPostBorder = (post: CommunityNotice) => {
    if (post.type !== 'notice') return 'border-outline-variant/5';
    const urgency = post.urgency_level || (post.urgency === 'high' ? 'warning' : post.urgency === 'normal' ? 'info' : post.urgency === 'low' ? 'general' : post.urgency);
    switch (urgency) {
      case 'emergency': return 'border-error/50 ring-1 ring-error/10 shadow-lg shadow-error/5';
      case 'warning': return 'border-amber-400/50 ring-1 ring-amber-400/10 shadow-lg shadow-amber-400/5';
      case 'info': return 'border-blue-400/50 ring-1 ring-blue-400/10';
      case 'general': return 'border-emerald-400/30 opacity-90';
      default: return 'border-outline-variant/10';
    }
  };

  const getUrgencyIcon = (level?: string, urgency?: string) => {
    const l = level || (urgency === 'high' ? 'warning' : urgency === 'normal' ? 'info' : urgency === 'low' ? 'general' : urgency);
    switch (l) {
      case 'emergency': return <Siren className="w-3 h-3" />;
      case 'warning': return <AlertTriangle className="w-3 h-3" />;
      case 'info': return <Info className="w-3 h-3" />;
      case 'general': return <Tag className="w-3 h-3" />;
      default: return <Tag className="w-3 h-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Sub-Header for Search & Filters */}
      <div className="sticky top-20 z-40 bg-surface/70 backdrop-blur-xl w-full border-b border-surface-container">
        <div className="max-w-2xl mx-auto px-6 py-4 flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search community listings..."
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
            />
          </div>

          <div className="flex items-center gap-2 px-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'all', label: 'All Feed' },
              { id: 'listing', label: 'Listings' },
              { id: 'notice', label: 'Notices' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                  filter === item.id 
                    ? "bg-primary text-white border-primary shadow-sm" 
                    : "bg-surface-container-low text-outline border-outline-variant/30 hover:bg-surface-container-high"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
      </div>
    </div>

    {/* Feed Content */}
      <main className="max-w-2xl mx-auto px-6 pt-6 pb-32">
        <div className="space-y-8">
          {/* Notice Feed (Read-Only) */}
          {(filter === 'all' || filter === 'notice') && notices.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <Siren className="w-4 h-4 text-error" />
                  Community Notices
                </h3>
                <span className="text-[10px] font-bold text-outline">Read Only</span>
              </div>
              <div className="flex flex-col gap-3">
                {notices.map((notice) => (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "rounded-2xl border bg-surface-container-lowest shadow-sm flex flex-col gap-2 overflow-hidden",
                      getPostBorder(notice)
                    )}
                  >
                    {/* Map for Emergency/Warning notices */}
                    {(notice.urgency === 'emergency' || notice.urgency_level === 'emergency' || notice.urgency_level === 'warning' || notice.urgency === 'high') && notice.latitude && notice.longitude && (
                      <div 
                        className="w-full h-40 overflow-hidden border-b border-outline-variant/10 relative cursor-pointer"
                        onClick={() => onViewOnMap?.(notice.latitude!, notice.longitude!)}
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
                          {notice.category && (
                            <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tighter w-fit">
                              {notice.category}
                            </span>
                          )}
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit",
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
                                          onEditPost(notice);
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
                      <h4 className="font-bold leading-snug font-headline text-lg">
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
                            src={notice.authorImage || `https://picsum.photos/seed/${notice.author_id}/50/50`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{notice.authorName}</p>
                          <p className="text-[10px] text-outline">{notice.authorRole || 'Member'} • {formatDate(notice.timestamp)}</p>
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
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {(filter === 'all') && notices.length > 0 && listings.length > 0 && (
            <div className="h-px bg-outline-variant/10 w-full" />
          )}

          {/* Listings Feed */}
          {(filter === 'all' || filter === 'listing') && (
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <Tag className="w-4 h-4 text-secondary" />
                  Community Listing
                </h3>
              </div>
              <AnimatePresence mode="popLayout">
              {listings.length > 0 ? (
                listings.map((post) => (
                <motion.article
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface-container-low rounded-[2rem] overflow-hidden shadow-sm transition-all duration-300 border border-outline-variant/15 group"
                >
                  {post.urgency === 'emergency' && post.latitude && post.longitude ? (
                    <div className="w-full aspect-video overflow-hidden border-b border-outline-variant/10 shadow-sm relative">
                      <MapContainer 
                        center={[post.latitude, post.longitude]} 
                        zoom={13} 
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        dragging={false}
                        scrollWheelZoom={false}
                        doubleClickZoom={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[post.latitude, post.longitude]} icon={emergencyIcon} />
                        
                        <Circle 
                          center={[post.latitude, post.longitude]} 
                          radius={10000} 
                          pathOptions={{ color: '#ff4d4d', fillColor: '#ff4d4d', fillOpacity: 0.05, weight: 1, dashArray: '5, 10' }} 
                        />
                        <Circle 
                          center={[post.latitude, post.longitude]} 
                          radius={20000} 
                          pathOptions={{ color: '#ff4d4d', fillColor: '#ff4d4d', fillOpacity: 0.02, weight: 1, dashArray: '10, 20' }} 
                        />

                        {/* Security Responders */}
                        {currentCommunity?.isEmergencyMode && securityResponders.map((responder) => (
                          <Marker 
                            key={responder.user_id} 
                            position={[responder.latitude, responder.longitude]} 
                            icon={securityIcon}
                          />
                        ))}
                      </MapContainer>
                      <div className="absolute top-4 right-4 z-[1000] bg-error text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg animate-pulse">
                        Live Situation
                      </div>
                    </div>
                  ) : post.posts_image && (
                    <div className="w-full aspect-video overflow-hidden border-b border-outline-variant/10 shadow-sm">
                      <img 
                        src={post.posts_image} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          {post.urgency && post.urgency !== 'normal' && (
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1",
                              getUrgencyColor(post.urgency)
                            )}>
                              {getUrgencyIcon(post.urgency)}
                              {post.urgency}
                            </span>
                          )}
                          {post.isCommunityPick && (
                            <span className="bg-secondary text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              Pick
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-headline font-black text-primary leading-tight group-hover:text-secondary transition-colors">
                          {post.title}
                        </h3>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === post.id ? null : post.id)}
                          className="p-2 text-outline hover:text-primary transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        <AnimatePresence>
                          {activeMenuId === post.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -10 }}
                              className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-outline-variant/10 z-50 py-2 overflow-hidden"
                            >
                              {(post.author_id === user?.uid || currentCommunity?.userRole === 'Admin') && (
                                <>
                                  {post.author_id === user?.uid && (
                                    <button 
                                      onClick={() => {
                                        onEditPost(post);
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
                                      setPostToDelete(post.id);
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

                    <p className="text-on-surface-variant font-medium text-sm leading-relaxed">
                      {post.description}
                    </p>

                    {post.type === 'listing' && post.price !== undefined && (
                      <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/15 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Local Price</span>
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-2xl font-black text-secondary leading-none font-headline">R{(post.community_price || post.price).toLocaleString()}</span>
                                <span className="text-secondary/60 font-bold text-xs">.00</span>
                              </div>
                            </div>
                            {post.isPublic && post.public_price && post.public_price > (post.community_price || post.price) && (
                              <div className="flex flex-col opacity-50">
                                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Public Price</span>
                                <span className="text-lg font-bold text-on-surface-variant leading-none line-through decoration-2">R{post.public_price.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                          {post.isPublic && post.charityId && (
                            <div className="flex flex-col items-end text-right">
                              <div className="flex items-center gap-1.5 bg-secondary/10 text-secondary px-2 py-1 rounded-lg mb-1">
                                <Heart className="w-3 h-3 fill-current" />
                                <span className="text-[9px] font-black uppercase tracking-wider">
                                  {charities.find(c => c.id === post.charityId)?.name || 'Charity Impact'}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-on-surface-variant">Contribution: R{post.charity_amount?.toFixed(2) || '0.00'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {post.locationName && (
                      <button 
                        onClick={() => post.latitude && post.longitude && onViewOnMap?.(post.latitude, post.longitude)}
                        className="flex items-center gap-2 bg-secondary/5 hover:bg-secondary/10 px-4 py-2 rounded-full transition-all group/loc w-fit border border-secondary/10"
                      >
                        <MapPin className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-[11px] font-extrabold text-secondary truncate max-w-[180px]">
                          {post.locationName}
                        </span>
                        {userLocation && post.latitude && post.longitude && (
                          <>
                            <div className="w-px h-3 bg-secondary/20 mx-1" />
                            <span className="text-[11px] font-bold text-on-surface-variant/70">
                              {getDistance(userLocation.lat, userLocation.lng, post.latitude, post.longitude).toFixed(1)} km away
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant/30">
                          <img 
                            src={post.authorImage || `https://picsum.photos/seed/${post.author_id}/100/100`} 
                            alt={post.authorName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-primary">{post.authorName}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            {new Date(post.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button className="p-2 text-outline hover:text-error transition-colors">
                          <Heart className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => onOpenChat?.(post)}
                          className="p-2 text-outline hover:text-primary transition-colors"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center text-outline-variant">
                  <Tag className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-primary">No listings found</h3>
                  <p className="text-sm text-on-surface-variant max-w-[240px]">
                    Try adjusting your search query to find what you're looking for.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                  }}
                  className="text-secondary font-bold text-sm hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </AnimatePresence>
          </section>
          )}
        </div>
      </main>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onCreatePost}
        className="fixed bottom-28 right-6 w-16 h-16 clay-gradient text-white rounded-full flex items-center justify-center shadow-2xl z-50 group"
      >
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
      </motion.button>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPostToDelete(null)}
              className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border border-outline-variant/10 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-error" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-headline font-black text-primary leading-tight">Delete Post?</h3>
                <p className="text-on-surface-variant font-medium text-sm">
                  This action cannot be undone. This post will be permanently removed from the community feed.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    removePost(postToDelete);
                    setPostToDelete(null);
                  }}
                  className="w-full bg-error text-white py-4 rounded-full font-bold shadow-lg shadow-error/20 active:scale-95 transition-all"
                >
                  Yes, Delete Post
                </button>
                <button
                  onClick={() => setPostToDelete(null)}
                  className="w-full bg-surface-container-low text-primary py-4 rounded-full font-bold active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
