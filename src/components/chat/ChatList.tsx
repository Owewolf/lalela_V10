import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Conversation } from '../../types';
import { useFirebase } from '../../context/FirebaseContext';
import { formatDistanceToNow } from 'date-fns';

interface ChatListProps {
  conversations: Conversation[];
  onSelect: (conversation: Conversation) => void;
  activeId?: string | null;
}

export const ChatList: React.FC<ChatListProps> = ({ conversations, onSelect, activeId }) => {
  const { user } = useFirebase();

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">💬</span>
        </div>
        <h3 className="text-lg font-bold text-on-surface mb-2">No conversations yet</h3>
        <p className="text-sm text-outline max-w-xs">
          Start a conversation from a listing, community post, or by messaging a member directly.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((conv) => {
        const unreadCount = conv.unreadCount[user?.uid || ''] || 0;
        const isEmergency = conv.type === 'emergency';
        const isListing = conv.type === 'listing';
        const isNotice = conv.type === 'notice';
        
        const title = conv.metadata?.title || conv.otherParticipant?.name || 'Conversation';
        const image = conv.metadata?.image || conv.otherParticipant?.profile_image || `https://picsum.photos/seed/${conv.id}/100/100`;

        return (
          <motion.div
            key={conv.id}
            onClick={() => onSelect(conv)}
            whileHover={{ backgroundColor: 'rgba(var(--primary-rgb), 0.03)' }}
            className={cn(
              "flex items-center gap-4 p-4 transition-all border-b border-outline-variant/10 cursor-pointer relative overflow-hidden",
              activeId === conv.id && "bg-primary/5",
              unreadCount > 0 && "bg-secondary-container/5"
            )}
          >
            {/* Active Indicator */}
            {activeId === conv.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            )}

            <div className="relative flex-shrink-0">
              <img 
                className={cn(
                  "w-14 h-14 rounded-2xl object-cover shadow-sm",
                  isEmergency && "ring-2 ring-error ring-offset-2"
                )} 
                src={image}
                alt={title}
                referrerPolicy="no-referrer"
              />
              {conv.otherParticipant && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <div className="flex items-center gap-2">
                  <h3 className={cn(
                    "font-bold text-base truncate",
                    unreadCount > 0 ? "text-on-surface" : "text-on-surface/80"
                  )}>
                    {title}
                  </h3>
                  {isEmergency && (
                    <span className="bg-error text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      Emergency
                    </span>
                  )}
                  {isListing && (
                    <span className="bg-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      Listing
                    </span>
                  )}
                  {isNotice && (
                    <span className="bg-tertiary text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      Notice
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-outline font-medium whitespace-nowrap ml-2">
                  {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                </span>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <p className={cn(
                  "text-sm truncate flex-1",
                  unreadCount > 0 ? "text-primary font-bold" : "text-outline"
                )}>
                  {conv.lastMessage}
                </p>
                {unreadCount > 0 && (
                  <div className="bg-secondary rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                    {unreadCount}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
