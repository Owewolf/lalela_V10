import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Map as MapIcon, 
  List as ListIcon, 
  CheckCircle2, 
  Plus, 
  ArrowLeft, 
  Filter, 
  Star, 
  Navigation, 
  Clock, 
  Check,
  Loader2,
  AlertCircle,
  Globe,
  Phone,
  MapPin,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BUSINESS_CATEGORIES as CATEGORIES } from '../constants';
import { useCommunity } from '../context/CommunityContext';
import { Business } from '../types';
import { cn } from '../lib/utils';
import { GoogleGenAI, Type } from "@google/genai";

interface BusinessImportToolProps {
  onBack: () => void;
}

export const BusinessImportTool: React.FC<BusinessImportToolProps> = ({ onBack }) => {
  const { currentCommunity, bulkAddCommunityBusinesses } = useCommunity();
  const [categorySearch, setCategorySearch] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Business[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const coverageArea = currentCommunity?.coverageArea;

  const enabledCategories = useMemo(() => {
    if (!currentCommunity?.enabledCategories) return CATEGORIES;
    return CATEGORIES.filter(c => currentCommunity.enabledCategories.includes(c.id));
  }, [currentCommunity?.enabledCategories]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return enabledCategories;
    const search = categorySearch.toLowerCase();
    return enabledCategories.filter(c => 
      c.label.toLowerCase().includes(search) ||
      c.types.some(t => t.toLowerCase().includes(search))
    );
  }, [categorySearch, enabledCategories]);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const addCustomCategory = () => {
    if (!customCategory.trim()) return;
    const cat = customCategory.trim();
    if (!selectedCategories.includes(cat)) {
      setSelectedCategories(prev => [...prev, cat]);
    }
    setCustomCategory('');
  };

  const handleSearch = async () => {
    if (!coverageArea) return;
    if (selectedCategories.length === 0) {
      setError('Please select at least one category.');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Map selected IDs to their Google types, or use the ID directly if it's a custom one
      const selectedTypes = selectedCategories.flatMap(id => {
        const cat = CATEGORIES.find(c => c.id === id);
        return cat ? cat.types : [id];
      });

      const prompt = `Search for real, popular, and highly-rated businesses in the following categories: ${selectedTypes.join(', ')}. 
      The search area is ${coverageArea.location_name} (Latitude: ${coverageArea.latitude}, Longitude: ${coverageArea.longitude}) within a ${coverageArea.radius}km radius.
      Use Google Search to find the most accurate and up-to-date information.
      Return a list of businesses with their real names, verified addresses, coordinates, ratings, and descriptions.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                address: { type: Type.STRING },
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER },
                rating: { type: Type.NUMBER },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                phone: { type: Type.STRING },
                website: { type: Type.STRING }
              },
              required: ["name", "address", "latitude", "longitude"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      const businesses: Business[] = data.map((b: any) => ({
        id: `google_${Math.random().toString(36).substr(2, 9)}`,
        name: b.name,
        address: b.address,
        latitude: b.latitude,
        longitude: b.longitude,
        rating: b.rating,
        category: b.category || selectedCategories[0],
        description: b.description,
        phone: b.phone,
        website: b.website,
        status: 'Open',
        distance: 'Calculating...', // Will be calculated in UI
        isExternal: true,
        isVerified: false,
        image: `https://picsum.photos/seed/${b.name}/400/300`
      }));

      // Attempt to fetch real OG images for businesses with websites
      const ogResults = await Promise.allSettled(
        businesses.map(async (biz) => {
          if (!biz.website) return null;
          try {
            const resp = await fetch(`/api/og-image?url=${encodeURIComponent(biz.website)}`);
            const { imageUrl } = await resp.json();
            return imageUrl as string | null;
          } catch { return null; }
        })
      );
      ogResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
          businesses[i].image = result.value;
        }
      });

      setResults(businesses);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch businesses. Please try again.');
      
      // Fallback mock data for demo purposes if API fails
      const mockResults: Business[] = [
        {
          id: 'mock_1',
          name: 'Central Garden Café',
          address: '123 Main St, ' + coverageArea.location_name,
          latitude: coverageArea.latitude + 0.002,
          longitude: coverageArea.longitude + 0.002,
          rating: 4.5,
          category: 'Food & Dining',
          status: 'Open',
          isExternal: true,
          image: 'https://picsum.photos/seed/cafe/400/300'
        },
        {
          id: 'mock_2',
          name: 'QuickFix Auto',
          address: '45 Industrial Rd, ' + coverageArea.location_name,
          latitude: coverageArea.latitude - 0.005,
          longitude: coverageArea.longitude - 0.003,
          rating: 4.2,
          category: 'Automotive',
          status: 'Open',
          isExternal: true,
          image: 'https://picsum.photos/seed/auto/400/300'
        }
      ];
      setResults(mockResults);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;

    const toImport = results.filter(r => selectedIds.has(r.id)).map(r => ({
      ...r,
      id: `biz_${Math.random().toString(36).substr(2, 9)}`,
      source: 'GOOGLE',
      isVerified: true, // Admin imported businesses are verified by default
      isFeatured: false,
      status: 'Open' as const
    }));

    await bulkAddCommunityBusinesses(currentCommunity.id, toImport);
    onBack();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <div>
            <h3 className="text-2xl font-headline font-bold text-primary">Smart Business Import</h3>
            <p className="text-xs text-on-surface-variant font-medium">Discover and seed businesses from Google Maps.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary">{coverageArea?.location_name} ({coverageArea?.radius}km)</span>
        </div>
      </div>

      {/* Category Selection */}
      <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h4 className="text-lg font-bold text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            1. Select Categories to Discover
          </h4>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input 
                type="text" 
                placeholder="Filter categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-surface-container-low border-none rounded-xl text-xs focus:ring-2 focus:ring-primary/20 w-48"
              />
            </div>
            <span className="text-[10px] font-black text-outline uppercase tracking-widest">
              {selectedCategories.length} Selected
            </span>
          </div>
        </div>

        {/* Selected Categories Chips */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
            {selectedCategories.map(id => {
              const cat = enabledCategories.find(c => c.id === id);
              return (
                <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-full text-[10px] font-bold">
                  <span>{cat ? cat.icon : '🔍'}</span>
                  <span>{cat ? cat.label : id}</span>
                  <button onClick={() => toggleCategory(id)} className="hover:text-white/70">
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <button 
              onClick={() => setSelectedCategories([])}
              className="text-[10px] font-bold text-outline hover:text-primary px-2"
            >
              Clear All
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300",
                selectedCategories.includes(cat.id)
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-[1.05]"
                  : "bg-surface-container-low border-outline-variant/10 text-on-surface-variant hover:border-primary/30"
              )}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter text-center leading-tight">{cat.label}</span>
            </button>
          ))}
          {filteredCategories.length === 0 && (
            <div className="col-span-full py-8 text-center text-outline text-xs italic">
              No categories match your search.
            </div>
          )}
        </div>

        {/* Custom Category Add */}
        <div className="pt-8 border-t border-outline-variant/10">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-all" />
              <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 group-focus-within:text-primary transition-colors z-10" />
              <input 
                type="text" 
                placeholder="Add custom Google Place type (e.g. 'museum', 'park', 'gym')..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-2 border-transparent rounded-2xl text-sm focus:border-primary/20 focus:bg-white transition-all relative z-10 placeholder:text-outline/50"
              />
            </div>
            <button 
              onClick={addCustomCategory}
              disabled={!customCategory.trim()}
              className="px-8 py-4 bg-secondary text-white rounded-2xl text-sm font-bold shadow-xl shadow-secondary/20 hover:shadow-secondary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
            >
              Add Category
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <p className="text-[11px] text-outline font-medium">
              Tip: Use standard Google Place types for the most accurate AI discovery.
            </p>
          </div>
        </div>
        <button 
          onClick={handleSearch}
          disabled={isSearching || selectedCategories.length === 0}
          className="w-full mt-10 py-5 bg-primary text-white rounded-[2rem] font-headline font-bold text-lg shadow-2xl shadow-primary/30 hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-4 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
          {isSearching ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="tracking-tight">Analyzing Coverage Area...</span>
            </>
          ) : (
            <>
              <div className="p-2 bg-white/10 rounded-xl">
                <Search className="w-6 h-6" />
              </div>
              <span className="tracking-tight">Scan & Discover Businesses</span>
            </>
          )}
        </button>
        {error && (
          <div className="mt-4 p-4 bg-error/5 border border-error/10 rounded-xl flex items-center gap-3 text-error text-xs font-bold">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </section>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {results.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-primary">
                2. Select Businesses to Import ({selectedIds.size} selected)
              </h4>
              <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/10">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    viewMode === 'list' ? "bg-secondary text-white" : "text-on-surface-variant"
                  )}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    viewMode === 'map' ? "bg-secondary text-white" : "text-on-surface-variant"
                  )}
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((biz) => (
                  <div 
                    key={biz.id}
                    onClick={() => toggleSelection(biz.id)}
                    className={cn(
                      "bg-surface-container-lowest p-4 rounded-3xl border transition-all cursor-pointer flex gap-4 group",
                      selectedIds.has(biz.id) 
                        ? "border-primary ring-2 ring-primary/10 shadow-md" 
                        : "border-outline-variant/10 hover:border-primary/30"
                    )}
                  >
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-container-high shrink-0 relative">
                      <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {selectedIds.has(biz.id) && (
                        <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-bold text-primary truncate pr-2">{biz.name}</h5>
                        {biz.rating && (
                          <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-black">
                            <Star className="w-3 h-3 fill-current" />
                            {biz.rating}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-outline font-bold uppercase mb-2">{biz.category}</p>
                      <p className="text-[11px] text-on-surface-variant line-clamp-2 mb-2">{biz.address}</p>
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <Clock className="w-3 h-3" /> Open
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-outline">
                          <Navigation className="w-3 h-3" /> 0.8km
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-low rounded-[2.5rem] h-[400px] relative overflow-hidden border border-outline-variant/10 shadow-inner">
                <div className="absolute inset-0 bg-surface-container-highest opacity-10 african-pattern" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* Center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg animate-pulse" />
                    </div>
                    {/* Pins */}
                    {results.map((biz, idx) => {
                      if (!biz.latitude || !biz.longitude || !coverageArea) return null;
                      const latDiff = (biz.latitude - coverageArea.latitude) * 111;
                      const lonDiff = (biz.longitude - coverageArea.longitude) * 111 * Math.cos(coverageArea.latitude * Math.PI / 180);
                      const top = 50 - (latDiff / coverageArea.radius) * 40;
                      const left = 50 + (lonDiff / coverageArea.radius) * 40;

                      return (
                        <div 
                          key={biz.id}
                          onClick={() => toggleSelection(biz.id)}
                          style={{ top: `${top}%`, left: `${left}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 border-white shadow-md transition-all group-hover:scale-150",
                            selectedIds.has(biz.id) ? "bg-primary scale-125" : "bg-secondary"
                          )} />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <div className="bg-white p-2 rounded-lg shadow-xl border border-outline-variant/10 min-w-[100px] text-center">
                              <p className="text-[10px] font-bold text-primary truncate">{biz.name}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="sticky bottom-6 flex justify-center">
              <button 
                onClick={handleImport}
                disabled={selectedIds.size === 0}
                className="px-12 py-4 bg-secondary text-white rounded-full font-headline font-bold shadow-2xl shadow-secondary/40 hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
              >
                <Plus className="w-5 h-5" />
                Import {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} into "{currentCommunity?.name}"
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {results.length === 0 && !isSearching && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
          <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
            <Globe className="w-10 h-10" />
          </div>
          <div>
            <h5 className="text-lg font-bold text-primary">No Scan Results</h5>
            <p className="text-sm text-on-surface-variant">Select categories above and scan your coverage area to find businesses.</p>
          </div>
        </div>
      )}
    </div>
  );
};
