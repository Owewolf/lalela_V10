import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useFirebase } from '../context/FirebaseContext';
import { useCommunity } from '../context/CommunityContext';
import { cn } from '../lib/utils';
import { ProfileSection } from './account/ProfileSection';
import { SecuritySection } from './account/SecuritySection';
import { SessionsSection } from './account/SessionsSection';
import { LicensingSection } from './account/LicensingSection';
import { AuditLogsSection } from './account/AuditLogsSection';
import { DangerZoneSection } from './account/DangerZoneSection';

interface AccountSecurityPageProps {
  onBack: () => void;
  onNavigateToCommunityDashboard: (communityId: string, role: string) => void;
  initialEditProfile?: boolean;
}

export const AccountSecurityPage: React.FC<AccountSecurityPageProps> = ({ 
  onBack, 
  onNavigateToCommunityDashboard,
  initialEditProfile = false
}) => {
  const { userProfile } = useFirebase();

  return (
    <main className="min-h-screen bg-surface pb-32">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Sections */}
        <div className="grid grid-cols-1 gap-8">
          <ProfileSection initialEdit={initialEditProfile} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SecuritySection />
            <SessionsSection />
          </div>

          <LicensingSection onNavigate={onNavigateToCommunityDashboard} />
          
          <AuditLogsSection />

          <DangerZoneSection />
        </div>
      </div>
    </main>
  );
};
