import React from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { useCommunity } from '../../context/CommunityContext';

interface CommunityAccessSectionProps {
  onNavigate: (communityId: string, role: string) => void;
}

export const CommunityAccessSection: React.FC<CommunityAccessSectionProps> = ({ onNavigate }) => {
  const { communities, setCurrentCommunity } = useCommunity();

  return (
    <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-primary">Community Access</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {communities.map((community) => (
          <button 
            key={community.id} 
            onClick={() => {
              setCurrentCommunity(community.id);
              onNavigate(community.id, community.userRole || 'Member');
            }}
            className="p-5 bg-surface-container-low rounded-3xl flex items-center justify-between group hover:bg-surface-container-high transition-all text-left border border-transparent hover:border-primary/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner">
                {community.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">{community.name}</p>
                <p className="text-[10px] text-outline uppercase font-black tracking-widest">{community.userRole || 'Member'}</p>
              </div>
            </div>
            <div className="p-2 text-outline group-hover:text-primary group-hover:translate-x-1 transition-all">
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
