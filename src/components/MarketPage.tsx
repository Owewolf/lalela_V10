import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, Map as MapIcon, List as ListIcon, Info, Search, X, ArrowRight, MessageSquare, MapPin, Clock } from 'lucide-react';
import { BusinessCard } from './BusinessCard';
import { SearchBar } from './Layout';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { Wrench, Dog, Utensils } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BUSINESS_CATEGORIES } from '../constants';
import type { Business } from '../types';

const ICON_MAP: Record<string, React.ReactNode> = {
  Wrench: <Wrench className="w-8 h-8" />,
  Dog: <Dog className="w-8 h-8" />,
  Utensils: <Utensils className="w-8 h-8" />,
};

interface MarketBusiness extends Business {
  distance: string;
  isExplicitlyLinked: boolean;
  isMemberBusiness: boolean;
  status: 'Open' | 'Closed';
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

export const MarketPage = ({ onViewOnMap, onOpenChat }: { onViewOnMap?: (lat: number, lng: number) => void, onOpenChat?: (post: any) => void }) => {
  const { user, userProfile } = useFirebase();
  const { currentCommunity, userBusinesses, posts, communityBusinesses, charities } = useCommunity();
  const [activeTab, setActiveTab] = useState<'featured' | 'listings' | 'businesses'>('businesses');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const coverageArea = currentCommunity?.coverageArea;
  
  const listings = useMemo(() => {
    let l = posts.filter(p => p.type === 'listing');
    // Sort by newest first, then by category
    l.sort((a, b) => {
      const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (a.category || '').localeCompare(b.category || '');
    });
    return l;
  }, [posts]);

  const enabledCategories = useMemo(() => {
    if (!currentCommunity?.enabledCategories) return BUSINESS_CATEGORIES;
    return BUSINESS_CATEGORIES.filter(cat => currentCommunity.enabledCategories.includes(cat.id));
  }, [currentCommunity?.enabledCategories]);

  const filteredBusinesses = useMemo(() => {
    if (!coverageArea) return [];

    // Combine internal community businesses and user businesses
    const internalBusinesses: MarketBusiness[] = (currentCommunity?.businesses || []).map(b => ({
      ...b,
      isExternal: false,
      isVerified: b.isVerified ?? true,
      isFeatured: b.isFeatured ?? b.isVerified ?? true,
      isExplicitlyLinked: true,
      isMemberBusiness: false,
      distance: b.latitude && b.longitude 
        ? getDistance(coverageArea.latitude, coverageArea.longitude, b.latitude, b.longitude).toFixed(1) + ' km'
        : '0.0 km'
    }));

    const allCommunityUserBusinesses: MarketBusiness[] = (communityBusinesses || []).map(b => ({
      id: b.id,
      name: b.name,
      category: b.category,
      subcategory: b.subcategory,
      latitude: b.latitude,
      longitude: b.longitude,
      address: b.address,
      image: b.image,
      description: b.description,
      phone: b.contactPhone,
      website: undefined as string | undefined,
      isExternal: false,
      isVerified: true,
      isFeatured: true,
      isMemberBusiness: true,
      label: b.owner_id === user?.uid ? 'My Business' : undefined,
      labelType: 'new' as const,
      status: 'Open' as const,
      distance: getDistance(coverageArea.latitude, coverageArea.longitude, b.latitude, b.longitude).toFixed(1) + ' km',
      isExplicitlyLinked: true
    }));

    let combined: MarketBusiness[] = [...allCommunityUserBusinesses, ...internalBusinesses];

    // Filter by coverage area radius
    combined = combined.filter(b => {
      // If it's explicitly linked to this community, always show it
      if (b.isExplicitlyLinked) return true;
      
      if (b.latitude && b.longitude) {
        const dist = getDistance(coverageArea.latitude, coverageArea.longitude, b.latitude, b.longitude);
        return dist <= coverageArea.radius;
      }
      return true;
    });

    // Filter by Category
    if (selectedCategory) {
      combined = combined.filter(b => {
        const cat = enabledCategories.find(c => c.id === selectedCategory);
        if (!cat) return b.category === selectedCategory;
        return b.category === cat.label || cat.types.includes(b.category.toLowerCase());
      });
    }

    // Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      combined = combined.filter(b => 
        b.name.toLowerCase().includes(query) || 
        b.category.toLowerCase().includes(query) ||
        (b.description && b.description.toLowerCase().includes(query))
      );
    }

    // Ranking Logic: Community member businesses first (by distance), then imported (by distance)
    combined.sort((a, b) => {
      // 1. Member businesses always on top
      if (a.isMemberBusiness && !b.isMemberBusiness) return -1;
      if (!a.isMemberBusiness && b.isMemberBusiness) return 1;
      // 2. Within same group, sort by distance
      return parseFloat(a.distance || '0') - parseFloat(b.distance || '0');
    });

    if (activeTab === 'featured') {
      // ONLY admin-pinned/featured businesses
      return combined.filter(b => b.isFeatured);
    }
    if (activeTab === 'businesses') {
      return combined;
    }

    return combined;
  }, [currentCommunity, userBusinesses, communityBusinesses, activeTab, coverageArea, selectedCategory, searchQuery, enabledCategories, user?.uid]);

  return (
    <main className="max-w-2xl mx-auto px-5 pb-32">
      <section className="space-y-6 mb-8">
        <div className="relative">
          <SearchBar value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Category Quick Filter */}
        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border",
              !selectedCategory 
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                : "bg-surface-container-low text-on-surface-variant border-outline-variant/10 hover:border-primary/30"
            )}
          >
            All Categories
          </button>
          {enabledCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border",
                selectedCategory === cat.id
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                  : "bg-surface-container-low text-on-surface-variant border-outline-variant/10 hover:border-primary/30"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Tabs & View Toggle */}
      <section className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/10">
            {[
              { id: 'featured', label: 'Featured' },
              { id: 'listings', label: 'Listings' },
              { id: 'businesses', label: 'Businesses' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                  activeTab === tab.id 
                    ? "bg-primary text-white shadow-sm" 
                    : "text-on-surface-variant hover:text-primary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/10">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-full transition-all",
                viewMode === 'list' ? "bg-secondary text-white" : "text-on-surface-variant"
              )}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "p-1.5 rounded-full transition-all",
                viewMode === 'map' ? "bg-secondary text-white" : "text-on-surface-variant"
              )}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold font-headline text-primary">
              {activeTab === 'featured' ? 'Admin Picks' : activeTab === 'businesses' ? 'Community Businesses' : activeTab === 'listings' ? 'Items for Sale' : 'Closest First'}
            </h2>
            <p className="text-on-surface-variant text-sm opacity-70">
              {activeTab === 'businesses' 
                ? `${filteredBusinesses.length} business${filteredBusinesses.length !== 1 ? 'es' : ''} in ${coverageArea?.location_name || currentCommunity?.name}`
                : `Showing ${activeTab === 'listings' ? listings.length : filteredBusinesses.length} ${activeTab === 'listings' ? 'listings' : 'businesses'} in ${coverageArea?.location_name || currentCommunity?.name}`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1 bg-secondary/10 text-secondary px-2 py-1 rounded-lg text-[10px] font-bold"
              >
                <X className="w-3 h-3" /> {enabledCategories.find(c => c.id === selectedCategory)?.label}
              </button>
            )}
            <button className="flex items-center gap-1 text-secondary text-xs font-bold uppercase tracking-wider">
              <SlidersHorizontal className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>
      </section>

      {viewMode === 'list' ? (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {/* Businesses tab — show all community businesses */}
            {activeTab === 'businesses' && filteredBusinesses.map((biz) => (
              <motion.div
                key={biz.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <BusinessCard 
                  name={biz.name}
                  distance={biz.distance}
                  category={biz.category}
                  status={biz.status}
                  image={biz.image}
                  icon={biz.icon ? ICON_MAP[biz.icon] : undefined}
                  iconBg={biz.iconBg}
                  iconColor={biz.iconColor}
                  label={biz.label}
                  labelType={biz.labelType}
                  neighbors={biz.neighbors}
                  closingTime={biz.closingTime}
                  hasCall={biz.hasCall}
                  isMemberBusiness={biz.isMemberBusiness}
                  phone={biz.phone}
                  website={biz.website}
                  description={biz.description}
                  address={biz.address}
                  onChat={biz.isMemberBusiness && onOpenChat ? () => {
                    const owner = communityBusinesses.find(cb => cb.id === biz.id);
                    if (owner) onOpenChat({ id: biz.id, type: 'listing' as const, title: biz.name, authorName: biz.name, author_id: owner.owner_id, description: biz.category, category: biz.category, source: 'marketplace' });
                  } : undefined}
                />
              </motion.div>
            ))}

            {/* Listings tab — community members listings sorted by time */}
            {activeTab === 'listings' && listings.map((listing) => (
              <motion.div
                key={listing.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface-container-low rounded-[2rem] overflow-hidden shadow-sm transition-all duration-300 border border-outline-variant/15 group"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden">
                  <img 
                    src={listing.posts_image || `https://picsum.photos/seed/${listing.id}/800/1000`} 
                    alt={listing.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  
                  {listing.isCommunityPick && (
                    <div className="absolute top-4 left-4 z-10">
                      <div className="bg-secondary text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Community Pick
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-white text-2xl font-bold leading-tight drop-shadow-md font-headline">
                      {listing.title}
                    </h2>
                  </div>
                </div>

                <div className="p-5 space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-[0.2em] block mb-1">Local Price</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-primary text-3xl font-black tracking-tight font-headline">
                          R{(listing.community_price || listing.price || 0).toLocaleString()}
                        </span>
                        <span className="text-primary/60 font-bold text-sm">.00</span>
                      </div>
                    </div>
                    {listing.isPublic && listing.public_price && (
                      <div className="text-right">
                        <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-[0.2em] block mb-1">Public Price</span>
                        <span className="text-on-surface-variant font-bold text-lg line-through decoration-secondary/40 decoration-2">
                          R{listing.public_price.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {listing.isPublic && listing.charityId && (
                    <div className="bg-surface-container p-4 rounded-2xl flex items-start gap-4 border border-outline-variant/15">
                      <div className="bg-secondary/10 p-2 rounded-full flex items-center justify-center text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="text-primary font-bold text-sm">Charity Impact</h3>
                          <span className="text-secondary font-black text-sm">R{(listing.charity_amount || 0).toFixed(2)}</span>
                        </div>
                        <p className="text-on-surface-variant text-[11px] leading-relaxed">
                          Benefiting <span className="font-bold text-primary">{charities.find(c => c.id === listing.charityId)?.name || 'Local Charity'}</span> from this purchase.
                        </p>
                      </div>
                    </div>
                  )}

                  {listing.locationName && (
                    <button 
                      onClick={() => listing.latitude && listing.longitude && onViewOnMap?.(listing.latitude, listing.longitude)}
                      className="flex items-center gap-2 bg-secondary/5 hover:bg-secondary/10 px-4 py-2 rounded-full transition-all group/loc w-fit border border-secondary/10"
                    >
                      <MapPin className="w-3.5 h-3.5 text-secondary" />
                      <span className="text-[11px] font-extrabold text-secondary truncate max-w-[180px]">
                        {listing.locationName}
                      </span>
                      {userLocation && listing.latitude && listing.longitude && (
                        <>
                          <div className="w-px h-3 bg-secondary/20 mx-1" />
                          <span className="text-[11px] font-bold text-on-surface-variant/70">
                            {getDistance(userLocation.lat, userLocation.lng, listing.latitude, listing.longitude).toFixed(1)} km away
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant/30">
                        <img 
                          src={listing.authorImage || `https://picsum.photos/seed/${listing.author_id}/100/100`} 
                          alt={listing.authorName} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h4 className="text-on-surface font-bold text-sm">{listing.authorName || 'Artisan'}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
                          <Clock className="w-3 h-3" />
                          {new Date(listing.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onOpenChat?.(listing)}
                        className="w-10 h-10 rounded-full bg-surface-container-high text-primary flex items-center justify-center hover:bg-surface-container transition-colors active:scale-95 duration-150"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      <button className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center hover:bg-secondary/20 transition-colors active:scale-95 duration-150">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Featured tab — show businesses */}
            {activeTab === 'featured' && filteredBusinesses.map((biz) => (
              <motion.div
                key={biz.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <BusinessCard 
                  name={biz.name}
                  distance={biz.distance}
                  category={biz.category}
                  status={biz.status}
                  image={biz.image}
                  icon={biz.icon ? ICON_MAP[biz.icon] : undefined}
                  iconBg={biz.iconBg}
                  iconColor={biz.iconColor}
                  label={biz.label || (biz.isExternal ? 'Suggest to Add' : undefined)}
                  labelType={biz.labelType || (biz.isExternal ? 'new' : undefined)}
                  neighbors={biz.neighbors}
                  closingTime={biz.closingTime}
                  hasCall={biz.hasCall}
                  isMemberBusiness={biz.isMemberBusiness}
                  phone={biz.phone}
                  website={biz.website}
                  description={biz.description}
                  address={biz.address}
                  onChat={biz.isMemberBusiness && onOpenChat ? () => {
                    const owner = communityBusinesses.find(cb => cb.id === biz.id);
                    if (owner) onOpenChat({ id: biz.id, type: 'listing' as const, title: biz.name, authorName: biz.name, author_id: owner.owner_id, description: biz.category, category: biz.category, source: 'marketplace' });
                  } : undefined}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-3xl h-[500px] relative overflow-hidden border border-outline-variant/10 shadow-inner">
          {/* Mock Map View */}
          <div className="absolute inset-0 bg-surface-container-highest opacity-20 african-pattern" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full">
              {/* Center Point */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg animate-pulse" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                  Community Center
                </div>
              </div>

              {/* Business Pins */}
              {filteredBusinesses.map((biz, idx) => {
                if (!biz.latitude || !biz.longitude || !coverageArea) return null;
                
                // Calculate position relative to radius
                const latDiff = (biz.latitude - coverageArea.latitude) * 111; // Approx km
                const lonDiff = (biz.longitude - coverageArea.longitude) * 111 * Math.cos(coverageArea.latitude * Math.PI / 180); // Approx km
                
                // Scale to 40% of the map container (radius is the edge)
                const top = 50 - (latDiff / coverageArea.radius) * 40;
                const left = 50 + (lonDiff / coverageArea.radius) * 40;
                
                return (
                  <motion.div
                    key={biz.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{ top: `${top}%`, left: `${left}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  >
                    <div className={cn(
                      "w-3 h-3 rounded-full border border-white shadow-sm transition-transform group-hover:scale-150",
                      biz.isExternal ? "bg-secondary" : "bg-primary"
                    )} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                      <div className="bg-surface-container-lowest p-2 rounded-lg shadow-xl border border-outline-variant/10 min-w-[120px]">
                        <p className="text-[10px] font-bold text-primary truncate">{biz.name}</p>
                        <p className="text-[8px] text-on-surface-variant">{biz.category}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          <div className="absolute bottom-4 left-4 right-4 bg-surface-container-lowest/90 backdrop-blur-sm p-3 rounded-2xl border border-outline-variant/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Info className="w-4 h-4" />
            </div>
            <p className="text-[10px] text-on-surface-variant leading-tight">
              Interactive map view showing businesses within your community's <b>{coverageArea?.radius}km</b> coverage zone.
            </p>
          </div>
        </div>
      )}
    </main>
  );
};
