import React from 'react';
import { CreditCard, ShieldCheck, ShieldAlert, Zap, Calendar, ArrowRight, Users, Star } from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';
import { useCommunity } from '../../context/CommunityContext';
import { Timestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { accountService } from '../../services/accountService';

interface LicensingSectionProps {
  onNavigate: (communityId: string, role: string) => void;
}

export const LicensingSection: React.FC<LicensingSectionProps> = ({ onNavigate }) => {
  const { userProfile } = useFirebase();
  const { communities, licenseCommunity, setCurrentCommunity } = useCommunity();

  const isOverallLicensed = communities.some(c => c.type === 'LICENSED');
  const isExpiredInvitedMember = userProfile?.license_type === 'COMMUNITY_GRANTED' &&
    userProfile?.license_status === 'UNLICENSED' &&
    userProfile?.member_expiry_date &&
    (userProfile.member_expiry_date.toDate ? userProfile.member_expiry_date.toDate() : new Date(userProfile.member_expiry_date)) < new Date();
  const overallStatus = isExpiredInvitedMember ? 'Expired Member' : isOverallLicensed ? 'Licensed Platform Member' : 'Trial Platform User';

  const handleAction = async (community: any) => {
    if (community.type === 'TRIAL') {
      try {
        const { url } = await accountService.createCheckoutSession('community', community.id);
        window.location.href = url;
      } catch (error) {
        console.error('Failed to initialize checkout:', error);
      }
    } else {
      setCurrentCommunity(community.id);
      onNavigate(community.id, community.userRole || 'Member');
    }
  };

  const getCommunityStatus = (community: any) => {
    const now = new Date();
    const trialEndDate = community.trial_end_date instanceof Date 
      ? community.trial_end_date 
      : (community.trial_end_date instanceof Timestamp ? community.trial_end_date.toDate() : new Date(community.trial_end_date));
    
    if (community.type === 'LICENSED') return { label: 'Licensed', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    if (trialEndDate < now) return { label: 'Expired', color: 'text-error', bg: 'bg-error/10' };
    return { label: 'Trial', color: 'text-amber-500', bg: 'bg-amber-500/10' };
  };

  return (
    <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-primary">Licensing & Access</h3>
        </div>
        <div className={cn(
          "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
          isOverallLicensed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-amber-500/10 border-amber-500/20 text-amber-600"
        )}>
          {overallStatus}
        </div>
      </div>

      {isExpiredInvitedMember && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-3xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-500 flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div>
              <h4 className="text-sm font-bold text-red-700">Membership Expired</h4>
              <p className="text-xs text-red-600 mt-1">Your community-granted membership trial has expired. You are currently in read-only mode. Pay R149 once-off for lifetime membership to regain full access.</p>
            </div>
            <div>
              <button 
                onClick={async () => {
                  try {
                    const { url } = await accountService.createCheckoutSession('membership');
                    window.location.href = url;
                  } catch (error) {
                    console.error('Failed to initialize checkout:', error);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
              >
                Upgrade Membership (R149)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-[10px] font-black text-outline uppercase tracking-widest">Community Status & Roles</label>
        <div className="grid grid-cols-1 gap-4">
          {communities.map((community) => {
            const status = getCommunityStatus(community);
            return (
              <div 
                key={community.id}
                className="p-5 bg-surface-container-low rounded-3xl border border-outline-variant/5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-primary/10 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner">
                    {community.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">{community.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider", status.bg, status.color)}>
                        {status.label}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-outline/20" />
                      <span className="text-[10px] font-bold text-outline">Role: {community.userRole || 'Member'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {community.type === 'TRIAL' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-xl border border-white text-[10px] font-bold text-outline">
                      <Calendar className="w-3.5 h-3.5" />
                      Ends: {community.trial_end_date instanceof Date 
                        ? community.trial_end_date.toLocaleDateString() 
                        : (community.trial_end_date instanceof Timestamp ? community.trial_end_date.toDate().toLocaleDateString() : 'N/A')}
                    </div>
                  )}
                  
                  {community.type === 'TRIAL' ? (
                    <>
                      {status.label !== 'Expired' && (
                        <button 
                          onClick={() => {
                            setCurrentCommunity(community.id);
                            onNavigate(community.id, community.userRole || 'Member');
                          }}
                          className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95"
                        >
                          Manage
                        </button>
                      )}
                      <button 
                        onClick={() => handleAction(community)}
                        className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
                      >
                        Upgrade (R349)
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        setCurrentCommunity(community.id);
                        onNavigate(community.id, community.userRole || 'Member');
                      }}
                      className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      Manage
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
};
