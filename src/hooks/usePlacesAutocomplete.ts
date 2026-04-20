import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePlacesAutocompleteOptions {
  debounce?: number;
  defaultValue?: string;
  initOnMount?: boolean;
  requestOptions?: {
    locationBias?: string;
  };
  cache?: number;
}

interface Suggestion {
  place_id: string;
  description: string;
  /** The underlying PlacePrediction object from the new API */
  _prediction: google.maps.places.PlacePrediction;
}

interface SuggestionsState {
  status: string;
  data: Suggestion[];
}

/**
 * Drop-in replacement for the `use-places-autocomplete` package,
 * built on the new google.maps.places.AutocompleteSuggestion API
 * with AutocompleteSessionToken and Place.fetchFields.
 */
export function usePlacesAutocomplete(options: UsePlacesAutocompleteOptions = {}) {
  const { debounce = 300, defaultValue = '', initOnMount = true } = options;

  const [ready, setReady] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SuggestionsState>({ status: '', data: [] });

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initToken = useCallback(() => {
    if (typeof google !== 'undefined' && google.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, []);

  const init = useCallback(() => {
    if (typeof google !== 'undefined' && google.maps?.places?.AutocompleteSuggestion) {
      setReady(true);
      initToken();
    }
  }, [initToken]);

  useEffect(() => {
    if (initOnMount) {
      init();
    }
  }, [initOnMount, init]);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || !ready) {
      setSuggestions({ status: '', data: [] });
      return;
    }

    try {
      const request: google.maps.places.AutocompleteRequest = {
        input,
        sessionToken: sessionTokenRef.current ?? undefined,
      };

      const response = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      const mapped: Suggestion[] = response.suggestions
        .filter((s) => s.placePrediction)
        .map((s) => ({
          place_id: s.placePrediction!.placeId,
          description: s.placePrediction!.text.text,
          _prediction: s.placePrediction!,
        }));

      setSuggestions({ status: mapped.length > 0 ? 'OK' : 'ZERO_RESULTS', data: mapped });
    } catch (err) {
      console.error('AutocompleteSuggestion fetch error:', err);
      setSuggestions({ status: 'ERROR', data: [] });
    }
  }, [ready]);

  const setValueWrapper = useCallback(
    (newValue: string, shouldFetch = true) => {
      setValue(newValue);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (shouldFetch) {
        debounceTimerRef.current = setTimeout(() => {
          fetchSuggestions(newValue);
        }, debounce);
      }
    },
    [debounce, fetchSuggestions],
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions({ status: '', data: [] });
  }, []);

  return {
    ready,
    value,
    suggestions,
    setValue: setValueWrapper,
    clearSuggestions,
    init,
  };
}

/**
 * Given a place description string, use the Geocoding service to get coordinates.
 * Replacement for the old `getGeocode` + `getLatLng` from use-places-autocomplete.
 */
export async function geocodeByAddress(address: string): Promise<{ lat: number; lng: number }> {
  const geocoder = new google.maps.Geocoder();
  const response = await geocoder.geocode({ address });

  if (!response.results[0]) {
    throw new Error('No geocode results found');
  }

  const location = response.results[0].geometry.location;
  return { lat: location.lat(), lng: location.lng() };
}

/**
 * Given a PlacePrediction (from a suggestion), resolve the Place and fetch its location.
 * This is the preferred approach with the new API — avoids extra geocoding calls.
 */
export async function getPlaceLatLng(prediction: google.maps.places.PlacePrediction): Promise<{ lat: number; lng: number; formattedAddress: string }> {
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ['location', 'formattedAddress'] });

  const loc = place.location;
  if (!loc) {
    throw new Error('Place has no location');
  }

  return {
    lat: loc.lat(),
    lng: loc.lng(),
    formattedAddress: place.formattedAddress || '',
  };
}

export async function reverseGeocodeLatLng(lat: number, lng: number): Promise<string> {
  const geocoder = new google.maps.Geocoder();
  const response = await geocoder.geocode({ location: { lat, lng } });

  if (!response.results[0]) {
    throw new Error('No reverse geocode results found');
  }

  return response.results[0].formatted_address;
}
