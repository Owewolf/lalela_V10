import React, { useState } from 'react';
import { Bell, Shield, ChevronDown, Plus, MapPin, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { APP_LOGO_ALT_PATH, APP_LOGO_PATH } from '../constants';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  onBack?: () => void;
  showBack?: boolean;
  title?: string;
  onToggleNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onBack, showBack, title, onToggleNotifications }) => {
  const { currentCommunity, communities, setCurrentCommunity, createCommunity, notifications } = useCommunity();
  const { user, userProfile } = useFirebase();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const userRole = currentCommunity?.userRole || 'Member';
  const isLicensed = userProfile?.license_status === 'LICENSED';
  const isReadOnly = userProfile?.status === 'READ-ONLY' || (
    userProfile?.license_type === 'COMMUNITY_GRANTED' &&
    userProfile?.license_status === 'UNLICENSED' &&
    userProfile?.member_expiry_date &&
    (userProfile.member_expiry_date.toDate ? userProfile.member_expiry_date.toDate() : new Date(userProfile.member_expiry_date)) < new Date()
  );
  
  const hasTrialCommunity = communities.some(c => c.owner_id === user?.uid && c.type === 'TRIAL');
  const canCreateNewCommunity = isLicensed && !hasTrialCommunity;

  return (
    <>
    <header className="bg-surface/70 backdrop-blur-xl sticky top-0 z-50 border-b border-surface-container h-20 flex items-center">
      <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto h-full">
        {/* Left Side: Logo & Community Info */}
        <div className="flex items-center gap-4">
          {showBack && onBack ? (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-surface-container-high rounded-full transition-all active:scale-95 text-primary"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center overflow-hidden hover:scale-105 active:scale-95 transition-all"
            >
              <img 
                src={APP_LOGO_PATH}
                alt="Lalela Logo" 
                className="w-8 h-8 object-contain"
                referrerPolicy="no-referrer"
              />
            </button>
          )}
          
          <div className="h-8 w-px bg-surface-container mx-1" />

          <div className="flex flex-col items-start">
            <h1 className="text-sm font-black text-primary tracking-tight font-headline line-clamp-1">
              {title || currentCommunity?.name || 'Select Community'}
            </h1>
            <div className="flex items-center gap-2">
              <span className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm border",
                currentCommunity?.type === 'LICENSED' 
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                  : "bg-amber-100 text-amber-700 border-amber-200"
              )}>
                {currentCommunity?.type === 'LICENSED' ? (
                  <>
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Licensed
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-2.5 h-2.5" />
                    Unlicensed
                  </>
                )}
              </span>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm",
                userRole === 'Admin' ? "bg-error/10 text-error" : userRole === 'Moderator' ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
              )}>
                {userRole}
              </div>
              {isReadOnly && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm border bg-red-100 text-red-700 border-red-200">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Read-Only
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Side: User Profile & Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleNotifications}
            className="relative p-2 rounded-full hover:bg-surface-container-high transition-colors"
          >
            <Bell className="w-6 h-6 text-primary" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface" />
            )}
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-surface-container">
            <div className="flex flex-col items-end mr-1">
              <span className="text-xs font-black text-primary leading-none">
                {userProfile?.name || 'User'}
              </span>
            </div>
            <div className={cn(
              "relative w-10 h-10 rounded-full p-0.5 shadow-md transition-all duration-300",
              isLicensed ? "bg-emerald-500" : "bg-error"
            )}>
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-surface bg-surface-container">
                <img 
                  src={userProfile?.profile_image || `https://picsum.photos/seed/${user?.uid}/100/100`} 
                  alt={userProfile?.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className={cn(
                "absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-surface shadow-sm",
                isLicensed ? "bg-emerald-500" : "bg-error"
              )}>
                <Shield className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Full-screen Community Switcher Overlay */}
    <AnimatePresence>
      {isSelectorOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSelectorOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
          />
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-6 right-6 max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-surface-container z-[100] overflow-hidden"
          >
            <div className="p-4 border-b border-surface-container bg-surface-container-low flex items-center justify-between">
              <span className="text-[10px] font-black text-outline uppercase tracking-widest">Switch Community</span>
              <button 
                onClick={() => {
                  if (canCreateNewCommunity) {
                    const name = prompt("Enter community name:");
                    if (name) createCommunity(name);
                  } else if (!isLicensed) {
                    alert("Purchase a platform license to become a paid member before creating additional communities.");
                  } else {
                    alert("License your current trial community before creating another.");
                  }
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  canCreateNewCommunity ? "text-primary hover:bg-primary/10" : "text-outline/30 cursor-not-allowed"
                )}
                title="Create New Community"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {communities.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCurrentCommunity(c.id);
                    setIsSelectorOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3.5 hover:bg-surface-container transition-all flex items-center justify-between group",
                    c.id === currentCommunity?.id && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center transition-colors",
                      c.id === currentCommunity?.id ? "bg-primary" : "bg-surface-container-high group-hover:bg-primary/10"
                    )}>
                      <img
                        src={c.id === currentCommunity?.id ? APP_LOGO_PATH : APP_LOGO_ALT_PATH}
                        alt="Lalela logo"
                        className="w-6 h-6 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "text-sm font-bold transition-colors leading-none",
                        c.id === currentCommunity?.id ? "text-primary" : "text-on-surface"
                      )}>{c.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border",
                          c.type === 'LICENSED' 
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        )}>
                          {c.type === 'LICENSED' ? (
                            <><ShieldCheck className="w-2 h-2" /> Licensed</>
                          ) : (
                            <><AlertCircle className="w-2 h-2" /> Unlicensed</>
                          )}
                        </span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest",
                          c.userRole === 'Admin' ? "bg-error/10 text-error" : c.userRole === 'Moderator' ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                        )}>
                          {c.userRole || 'Member'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {c.id === currentCommunity?.id && (
                    <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(13,61,71,0.5)]" />
                  )}
                </button>
              ))}
            </div>

            {!canCreateNewCommunity && (
              <div className="p-3 bg-amber-50 border-t border-amber-100">
                <p className="text-[9px] text-amber-700 font-bold leading-tight">
                  {!isLicensed
                    ? '* Become a paid platform member to create additional communities.'
                    : '* License your current trial community to unlock more spaces.'}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
};
