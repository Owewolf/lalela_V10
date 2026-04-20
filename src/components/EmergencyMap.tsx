import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { GoogleMap, Marker, Circle, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { Shield, Siren, Users, MapPin, Navigation, Info, Clock, User } from 'lucide-react';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { CommunityNotice, CommunityMember } from '../types';
import { cn } from '../lib/utils';

interface EmergencyMapProps {
  emergencyPost: CommunityNotice;
  height?: string;
  resetTrigger?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#746855" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "featureType": "administrative.locality",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#d59563" }]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#d59563" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry",
      "stylers": [{ "color": "#263c3f" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#6b9a76" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#38414e" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#212a37" }]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#9ca5b3" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#746855" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#1f2835" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#f3d19c" }]
    },
    {
      "featureType": "transit",
      "elementType": "geometry",
      "stylers": [{ "color": "#2f3948" }]
    },
    {
      "featureType": "transit.station",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#d59563" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#17263c" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#515c6d" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#17263c" }]
    }
  ]
};

export const EmergencyMap: React.FC<EmergencyMapProps> = ({ emergencyPost, height = "100%", resetTrigger }) => {
  const { members, securityResponders } = useCommunity();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<{ type: 'emergency' | 'member' | 'responder', data: any } | null>(null);

  const EMERGENCY_RADIUS = 20000; // 20km in meters

  const emergencyPos = useMemo(() => ({
    lat: emergencyPost.latitude || -26.2041,
    lng: emergencyPost.longitude || 28.0473
  }), [emergencyPost.latitude, emergencyPost.longitude]);

  // Initial map options — center+zoom set here (not as controlled props)
  // zoom 11 ≈ 20km radius at mid-latitudes; fitBounds will refine after mount
  const initialOptions = useMemo(() => ({
    ...mapOptions,
    center: emergencyPos,
    zoom: 11,
  }), [emergencyPos]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    // Delay fitBounds to allow the container animation to settle (35vh expansion)
    const fitToEmergency = () => {
      const circle = new google.maps.Circle({ center: emergencyPos, radius: EMERGENCY_RADIUS });
      const bounds = circle.getBounds();
      if (bounds) {
        map.fitBounds(bounds);
      }
    };
    // Listen for the first idle event (map fully rendered), then fit
    google.maps.event.addListenerOnce(map, 'idle', () => {
      setTimeout(fitToEmergency, 350);
    });
  }, [emergencyPos, EMERGENCY_RADIUS]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const calculateDistance = (lat: number, lng: number) => {
    const R = 6371; // km
    const dLat = (lat - emergencyPos.lat) * Math.PI / 180;
    const dLng = (lng - emergencyPos.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(emergencyPos.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  // Security members from the dedicated responders array
  const responders = useMemo(() => {
    return securityResponders.map(r => ({
      ...r,
      distance: calculateDistance(r.latitude, r.longitude)
    }));
  }, [securityResponders, emergencyPos]);

  // Dedicated security member IDs to avoid duplicates in the members layer
  const responderIds = useMemo(() => new Set(securityResponders.map(r => r.user_id)), [securityResponders]);

  // All community members with location — NO distance limit
  // Security members always shown even without locationSharingEnabled
  // Use liveLocation coords when available for dynamic updates
  const visibleMembers = useMemo(() => {
    return members
      .filter(m => {
        if (m.user_id === emergencyPost.author_id) return false;
        if (responderIds.has(m.user_id)) return false; // shown in responders layer
        const isSecurity = m.isSecurityMember;
        const hasLocation = (m.latitude && m.longitude) || (m.locationSharingEnabled && m.latitude && m.longitude);
        return isSecurity || hasLocation;
      })
      .map(m => ({
        ...m,
        // Prefer live coordinates when the member has enabled sharing
        displayLat: m.latitude!,
        displayLng: m.longitude!,
      }));
  }, [members, emergencyPos, responderIds, emergencyPost.author_id]);

  // Re-center on emergency when resetTrigger changes (e.g. new emergency)
  useEffect(() => {
    if (!map || resetTrigger === undefined) return;
    const circle = new google.maps.Circle({ center: emergencyPos, radius: EMERGENCY_RADIUS });
    const bounds = circle.getBounds();
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [map, emergencyPos, resetTrigger]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-outline-variant/10 shadow-2xl">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={initialOptions}
      >
        {/* Emergency Zone Circle — 20km radius */}
        <Circle
          center={emergencyPos}
          radius={EMERGENCY_RADIUS}
          options={{
            fillColor: '#B3261E',
            fillOpacity: 0.1,
            strokeColor: '#B3261E',
            strokeOpacity: 0.3,
            strokeWeight: 2,
            clickable: false,
          }}
        />

        {/* Emergency Marker */}
        <Marker
          position={emergencyPos}
          onClick={() => setSelectedMarker({ type: 'emergency', data: emergencyPost })}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#B3261E',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            scale: 10,
          }}
        />

        {/* Security Responders — always visible, dynamically updating */}
        {responders.map(responder => (
          <Marker
            key={`resp-${responder.user_id}`}
            position={{ lat: responder.latitude, lng: responder.longitude }}
            onClick={() => setSelectedMarker({ type: 'responder', data: responder })}
            icon={{
              path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
              fillColor: '#006A6A',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
              scale: 1.2,
              anchor: new google.maps.Point(12, 12),
            }}
          />
        ))}

        {/* Security Members from the community members list (isSecurityMember flag) */}
        {visibleMembers.filter(m => m.isSecurityMember).map(member => (
          <Marker
            key={`sec-${member.user_id}`}
            position={{ lat: member.displayLat, lng: member.displayLng }}
            onClick={() => setSelectedMarker({ type: 'responder', data: { ...member, name: member.name, image: member.image, latitude: member.displayLat, longitude: member.displayLng, distance: calculateDistance(member.displayLat, member.displayLng) } })}
            icon={{
              path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
              fillColor: '#006A6A',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
              scale: 1.2,
              anchor: new google.maps.Point(12, 12),
            }}
          />
        ))}

        {/* Community Members with Clustering — no distance limit */}
        <MarkerClusterer>
          {(clusterer) => (
            <>
              {visibleMembers.filter(m => !m.isSecurityMember).map(member => (
                <Marker
                  key={member.user_id}
                  position={{ lat: member.displayLat, lng: member.displayLng }}
                  clusterer={clusterer}
                  onClick={() => setSelectedMarker({ type: 'member', data: { ...member, latitude: member.displayLat, longitude: member.displayLng } })}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#10B981',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 1,
                    scale: 6,
                  }}
                />
              ))}
            </>
          )}
        </MarkerClusterer>

        {/* Info Window */}
        {selectedMarker && (
          <InfoWindow
            position={
              selectedMarker.type === 'emergency' 
                ? emergencyPos 
                : { lat: selectedMarker.data.latitude, lng: selectedMarker.data.longitude }
            }
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 min-w-[200px] max-w-[280px]">
              {selectedMarker.type === 'emergency' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-error">
                    <Siren className="w-4 h-4" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Active Emergency</span>
                  </div>
                  <h4 className="font-bold text-primary text-sm leading-tight">{selectedMarker.data.title}</h4>
                  <p className="text-[10px] text-on-surface-variant line-clamp-3">{selectedMarker.data.description}</p>
                  <div className="pt-2 border-t border-outline-variant/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface-container-high overflow-hidden">
                        <img src={selectedMarker.data.authorImage} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-bold text-primary">{selectedMarker.data.authorName}</span>
                    </div>
                    <span className="text-[9px] text-outline font-medium">
                      {new Date(selectedMarker.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ) : selectedMarker.type === 'responder' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-secondary">
                    <Shield className="w-4 h-4" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Security Responder</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border-2 border-secondary/20">
                      <img src={selectedMarker.data.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-primary text-sm">{selectedMarker.data.name}</h4>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">En Route</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-outline">
                    <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {selectedMarker.data.distance}km away</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Active</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Users className="w-4 h-4" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Community Member</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border-2 border-emerald-500/20">
                      <img src={selectedMarker.data.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMarker.data.user_id}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-primary text-sm">{selectedMarker.data.name}</h4>
                      <p className="text-[10px] text-outline font-medium uppercase tracking-widest">{selectedMarker.data.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-outline">
                    <Navigation className="w-3 h-3" /> {calculateDistance(selectedMarker.data.latitude, selectedMarker.data.longitude)}km from emergency
                  </div>
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Map Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <button 
          onClick={() => {
            if (map) {
              const circle = new google.maps.Circle({ center: emergencyPos, radius: EMERGENCY_RADIUS });
              const bounds = circle.getBounds();
              if (bounds) {
                map.fitBounds(bounds);
              }
            }
          }}
          className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl text-primary hover:bg-white transition-all active:scale-95 border border-outline-variant/10 group"
          title="Center on emergency"
        >
          <Navigation className="w-5 h-5 group-hover:rotate-45 transition-transform" />
        </button>
      </div>

      {/* Legend Overlay */}
      <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-outline-variant/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-error shadow-sm animate-pulse" />
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Emergency Source</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-secondary shadow-sm" />
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Security Responders</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Community Members</span>
        </div>
      </div>
    </div>
  );
};
