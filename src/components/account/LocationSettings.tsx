import React, { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useFirebase } from '../../context/FirebaseContext';
import { useCommunity } from '../../context/CommunityContext';
import { useGoogleMaps } from '../../context/GoogleMapsContext';
import { cn } from '../../lib/utils';
import { 
  GoogleMap, 
  MarkerF
} from '@react-google-maps/api';
import { usePlacesAutocomplete, getPlaceLatLng, reverseGeocodeLatLng } from '../../hooks/usePlacesAutocomplete';

const MapSelector = ({ 
  lat, 
  lng, 
  onLocationSelect,
  userName
}: { 
  lat: number, 
  lng: number, 
  onLocationSelect: (lat: number, lng: number) => void | Promise<void>,
  userName?: string
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const center = { lat, lng };

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo(center);
    }
  }, [center.lat, center.lng]);

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden border border-surface-container shadow-sm mt-4">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={15}
        onClick={(e) => {
          if (e.latLng) {
            onLocationSelect(e.latLng.lat(), e.latLng.lng());
          }
        }}
        onLoad={(map) => { mapRef.current = map; }}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          scrollwheel: true,
          gestureHandling: 'greedy',
          draggableCursor: 'crosshair',
        }}
      >
        <MarkerF 
          position={center} 
          draggable={true}
          onDragEnd={(e) => {
            if (e.latLng) {
              onLocationSelect(e.latLng.lat(), e.latLng.lng());
            }
          }}
          title={userName}
          label={userName ? {
            text: userName,
            className: "marker-label", // We'll add CSS for this
          } : undefined}
        />
      </GoogleMap>
    </div>
  );
};

const PlacesAutocomplete = ({ 
  onAddressSelect 
}: { 
  onAddressSelect: (address: string, lat: number, lng: number) => void 
}) => {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleSelect = async (description: string, prediction: google.maps.places.PlacePrediction) => {
    setValue(description, false);
    clearSuggestions();

    try {
      const { lat, lng, formattedAddress } = await getPlaceLatLng(prediction);
      onAddressSelect(formattedAddress || description, lat, lng);
    } catch (error) {
      console.log("Error: ", error);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
        <input
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder="Search for your address..."
          className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 pl-11 pr-4 py-3 rounded-t-xl text-sm transition-all"
        />
      </div>
      {status === "OK" && (
        <ul className="absolute z-50 w-full bg-white mt-1 rounded-xl shadow-xl border border-surface-container overflow-hidden">
          {data.map(({ place_id, description, _prediction }) => (
            <li 
              key={place_id} 
              onClick={() => handleSelect(description, _prediction)}
              className="px-4 py-3 hover:bg-surface-container cursor-pointer text-sm border-b border-surface-container last:border-0 transition-colors"
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface LocationSettingsProps {
  isEditing?: boolean;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  onLocationChange?: (location: { name: string, latitude: number, longitude: number }) => void;
}

export const LocationSettings: React.FC<LocationSettingsProps> = ({
  isEditing = false,
  locationName,
  latitude,
  longitude,
  onLocationChange
}) => {
  const { userProfile, updateUserProfile } = useFirebase();
  const { currentCommunity } = useCommunity();
  
  const [localLocationName, setLocalLocationName] = useState(locationName || userProfile?.defaultLocation?.name || '');
  const [localLatitude, setLocalLatitude] = useState(latitude || userProfile?.defaultLocation?.latitude || 0);
  const [localLongitude, setLocalLongitude] = useState(longitude || userProfile?.defaultLocation?.longitude || 0);

  useEffect(() => {
    if (!isEditing && userProfile?.defaultLocation) {
      setLocalLocationName(userProfile.defaultLocation.name);
      setLocalLatitude(userProfile.defaultLocation.latitude);
      setLocalLongitude(userProfile.defaultLocation.longitude);
    }
  }, [userProfile?.defaultLocation, isEditing]);

  useEffect(() => {
    if (isEditing) {
      if (locationName !== undefined) setLocalLocationName(locationName);
      if (latitude !== undefined) setLocalLatitude(latitude);
      if (longitude !== undefined) setLocalLongitude(longitude);
    }
  }, [locationName, latitude, longitude, isEditing]);

  const { isLoaded, loadError } = useGoogleMaps();

  const resolveLocationName = async (lat: number, lng: number, fallbackName: string) => {
    try {
      return await reverseGeocodeLatLng(lat, lng);
    } catch (error) {
      console.log('Reverse geocode error:', error);
      return fallbackName;
    }
  };

  const handleLocationSave = () => {
    if (isEditing) return;
    updateUserProfile({
      address: localLocationName,
      defaultLocation: {
        name: localLocationName,
        latitude: localLatitude,
        longitude: localLongitude
      }
    });
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    const resolvedName = await resolveLocationName(lat, lng, localLocationName || 'Selected Location');

    setLocalLatitude(lat);
    setLocalLongitude(lng);
    setLocalLocationName(resolvedName);
    
    if (onLocationChange) {
      onLocationChange({
        name: resolvedName,
        latitude: lat,
        longitude: lng
      });
    }

    if (!isEditing) {
      updateUserProfile({
        address: resolvedName,
        defaultLocation: {
          name: resolvedName,
          latitude: lat,
          longitude: lng
        }
      });
    }
  };

  const handleAddressSelect = (address: string, lat: number, lng: number) => {
    setLocalLocationName(address);
    setLocalLatitude(lat);
    setLocalLongitude(lng);
    
    if (onLocationChange) {
      onLocationChange({
        name: address,
        latitude: lat,
        longitude: lng
      });
    }

    if (!isEditing) {
      updateUserProfile({
        address: address,
        defaultLocation: {
          name: address,
          latitude: lat,
          longitude: lng
        }
      });
    }
  };

  const handleNameChange = (name: string) => {
    setLocalLocationName(name);
    if (onLocationChange) {
      onLocationChange({
        name,
        latitude: localLatitude,
        longitude: localLongitude
      });
    }
  };

  const handleLatChange = async (lat: number) => {
    setLocalLatitude(lat);
    const resolvedName = await resolveLocationName(lat, localLongitude, localLocationName || 'Selected Location');
    setLocalLocationName(resolvedName);
    if (onLocationChange) {
      onLocationChange({
        name: resolvedName,
        latitude: lat,
        longitude: localLongitude
      });
    }
  };

  const handleLngChange = async (lng: number) => {
    setLocalLongitude(lng);
    const resolvedName = await resolveLocationName(localLatitude, lng, localLocationName || 'Selected Location');
    setLocalLocationName(resolvedName);
    if (onLocationChange) {
      onLocationChange({
        name: resolvedName,
        latitude: localLatitude,
        longitude: lng
      });
    }
  };

  // Default to coverage area if defined
  const mapCenterLat = userProfile?.defaultLocation?.latitude || currentCommunity?.coverageArea?.latitude || -26.2041;
  const mapCenterLng = userProfile?.defaultLocation?.longitude || currentCommunity?.coverageArea?.longitude || 28.0473;
  const hasEditableCoordinates = Number.isFinite(localLatitude) && Number.isFinite(localLongitude) && !(localLatitude === 0 && localLongitude === 0);
  const mapLat = hasEditableCoordinates ? localLatitude : mapCenterLat;
  const mapLng = hasEditableCoordinates ? localLongitude : mapCenterLng;

  return (
    <div className="space-y-6 pt-4 border-t border-outline-variant/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface">Default Location</h3>
            <p className="text-[10px] text-outline">Auto-attach to new posts and businesses</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
            {userProfile?.locationSharingEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={userProfile?.locationSharingEnabled} 
              onChange={(e) => updateUserProfile({ locationSharingEnabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {isLoaded ? (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Search Address</label>
              <PlacesAutocomplete onAddressSelect={handleAddressSelect} />
              <p className="text-[10px] text-on-surface-variant italic px-1">
                Search for a nearby place first, then refine the exact spot by dragging the pin or clicking the map.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Selected Address</label>
                <input 
                  type="text"
                  value={localLocationName}
                  readOnly
                  aria-readonly="true"
                  title="This address is updated from search and map pin placement"
                  className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 px-4 py-2.5 rounded-t-xl text-sm text-outline cursor-not-allowed"
                  placeholder="Search above and refine on the map"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Latitude</label>
                  <input 
                    type="number"
                    step="any"
                    value={localLatitude}
                    onChange={(e) => handleLatChange(parseFloat(e.target.value) || 0)}
                    onBlur={handleLocationSave}
                    className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-2.5 rounded-t-xl text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Longitude</label>
                  <input 
                    type="number"
                    step="any"
                    value={localLongitude}
                    onChange={(e) => handleLngChange(parseFloat(e.target.value) || 0)}
                    onBlur={handleLocationSave}
                    className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/30 focus:border-primary focus:ring-0 px-4 py-2.5 rounded-t-xl text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1 flex items-center gap-1.5">
                <MapIcon className="w-3 h-3" />
                Select on Map
              </label>
              <MapSelector 
                lat={mapLat} 
                lng={mapLng} 
                onLocationSelect={handleLocationSelect} 
                userName={userProfile?.name}
              />
              <p className="text-[10px] text-on-surface-variant italic px-1">
                Search jumps the map to a nearby place. Scroll to zoom, then click the map or drag the pin to lock in your exact location.
              </p>
            </div>
          </>
        ) : loadError ? (
          <div className="p-4 bg-error/10 text-error rounded-xl text-xs font-medium border border-error/20">
            Failed to load Google Maps. Please check your API key.
          </div>
        ) : (
          <div className="h-64 bg-surface-container-low animate-pulse rounded-xl flex items-center justify-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Loading Map...</p>
          </div>
        )}
      </div>
    </div>
  );
};
