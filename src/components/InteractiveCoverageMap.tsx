import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Siren, 
  Shield, 
  Users, 
  Tag, 
  AlertTriangle, 
  Store, 
  Compass,
  ArrowRight,
  ExternalLink,
  Navigation,
  MapPin
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';

// Fix for default marker icons in Leaflet
const markerIcon2x = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom icons
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

const memberIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-emerald-500 p-1.5 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const listingIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-blue-500 p-1.5 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const noticeIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-amber-500 p-1.5 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const businessIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-purple-500 p-1.5 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.91A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.79 1.09L21 9"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const RecenterMap = ({ center, trigger, zoom }: { center: [number, number], trigger?: number, zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom(), { duration: 0.8 });
  }, [center, map, trigger, zoom]);
  return null;
};

const MapInteractionController = ({ isLocked }: { isLocked: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (isLocked) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }, [isLocked, map]);
  return null;
};

const MapUnlockOnClick = ({ isLocked, onUnlock }: { isLocked: boolean; onUnlock?: () => void }) => {
  useMapEvents({
    click: () => {
      if (isLocked) onUnlock?.();
    },
  });

  return null;
};

interface InteractiveCoverageMapProps {
  center: [number, number];
  zoom?: number;
  isEmergencyActive?: boolean;
  showFilters?: boolean;
  showLegend?: boolean;
  showPulseOverlay?: boolean;
  showEmergencyOverlay?: boolean;
  height?: string;
  className?: string;
  onMarkerClick?: (type: string, data: any) => void;
  onOpenEmergencyHub?: () => void;
  resetTrigger?: number;
  initialFilter?: 'members' | 'listings' | 'notices' | 'businesses';
  additionalMarkers?: Array<{
    id: string;
    position: [number, number];
    icon?: L.DivIcon;
    popupContent?: React.ReactNode;
  }>;
  isLocked?: boolean;
  onUnlock?: () => void;
}

export const InteractiveCoverageMap: React.FC<InteractiveCoverageMapProps> = ({
  center,
  zoom = 14,
  isEmergencyActive = false,
  showFilters = false,
  showLegend = false,
  showPulseOverlay = false,
  showEmergencyOverlay = false,
  height = "500px",
  className,
  onMarkerClick,
  onOpenEmergencyHub,
  resetTrigger,
  initialFilter,
  additionalMarkers = [],
  isLocked = false,
  onUnlock,
}) => {
  const { currentCommunity, posts, members, securityResponders, communityBusinesses } = useCommunity();
  const [mapFilter, setMapFilter] = useState<'members' | 'listings' | 'notices' | 'businesses'>(initialFilter || 'members');

  useEffect(() => {
    if (initialFilter) setMapFilter(initialFilter);
  }, [initialFilter]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);

  // Merge dedicated responders + security members from the members list (deduplicated)
  // Include distance to emergency (center) for each responder
  const allResponders = useMemo(() => {
    const [eLat, eLng] = center;
    const calcDist = (lat: number, lng: number) => {
      const R = 6371;
      const dLat = (lat - eLat) * Math.PI / 180;
      const dLng = (lng - eLng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(eLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng/2)**2;
      return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
    };

    const responderIds = new Set(securityResponders.map(r => r.user_id));
    const fromDedicated = securityResponders.map(r => ({
      ...r,
      distance: calcDist(r.latitude, r.longitude),
    }));
    const fromMembers = members
      .filter(m => m.isSecurityMember && m.latitude && m.longitude && !responderIds.has(m.user_id))
      .map(m => ({
        user_id: m.user_id,
        name: m.name || 'Security Member',
        image: m.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user_id}`,
        latitude: m.latitude!,
        longitude: m.longitude!,
        timestamp: new Date().toISOString(),
        distance: calcDist(m.latitude!, m.longitude!),
      }));
    return [...fromDedicated, ...fromMembers].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }, [securityResponders, members, center]);

  useEffect(() => {
    setMapCenter(center);
  }, [center]);

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

  return (
    <>
    <style>{`
      @keyframes emergency-ripple {
        0%   { opacity: 0.75; }
        100% { opacity: 0; }
      }
      .emergency-ripple-1 { animation: emergency-ripple 2.4s ease-out infinite; }
      .emergency-ripple-2 { animation: emergency-ripple 2.4s ease-out infinite 0.8s; }
      .emergency-ripple-3 { animation: emergency-ripple 2.4s ease-out infinite 1.6s; }
    `}</style>
    <div className={cn("space-y-6", className)}>
      <div className="relative w-full rounded-2xl overflow-hidden bg-surface-container-high border border-outline-variant/10" style={{ height }}>
        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={mapCenter} trigger={resetTrigger} zoom={zoom} />
          <MapInteractionController isLocked={isLocked} />
          <MapUnlockOnClick isLocked={isLocked} onUnlock={onUnlock} />

          {/* Coverage Area / Emergency Impact Zone */}
          {currentCommunity?.coverageArea && (
            <Circle 
              center={
                isEmergencyActive && posts.find(p => p.urgency === 'emergency' || p.urgency_level === 'emergency')?.latitude
                  ? [
                      posts.find(p => p.urgency === 'emergency' || p.urgency_level === 'emergency')!.latitude!,
                      posts.find(p => p.urgency === 'emergency' || p.urgency_level === 'emergency')!.longitude!
                    ]
                  : [currentCommunity.coverageArea.latitude, currentCommunity.coverageArea.longitude]
              }
              radius={currentCommunity.coverageArea.radius * 1000}
              pathOptions={{ 
                color: isEmergencyActive ? '#B3261E' : '#134E42', 
                fillColor: isEmergencyActive ? '#B3261E' : '#134E42',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 10'
              }}
            />
          )}

          {/* Emergency Ripple Rings */}
          {isEmergencyActive && (() => {
            const emergencyPost = posts.find(p => p.urgency === 'emergency' || p.urgency_level === 'emergency');
            const ripplePos: [number, number] | null = emergencyPost?.latitude && emergencyPost?.longitude
              ? [emergencyPost.latitude, emergencyPost.longitude]
              : currentCommunity?.coverageArea
                ? [currentCommunity.coverageArea.latitude, currentCommunity.coverageArea.longitude]
                : null;
            if (!ripplePos) return null;
            return (
              <React.Fragment key="emergency-ripples">
                {[120, 280, 500].map((radius, i) => (
                  <Circle
                    key={`ripple-${i}`}
                    center={ripplePos}
                    radius={radius}
                    pathOptions={{
                      color: '#B3261E',
                      fillColor: '#B3261E',
                      fillOpacity: 0.06,
                      weight: 2,
                      className: `emergency-ripple-${i + 1}`,
                    }}
                  />
                ))}
              </React.Fragment>
            );
          })()}

          {/* Emergency Marker */}
          {isEmergencyActive && (
            <React.Fragment key="emergency-marker-wrapper">
              {(() => {
                const emergencyPost = posts.find(p => p.urgency === 'emergency' || p.urgency_level === 'emergency');
                const pos: [number, number] | null = emergencyPost?.latitude && emergencyPost?.longitude 
                  ? [emergencyPost.latitude, emergencyPost.longitude]
                  : currentCommunity?.coverageArea 
                    ? [currentCommunity.coverageArea.latitude, currentCommunity.coverageArea.longitude]
                    : null;
                
                if (!pos) return null;

                return (
                  <Marker 
                    position={pos} 
                    icon={emergencyIcon}
                    zIndexOffset={1000}
                    eventHandlers={{ click: () => onUnlock?.() }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-3 space-y-2 min-w-[200px]">
                        <div className="flex items-center gap-2 text-error">
                          <Siren className="w-5 h-5" />
                          <h4 className="font-black uppercase tracking-widest text-xs">Active Emergency</h4>
                        </div>
                        <p className="text-sm font-bold text-primary leading-tight">
                          {emergencyPost ? emergencyPost.title : 'Emergency reported at this location.'}
                        </p>
                        {emergencyPost?.locationName && (
                          <p className="text-[10px] text-outline font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {emergencyPost.locationName}
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })()}
            </React.Fragment>
          )}

          {/* Members Layer */}
          {mapFilter === 'members' && members
            .filter((m) => m.latitude && m.longitude)
            .map(member => {
              const showSecurityIcon = member.isSecurityMember && isEmergencyActive;
              
              return (
                <Marker 
                  key={member.user_id} 
                  position={[member.latitude!, member.longitude!]}
                  icon={showSecurityIcon ? securityIcon : memberIcon}
                  eventHandlers={{ click: () => onUnlock?.() }}
                >
                  <Popup className="custom-popup">
                    <div className="p-3 flex items-center gap-4 min-w-[220px]">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/20">
                        <img src={member.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`} className="w-full h-full object-cover" alt={member.name} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-primary text-sm">{member.name}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                          {showSecurityIcon ? 'Emergency Responder' : member.role}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Listings Layer */}
          {mapFilter === 'listings' && posts.filter(p => p.type === 'listing' && p.latitude && p.longitude).map(listing => (
            <Marker 
              key={listing.id} 
              position={[listing.latitude!, listing.longitude!]}
              icon={listingIcon}
              eventHandlers={{ click: () => onUnlock?.() }}
            >
              <Popup className="custom-popup">
                <div className="p-0 overflow-hidden min-w-[240px] rounded-xl">
                  {listing.posts_image && (
                    <img src={listing.posts_image} className="w-full h-24 object-cover" alt={listing.title} />
                  )}
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-primary text-sm leading-tight flex-1">{listing.title}</h4>
                      {listing.price && <span className="text-xs font-black text-secondary ml-2">R{listing.price}</span>}
                    </div>
                    <p className="text-[10px] text-on-surface-variant line-clamp-2">{listing.description}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Notices Layer */}
          {mapFilter === 'notices' && posts.filter(p => p.type === 'notice' && p.latitude && p.longitude).map(notice => (
            <Marker 
              key={notice.id} 
              position={[notice.latitude!, notice.longitude!]}
              icon={notice.priority === 'emergency' || notice.urgency === 'emergency' ? emergencyIcon : noticeIcon}
              zIndexOffset={notice.priority === 'emergency' || notice.urgency === 'emergency' ? 500 : 0}
              eventHandlers={{ click: () => onUnlock?.() }}
            >
              <Popup className="custom-popup">
                <div className="p-3 space-y-3 min-w-[220px]">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                      notice.priority === 'emergency' || notice.urgency === 'emergency' ? "bg-error/10 text-error" : "bg-amber-100 text-amber-700"
                    )}>
                      {notice.priority === 'emergency' || notice.urgency === 'emergency' ? 'Emergency' : 'Notice'}
                    </div>
                    <span className="text-[9px] text-outline font-medium">{formatDate(notice.timestamp)}</span>
                  </div>
                  <h4 className="font-bold text-primary text-sm leading-tight">{notice.title}</h4>
                  <p className="text-[10px] text-on-surface-variant line-clamp-2">{notice.description}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Businesses Layer */}
          {mapFilter === 'businesses' && communityBusinesses.map(business => (
            <Marker 
              key={business.id} 
              position={[business.latitude, business.longitude]} 
              icon={businessIcon}
              eventHandlers={{ click: () => onUnlock?.() }}
            >
              <Popup className="custom-popup">
                <div className="p-0 overflow-hidden min-w-[240px] rounded-xl">
                  {business.image && (
                    <img src={business.image} className="w-full h-24 object-cover" alt={business.name} />
                  )}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-primary text-sm leading-tight">{business.name}</h4>
                      <div className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                        Business
                      </div>
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-bold">{business.category}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Security Responders (Always show during emergency) */}
          {isEmergencyActive && securityResponders.map(responder => (
            <Marker 
              key={responder.user_id} 
              position={[responder.latitude, responder.longitude]} 
              icon={securityIcon}
              zIndexOffset={800}
              eventHandlers={{ click: () => onUnlock?.() }}
            >
              <Popup>
                <div className="flex items-center gap-2 p-1">
                  <img src={responder.image} className="w-8 h-8 rounded-full" alt={responder.name} />
                  <div>
                    <p className="text-xs font-bold">{responder.name}</p>
                    <p className="text-[10px] text-secondary">Security Responder</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Additional Custom Markers */}
          {additionalMarkers.map((marker) => (
            <Marker 
              key={marker.id} 
              position={marker.position} 
              icon={marker.icon}
              zIndexOffset={900}
              eventHandlers={{ click: () => onUnlock?.() }}
            >
              {marker.popupContent && (
                <Popup>{marker.popupContent}</Popup>
              )}
            </Marker>
          ))}
        </MapContainer>

        {showPulseOverlay && (
          <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-outline-variant/20">
            <span className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isEmergencyActive ? "bg-error" : "bg-emerald-500"
            )}></span>
            <span className={cn(
              "text-xs font-bold",
              isEmergencyActive ? "text-error" : "text-primary"
            )}>
              {isEmergencyActive ? 'EMERGENCY MODE ACTIVE' : 'Live Pulse: All Secure'}
            </span>
          </div>
        )}

        {showEmergencyOverlay && isEmergencyActive && (
          <div
            className="absolute bottom-6 left-6 right-6 z-[1000] flex flex-col gap-2 cursor-pointer"
            onClick={onOpenEmergencyHub}
          >
            <div className="bg-error text-white px-4 py-3 rounded-2xl shadow-2xl hover:bg-error/90 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5" />
                  <div>
                    <p className="text-xs font-bold">{allResponders.length} Security Responder{allResponders.length !== 1 ? 's' : ''} Active</p>
                    <p className="text-[10px] opacity-80">Coordinating response...</p>
                  </div>
                </div>
                <Navigation className="w-5 h-5" />
              </div>
              {allResponders.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/20 space-y-1.5 max-h-32 overflow-y-auto">
                  {allResponders.map(responder => (
                    <div key={responder.user_id} className="flex items-center gap-2">
                      <img
                        src={responder.image}
                        alt={responder.name}
                        className="w-6 h-6 rounded-full border border-white/40 object-cover"
                      />
                      <span className="text-[11px] font-bold truncate">{responder.name}</span>
                      <span className="ml-auto flex items-center gap-1 shrink-0">
                        <Navigation className="w-3 h-3 opacity-70" />
                        <span className="text-[10px] font-bold">{responder.distance}km</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm">
          {[
            { id: 'members' as const, color: 'bg-emerald-500', label: 'Members' },
            { id: 'listings' as const, color: 'bg-blue-500', label: 'Listings' },
            { id: 'notices' as const, color: 'bg-amber-500', label: 'Notices' },
            { id: 'businesses' as const, color: 'bg-purple-500', label: 'Businesses' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setMapFilter(item.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all active:scale-95",
                mapFilter === item.id
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-surface-container-low border-outline-variant/5 hover:bg-surface-container-high"
              )}
            >
              <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", mapFilter === item.id ? 'bg-white' : item.color)} />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                mapFilter === item.id ? 'text-white' : 'text-primary'
              )}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
    </>
  );
};
