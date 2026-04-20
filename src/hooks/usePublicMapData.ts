import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { PublicCommunity } from '../types';

interface PublicMapData {
  communities: PublicCommunity[];
  isLoading: boolean;
  error: string | null;
}

let cachedCommunities: PublicCommunity[] | null = null;

export function usePublicMapData(): PublicMapData {
  const [communities, setCommunities] = useState<PublicCommunity[]>(cachedCommunities || []);
  const [isLoading, setIsLoading] = useState(!cachedCommunities);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedCommunities) return;

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const commQuery = query(
          collection(db, 'communities'),
          where('status', '==', 'ACTIVE')
        );
        const snapshot = await getDocs(commQuery);

        const results: PublicCommunity[] = [];
        for (const doc of snapshot.docs) {
          const data = doc.data();
          if (!data.coverageArea) continue;

          results.push({
            id: doc.id,
            name: data.name,
            coverageArea: data.coverageArea,
          });
        }

        if (!cancelled) {
          cachedCommunities = results;
          setCommunities(results);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch public communities:', err);
        if (!cancelled) setError('Failed to load community data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { communities, isLoading, error };
}
