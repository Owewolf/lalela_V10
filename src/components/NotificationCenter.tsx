import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  Mail, 
  Shield, 
  AlertTriangle,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useCommunity } from '../context/CommunityContext';
import { cn } from '../lib/utils';
import { Timestamp } from 'firebase/firestore';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onAcknowledgeAlert?: (communityId: string, postData: any) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, onAcknowledgeAlert }) => {
  const { 
    notifications, 
    markNotificationAsRead, 
    deleteNotification,
    acceptInvitation,
    declineInvitation,
    setCurrentCommunity
  } = useCommunity();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleAction = async (e: React.MouseEvent, notification: any, action: 'accept' | 'decline') => {
    e.stopPropagation();
    if (notification.type === 'invitation' && notification.metadata?.invitationId) {
      try {
        if (action === 'accept') {
          await acceptInvitation(notification.metadata.invitationId);
        } else {
          await declineInvitation(notification.metadata.invitationId);
        }
      } catch (error) {
        console.error(`Failed to ${action} invitation:`, error);
      }
    }
  };

  const handleAcknowledgeAlert = async (e: React.MouseEvent, notification: any) => {
    e.stopPropagation();
    const meta = notification.metadata;
    if (!meta?.communityId) return;

    await markNotificationAsRead(notification.id);
    setCurrentCommunity(meta.communityId);

    if (onAcknowledgeAlert) {
      const postData = {
        id: meta.postId,
        title: meta.postTitle || 'Emergency',
        description: meta.postDescription || '',
        authorName: meta.authorName || 'Community Member',
        urgency: 'emergency',
        urgency_level: 'emergency',
        timestamp: new Date().toISOString(),
      };
      onAcknowledgeAlert(meta.communityId, postData);
    }

    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'invitation': return <Mail className="w-4 h-4 text-primary" />;
      case 'alert': return <AlertTriangle className="w-4 h-4 text-error" />;
      case 'system': return <Shield className="w-4 h-4 text-secondary" />;
      default: return <Bell className="w-4 h-4 text-outline" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-surface shadow-2xl z-[70] flex flex-col organic-pattern"
          >
            <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface/80 backdrop-blur-md sticky top-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell className="w-6 h-6 text-primary" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-primary font-headline">Notifications</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-outline" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all group relative",
                      notification.read 
                        ? "bg-surface-container-lowest border-outline-variant/5 opacity-75" 
                        : "bg-white border-primary/20 shadow-sm ring-1 ring-primary/5"
                    )}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        notification.read ? "bg-surface-container-low" : "bg-primary/10"
                      )}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className={cn(
                            "text-sm font-bold truncate",
                            notification.read ? "text-on-surface-variant" : "text-on-surface"
                          )}>
                            {notification.title}
                          </h4>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error rounded-md transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                          {notification.message}
                        </p>
                        
                        {notification.type === 'invitation' && !notification.read && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleAction(e, notification, 'accept')}
                              className="flex-1 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Accept
                            </button>
                            <button
                              onClick={(e) => handleAction(e, notification, 'decline')}
                              className="flex-1 py-2 bg-surface-container-high text-outline text-[10px] font-black uppercase tracking-widest rounded-lg active:scale-95 transition-all flex items-center justify-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Decline
                            </button>
                          </div>
                        )}

                        {notification.type === 'alert' && !notification.read && notification.metadata?.communityId && (
                          <button
                            onClick={(e) => handleAcknowledgeAlert(e, notification)}
                            className="w-full py-2.5 bg-error text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 animate-pulse"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Acknowledge &amp; Open Emergency Hub
                          </button>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-outline uppercase">
                          <Clock className="w-3 h-3" />
                          {notification.created_at instanceof Timestamp 
                            ? notification.created_at.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Just now'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-outline/30" />
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-1">All caught up!</h3>
                  <p className="text-sm text-on-surface-variant">No new notifications at the moment.</p>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/10">
                <button 
                  className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-outline hover:text-primary transition-colors"
                  onClick={() => notifications.forEach(n => markNotificationAsRead(n.id))}
                >
                  Mark all as read
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
