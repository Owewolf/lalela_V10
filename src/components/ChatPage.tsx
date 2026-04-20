import React, { useState, useMemo, useCallback } from 'react';
import { Search, Shield, Store, Navigation, FileText, Tag, Siren } from 'lucide-react';
import { motion } from 'motion/react';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { cn } from '../lib/utils';
import { CommunityMember, Conversation } from '../types';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface ChatPageProps {
  onSelectChat: (chat: any) => void;
  onOpenEmergencyHub?: (post: any) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onSelectChat, onOpenEmergencyHub }) => {
  const {
    members, posts, communityBusinesses, securityResponders,
    startConversation, conversations, setActiveConversation, currentCommunity, markAsRead
  } = useCommunity();
  const { user } = useFirebase();
  const [searchQuery, setSearchQuery] = useState('');

  const isEmergency = !!currentCommunity?.isEmergencyMode;

  const emergencyPost = useMemo(
    () => posts.find(p => p.urgency === 'emergency' || p.priority === 'emergency'),
    [posts]
  );

  // Build enriched member list
  const enrichedMembers = useMemo(() => {
    const otherMembers = members.filter(m => m.user_id !== user?.uid);

    // Sets for O(1) lookup
    const businessOwnerIds = new Set(communityBusinesses.map(b => b.owner_id));
    const responderIds = new Set(securityResponders.map(r => r.user_id));
    const authorPostMap = new Map<string, string>(); // user_id → latest timestamp
    const authorPostCounts = new Map<string, { listings: number; notices: number }>();
    for (const p of posts) {
      if (!p.author_id) continue;
      const existing = authorPostMap.get(p.author_id);
      if (!existing || p.timestamp > existing) {
        authorPostMap.set(p.author_id, p.timestamp);
      }
      const counts = authorPostCounts.get(p.author_id) || { listings: 0, notices: 0 };
      if (p.type === 'listing') counts.listings++;
      else counts.notices++;
      authorPostCounts.set(p.author_id, counts);
    }

    // Build per-type unread maps: member → { direct, listing, notice } counts + conversation refs
    type UnreadInfo = { direct: number; listing: number; notice: number; marketplace: number; directConv?: Conversation; listingConv?: Conversation; noticeConv?: Conversation; marketplaceConv?: Conversation };
    const unreadInfoMap = new Map<string, UnreadInfo>();
    for (const conv of conversations) {
      if (!user) continue;
      if (conv.type === 'community' || conv.type === 'emergency') continue;
      const otherId = conv.participants.find(p => p !== user.uid);
      if (!otherId) continue;
      const myUnread = conv.unreadCount?.[user.uid] || 0;
      const info = unreadInfoMap.get(otherId) || { direct: 0, listing: 0, notice: 0, marketplace: 0 };
      if (conv.type === 'direct') {
        info.direct += myUnread;
        if (myUnread > 0 && !info.directConv) info.directConv = conv;
      } else if (conv.type === 'listing' && conv.metadata?.source === 'marketplace') {
        info.marketplace += myUnread;
        if (myUnread > 0 && !info.marketplaceConv) info.marketplaceConv = conv;
      } else if (conv.type === 'listing') {
        info.listing += myUnread;
        if (myUnread > 0 && !info.listingConv) info.listingConv = conv;
      } else if (conv.type === 'notice') {
        info.notice += myUnread;
        if (myUnread > 0 && !info.noticeConv) info.noticeConv = conv;
      }
      unreadInfoMap.set(otherId, info);
    }

    return otherMembers.map(m => {
      const counts = authorPostCounts.get(m.user_id);
      const summaryParts: string[] = [];
      if (counts?.listings) summaryParts.push(`${counts.listings} listing${counts.listings > 1 ? 's' : ''}`);
      if (counts?.notices) summaryParts.push(`${counts.notices} notice${counts.notices > 1 ? 's' : ''}`);

      const info = unreadInfoMap.get(m.user_id) || { direct: 0, listing: 0, notice: 0, marketplace: 0 };
      return {
        member: m,
        hasActivePost: authorPostMap.has(m.user_id),
        hasBusiness: businessOwnerIds.has(m.user_id),
        isSecurity: m.isSecurityMember || responderIds.has(m.user_id),
        isEmergencyAuthor: isEmergency && emergencyPost?.author_id === m.user_id,
        latestActivity: authorPostMap.get(m.user_id) || m.joined_at || '',
        emergencyDistance: isEmergency && emergencyPost?.latitude && emergencyPost?.longitude && m.latitude && m.longitude
          ? getDistance(emergencyPost.latitude, emergencyPost.longitude, m.latitude, m.longitude)
          : null,
        summary: summaryParts.join(' · '),
        unread: info,
      };
    });
  }, [members, user, posts, communityBusinesses, securityResponders, isEmergency, emergencyPost, conversations]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return enrichedMembers;
    const q = searchQuery.toLowerCase();
    return enrichedMembers.filter(e => (e.member.name || '').toLowerCase().includes(q));
  }, [enrichedMembers, searchQuery]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (isEmergency) {
        // Emergency author first
        if (a.isEmergencyAuthor && !b.isEmergencyAuthor) return -1;
        if (!a.isEmergencyAuthor && b.isEmergencyAuthor) return 1;
        // Security responders next
        if (a.isSecurity && !b.isSecurity) return -1;
        if (!a.isSecurity && b.isSecurity) return 1;
      }
      // Members with unread messages float to top
      const aTotal = a.unread.direct + a.unread.listing + a.unread.notice + a.unread.marketplace;
      const bTotal = b.unread.direct + b.unread.listing + b.unread.notice + b.unread.marketplace;
      if (aTotal > 0 && bTotal === 0) return -1;
      if (aTotal === 0 && bTotal > 0) return 1;
      // Then by latest activity descending
      const aTime = typeof a.latestActivity === 'string' ? a.latestActivity : '';
      const bTime = typeof b.latestActivity === 'string' ? b.latestActivity : '';
      return bTime.localeCompare(aTime);
    });
  }, [filtered, isEmergency]);

  const openConversation = useCallback((conv: Conversation) => {
    setActiveConversation(conv.id);
    onSelectChat(conv);
  }, [setActiveConversation, onSelectChat]);

  const handleMemberTap = async (member: CommunityMember) => {
    if (!user) return;

    // During emergency, tapping security responders or the emergency author
    // opens the Emergency Hub group conversation instead of a direct chat
    if (isEmergency && emergencyPost && onOpenEmergencyHub) {
      const responderIds = new Set(securityResponders.map(r => r.user_id));
      const isMemberSecurity = member.isSecurityMember || responderIds.has(member.user_id);
      const isMemberEmergencyAuthor = emergencyPost.author_id === member.user_id;
      if (isMemberSecurity || isMemberEmergencyAuthor) {
        onOpenEmergencyHub(emergencyPost);
        return;
      }
    }

    try {
      const convId = await startConversation({
        participants: [user.uid, member.user_id],
        type: 'direct',
        communityId: currentCommunity?.id,
      });
      setActiveConversation(convId);
      const conv = conversations.find(c => c.id === convId);
      onSelectChat(conv || { id: convId, type: 'direct', participants: [user.uid, member.user_id], lastMessage: '', lastMessageAt: '', priority: 'normal' as const, unreadCount: {}, otherParticipant: { id: member.user_id, name: member.name || 'Member', profile_image: member.image } });
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-primary/15 text-primary';
      case 'Moderator': return 'bg-tertiary/15 text-tertiary';
      default: return 'bg-surface-container-high text-outline';
    }
  };

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full pt-4 pb-32 flex flex-col h-full">
      {/* Header Section */}
      <div className="px-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Community</h1>
          <span className="text-xs font-bold text-outline bg-surface-container-low px-3 py-1 rounded-full">
            {members.length} members
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center bg-surface-container-low rounded-2xl px-4 py-3 border border-outline-variant/10 focus-within:border-primary/30 transition-all">
          <Search className="w-5 h-5 text-outline mr-3" />
          <input
            className="bg-transparent border-none focus:ring-0 w-full text-on-surface placeholder:text-outline-variant text-sm font-medium"
            placeholder="Search members..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isEmergency && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-error/10 border border-error/20 rounded-xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error" />
            </span>
            <span className="text-xs font-bold text-error">Emergency Active — Security responders shown first</span>
          </div>
        )}
      </div>

      {/* Member List */}
      <div className="flex-1 overflow-y-auto px-2">
        {sorted.map(({ member, hasActivePost, hasBusiness, isSecurity, isEmergencyAuthor, emergencyDistance, summary, unread }) => (
          <motion.button
            key={member.user_id}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleMemberTap(member)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-left",
              isEmergencyAuthor
                ? "bg-error/5 border border-error/20"
                : "hover:bg-surface-container-low"
            )}
          >
            {/* Avatar with green ring */}
            <div className={cn(
              "relative w-11 h-11 rounded-full shrink-0",
              hasActivePost && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-surface"
            )}>
              {member.image ? (
                <img src={member.image} alt="" className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {(member.name || '?')[0].toUpperCase()}
                </div>
              )}
              {isSecurity && (
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center",
                  isEmergency ? "bg-error animate-pulse" : "bg-emerald-500"
                )}>
                  <Shield className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-bold text-sm truncate",
                  isEmergencyAuthor ? "text-error" : (isEmergency && isSecurity) ? "text-error animate-pulse" : "text-on-surface"
                )}>
                  {member.name || 'Community Member'}
                </span>
                {isEmergencyAuthor && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-error bg-error/10 px-1.5 py-0.5 rounded">
                    Alert
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                  roleBadgeClass(member.role)
                )}>
                  {member.role}
                </span>
                {hasBusiness && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 flex items-center gap-0.5">
                    <Store className="w-2.5 h-2.5" /> Biz
                  </span>
                )}
              </div>
              {summary && (
                <div className="flex items-center gap-1 mt-1">
                  <FileText className="w-2.5 h-2.5 text-outline" />
                  <span className="text-[10px] text-outline font-medium">{summary}</span>
                </div>
              )}
              {/* Contextual conversation badges — tappable to open that specific chat */}
              {(unread.listing > 0 || unread.notice > 0) && (
                <div className="flex items-center gap-1.5 mt-1">
                  {unread.listing > 0 && unread.listingConv && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); markAsRead(unread.listingConv!.id); openConversation(unread.listingConv!); }}
                      className="animate-pulse text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 flex items-center gap-0.5 cursor-pointer hover:bg-blue-500/25 transition-colors"
                    >
                      <Tag className="w-2.5 h-2.5" /> Listing
                    </span>
                  )}
                  {unread.notice > 0 && unread.noticeConv && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); markAsRead(unread.noticeConv!.id); openConversation(unread.noticeConv!); }}
                      className="animate-pulse text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-600 flex items-center gap-0.5 cursor-pointer hover:bg-amber-400/30 transition-colors"
                    >
                      <Siren className="w-2.5 h-2.5" /> Notice
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right side indicators — color-coded per type */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {/* Green: Direct member-to-member */}
              {unread.direct > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">
                  {unread.direct > 99 ? '99+' : unread.direct}
                </span>
              )}
              {/* Purple: Marketplace business chat */}
              {unread.marketplace > 0 && unread.marketplaceConv && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); markAsRead(unread.marketplaceConv!.id); openConversation(unread.marketplaceConv!); }}
                  className="min-w-[20px] h-5 px-1.5 rounded-full bg-purple-500 text-white text-[10px] font-black flex items-center justify-center cursor-pointer hover:bg-purple-600 transition-colors"
                >
                  <Store className="w-2.5 h-2.5 mr-0.5" />
                  {unread.marketplace > 99 ? '99+' : unread.marketplace}
                </span>
              )}
              {isEmergency && isSecurity && emergencyDistance != null && (
                <div className="flex items-center gap-1 text-error">
                  <Navigation className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">{emergencyDistance.toFixed(1)}km</span>
                </div>
              )}
            </div>
          </motion.button>
        ))}

        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-outline" />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-1">
              {searchQuery ? 'No members found' : 'No community members'}
            </h3>
            <p className="text-sm text-outline">
              {searchQuery
                ? `No members matching "${searchQuery}"`
                : 'Members will appear here once they join'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
};
