import React from 'react';
import ReactDOM from 'react-dom';
import { 
  LayoutDashboard, 
  Gavel, 
  HeartHandshake, 
  Map, 
  Shield, 
  Users, 
  LogOut, 
  Search, 
  Bell, 
  Settings, 
  Megaphone, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowLeft,
  Droplets,
  UserPlus,
  CreditCard,
  Flag,
  History,
  X,
  Save,
  Activity,
  MapPin,
  Locate,
  Loader2,
  Siren,
  Navigation,
  CheckCircle2
} from 'lucide-react';
import { APP_LOGO_PATH } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleMap, Circle } from '@react-google-maps/api';

import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useCommunity } from '../context/CommunityContext';
import { useFirebase } from '../context/FirebaseContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { cn } from '../lib/utils';

import { ModerationCenter, ModerationCenterHandle } from './ModerationCenter';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  console.error(`Firestore ${operationType} error at ${path}:`, error);
}

interface AdminDashboardProps {
  onBack: () => void;
  onManageCharity?: () => void;
  initialView?: 'dashboard' | 'moderation' | 'members';
  readOnly?: boolean;
  guidedSetup?: boolean;
  onSetupComplete?: () => void;
}

const SETUP_STEPS = [
  { id: 'coverage', label: 'Coverage Area', description: 'Define your community\'s geographic scope', icon: Map },
  { id: 'categories', label: 'Categories', description: 'Select which business categories are visible', icon: Settings },
  { id: 'businesses', label: 'Import Businesses', description: 'Add local businesses to your community', icon: CreditCard },
  { id: 'invitations', label: 'Invite Members', description: 'Invite users and assign roles', icon: UserPlus },
  { id: 'rules', label: 'Community Rules', description: 'Set posting limits and access controls', icon: Settings },
] as const;

type SetupStepId = typeof SETUP_STEPS[number]['id'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
 
  onBack, 
  onManageCharity,
  initialView = 'dashboard',
  readOnly = false,
  guidedSetup = false,
  onSetupComplete,
}) => {
    const modalRoot = typeof document !== 'undefined' ? document.body : null;
  const { user, userProfile, updateUserProfile } = useFirebase();
  const { currentCommunity, updateCommunityCoverage, posts, members, securityResponders } = useCommunity();
  const [activeView, setActiveView] = React.useState<'dashboard' | 'moderation' | 'members'>(
    readOnly ? 'dashboard' : initialView
  );
  const [moderationTab, setModerationTab] = React.useState<any>('members');

  React.useEffect(() => {
    if (!readOnly && initialView) {
      setActiveView(initialView);
    }
  }, [initialView, readOnly]);

  const [memberCount, setMemberCount] = React.useState(0);
  const [totalCharityRaised, setTotalCharityRaised] = React.useState(0);
  const [activeAlertsCount, setActiveAlertsCount] = React.useState(0);
  const [recentActivities, setRecentActivities] = React.useState<any[]>([]);
  const [charities, setCharities] = React.useState<any[]>([]);
  const [systemUptime, setSystemUptime] = React.useState(99.9);
  const [securityThreats, setSecurityThreats] = React.useState(0);
  const [activeVolunteersCount, setActiveVolunteersCount] = React.useState(0);
  const [isSuggestingCharity, setIsSuggestingCharity] = React.useState(false);
  const [suggestionError, setSuggestionError] = React.useState('');
  const { addCharitySuggestion } = useCommunity();

  // Guided setup state
  const [setupStepIndex, setSetupStepIndex] = React.useState(0);
  const [completedSetupSteps, setCompletedSetupSteps] = React.useState<Set<SetupStepId>>(new Set());
  const [showSetupComplete, setShowSetupComplete] = React.useState(false);

  const moderationRef = React.useRef<ModerationCenterHandle>(null);

  // Navigate the dashboard to the view/tab for a given setup step
  const navigateToStep = (stepId: SetupStepId) => {
    if (stepId === 'coverage') { setModerationTab('coverage'); setActiveView('moderation'); }
    else if (stepId === 'categories') { setModerationTab('categories'); setActiveView('moderation'); }
    else if (stepId === 'businesses') { setModerationTab('businesses'); setActiveView('moderation'); }
    else if (stepId === 'invitations') { setActiveView('members'); }
    else if (stepId === 'rules') { setModerationTab('rules'); setActiveView('moderation'); }
  };

  // Save current tab content before marking step complete
  const handleDone = async () => {
    try {
      await moderationRef.current?.saveCurrentTab();
    } catch (err) {
      console.error('Failed to save step content:', err);
    }
    markSetupStepComplete(currentSetupStep.id);
  };

  // Auto-start: navigate to the first incomplete step on mount
  React.useEffect(() => {
    if (!guidedSetup) return;
    const firstIncomplete = SETUP_STEPS.findIndex(s => !completedSetupSteps.has(s.id));
    if (firstIncomplete !== -1) {
      setSetupStepIndex(firstIncomplete);
      navigateToStep(SETUP_STEPS[firstIncomplete].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guidedSetup]);

  // Initialize completed steps from community data
  React.useEffect(() => {
    if (currentCommunity?.onboarding_steps_completed) {
      setCompletedSetupSteps(new Set(currentCommunity.onboarding_steps_completed as SetupStepId[]));
    }
  }, [currentCommunity?.onboarding_steps_completed]);

  const currentSetupStep = SETUP_STEPS[setupStepIndex];

  const markSetupStepComplete = async (stepId: SetupStepId) => {
    const updated = new Set(completedSetupSteps);
    updated.add(stepId);
    setCompletedSetupSteps(updated);

    // Persist to community doc
    if (currentCommunity?.id) {
      try {
        const { doc: firestoreDoc, setDoc } = await import('firebase/firestore');
        await setDoc(firestoreDoc(db, 'communities', currentCommunity.id), {
          onboarding_steps_completed: Array.from(updated)
        }, { merge: true });
      } catch (err) {
        console.error('Failed to save setup step:', err);
      }
    }

    // Check if all steps are complete
    if (updated.size >= SETUP_STEPS.length) {
      setShowSetupComplete(true);
    } else {
      // Auto-advance to the next incomplete step
      const nextIdx = SETUP_STEPS.findIndex((s, i) => i > setupStepIndex && !updated.has(s.id));
      if (nextIdx !== -1) {
        setSetupStepIndex(nextIdx);
        navigateToStep(SETUP_STEPS[nextIdx].id);
      }
    }
  };

  const handleFinishSetup = async () => {
    if (currentCommunity?.id) {
      try {
        const { doc: firestoreDoc, setDoc } = await import('firebase/firestore');
        await setDoc(firestoreDoc(db, 'communities', currentCommunity.id), {
          guided_setup_required: false,
        }, { merge: true });
      } catch (err) {
        console.error('Failed to finalize guided setup state:', err);
      }
    }

    try {
      await updateUserProfile({ onboarding_completed: true } as any);
    } catch (err) {
      console.error('Failed to mark onboarding complete:', err);
    }
    setShowSetupComplete(false);
    onSetupComplete?.();
  };

  const { isLoaded } = useGoogleMaps();

  React.useEffect(() => {
    if (!currentCommunity?.id) return;

    const communityId = currentCommunity.id;

    // 1. Fetch Member Count and Active Volunteers
    const membersQuery = collection(db, 'communities', communityId, 'members');
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      setMemberCount(snapshot.size);
      const volunteers = snapshot.docs.filter(doc => {
        const role = doc.data().role;
        return role === 'Liaison' || role === 'Moderator';
      });
      setActiveVolunteersCount(volunteers.length);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `communities/${communityId}/members`));

    // 3. Fetch Charity Total
    const charitiesQuery = collection(db, 'communities', communityId, 'charities');
    const unsubscribeCharities = onSnapshot(charitiesQuery, (snapshot) => {
      let total = 0;
      const charitiesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      charitiesList.forEach((charity: any) => {
        total += (charity.totalRaised || 0);
      });
      setTotalCharityRaised(total);
      setCharities(charitiesList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `communities/${communityId}/charities`));

    // 4. Fetch Active Alerts
    let unsubscribeAlerts: (() => void) | null = null;
    if (!readOnly) {
      const alertsQuery = query(
        collection(db, 'communities', communityId, 'security_events'),
        where('resolved', '==', false)
      );
      unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
        setActiveAlertsCount(snapshot.size);
      }, (error) => handleFirestoreError(error, OperationType.LIST, `communities/${communityId}/security_events`));
    }

    // 5. Fetch Recent Activities (Moderation Logs)
    let unsubscribeLogs: (() => void) | null = null;
    if (!readOnly) {
      const logsQuery = query(
        collection(db, 'communities', communityId, 'moderation_logs'),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
        const logs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: `${data.action.charAt(0).toUpperCase() + data.action.slice(1)} Action`,
            subtitle: `${data.target_type} • ${data.reason || 'No reason provided'}`,
            time: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : 'Just now',
            icon: data.action === 'approve' ? UserPlus : Flag,
            bg: data.action === 'approve' ? 'bg-tertiary-fixed' : 'bg-error-container',
            text: data.action === 'approve' ? 'text-on-tertiary-fixed' : 'text-on-error-container'
          };
        });
        setRecentActivities(logs);
      }, (error) => handleFirestoreError(error, OperationType.LIST, `communities/${communityId}/moderation_logs`));
    }

    // 6. Fetch System Metrics (Uptime)
    let unsubscribeMetrics: (() => void) | null = null;
    if (!readOnly) {
      const metricsQuery = query(
        collection(db, 'communities', communityId, 'system_metrics'),
        where('type', '==', 'uptime'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      unsubscribeMetrics = onSnapshot(metricsQuery, (snapshot) => {
        if (!snapshot.empty) {
          setSystemUptime(snapshot.docs[0].data().value);
        }
      }, (error) => handleFirestoreError(error, OperationType.LIST, `communities/${communityId}/system_metrics`));
    }

    // 7. Fetch Security Events (Threats)
    let unsubscribeSecurity: (() => void) | null = null;
    if (!readOnly) {
      const securityQuery = query(
        collection(db, 'communities', communityId, 'security_events'),
        where('severity', 'in', ['high', 'critical']),
        where('status', '==', 'active')
      );
      unsubscribeSecurity = onSnapshot(securityQuery, (snapshot) => {
        setSecurityThreats(snapshot.size);
      }, (error) => handleFirestoreError(error, OperationType.LIST, `communities/${communityId}/security_events`));
    }

    return () => {
      unsubscribeMembers();
      unsubscribeCharities();
      if (unsubscribeAlerts) unsubscribeAlerts();
      if (unsubscribeLogs) unsubscribeLogs();
      if (unsubscribeMetrics) unsubscribeMetrics();
      if (unsubscribeSecurity) unsubscribeSecurity();
    };
  }, [currentCommunity?.id]);

  React.useEffect(() => {
    if (currentCommunity?.coverageArea) {
      // No longer needed here as it's moved to ModerationCenter
    }
  }, [currentCommunity?.coverageArea]);

  const stats = [
    { label: 'Active Users', value: memberCount.toLocaleString(), trend: '+0%', icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Total Charity', value: `R${totalCharityRaised.toLocaleString()}`, icon: HeartHandshake, color: 'text-on-tertiary-container' },
    { label: 'Active Alerts', value: activeAlertsCount.toString(), icon: Bell, color: 'text-error', pulse: activeAlertsCount > 0 },
  ];

  const activities = recentActivities.length > 0 ? recentActivities : [
    { id: 'no-activity', title: 'No recent activity', subtitle: 'System is quiet', time: 'NOW', icon: History, bg: 'bg-surface-container-low', text: 'text-outline' }
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row organic-pattern">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-container-low border-r border-outline-variant/10 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-surface-container-high rounded-full transition-colors text-primary group"
            title="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <img
            src={APP_LOGO_PATH}
            alt="Lalela logo"
            className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-primary/20"
            referrerPolicy="no-referrer"
          />
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', active: activeView === 'dashboard', onClick: () => setActiveView('dashboard') },
            ...(!readOnly ? [
              { id: 'moderation', icon: Gavel, label: 'Moderation', active: activeView === 'moderation', onClick: () => { setModerationTab('members'); setActiveView('moderation'); } },
              { id: 'members', icon: Users, label: 'Members', active: activeView === 'members', onClick: () => setActiveView('members') },
              { id: 'charity', icon: HeartHandshake, label: 'Charity', onClick: onManageCharity },
              { id: 'security', icon: Shield, label: 'Security' },
            ] : [])
          ].map((item, idx) => (
            <button 
              key={idx}
              onClick={item.onClick}
              className={cn(
                "w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-300 font-medium text-sm",
                item.active 
                  ? "bg-surface-container-lowest text-primary shadow-sm border-l-4 border-secondary" 
                  : "text-on-surface-variant hover:bg-surface-container-highest/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-outline-variant/10">
          <div className="p-4 rounded-xl bg-surface-container-lowest text-[10px] font-bold text-primary flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SYSTEM STATUS: HEALTHY
          </div>
          <button 
            onClick={onBack}
            className="w-full flex items-center gap-3 py-3 px-4 text-error font-bold text-sm hover:bg-error/5 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Exit Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Dashboard Content */}
        <div className="p-6 lg:p-12 space-y-12 max-w-7xl mx-auto w-full">
          {activeView === 'dashboard' ? (
            <>
              {/* Hero Section */}
              <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                <div className="max-w-2xl">
                  <h1 className="text-4xl font-headline font-black text-primary mb-4">Admin Control Center</h1>
                  <p className="text-lg text-on-surface-variant leading-relaxed">
                    Real-time oversight and governance for the {currentCommunity?.name || 'Community'} platform.
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between h-32 shadow-sm border border-outline-variant/5"
                  >
                    <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-headline font-extrabold text-primary">{stat.value}</span>
                      {stat.trend ? (
                        <span className={cn("text-xs font-bold flex items-center gap-1", stat.color)}>
                          <stat.icon className="w-3 h-3" /> {stat.trend}
                        </span>
                      ) : (
                        <div className={cn("relative", stat.color)}>
                          <stat.icon className="w-5 h-5 opacity-40" />
                          {stat.pulse && <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-error animate-ping" />}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Management Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Moderation Center */}
                <div 
                  onClick={() => !readOnly && setActiveView('moderation')}
                  className={cn(
                    "md:col-span-2 bg-surface-container-lowest rounded-3xl p-8 flex flex-col justify-between group border border-outline-variant/10 shadow-sm transition-all",
                    !readOnly ? "cursor-pointer hover:bg-surface-bright hover:shadow-lg hover:shadow-primary/5" : "opacity-75"
                  )}
                >
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
                        <Gavel className="w-6 h-6" />
                      </div>
                      {!readOnly && <ArrowUpRight className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />}
                    </div>
                    <h3 className="text-2xl font-headline font-bold text-primary mb-2">Moderation Center</h3>
                    <p className="text-on-surface-variant">
                      {readOnly ? 'Community moderation is managed by authorized administrators.' : 'Review and manage community listings and alerts.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mt-8">
                    <div className="bg-surface-container-low p-4 rounded-xl">
                      <p className="text-[10px] uppercase font-bold tracking-tighter text-outline mb-1">Active Alerts</p>
                      <p className="text-xl font-bold text-error">{activeAlertsCount}</p>
                    </div>
                  </div>
                </div>

                {/* Coverage Area */}
                <div 
                  onClick={() => {
                    if (!readOnly) {
                      setModerationTab('coverage');
                      setActiveView('moderation');
                    }
                  }}
                  className={cn(
                    "md:col-span-1 bg-surface-container-lowest rounded-3xl flex flex-col border border-outline-variant/10 relative overflow-hidden group shadow-sm transition-all hover:shadow-lg hover:shadow-primary/5",
                    !readOnly && "cursor-pointer hover:bg-surface-bright"
                  )}
                >
                  <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                        <Map className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                        {currentCommunity?.coverageArea?.location_name ? 'Synced' : 'Default'}
                      </span>
                    </div>
                    <h3 className="text-xl font-headline font-bold text-primary mb-1">Coverage Area</h3>
                    <p className="text-xs text-on-surface-variant font-medium truncate">
                      {currentCommunity?.coverageArea?.location_name || 'Active Monitoring Zone'}
                    </p>
                  </div>
                  <div className="flex-1 min-h-[140px] bg-surface-container-highest relative overflow-hidden">
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerClassName="w-full h-full grayscale opacity-50 transition-all group-hover:grayscale-0 group-hover:opacity-100"
                        center={{
                          lat: currentCommunity?.coverageArea?.latitude || -26.2041,
                          lng: currentCommunity?.coverageArea?.longitude || 28.0473
                        }}
                        zoom={11}
                        options={{
                          disableDefaultUI: true,
                          clickableIcons: false,
                          gestureHandling: 'none',
                        }}
                      >
                        <Circle
                          center={{
                            lat: currentCommunity?.coverageArea?.latitude || -26.2041,
                            lng: currentCommunity?.coverageArea?.longitude || 28.0473
                          }}
                          radius={(currentCommunity?.coverageArea?.radius || 10) * 1000}
                          options={{
                            fillColor: '#6750A4',
                            fillOpacity: 0.2,
                            strokeColor: '#6750A4',
                            strokeOpacity: 0.5,
                            strokeWeight: 2,
                          }}
                        />
                      </GoogleMap>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                        <Loader2 className="w-6 h-6 text-outline animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-surface-container-low flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                    <span>Radius: {currentCommunity?.coverageArea?.radius || 10}km</span>
                    <span>Sync: Just now</span>
                  </div>
                </div>

              </div>

              {/* Expanded Charity Hub */}
              {(() => {
                const availableCharities = charities.filter(c => c.status !== 'Archived');
                const featuredCharity = availableCharities.find(c => c.isFeatured) || (availableCharities.length === 1 ? availableCharities[0] : undefined);
                const otherCharities = charities.filter(c => c !== featuredCharity && (c.totalRaised || 0) > 0);
                
                // chart logic: map charities that have total raised > 0.
                const chartData = charities.filter(c => (c.totalRaised || 0) > 0).slice(0, 10);
                const maxRaised = Math.max(...chartData.map(c => c.totalRaised || 0), 1);

                return (
                  <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm space-y-8 mb-12">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center text-primary-fixed">
                          <HeartHandshake className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-headline font-bold text-primary">Charity Hub</h3>
                          <p className="text-sm text-on-surface-variant">Community-driven support for rural upliftment projects.</p>
                        </div>
                      </div>
                      {!readOnly ? (
                        <button 
                          onClick={onManageCharity}
                          className="px-4 py-2 bg-primary text-white rounded-full font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 w-fit"
                        >
                          <Settings className="w-4 h-4" /> Manage Funds
                        </button>
                      ) : (
                        <button 
                          onClick={() => { setSuggestionError(''); setIsSuggestingCharity(true); }}
                          className="px-4 py-2 bg-primary text-white rounded-full font-bold text-sm hover:opacity-90 transition-opacity w-fit"
                        >
                          Suggest Charity
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Featured Charity */}
                      {featuredCharity ? (() => {
                        const totalRaised = featuredCharity.totalRaised || 0;
                        const goal = featuredCharity.fundraisingGoal || 1;
                        const progress = Math.min(Math.max((totalRaised / goal) * 100, 0) || 0, 100);
                        return (
                          <div className="bg-primary text-white rounded-3xl p-6 relative overflow-hidden flex flex-col shadow-xl">
                            <div className="absolute inset-0 opacity-10 pointer-events-none african-pattern" />
                            <div className="relative z-10 flex-1 flex flex-col">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <span className="text-[10px] uppercase font-bold tracking-widest text-primary-fixed-dim/70 mb-1 block">Current Initiative</span>
                                  <h4 className="text-xl font-headline font-bold">{featuredCharity.name || 'Unnamed Charity'}</h4>
                                </div>
                                {featuredCharity.campaignCompleted && (
                                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-200 text-xs font-bold rounded flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                  </span>
                                )}
                              </div>
                              
                              <div className="mt-auto mb-6">
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="font-medium">R{totalRaised.toLocaleString()} raised</span>
                                  <span className="text-primary-fixed-dim/80">Goal: R{(featuredCharity.fundraisingGoal || 0).toLocaleString()}</span>
                                </div>
                                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-secondary-fixed transition-all duration-1000"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                              
                              <div className="pt-2 flex gap-2">
                                {!readOnly && !featuredCharity.campaignCompleted && (
                                  <button
                                    onClick={async () => {
                                      if (!currentCommunity?.id || !featuredCharity.id) return;
                                      try {
                                        await updateDoc(doc(db, 'communities', currentCommunity.id, 'charities', featuredCharity.id), {
                                          campaignCompleted: true
                                        });
                                      } catch (err) {
                                        console.error('Failed to complete campaign:', err);
                                      }
                                    }}
                                    className="flex-1 py-3 bg-white text-primary font-bold rounded-xl hover:bg-surface transition-colors text-sm flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle2 className="w-5 h-5" /> Complete Campaign
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="bg-surface-container-low rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                          <Droplets className="w-8 h-8 text-outline mb-2" />
                          <p className="text-on-surface-variant font-medium">No active initiatives</p>
                        </div>
                      )}

                      {/* Right Column: Mini Chart & Previous */}
                      <div className="flex flex-col gap-6">
                        {/* Native HTML Bar Chart for historical trend */}
                        <div className="bg-surface-container-low rounded-2xl p-5 flex flex-col justify-end h-36 border border-outline-variant/5">
                          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Fundraising Trend</span>
                          <div className="flex items-end gap-2 h-20 w-full mt-auto">
                            {chartData.length > 0 ? chartData.map((c, i) => {
                              const heightPct = Math.max(((c.totalRaised || 0) / maxRaised) * 100, 2);
                              return (
                                <div key={c.id || i} className="flex-1 flex flex-col justify-end group relative h-full">
                                  <div 
                                    className="w-full bg-primary/20 group-hover:bg-primary transition-colors rounded-t-sm"
                                    style={{ height: `${heightPct}%` }}
                                  />
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-on-surface text-surface text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                                    {c.name}: R{c.totalRaised?.toLocaleString()}
                                  </div>
                                </div>
                              )
                            }) : (
                              <div className="text-xs text-outline w-full text-center mb-4">No trend data</div>
                            )}
                          </div>
                        </div>

                        {/* Previous Campaigns Breakdown */}
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-primary mb-3">Previous Campaigns</h4>
                          {otherCharities.length > 0 ? (
                            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                              {otherCharities.map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10 shadow-sm">
                                  <div className="overflow-hidden pr-2">
                                    <p className="text-sm font-bold text-on-surface truncate">{c.name}</p>
                                    <p className="text-xs text-on-surface-variant mt-0.5">
                                      {c.campaignCompleted ? 'Completed' : 'Active'}
                                    </p>
                                  </div>
                                  <div className="text-right whitespace-nowrap pl-2">
                                    <p className="text-sm font-black text-emerald-600">R{(c.totalRaised || 0).toLocaleString()}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-on-surface-variant p-4 bg-surface-container-lowest rounded-xl text-center border border-outline-variant/10">No previous campaigns found.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Security Panel & System Health */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Security Panel */}
                <div className="md:col-span-2 bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-secondary" />
                    <h3 className="text-2xl font-headline font-bold text-primary">Security Panel</h3>
                    {currentCommunity?.isEmergencyMode && (
                      <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-error/10 text-error rounded-full text-[10px] font-bold uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                        Emergency Active
                      </span>
                    )}
                  </div>

                  {/* Active Emergency Info */}
                  {(() => {
                    const emergencyPost = posts.find(p => p.urgency === 'emergency' || p.urgency_level === 'emergency');
                    const securityMembers = members.filter(m => m.isSecurityMember && m.latitude && m.longitude);
                    const responderIds = new Set(securityResponders.map(r => r.user_id));
                    const allResponders = [
                      ...securityResponders,
                      ...securityMembers
                        .filter(m => !responderIds.has(m.user_id))
                        .map(m => ({
                          user_id: m.user_id,
                          name: m.name || 'Security Member',
                          image: m.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user_id}`,
                          latitude: m.latitude!,
                          longitude: m.longitude!,
                          timestamp: new Date().toISOString(),
                        }))
                    ];

                    if (currentCommunity?.isEmergencyMode && emergencyPost) {
                      const eLat = emergencyPost.latitude || 0;
                      const eLng = emergencyPost.longitude || 0;
                      const calcDist = (lat: number, lng: number) => {
                        const R = 6371;
                        const dLat = (lat - eLat) * Math.PI / 180;
                        const dLng = (lng - eLng) * Math.PI / 180;
                        const a = Math.sin(dLat/2)**2 + Math.cos(eLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng/2)**2;
                        return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
                      };

                      return (
                        <div className="space-y-5">
                          {/* Emergency Details */}
                          <div className="p-4 bg-error/5 border border-error/15 rounded-2xl space-y-2">
                            <div className="flex items-center gap-2 text-error">
                              <Siren className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Active Emergency</span>
                            </div>
                            <h4 className="text-sm font-bold text-primary">{emergencyPost.title}</h4>
                            <p className="text-xs text-on-surface-variant line-clamp-2">{emergencyPost.description}</p>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-outline">
                              {emergencyPost.locationName && (
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{emergencyPost.locationName}</span>
                              )}
                              <span>{new Date(emergencyPost.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>

                          {/* Responders List */}
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-outline mb-3">
                              Responders ({allResponders.length})
                            </p>
                            {allResponders.length > 0 ? (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {allResponders.map(r => (
                                  <div key={r.user_id} className="flex items-center gap-3 p-2 rounded-xl bg-surface-container-low">
                                    <img
                                      src={r.image}
                                      alt={r.name}
                                      className="w-8 h-8 rounded-full border-2 border-secondary/20 object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-primary truncate">{r.name}</p>
                                      <p className="text-[10px] text-secondary font-bold">Security Responder</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-bold text-outline shrink-0">
                                      <Navigation className="w-3 h-3" />
                                      {calcDist(r.latitude, r.longitude)}km
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-on-surface-variant italic">No responders active</p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Non-emergency state
                    return (
                      <div>
                        <p className="text-on-surface-variant mb-6">No active emergencies. Community is secure.</p>
                        <div className="flex gap-10">
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-outline mb-1">Security Members</p>
                            <div className="flex items-center gap-2">
                              <span className="text-3xl font-headline font-bold text-primary">{allResponders.length}</span>
                              <div className="flex -space-x-2">
                                {allResponders.slice(0, 3).map(r => (
                                  <div key={r.user_id} className="w-6 h-6 rounded-full border-2 border-white bg-surface-container-highest overflow-hidden">
                                    <img src={r.image} alt={r.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-outline mb-1">Open Alerts</p>
                            <p className="text-3xl font-headline font-bold text-primary">{activeAlertsCount}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* System Health */}
                <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className="w-6 h-6 text-emerald-600" />
                    <h3 className="text-xl font-headline font-bold text-primary">System Health</h3>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-outline uppercase tracking-wider">Uptime</span>
                        <span className="text-xs font-bold text-emerald-600">{systemUptime}</span>
                      </div>
                      <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '99.9%' }}
                          className="h-full bg-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-outline uppercase tracking-wider">Security Threats</span>
                        <span className={cn(
                          "text-xs font-bold",
                          securityThreats === 0 ? "text-emerald-600" : "text-error"
                        )}>{securityThreats === 0 ? 'None' : securityThreats}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full animate-pulse",
                          securityThreats === 0 ? "bg-emerald-500" : "bg-error"
                        )} />
                        <span className="text-[10px] text-on-surface-variant">
                          {securityThreats === 0 ? 'All systems operational' : 'Active threats detected'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-surface-container-low rounded-3xl p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-headline font-bold text-primary">Recent Community Pulse</h3>
                    <button className="text-primary font-bold text-sm flex items-center gap-2 hover:underline">
                      View Log <History className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <motion.div 
                        key={activity.id}
                        whileHover={{ x: 8 }}
                        className="bg-surface-container-lowest p-4 rounded-2xl flex items-center justify-between transition-all shadow-sm border border-outline-variant/5"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", activity.bg, activity.text)}>
                            <activity.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{activity.title}</p>
                            <p className="text-xs text-on-surface-variant">{activity.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-outline uppercase">{activity.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : activeView === 'moderation' ? (
            <ModerationCenter ref={moderationRef} onBack={() => setActiveView('dashboard')} embedded={true} initialTab={moderationTab} />
          ) : (
            <ModerationCenter ref={moderationRef} onBack={() => setActiveView('dashboard')} embedded={true} initialTab="members" />
          )}
        </div>
      </div>

      {/* Main Content */}
      
      {/* Guided Setup — Auto-progressing bottom bar */}
      <AnimatePresence>
        {guidedSetup && !showSetupComplete && (
          <motion.div
            key={`setup-bar-${setupStepIndex}`}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-0 left-0 right-0 z-[90] bg-surface-container-lowest border-t border-outline-variant/10 shadow-2xl"
          >
            {/* Progress bar across the top edge */}
            <div className="h-1 bg-surface-container-low">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: `${((completedSetupSteps.size) / SETUP_STEPS.length) * 100}%` }}
                animate={{ width: `${((completedSetupSteps.size) / SETUP_STEPS.length) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
              {/* Step icon + info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                  {React.createElement(SETUP_STEPS[setupStepIndex].icon, { className: 'w-4 h-4' })}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-primary truncate">
                      {currentSetupStep.label}
                    </p>
                    <span className="text-[10px] font-bold text-outline bg-surface-container-low px-2 py-0.5 rounded-full shrink-0">
                      {completedSetupSteps.size + 1} of {SETUP_STEPS.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant truncate">{currentSetupStep.description}</p>
                </div>
              </div>

              {/* Skip + Done */}
              <button
                onClick={() => setShowSetupComplete(true)}
                className="px-3 py-2 text-[10px] font-bold text-outline hover:text-primary transition-all shrink-0"
              >
                Skip All
              </button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDone}
                className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white bg-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center gap-1.5 shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Done
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {modalRoot && ReactDOM.createPortal(
        <>
          <AnimatePresence>
            {showSetupComplete && (
              <div className="fixed inset-0 z-[200] isolate flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-md bg-surface-container-lowest rounded-[2.5rem] shadow-2xl overflow-hidden border border-outline-variant/10 p-8 text-center"
                >
                  <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-headline font-bold text-primary mb-2">Your Community is Ready!</h2>
                  <p className="text-sm text-on-surface-variant mb-8">
                    {currentCommunity?.name || 'Your community'} is set up and ready for members. You can always adjust settings from the Admin Dashboard.
                  </p>
                  <button
                    onClick={handleFinishSetup}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Go to Home
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isSuggestingCharity && (
              <div className="fixed inset-0 z-[200] isolate flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setSuggestionError('');
                    setIsSuggestingCharity(false);
                  }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-lg bg-surface-container-lowest rounded-[2.5rem] shadow-2xl overflow-hidden border border-outline-variant/10"
                >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-headline font-bold text-primary">Suggest a Charity</h2>
                    <p className="text-xs text-on-surface-variant mt-1">Empower your community by proposing a cause you care about.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSuggestionError('');
                      setIsSuggestingCharity(false);
                    }}
                    className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-outline" />
                  </button>
                </div>

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const suggestedPercentageRaw = Number(formData.get('amount'));

                    if (!user?.uid || !currentCommunity?.id) {
                      setSuggestionError('Unable to submit suggestion right now. Please refresh and try again.');
                      return;
                    }

                    if (!Number.isInteger(suggestedPercentageRaw) || suggestedPercentageRaw < 1 || suggestedPercentageRaw > 100) {
                      setSuggestionError('Suggested percentage must be a whole number between 1 and 100.');
                      return;
                    }

                    setSuggestionError('');
                    await addCharitySuggestion({
                      community_id: currentCommunity.id,
                      suggested_by_id: user.uid,
                      suggested_by_name: user?.displayName || 'Community Member',
                      name: formData.get('name') as string,
                      description: formData.get('description') as string,
                      reason: formData.get('reason') as string,
                      suggested_donation_amount: suggestedPercentageRaw,
                      website: formData.get('website') as string,
                    });
                    (e.currentTarget as HTMLFormElement).reset();
                    setIsSuggestingCharity(false);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Charity Name</label>
                    <input 
                      name="name" 
                      required 
                      placeholder="e.g. Rural Water Initiative"
                      className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Description</label>
                    <textarea 
                      name="description" 
                      required 
                      rows={3}
                      placeholder="What is their mission?"
                      className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all resize-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Suggested Percentage (%)</label>
                      <input 
                        name="amount" 
                        type="number"
                        required
                        min={1}
                        max={100}
                        step={1}
                        placeholder="e.g. 5"
                        className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      />
                      <p className="text-[10px] text-outline/80 mt-1 ml-1">Enter a whole number from 1 to 100.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Website (Optional)</label>
                      <input 
                        name="website" 
                        type="url"
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Reason for Suggestion</label>
                    <textarea 
                      name="reason" 
                      required 
                      rows={2}
                      placeholder="Why should we support them?"
                      className="w-full px-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all resize-none" 
                    />
                  </div>
                  {suggestionError && (
                    <p className="text-xs text-error font-semibold">{suggestionError}</p>
                  )}
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        setSuggestionError('');
                        setIsSuggestingCharity(false);
                      }}
                      className="flex-1 py-3.5 rounded-2xl bg-surface-container-low text-outline font-bold hover:bg-surface-container-high transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Submit Suggestion
                    </button>
                  </div>
                </form>
              </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        modalRoot
      )}
    </div>
  );
};
