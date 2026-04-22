import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { Plus, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { isSignInWithEmailLink, signInWithEmailLink, updatePassword } from 'firebase/auth';
import { auth } from './firebase';
import { Header } from './components/Header';
import { NotificationCenter } from './components/NotificationCenter';
import { BottomNav } from './components/BottomNav';
import { MobileSidebar } from './components/MobileSidebar';
import { CommunityProvider, useCommunity } from './context/CommunityContext';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';
import { GoogleMapsProvider } from './context/GoogleMapsContext';
import { APP_LOGO_PATH } from './constants';

// Lazy-loaded page components — loaded only when first navigated to
const HomePage = lazy(() => import('./components/HomePage').then(m => ({ default: m.HomePage })));
const MarketPage = lazy(() => import('./components/MarketPage').then(m => ({ default: m.MarketPage })));
const ChatPage = lazy(() => import('./components/ChatPage').then(m => ({ default: m.ChatPage })));
const ChatDetailPage = lazy(() => import('./components/ChatDetailPage').then(m => ({ default: m.ChatDetailPage })));
const CreatePostPage = lazy(() => import('./components/CreatePostPage').then(m => ({ default: m.CreatePostPage })));
const CreateWarningNotice = lazy(() => import('./components/notices/CreateWarningNotice').then(m => ({ default: m.CreateWarningNotice })));
const CreateGeneralNotice = lazy(() => import('./components/notices/CreateGeneralNotice').then(m => ({ default: m.CreateGeneralNotice })));
const CreateInfoNotice = lazy(() => import('./components/notices/CreateInfoNotice').then(m => ({ default: m.CreateInfoNotice })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PostsPage = lazy(() => import('./components/PostsPage').then(m => ({ default: m.PostsPage })));
const AccountSecurityPage = lazy(() => import('./components/AccountSecurityPage').then(m => ({ default: m.AccountSecurityPage })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const EmergencyHub = lazy(() => import('./components/EmergencyHub').then(m => ({ default: m.EmergencyHub })));
const Onboarding = lazy(() => import('./components/Onboarding').then(m => ({ default: m.Onboarding })));
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const BenefitsPricingPage = lazy(() => import('./components/BenefitsPricingPage').then(m => ({ default: m.BenefitsPricingPage })));
const MockStripeCheckout = lazy(() => import('./components/MockStripeCheckout').then(m => ({ default: m.MockStripeCheckout })));
const NotificationSettingsPage = lazy(() => import('./components/NotificationSettingsPage').then(m => ({ default: m.NotificationSettingsPage })));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppContent() {
  const { user, userProfile, loading } = useFirebase();
  const { currentCommunity, communities, startConversation, setActiveConversation, conversations, members, joinViaInviteLink, setCurrentCommunity } = useCommunity();
  const [activeTab, setActiveTab] = useState('home');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAccountSecurity, setShowAccountSecurity] = useState(false);
  const [initialEditProfile, setInitialEditProfile] = useState(false);
  const [adminOptions, setAdminOptions] = useState<{ initialView?: 'dashboard' | 'moderation' | 'members', readOnly?: boolean, guidedSetup?: boolean }>({});
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [initialManageCharity, setInitialManageCharity] = useState(false);
  const [initialSuggestCharity, setInitialSuggestCharity] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showBenefitsPricing, setShowBenefitsPricing] = useState(false);
  const [mockCheckoutConfig, setMockCheckoutConfig] = useState<{type: 'membership' | 'community', targetId?: string} | null>(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>(null);
  const [activeEmergencyPost, setActiveEmergencyPost] = useState<any>(null);
  const [postTypeForCreate, setPostTypeForCreate] = useState<'listing' | 'notice' | null>(null);
  const [urgencyForCreate, setUrgencyForCreate] = useState<'general' | 'info' | 'warning' | 'emergency' | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout') === 'true') {
      const type = (urlParams.get('type') as 'membership' | 'community') || 'membership';
      const targetId = urlParams.get('communityId') || undefined;
      setMockCheckoutConfig({ type, targetId });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);


  const stashPendingInviteJoin = useCallback((joinCode: string) => {
    localStorage.setItem('pending_join_code', joinCode);
    localStorage.setItem('pending_onboarding_mode', 'join');
  }, []);

  const getEmailLinkErrorMessage = (err: { code?: string; message?: string }) => {
    if (err.code === 'auth/invalid-action-code') {
      return 'This sign-in link has expired or already been used. Please request a new one.';
    }

    if (err.code === 'auth/invalid-email') {
      return 'The email address does not match. Please enter the email you used to request the link.';
    }

    if (err.code === 'auth/email-already-in-use') {
      return 'This email already has an account. Use the sign-in flow instead of the new-user email link flow.';
    }

    if (err.code === 'auth/argument-error') {
      return 'This sign-in link is invalid or incomplete. Open the newest email link again and finish sign-in from that page.';
    }

    return err.message || 'Unable to complete email link sign-in.';
  };

  // Handle ?join= invite link parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (!joinCode) return;

    // Clear the URL param immediately to prevent re-processing
    window.history.replaceState(null, '', window.location.origin + window.location.pathname);

    if (user && userProfile) {
      // User is already authenticated and has a profile — join immediately
      joinViaInviteLink(joinCode)
        .then((communityId) => {
          setCurrentCommunity(communityId);
          setActiveTab('home');
        })
        .catch((err) => {
          console.error('Failed to join via invite link:', err);
          alert(err.message || 'Failed to join community. The link may be invalid or expired.');
        });
    } else {
      // Stash code for after auth/onboarding
      stashPendingInviteJoin(joinCode);
    }
  }, [joinViaInviteLink, setCurrentCommunity, stashPendingInviteJoin, user, userProfile]);

  // Handle pending join after user authenticates with a complete profile
  useEffect(() => {
    const pendingCode = localStorage.getItem('pending_join_code');
    if (!pendingCode || !user || !userProfile || !userProfile.profile_completed) return;

    localStorage.removeItem('pending_join_code');
    localStorage.removeItem('pending_onboarding_mode');
    joinViaInviteLink(pendingCode)
      .then((communityId) => {
        setCurrentCommunity(communityId);
        setActiveTab('home');
      })
      .catch((err) => {
        console.error('Failed to join via pending invite link:', err);
        stashPendingInviteJoin(pendingCode);
      });
  }, [joinViaInviteLink, setCurrentCommunity, stashPendingInviteJoin, user, userProfile]);




  // Track unread indicator for chat nav button
  const totalUnread = useMemo(() => {
    if (!user) return 0;
    return conversations.reduce((sum, c) => sum + (c.unreadCount?.[user.uid] || 0), 0);
  }, [conversations, user]);
  const seenUnreadRef = useRef(0);
  const [chatUnreadSeen, setChatUnreadSeen] = useState(true);

  useEffect(() => {
    if (totalUnread > seenUnreadRef.current) {
      setChatUnreadSeen(false);
    }
    if (totalUnread === 0) {
      setChatUnreadSeen(true);
      seenUnreadRef.current = 0;
    }
  }, [totalUnread]);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === 'chat') {
      setChatUnreadSeen(true);
      seenUnreadRef.current = totalUnread;
    }
    setActiveTab(tab);
  }, [totalUnread]);

  // Keep selectedChat in sync with live conversation data from Firestore listener
  React.useEffect(() => {
    if (selectedChat?.id) {
      const live = conversations.find(c => c.id === selectedChat.id);
      if (live) {
        // Prefer metadata that has a title (post-derived metadata is authoritative)
        const bestMetadata = (selectedChat.metadata?.title ? selectedChat.metadata : live.metadata) || selectedChat.metadata;
        const merged = {
          ...live,
          metadata: bestMetadata,
          otherParticipant: live.otherParticipant || selectedChat.otherParticipant,
        };
        // Only update if something actually changed to avoid infinite loops
        if (
          live.lastMessage !== selectedChat.lastMessage ||
          live.otherParticipant?.id !== selectedChat.otherParticipant?.id ||
          (!selectedChat.metadata && live.metadata) ||
          (!selectedChat.otherParticipant && live.otherParticipant)
        ) {
          setSelectedChat(merged);
        }
      }
    }
  }, [conversations, selectedChat?.id]);

  const shouldShowOnboarding = !!user && (!userProfile || userProfile.profile_completed !== true);

  const currentOwnerCommunityNeedingOnboarding = useMemo(() => {
    if (!user) {
      return null;
    }

    if (currentCommunity?.owner_id === user.uid && currentCommunity.guided_setup_required) {
      return currentCommunity;
    }

    if (!currentCommunity) {
      return communities.find((community) => community.owner_id === user.uid && community.guided_setup_required) ?? null;
    }

    return null;
  }, [communities, currentCommunity, user]);

  // Determine if user is a community owner with incomplete admin onboarding
  const isOwnerNeedsOnboarding = !!currentOwnerCommunityNeedingOnboarding;

  useEffect(() => {
    if (shouldShowOnboarding || !currentOwnerCommunityNeedingOnboarding) {
      return;
    }

    if (activeTab !== 'admin' || !adminOptions.guidedSetup) {
      setAdminOptions({ initialView: 'dashboard', readOnly: false, guidedSetup: true });
      setActiveTab('admin');
    }
  }, [
    activeTab,
    adminOptions.guidedSetup,
    currentOwnerCommunityNeedingOnboarding,
    shouldShowOnboarding,
  ]);

  const handleViewOnMap = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    setActiveTab('home');
  };

  const handleOpenChatFromPost = async (post: any) => {
    if (!user) return;

    // Resolve author_id: fall back to member lookup by authorName if missing
    let authorId = post.author_id;
    if (!authorId && post.authorName) {
      const match = members.find(m => m.name === post.authorName);
      if (match) authorId = match.user_id;
    }
    if (!authorId) return;

    // Emergency notices route to the Emergency Hub coordination channel
    if (post.type === 'notice' && (post.urgency === 'emergency' || post.urgency_level === 'emergency' || post.priority === 'emergency')) {
      setActiveEmergencyPost(post);
      return;
    }

    // Listings and non-emergency notices open contextual chat
    const isNotice = post.type === 'notice';
    const convType = isNotice ? 'notice' : 'listing';
    try {
      const convId = await startConversation({
        participants: [user.uid, authorId],
        type: convType,
        communityId: currentCommunity?.id,
        listingId: !isNotice ? post.id : undefined,
        noticeId: isNotice ? post.id : undefined,
        metadata: {
          title: post.title,
          description: post.description,
          price: post.price ? `R ${post.price}` : undefined,
          image: post.posts_image || (!isNotice ? `https://picsum.photos/seed/${post.id}/800/450` : undefined),
          type: post.type,
          author: post.authorName,
          authorImage: post.authorImage,
          authorRole: post.authorRole || 'Member',
          source: post.source,
        }
      });
      setActiveConversation(convId);
      setActiveTab('chat');
      const conv = conversations.find(c => c.id === convId);
      const postMetadata = {
        title: post.title,
        description: post.description,
        price: post.price ? `R ${post.price}` : undefined,
        image: post.posts_image || (!isNotice ? `https://picsum.photos/seed/${post.id}/800/450` : undefined),
        type: post.type,
        author: post.authorName,
        authorImage: post.authorImage,
        authorRole: post.authorRole || 'Member',
        source: post.source,
      };
      setSelectedChat({
        ...(conv || {
          id: convId,
          type: convType,
          participants: [user.uid, authorId],
          lastMessage: '',
          lastMessageAt: '',
          priority: 'normal' as const,
          unreadCount: {},
        }),
        metadata: postMetadata,
        otherParticipant: conv?.otherParticipant || {
          id: authorId,
          name: post.authorName,
          profile_image: post.authorImage,
        }
      });
    } catch (err) {
      console.error('Failed to start conversation from post:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Cross-device email link prompt

  if (!user) {
    if (showBenefitsPricing) {
      return (
        <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          <BenefitsPricingPage 
            onBack={() => setShowBenefitsPricing(false)}
            onUpgrade={() => {
              setShowBenefitsPricing(false);
                window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <LandingPage 
          onJoin={() => {}} 
          onStart={() => {}} 
          onViewBenefits={() => setShowBenefitsPricing(true)}
        />
      </Suspense>
    );
  }

  if (shouldShowOnboarding) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <Onboarding />
      </Suspense>
    );
  }

  // Determine if user is in READ-ONLY mode (expired invited member, unlicensed)
  const isReadOnly = userProfile.status === 'READ-ONLY' || (
    userProfile.license_type === 'COMMUNITY_GRANTED' &&
    userProfile.license_status === 'UNLICENSED' &&
    userProfile.member_expiry_date &&
    (userProfile.member_expiry_date.toDate ? userProfile.member_expiry_date.toDate() : new Date(userProfile.member_expiry_date)) < new Date()
  );

  const renderContent = () => {
    if (mockCheckoutConfig) {
      return (
        <Suspense fallback={<PageLoader />}>
          <MockStripeCheckout
            type={mockCheckoutConfig.type}
            targetId={mockCheckoutConfig.targetId}
            onCancel={() => setMockCheckoutConfig(null)}
            onSuccess={() => {
              setMockCheckoutConfig(null);
              // Handle actual license activation mock via service/context if needed
              // or rely on a generic reload since user profile updates
              window.location.reload();
            }}
          />
        </Suspense>
      );
    }

    if (showBenefitsPricing) {
      return (
        <BenefitsPricingPage 
          onBack={() => setShowBenefitsPricing(false)}
          onUpgrade={() => {
            setShowBenefitsPricing(false);
            setMockCheckoutConfig({ type: 'membership' });
          }}
        />
      );
    }

    if (activeTab === 'admin') {
      return (
        <AdminDashboard 
          onBack={() => {
            setActiveTab('settings');
            setAdminOptions({});
          }} 
          onManageCharity={() => {
            setInitialManageCharity(true);
            setActiveTab('settings');
            setAdminOptions({});
          }}
          initialView={adminOptions.initialView}
          readOnly={adminOptions.readOnly}
          guidedSetup={isOwnerNeedsOnboarding || !!adminOptions.guidedSetup}
          onSetupComplete={() => {
            setActiveTab('home');
            setAdminOptions({});
          }}
        />
      );
    }

    if (showAccountSecurity) {
      return (
        <AccountSecurityPage 
          onBack={() => {
            setShowAccountSecurity(false);
            setInitialEditProfile(false);
          }} 
          initialEditProfile={initialEditProfile}
          onNavigateToCommunityDashboard={(communityId, role) => {
            const isAdmin = role === 'Admin' || role === 'Moderator';
            setCurrentCommunity(communityId);
            setAdminOptions({
              initialView: isAdmin ? 'moderation' : 'dashboard',
              readOnly: !isAdmin
            });
            setShowAccountSecurity(false);
            setActiveTab('admin');
          }}
        />
      );
    }

    if (showNotificationSettings) {
      return (
        <NotificationSettingsPage onBack={() => setShowNotificationSettings(false)} />
      );
    }

    if (selectedChat) {
      return <ChatDetailPage chat={selectedChat} onBack={() => setSelectedChat(null)} />;
    }

    if (activeEmergencyPost) {
      return <EmergencyHub emergencyPost={activeEmergencyPost} onBack={() => setActiveEmergencyPost(null)} />;
    }

    switch (activeTab) {
      case 'home':
        return (
          <HomePage 
            initialCenter={mapCenter} 
            onCenterReset={() => setMapCenter(null)} 
            onOpenEmergencyHub={(post) => setActiveEmergencyPost(post)}
            onOpenChat={handleOpenChatFromPost}
            onOpenCharityHub={() => {
              const role = currentCommunity?.userRole;
              const isAdmin = role === 'Admin' || role === 'Moderator';
              setAdminOptions({ initialView: 'dashboard', readOnly: !isAdmin });
              setActiveTab('admin');
            }}
            onManageCharity={() => {
              setInitialManageCharity(true);
              setActiveTab('settings');
            }}
            onSuggestCharity={() => {
              setInitialSuggestCharity(true);
              setActiveTab('settings');
            }}
            onStartEmergencyPost={() => {
              setPostTypeForCreate('notice');
              setUrgencyForCreate('emergency');
              setShowCreatePost(true);
              setActiveTab('posts');
            }}
            onStartIncidentReport={(urgency: 'general' | 'info' | 'warning' | 'emergency') => {
              setPostTypeForCreate('notice');
              setUrgencyForCreate(urgency);
              setShowCreatePost(true);
              setActiveTab('posts');
            }}
            onEditPost={(post) => {
              setEditingPost(post);
              setPostTypeForCreate(post.type || null);
              if (post.type === 'notice') {
                const level = post.urgency_level || post.postSubtype || 
                  (post.urgency === 'high' ? 'warning' : post.urgency === 'normal' ? 'info' : post.urgency === 'low' ? 'general' : post.urgency);
                setUrgencyForCreate(level as any || null);
              } else {
                setUrgencyForCreate(null);
              }
              setShowCreatePost(true);
              setActiveTab('posts');
            }}
          />
        );
      case 'market':
        return <MarketPage onViewOnMap={handleViewOnMap} onOpenChat={handleOpenChatFromPost} />;
      case 'chat':
        return <ChatPage onSelectChat={setSelectedChat} onOpenEmergencyHub={(post) => setActiveEmergencyPost(post)} />;
      case 'posts':
        if (showCreatePost) {
          // Route non-emergency notices to dedicated components
          if (postTypeForCreate === 'notice' && urgencyForCreate && urgencyForCreate !== 'emergency') {
            const noticeBackHandler = () => {
              setShowCreatePost(false);
              setEditingPost(null);
              setPostTypeForCreate(null);
              setUrgencyForCreate(null);
            };
            if (urgencyForCreate === 'warning') {
              return <CreateWarningNotice onBack={noticeBackHandler} postToEdit={editingPost} />;
            }
            if (urgencyForCreate === 'info') {
              return <CreateInfoNotice onBack={noticeBackHandler} postToEdit={editingPost} />;
            }
            if (urgencyForCreate === 'general') {
              return <CreateGeneralNotice onBack={noticeBackHandler} postToEdit={editingPost} />;
            }
          }
          // Emergency notices and listings go through original CreatePostPage
          return (
            <CreatePostPage 
              postToEdit={editingPost}
              initialType={postTypeForCreate || undefined}
              initialUrgency={urgencyForCreate || undefined}
              onEmergencyPosted={(post) => {
                setShowCreatePost(false);
                setPostTypeForCreate(null);
                setUrgencyForCreate(null);
                setActiveEmergencyPost(post);
              }}
              onBack={() => {
                setShowCreatePost(false);
                setEditingPost(null);
                setPostTypeForCreate(null);
                setUrgencyForCreate(null);
              }} 
            />
          );
        }
        return (
          <PostsPage 
            onCreatePost={() => {
              setEditingPost(null);
              setShowCreatePost(true);
            }} 
            onEditPost={(post) => {
              setEditingPost(post);
              setPostTypeForCreate(post.type || null);
              // Route edits of notice posts to the correct notice component
              if (post.type === 'notice') {
                const level = post.urgency_level || post.postSubtype || 
                  (post.urgency === 'high' ? 'warning' : post.urgency === 'normal' ? 'info' : post.urgency === 'low' ? 'general' : post.urgency);
                setUrgencyForCreate(level as any || null);
              } else {
                setUrgencyForCreate(null);
              }
              setShowCreatePost(true);
            }}
            onOpenChat={handleOpenChatFromPost}
            onOpenEmergencyHub={(post) => setActiveEmergencyPost(post)}
            onViewOnMap={handleViewOnMap}
          />
        );
      case 'settings':
        return (
          <SettingsPage 
            onNavigateToAdmin={() => {
              setAdminOptions({ initialView: 'dashboard', readOnly: false });
              setActiveTab('admin');
            }} 
            onNavigateToAccountSecurity={() => {
              setInitialEditProfile(true);
              setShowAccountSecurity(true);
            }}
            onNavigateToBenefitsPricing={() => setShowBenefitsPricing(true)}
            onNavigateToCommunityDashboard={(communityId, role, options) => {
              const isAdmin = role === 'Admin' || role === 'Moderator';
              setCurrentCommunity(communityId);
              setAdminOptions({
                initialView: 'dashboard',
                readOnly: !isAdmin,
                guidedSetup: options?.guidedSetup,
              });
              setActiveTab('admin');
            }}
            initialManageCharity={initialManageCharity}
            onCloseManageCharity={() => setInitialManageCharity(false)}
            initialSuggestCharity={initialSuggestCharity}
            onCloseSuggestCharity={() => setInitialSuggestCharity(false)}
            onNavigateToNotificationSettings={() => setShowNotificationSettings(true)}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-[60vh] text-outline italic">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} content coming soon...
          </div>
        );
    }
  };

  const getHeaderTitle = () => {
    if (showCreatePost) return editingPost ? 'Edit Post' : (postTypeForCreate === 'listing' ? 'New Listing' : urgencyForCreate === 'emergency' ? 'Emergency Report' : urgencyForCreate === 'warning' ? 'Warning Notice' : urgencyForCreate === 'info' ? 'Info Notice' : urgencyForCreate === 'general' ? 'General Notice' : 'New Community Notice');
    if (selectedChat) return selectedChat.name;
    if (activeEmergencyPost) return 'Emergency Hub';
    if (showAccountSecurity) return 'Account Security';
    if (showBenefitsPricing) return 'Benefits & Pricing';
    if (activeTab === 'admin') return 'Admin Dashboard';
    return currentCommunity?.name;
  };

  const handleGlobalBack = () => {
    if (selectedChat) setSelectedChat(null);
    else if (activeEmergencyPost) setActiveEmergencyPost(null);
    else if (showAccountSecurity) setShowAccountSecurity(false);
    else if (showBenefitsPricing) setShowBenefitsPricing(false);
    else if (showCreatePost) {
      setShowCreatePost(false);
      setEditingPost(null);
      setPostTypeForCreate(null);
      setUrgencyForCreate(null);
    }
    else if (activeTab === 'admin') {
      setActiveTab('settings');
      setAdminOptions({});
    }
  };

  const isSubPage = activeTab === 'admin' || !!selectedChat || !!activeEmergencyPost || showAccountSecurity || showBenefitsPricing || showCreatePost;

  return (
    <div className="min-h-screen bg-surface">
      <Header 
        showBack={isSubPage}
        onBack={handleGlobalBack}
        title={getHeaderTitle()}
        onToggleNotifications={() => setIsNotificationsOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />
      
      <Suspense fallback={<PageLoader />}>
        {renderContent()}
      </Suspense>

      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        onNavigate={(tab) => {
          handleTabChange(tab);
          setIsSidebarOpen(false);
        }}
        onOpenAdmin={(communityId, role) => {
          const isAdmin = role === 'Admin' || role === 'Moderator';
          setCurrentCommunity(communityId);
          setAdminOptions({ initialView: 'dashboard', readOnly: !isAdmin });
          setActiveTab('admin');
          setIsSidebarOpen(false);
        }}
        onOpenSettings={() => {
          setActiveTab('settings');
          setIsSidebarOpen(false);
        }}
      />

      <NotificationCenter 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)}
        onAcknowledgeAlert={(_communityId, postData) => {
          setActiveEmergencyPost(postData);
          setActiveTab('home');
        }}
      />

      {activeTab === 'market' && !selectedChat && !activeEmergencyPost && !showAccountSecurity && !showBenefitsPricing && (
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="fixed right-6 bottom-24 w-14 h-14 rounded-full clay-gradient text-white shadow-ambient flex items-center justify-center z-50"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {activeTab !== 'admin' && !selectedChat && !activeEmergencyPost && !showAccountSecurity && !showBenefitsPricing && !showCreatePost && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} hasUnread={!chatUnreadSeen && totalUnread > 0} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <GoogleMapsProvider>
        <CommunityProvider>
          <AppContent />
        </CommunityProvider>
      </GoogleMapsProvider>
    </FirebaseProvider>
  );
}
