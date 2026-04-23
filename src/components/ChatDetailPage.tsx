import React, { useEffect, useMemo } from 'react';
import { ArrowLeft, Shield, Store, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { Conversation } from '../types';
import { cn } from '../lib/utils';
import { ChatWindow } from './chat/ChatWindow';
import { ChatComposer } from './chat/ChatComposer';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';

interface ChatDetailPageProps {
  chat: Conversation;
  onBack: () => void;
}

export const ChatDetailPage: React.FC<ChatDetailPageProps> = ({ chat, onBack }) => {
  const { userProfile } = useFirebase();
  const isChatDisabled = userProfile?.status === 'READ-ONLY' || (
    userProfile?.license_type === 'COMMUNITY_GRANTED' &&
    userProfile?.license_status === 'UNLICENSED' &&
    userProfile?.member_expiry_date &&
    (userProfile.member_expiry_date.toDate ? userProfile.member_expiry_date.toDate() : new Date(userProfile.member_expiry_date)) < new Date()
  );
  const { messages, sendMessage, setTypingStatus, isTyping, markAsRead, members, posts, communityBusinesses, currentCommunity } = useCommunity();

  useEffect(() => {
    markAsRead(chat.id);
  }, [chat.id]);

  const otherId = chat.otherParticipant?.id || chat.participants?.find(p => p !== chat.participants?.[0]);
  const member = useMemo(() => members.find(m => m.user_id === otherId), [members, otherId]);

  const memberPosts = useMemo(() => {
    if (!otherId) return [];
    return posts.filter(p => p.author_id === otherId);
  }, [posts, otherId]);

  const hasBusiness = useMemo(
    () => otherId ? communityBusinesses.some(b => b.owner_id === otherId) : false,
    [communityBusinesses, otherId]
  );

  const isEmergency = !!currentCommunity?.isEmergencyMode;
  const isSecurity = member?.isSecurityMember;

  const name = member?.name || chat.otherParticipant?.name || chat.metadata?.title || 'Conversation';
  const image = member?.image || chat.otherParticipant?.profile_image || chat.metadata?.image;
  const role = member?.role || 'Member';
  const composerOverlayClass = "fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]";

  const roleBadgeClass = (r: string) => {
    switch (r) {
      case 'Admin': return 'bg-primary/15 text-primary';
      case 'Moderator': return 'bg-tertiary/15 text-tertiary';
      default: return 'bg-surface-container-high text-outline';
    }
  };

  const summaryParts: string[] = [];
  if (memberPosts.length > 0) {
    const listings = memberPosts.filter(p => p.type === 'listing').length;
    const notices = memberPosts.filter(p => p.type === 'notice').length;
    if (listings > 0) summaryParts.push(`${listings} listing${listings > 1 ? 's' : ''}`);
    if (notices > 0) summaryParts.push(`${notices} notice${notices > 1 ? 's' : ''}`);
  }
  if (hasBusiness) summaryParts.push('Business owner');
  if (isSecurity) summaryParts.push('Security');

  return (
    <div className="flex flex-col h-dvh bg-surface african-pattern overflow-hidden">
      <main className="flex-1 flex flex-col min-h-0 relative">
        {/* Profile Header */}
        <div className="bg-surface border-b border-outline-variant/10 safe-area-top">
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-surface-container-low transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-on-surface" />
            </motion.button>

            {/* Large Avatar */}
            <div className="relative shrink-0">
              {image ? (
                <img src={image} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {(name)[0].toUpperCase()}
                </div>
              )}
              {isSecurity && (
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center",
                  isEmergency ? "bg-error animate-pulse" : "bg-emerald-500"
                )}>
                  <Shield className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-on-surface text-base truncate leading-tight">{name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                  roleBadgeClass(role)
                )}>
                  {role}
                </span>
                {hasBusiness && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 flex items-center gap-0.5">
                    <Store className="w-2.5 h-2.5" /> Biz
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Summary bar */}
          {summaryParts.length > 0 && (
            <div className="flex items-center gap-1.5 px-4 pb-2">
              <FileText className="w-3 h-3 text-outline" />
              <span className="text-[11px] text-outline font-medium">{summaryParts.join(' \u00B7 ')}</span>
            </div>
          )}
        </div>

        {/* Contextual Item Header */}
        {chat.metadata && chat.metadata.title && (
          <div className="px-4 py-3 bg-surface-container-low/50 backdrop-blur-sm border-b border-outline-variant/10">
            <div className="flex items-center gap-3">
              {/* Author avatar */}
              {chat.metadata.authorImage && (
                <img src={chat.metadata.authorImage} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {/* Type badge */}
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                    chat.metadata.type === 'listing' ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                  )}>
                    {chat.metadata.type === 'listing' ? 'Listing' : 'Notice'}
                  </span>
                  {chat.metadata.author && (
                    <span className="text-[10px] font-bold text-outline truncate">{chat.metadata.author}</span>
                  )}
                </div>
                <p className="text-xs font-bold text-on-surface truncate">{chat.metadata.title}</p>
                {chat.metadata.description && (
                  <p className="text-[10px] text-outline mt-0.5 line-clamp-1">{chat.metadata.description}</p>
                )}
              </div>
              {chat.metadata.price && (
                <p className="text-sm font-black text-primary whitespace-nowrap shrink-0">{chat.metadata.price}</p>
              )}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <ChatWindow 
          messages={messages} 
          conversation={chat} 
          isTyping={isTyping}
        />

        {/* Composer */}
        <ChatComposer 
          onSend={(text) => sendMessage(text)}
          onTyping={(typing) => setTypingStatus(chat.id, typing)}
          placeholder={chat.type === 'emergency' ? "Send emergency update..." : "Type a message..."}
          disabled={!!isChatDisabled}
          containerClassName={composerOverlayClass}
        />
      </main>
    </div>
  );
};
