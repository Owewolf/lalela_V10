import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Siren, 
  MessageSquare, 
  ChevronUp, 
  ChevronDown,
  AlertTriangle,
  Users,
  Shield,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { cn } from '../lib/utils';
import { CommunityNotice, UserRole, Message } from '../types';
import { ChatWindow } from './chat/ChatWindow';
import { ChatComposer } from './chat/ChatComposer';
import { EmergencyMap } from './EmergencyMap';

interface EmergencyHubProps {
  emergencyPost: CommunityNotice;
  onBack: () => void;
}

// Custom icon for shared locations in chat
const sharedLocationIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-primary p-2 rounded-full border-2 border-white shadow-xl text-white animate-bounce z-[1000]"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export const EmergencyHub: React.FC<EmergencyHubProps> = ({ emergencyPost, onBack }) => {
  const { securityResponders, startConversation, setActiveConversation, messages, sendMessage, activeConversation, members } = useCommunity();
  const { user, userProfile } = useFirebase();
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [mapResetTrigger, setMapResetTrigger] = useState(0);
  const [viewerCount, setViewerCount] = useState(12);

  const { isLoaded } = useGoogleMaps();

  // Simulate dynamic viewer count
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => Math.max(5, prev + Math.floor(Math.random() * 3) - 1));
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  
  const emergencyLocation: [number, number] = [
    emergencyPost.latitude || -26.2041, 
    emergencyPost.longitude || 28.0473
  ];

  // Extract shared locations from chat messages
  const sharedLocations = useMemo(() => {
    return messages
      .filter(msg => msg.text.startsWith('Shared Location:'))
      .map(msg => {
        const coords = msg.text.replace('Shared Location:', '').split(',').map(c => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          return {
            id: msg.id,
            position: [coords[0], coords[1]] as [number, number],
            senderName: msg.senderName,
            timestamp: msg.createdAt
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ id: string, position: [number, number], senderName: string, timestamp: string }>;
  }, [messages]);

  const additionalMarkers = useMemo(() => {
    return sharedLocations.map(loc => ({
      id: loc.id,
      position: loc.position,
      icon: sharedLocationIcon,
      popupContent: (
        <div className="p-2">
          <p className="font-bold text-primary text-xs">{loc.senderName} shared location</p>
          <p className="text-[10px] text-outline">
            {new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )
    }));
  }, [sharedLocations]);

  // Initialize or find emergency conversation
  useEffect(() => {
    const initChat = async () => {
      // Include ALL community members so everyone can participate
      const allMemberIds = members.map(m => m.user_id);
      // Ensure the emergency author and current user are included
      const participantSet = new Set(allMemberIds);
      if (emergencyPost.author_id) participantSet.add(emergencyPost.author_id);
      if (user?.uid) participantSet.add(user.uid);
      securityResponders.forEach(r => participantSet.add(r.user_id));

      const convId = await startConversation({
        participants: Array.from(participantSet),
        type: 'emergency',
        emergencyId: emergencyPost.id,
        metadata: {
          title: emergencyPost.title,
          location: emergencyPost.locationName
        }
      });
      setActiveConversation(convId);
    };

    initChat();
    return () => setActiveConversation(null);
  }, [emergencyPost.id, members.length, securityResponders.length]);

  // Map raw messages to include role badges and sender details
  const enrichedMessages = useMemo(() => {
    return messages.map(msg => {
      let role = msg.senderRole;
      let senderName = msg.senderName;
      let senderImage = msg.senderImage;

      // Look up sender in members list for name/image
      const senderMember = members.find(m => m.user_id === msg.senderId);
      if (senderMember) {
        if (!senderName) senderName = senderMember.name || `Member ${msg.senderId.slice(0, 4)}`;
        if (!senderImage) senderImage = senderMember.image;
      }

      // Also check security responders for name/image
      if (!senderName || !senderImage) {
        const responder = securityResponders.find(r => r.user_id === msg.senderId);
        if (responder) {
          if (!senderName) senderName = responder.name;
          if (!senderImage) senderImage = responder.image;
        }
      }

      // Assign role badges
      if (msg.senderId === emergencyPost.author_id) {
        role = 'Author' as any;
      } else if (securityResponders.some(r => r.user_id === msg.senderId)) {
        role = 'Responder' as any;
      }

      return { ...msg, senderRole: role, senderName: senderName || 'Community Member', senderImage };
    });
  }, [messages, emergencyPost.author_id, securityResponders, members]);

  const handleSendLocation = () => {
    if (userProfile?.liveLocation) {
      sendMessage(`Shared Location: ${userProfile.liveLocation.latitude}, ${userProfile.liveLocation.longitude}`, 'text');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Persistent Map Section */}
      <motion.section 
        animate={{ height: isMapExpanded ? '35vh' : '80px' }}
        className="relative w-full bg-surface-container-low overflow-hidden border-b border-outline-variant/20 z-50"
      >
        <div className="absolute inset-0 z-0">
          {isLoaded ? (
            <EmergencyMap 
              emergencyPost={emergencyPost}
              resetTrigger={mapResetTrigger}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-container-low">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Map Overlays */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <button 
            onClick={() => setIsMapExpanded(!isMapExpanded)}
            className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg text-primary hover:bg-white transition-all active:scale-95"
          >
            {isMapExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <button 
            className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg text-primary hover:bg-white transition-all active:scale-95"
            onClick={() => setMapResetTrigger(prev => prev + 1)}
          >
            <Navigation className="w-5 h-5" />
          </button>
        </div>

        {!isMapExpanded && (
          <div className="absolute inset-0 flex items-center px-6 bg-surface/80 backdrop-blur-sm z-[999] pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="bg-error/10 p-2 rounded-full">
                <MapPin className="w-4 h-4 text-error" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary">Map Minimized</p>
                <p className="text-[10px] text-outline">Tap to expand situational awareness</p>
              </div>
            </div>
          </div>
        )}
      </motion.section>

      {/* Chat Interface */}
      <main className="flex-1 flex flex-col bg-surface african-pattern overflow-hidden relative min-h-0">
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex justify-center py-3 bg-surface/50 backdrop-blur-sm border-b border-outline-variant/5">
            <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-4 py-1.5 rounded-full shadow-sm uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3 text-error" />
              Coordination Channel
            </span>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeConversation ? (
              <ChatWindow 
                messages={enrichedMessages} 
                conversation={activeConversation} 
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="px-4 py-2 bg-surface-container-lowest border-t border-outline-variant/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {securityResponders.slice(0, 3).map(r => (
                    <div key={r.user_id} className="w-6 h-6 rounded-full border-2 border-white bg-surface-container-high overflow-hidden">
                      <img src={r.image} alt={r.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
                  {securityResponders.length} Responders Active
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-error animate-pulse">
                <Siren className="w-3 h-3" />
                <span>High Priority</span>
              </div>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="p-4 bg-surface border-t border-outline-variant/10 pb-8">
          <ChatComposer 
            placeholder="Send a quick update..." 
            onSend={(text) => sendMessage(text)}
            onSendAttachment={(url, type) => sendMessage('', type, url)}
            onSendLocation={handleSendLocation}
            onTyping={() => {}}
          />
        </div>
      </main>
    </div>
  );
};
