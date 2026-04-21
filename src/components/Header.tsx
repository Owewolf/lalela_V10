import React from 'react';
import { Bell, Shield, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { APP_LOGO_PATH } from '../constants';
import { cn } from '../lib/utils';

interface HeaderProps {
  onBack?: () => void;
  showBack?: boolean;
  title?: string;
  onToggleNotifications?: () => void;
  onOpenSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onBack, showBack, title, onToggleNotifications, onOpenSidebar }) => {
  const { currentCommunity, notifications } = useCommunity();
  const { user, userProfile } = useFirebase();

  const userRole = currentCommunity?.userRole || 'Member';
  const isLicensed = userProfile?.license_status === 'LICENSED';
  const isReadOnly = userProfile?.status === 'READ-ONLY' || (
    userProfile?.license_type === 'COMMUNITY_GRANTED' &&
    userProfile?.license_status === 'UNLICENSED' &&
    userProfile?.member_expiry_date &&
    (userProfile.member_expiry_date.toDate ? userProfile.member_expiry_date.toDate() : new Date(userProfile.member_expiry_date)) < new Date()
  );

  return (
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
              onClick={onOpenSidebar}
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

          <div className="flex items-center pl-4 border-l border-surface-container">
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
  );
};
