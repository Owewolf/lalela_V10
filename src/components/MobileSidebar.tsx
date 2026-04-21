import React, { useState } from 'react';
import {
  Home, FileText, MessageSquare, Store, Users, ChevronDown,
  ChevronRight, LogOut, LogIn, Plus, ShieldCheck, AlertCircle,
  X, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { APP_LOGO_PATH, APP_LOGO_ALT_PATH } from '../constants';
import { cn } from '../lib/utils';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenAdmin: (communityId: string, role: string) => void;
  onOpenSettings: () => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
  onOpenAdmin,
  onOpenSettings,
}) => {
  const { currentCommunity, communities, setCurrentCommunity, createCommunity } = useCommunity();
  const { user, userProfile, signOut } = useFirebase();
  const [communitiesExpanded, setCommunitiesExpanded] = useState(false);

  const isLicensed = userProfile?.license_status === 'LICENSED';
  const hasTrialCommunity = communities.some(c => c.owner_id === user?.uid && c.type === 'TRIAL');
  const canCreateNewCommunity = isLicensed && !hasTrialCommunity;

  const navItems = [
    { id: 'home',   label: 'Home',   icon: <Home className="w-5 h-5" /> },
    { id: 'posts',  label: 'Posts',  icon: <FileText className="w-5 h-5" /> },
    { id: 'chat',   label: 'Chat',   icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'market', label: 'Market', icon: <Store className="w-5 h-5" /> },
  ];

  const handleNavigate = (tab: string) => {
    onNavigate(tab);
    onClose();
  };

  const handleCommunitySelect = (communityId: string) => {
    setCurrentCommunity(communityId);
    setCommunitiesExpanded(false);
  };

  const handleCreateCommunity = () => {
    if (canCreateNewCommunity) {
      const name = prompt('Enter community name:');
      if (name) createCommunity(name);
    } else if (!isLicensed) {
      alert('Purchase a platform license to become a paid member before creating additional communities.');
    } else {
      alert('License your current trial community before creating another.');
    }
  };

  const handleOpenAdmin = () => {
    if (!currentCommunity) return;
    onOpenAdmin(currentCommunity.id, currentCommunity.userRole ?? 'Member');
    onClose();
  };

  const handleOpenSettings = () => {
    onOpenSettings();
    onClose();
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* Sidebar Panel */}
          <motion.div
            key="sidebar-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-surface z-[110] flex flex-col shadow-2xl"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 pt-12 pb-5 border-b border-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center overflow-hidden">
                  <img
                    src={APP_LOGO_PATH}
                    alt="Lalela"
                    className="w-7 h-7 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-base font-black text-primary tracking-tight font-headline">Menu</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-outline"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-3">

              {/* ── Section A: App Navigation ── */}
              <div className="px-3 mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-outline px-3 mb-1">Navigation</p>
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left',
                      activeTab === item.id
                        ? 'bg-primary/10 text-primary font-black'
                        : 'text-on-surface hover:bg-surface-container font-bold',
                    )}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="h-px bg-surface-container mx-5 my-2" />

              {/* ── Section B: Communities (Context Switcher) ── */}
              <div className="px-3 mb-2">
                <button
                  onClick={() => setCommunitiesExpanded(!communitiesExpanded)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-2xl hover:bg-surface-container transition-all"
                >
                  <div className="flex items-center gap-3 text-on-surface font-bold">
                    <Users className="w-5 h-5" />
                    <span className="text-sm">Communities</span>
                  </div>
                  <motion.div
                    animate={{ rotate: communitiesExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-outline" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {communitiesExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-3 pt-1 space-y-1">
                        {communities.map(c => (
                          <button
                            key={c.id}
                            onClick={() => handleCommunitySelect(c.id)}
                            className={cn(
                              'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                              c.id === currentCommunity?.id
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-surface-container text-on-surface',
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0',
                              c.id === currentCommunity?.id ? 'bg-primary' : 'bg-surface-container-high',
                            )}>
                              <img
                                src={c.id === currentCommunity?.id ? APP_LOGO_PATH : APP_LOGO_ALT_PATH}
                                alt=""
                                className="w-5 h-5 object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold truncate">{c.name}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={cn(
                                  'text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                                  c.type === 'LICENSED'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700',
                                )}>
                                  {c.type === 'LICENSED'
                                    ? <><ShieldCheck className="w-2 h-2" /> Licensed</>
                                    : <><AlertCircle className="w-2 h-2" /> Trial</>}
                                </span>
                                <span className={cn(
                                  'text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                                  c.userRole === 'Admin'
                                    ? 'bg-error/10 text-error'
                                    : c.userRole === 'Moderator'
                                      ? 'bg-secondary/10 text-secondary'
                                      : 'bg-primary/10 text-primary',
                                )}>
                                  {c.userRole ?? 'Member'}
                                </span>
                              </div>
                            </div>
                            {c.id === currentCommunity?.id && (
                              <div className="ml-auto w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </button>
                        ))}

                        {/* + Create Community */}
                        <button
                          onClick={handleCreateCommunity}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                            canCreateNewCommunity
                              ? 'text-primary hover:bg-primary/10'
                              : 'text-outline/40 cursor-not-allowed',
                          )}
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-xs font-black">+ Create Community</span>
                        </button>

                        {!canCreateNewCommunity && (
                          <p className="text-[8px] text-amber-700 font-bold px-3 pb-1 leading-tight">
                            {!isLicensed
                              ? '* Become a paid platform member to create additional communities.'
                              : '* License your current trial community to unlock more spaces.'}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Section C: Active Community Dashboard ── */}
              {currentCommunity && (
                <>
                  <div className="h-px bg-surface-container mx-5 my-2" />
                  <div className="px-3 mb-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-outline px-3 mb-1">Active Community</p>
                    <button
                      onClick={handleOpenAdmin}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-surface-container transition-all text-left group"
                    >
                      <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={APP_LOGO_PATH}
                          alt=""
                          className="w-6 h-6 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-primary truncate">{currentCommunity.name}</span>
                        <span className={cn(
                          'text-[8px] font-black uppercase tracking-widest',
                          currentCommunity.userRole === 'Admin'
                            ? 'text-error'
                            : currentCommunity.userRole === 'Moderator'
                              ? 'text-secondary'
                              : 'text-outline',
                        )}>
                          {currentCommunity.userRole ?? 'Member'} Dashboard
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-outline ml-auto group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ── Footer: Session Control + Auth ── */}
            <div className="border-t border-surface-container px-3 py-4 space-y-1">

              {/* Section D: Session Control — opens SettingsPage */}
              {user && (
                <button
                  onClick={handleOpenSettings}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-surface-container transition-all text-left"
                >
                  <div className={cn(
                    'relative w-10 h-10 rounded-full p-0.5 flex-shrink-0',
                    isLicensed ? 'bg-emerald-500' : 'bg-surface-container-high',
                  )}>
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-surface bg-surface-container">
                      <img
                        src={userProfile?.profile_image || `https://picsum.photos/seed/${user.uid}/100/100`}
                        alt={userProfile?.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-primary truncate">{userProfile?.name ?? 'User'}</span>
                      {isLicensed && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                    </div>
                    <span className="text-[9px] text-outline font-bold uppercase tracking-widest">Account &amp; Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-outline ml-auto flex-shrink-0" />
                </button>
              )}

              {/* Section E: Auth Actions */}
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-error hover:bg-error/5 transition-all font-bold"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm">Logout</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleNavigate('login')}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-primary hover:bg-primary/5 transition-all font-bold"
                  >
                    <LogIn className="w-5 h-5" />
                    <span className="text-sm">Login</span>
                  </button>
                  <button
                    onClick={handleCreateCommunity}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-primary hover:bg-primary/5 transition-all font-bold"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-sm">+ Create Community</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
