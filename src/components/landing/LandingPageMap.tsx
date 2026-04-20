import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, MapPin } from 'lucide-react';
import { usePublicMapData } from '../../hooks/usePublicMapData';
import type { PublicCommunity } from '../../types';

// --- FitBounds helper ---

const FitBoundsToCommunities = ({ communities }: { communities: PublicCommunity[] }) => {
  const map = useMap();

  useEffect(() => {
    if (communities.length === 0) return;

    const bounds = L.latLngBounds(
      communities.map((c) => {
        const radiusDeg = c.coverageArea.radius / 111;
        return [
          L.latLng(c.coverageArea.latitude - radiusDeg, c.coverageArea.longitude - radiusDeg),
          L.latLng(c.coverageArea.latitude + radiusDeg, c.coverageArea.longitude + radiusDeg),
        ];
      }).flat()
    );

    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [communities, map]);

  return null;
};

// --- Main component ---

interface LandingPageMapProps {
  onJoin?: () => void;
}

export const LandingPageMap: React.FC<LandingPageMapProps> = () => {
  const { communities, isLoading, error } = usePublicMapData();

  const defaultCenter: [number, number] = [-26.2041, 28.0473];

  const mapCenter = useMemo(() => {
    if (communities.length === 0) return defaultCenter;
    const lat = communities.reduce((s, c) => s + c.coverageArea.latitude, 0) / communities.length;
    const lng = communities.reduce((s, c) => s + c.coverageArea.longitude, 0) / communities.length;
    return [lat, lng] as [number, number];
  }, [communities]);

  if (error) {
    return (
      <div className="w-full aspect-square md:h-[500px] md:aspect-auto bg-surface-container-low rounded-[4rem] flex items-center justify-center shadow-inner">
        <div className="text-center space-y-2 p-8">
          <MapPin className="w-12 h-12 text-outline mx-auto" />
          <p className="text-sm font-bold text-outline">Unable to load map data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square md:h-[500px] md:aspect-auto rounded-[4rem] shadow-inner overflow-hidden">
      {isLoading ? (
        <div className="w-full h-full bg-surface-container-low flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-xs font-black uppercase tracking-widest text-outline">Loading communities</p>
          </div>
        </div>
      ) : (
        <MapContainer
          center={mapCenter}
          zoom={communities.length === 0 ? 3 : 10}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {communities.length > 0 && (
            <FitBoundsToCommunities communities={communities} />
          )}

          {communities.map((community) => (
            <Circle
              key={community.id}
              center={[community.coverageArea.latitude, community.coverageArea.longitude]}
              radius={community.coverageArea.radius * 1000}
              pathOptions={{
                color: '#134E42',
                fillColor: '#134E42',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '5, 10',
              }}
            >
              <Popup className="custom-popup">
                <div className="p-4 min-w-[180px]">
                  <h4 className="font-black text-primary text-base">{community.name}</h4>
                  <p className="text-[10px] text-outline/60 flex items-center gap-1 mt-2">
                    <MapPin className="w-3 h-3" />
                    {community.coverageArea.location_name}
                  </p>
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      )}

      {communities.length > 0 && (
        <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-2xl shadow-lg border border-outline-variant/10">
          <p className="text-xs font-black uppercase tracking-widest text-primary">
            {communities.length} {communities.length === 1 ? 'Community' : 'Communities'}
          </p>
        </div>
      )}
    </div>
  );
};

export default LandingPageMap;
