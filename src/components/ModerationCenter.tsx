import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { 
  Shield, 
  Users, 
  AlertCircle, 
  FileText, 
  Store, 
  Settings, 
  History, 
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserX,
  UserCheck,
  MessageSquare,
  Pin,
  Lock,
  Eye,
  Trash2,
  Flag,
  ChevronRight,
  Clock,
  Megaphone,
  Plus,
  Link,
  Mail,
  Phone,
  ShieldAlert,
  Ban,
  ShieldCheck,
  UserMinus,
  UserPlus,
  ExternalLink,
  Copy,
  RefreshCw,
  Activity,
  Star,
  Map,
  Save,
  Loader2,
  X,
  Globe,
  Tag,
  DollarSign,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleMap, Circle } from '@react-google-maps/api';
import { usePlacesAutocomplete, geocodeByAddress } from '../hooks/usePlacesAutocomplete';
import { useCommunity } from '../context/CommunityContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { cn } from '../lib/utils';
import { BUSINESS_CATEGORIES, POST_SUBTYPE_CONFIG } from '../constants';
import { UserProfile, Business } from '../types';

import { BusinessImportTool } from './BusinessImportTool';

import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface ModerationCenterHandle {
  saveCurrentTab: () => Promise<void>;
}

interface ModerationCenterProps {
  onBack: () => void;
  embedded?: boolean;
  initialTab?: ModTab;
}

type ModTab = 'members' | 'content' | 'businesses' | 'rules' | 'logs' | 'categories' | 'coverage';
type MemberSubView = 'list' | 'invite' | 'details';
type BusinessSubView = 'list' | 'import';

export const ModerationCenter = forwardRef<ModerationCenterHandle, ModerationCenterProps>(({ onBack, embedded = false, initialTab }, ref) => {
  const { 
    currentCommunity, 
    updateCommunityCategories, 
    members, 
    addMember, 
    removeMember, 
    deleteMember,
    updateMemberRole, 
    searchUsers,
    posts,
    removePost,
    updatePost,
    updateCommunityBusiness,
    removeCommunityBusiness,
    updateCommunityCoverage,
    inviteMember,
    communityInvitations,
    addNotification,
    toggleEmergencyMode,
    activeCommunityLink,
    generateInviteLink
  } = useCommunity();
  const [activeTab, setActiveTab] = useState<ModTab>(initialTab || 'members');

  const [tempCoverage, setTempCoverage] = useState(currentCommunity?.coverageArea || {
    latitude: -26.2041,
    longitude: 28.0473,
    radius: 10,
    location_name: 'Johannesburg Central'
  });

  const { isLoaded } = useGoogleMaps();

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    initOnMount: false,
    requestOptions: {
      locationBias: 'IP_BIAS',
    },
    debounce: 300,
    cache: 86400,
  });

  useEffect(() => {
    if (isLoaded) {
      init();
    }
  }, [isLoaded, init]);

  useEffect(() => {
    if (activeTab === 'coverage' && tempCoverage.location_name) {
      setValue(tempCoverage.location_name, false);
    }
  }, [activeTab, tempCoverage.location_name, setValue]);

  useEffect(() => {
    if (currentCommunity?.coverageArea) {
      setTempCoverage(currentCommunity.coverageArea);
    }
  }, [currentCommunity?.coverageArea]);

  const handleSaveCoverage = async () => {
    if (currentCommunity?.id) {
      await updateCommunityCoverage(currentCommunity.id, tempCoverage);
    }
  };

  // Expose save method to parent via ref
  useImperativeHandle(ref, () => ({
    saveCurrentTab: async () => {
      if (activeTab === 'coverage') {
        await handleSaveCoverage();
      }
      // categories auto-save on toggle, businesses/members/invitations are action-based — no bulk save needed
    },
  }), [activeTab, handleSaveCoverage]);

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const { lat, lng } = await geocodeByAddress(address);
      setTempCoverage(prev => ({
        ...prev,
        location_name: address,
        latitude: lat,
        longitude: lng
      }));
    } catch (error) {
      console.error("Error selecting location:", error);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [memberSubView, setMemberSubView] = useState<MemberSubView>('list');
  const [businessSubView, setBusinessSubView] = useState<BusinessSubView>('list');
  const [contentFilter, setContentFilter] = useState<'all' | 'notices' | 'listings' | 'businesses' | 'public_queue'>('all');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [inviteEmailRecipient, setInviteEmailRecipient] = useState('');
  const [isSendingInviteEmail, setIsSendingInviteEmail] = useState(false);
  const [inviteEmailStatus, setInviteEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [logs, setLogs] = useState<any[]>([]);
  const [urgencyChangePost, setUrgencyChangePost] = useState<any>(null);

  useEffect(() => {
    if (!currentCommunity?.id || currentCommunity.id === 'loading') return;

    // Listen to logs
    const qLogs = query(
      collection(db, 'communities', currentCommunity.id, 'moderation_logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logData);
    });

    return () => {
      unsubscribeLogs();
    };
  }, [currentCommunity?.id]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInviteMember = async (userId: string) => {
    try {
      await inviteMember(userId, 'Member');
      setMemberSubView('list');
      setSearchQuery('');
      setSearchResults([]);
      alert('Invitation sent successfully!');
    } catch (error: any) {
      console.error('Failed to invite member:', error);
      alert(error.message || 'Failed to send invitation.');
    }
  };

  const handleSendInviteEmail = async () => {
    if (!activeCommunityLink) return;

    const recipient = inviteEmailRecipient.trim();
    if (!recipient) {
      setInviteEmailStatus({ type: 'error', message: 'Enter the recipient email address first.' });
      return;
    }

    setIsSendingInviteEmail(true);
    setInviteEmailStatus(null);

    try {
      const response = await fetch('/api/invitations/email/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          inviteUrl: `${window.location.origin}?join=${activeCommunityLink.id}`,
          communityName: currentCommunity?.name || 'your community',
          senderName: auth.currentUser?.displayName || 'A Lalela community admin',
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invite email.');
      }

      setInviteEmailStatus({ type: 'success', message: result.message || 'Invite email sent successfully.' });
      setInviteEmailRecipient('');
    } catch (error: any) {
      console.error('Failed to send invite email:', error);
      setInviteEmailStatus({ type: 'error', message: error.message || 'Failed to send invite email.' });
    } finally {
      setIsSendingInviteEmail(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember(userId);
      setMemberSubView('list');
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleDeleteMember = async (userId: string) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this member from the community? This cannot be undone.')) return;
    try {
      await deleteMember(userId);
      setMemberSubView('list');
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
  };

  const handleUpdateRole = async (userId: string, role: any) => {
    try {
      await updateMemberRole(userId, role);
      if (selectedMember && selectedMember.user_id === userId) {
        setSelectedMember({ ...selectedMember, role });
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      await removePost(postId);
      
      // Log the action
      if (currentCommunity?.id) {
        const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
        const logRef = doc(db, 'communities', currentCommunity.id, 'moderation_logs', logId);
        await setDoc(logRef, {
          id: logId,
          community_id: currentCommunity.id,
          moderator_id: auth.currentUser?.uid,
          action: 'delete',
          target_id: postId,
          target_type: 'post',
          timestamp: serverTimestamp()
        });

        // Notify author
        if (post?.author_id && post.author_id !== auth.currentUser?.uid) {
          const contentType = post.type === 'listing' ? 'listing' : 'post';
          await addNotification(post.author_id, {
            title: `${contentType === 'listing' ? 'Listing' : 'Post'} Removed`,
            message: `Your ${contentType} "${post.title}" has been removed by an admin.`,
            type: 'system',
            metadata: { action: 'post_deleted', postId, communityId: currentCommunity.id, contentType }
          });
        }
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const handleTogglePin = async (post: any) => {
    try {
      const newStatus = post.status === 'Pinned' ? 'Active' : 'Pinned';
      await updatePost({
        ...post,
        status: newStatus
      });

      // Notify author when pinned
      if (newStatus === 'Pinned' && post.author_id && post.author_id !== auth.currentUser?.uid && currentCommunity?.id) {
        const contentType = post.type === 'listing' ? 'listing' : 'post';
        await addNotification(post.author_id, {
          title: `${contentType === 'listing' ? 'Listing' : 'Post'} Pinned`,
          message: `Your ${contentType} "${post.title}" has been pinned by an admin.`,
          type: 'system',
          metadata: { action: 'post_pinned', postId: post.id, communityId: currentCommunity.id, contentType }
        });
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleChangeUrgency = async (post: any, newLevel: keyof typeof POST_SUBTYPE_CONFIG) => {
    if (!currentCommunity?.id) return;
    try {
      const config = POST_SUBTYPE_CONFIG[newLevel];
      const wasEmergency = post.urgency === 'emergency' || post.urgency_level === 'emergency';
      const isNowEmergency = newLevel === 'emergency';

      await updatePost({
        ...post,
        urgency: config.urgency,
        urgency_level: config.urgency_level,
        postSubtype: newLevel,
      });

      // Log the action
      const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
      const logRef = doc(db, 'communities', currentCommunity.id, 'moderation_logs', logId);
      await setDoc(logRef, {
        id: logId,
        community_id: currentCommunity.id,
        moderator_id: auth.currentUser?.uid,
        action: 'change_urgency',
        target_id: post.id,
        target_type: 'post',
        details: `Changed urgency from ${post.urgency_level || post.urgency || 'unknown'} to ${config.urgency_level}`,
        timestamp: serverTimestamp()
      });

      // If downgrading from emergency, end emergency mode
      if (wasEmergency && !isNowEmergency && currentCommunity.isEmergencyMode) {
        await toggleEmergencyMode(currentCommunity.id);
      }

      // Fan-out notifications to all community members
      const membersSnapshot = await getDocs(collection(db, 'communities', currentCommunity.id, 'members'));
      const memberIds = membersSnapshot.docs
        .map((memberDoc) => memberDoc.id)
        .filter((memberId) => memberId !== auth.currentUser?.uid);

      const levelLabel = config.urgency_level.charAt(0).toUpperCase() + config.urgency_level.slice(1);
      const communityName = currentCommunity.name || 'your community';

      for (const memberId of memberIds) {
        await addNotification(memberId, {
          title: isNowEmergency
            ? `Emergency Alert: ${communityName}`
            : `Notice Updated: ${communityName}`,
          message: isNowEmergency
            ? `"${post.title}" has been escalated to Emergency by an admin.`
            : `"${post.title}" urgency changed to ${levelLabel} by an admin.`,
          type: isNowEmergency ? 'alert' : 'system',
          metadata: {
            action: 'urgency_changed',
            communityId: currentCommunity.id,
            postId: post.id,
            newUrgency: config.urgency_level,
          }
        });
      }

      setUrgencyChangePost(null);
    } catch (error) {
      console.error('Failed to change urgency:', error);
    }
  };

  const handleApprovePublicListing = async (post: any) => {
    try {
      await updatePost({ ...post, status: 'Active' });
      if (currentCommunity?.id) {
        const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
        const logRef = doc(db, 'communities', currentCommunity.id, 'moderation_logs', logId);
        await setDoc(logRef, {
          id: logId,
          community_id: currentCommunity.id,
          moderator_id: auth.currentUser?.uid,
          action: 'approve_public',
          target_id: post.id,
          target_type: 'post',
          timestamp: serverTimestamp()
        });
        if (post.author_id && post.author_id !== auth.currentUser?.uid) {
          await addNotification(post.author_id, {
            title: 'Listing Approved',
            message: `Your listing "${post.title}" has been approved and is now live on the Lalela marketplace.`,
            type: 'system',
            link: `/market?post=${post.id}`,
            metadata: { action: 'listing_approved', postId: post.id, communityId: currentCommunity.id }
          });
        }
      }
    } catch (error) {
      console.error('Failed to approve public listing:', error);
    }
  };

  const handleRejectPublicListing = async (post: any, reason: string) => {
    try {
      await updatePost({ ...post, status: 'Rejected', rejection_reason: reason });
      if (currentCommunity?.id) {
        const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
        const logRef = doc(db, 'communities', currentCommunity.id, 'moderation_logs', logId);
        await setDoc(logRef, {
          id: logId,
          community_id: currentCommunity.id,
          moderator_id: auth.currentUser?.uid,
          action: 'reject_public',
          target_id: post.id,
          target_type: 'post',
          timestamp: serverTimestamp()
        });
        if (post.author_id && post.author_id !== auth.currentUser?.uid) {
          await addNotification(post.author_id, {
            title: 'Public Listing Rejected',
            message: `Your listing "${post.title}" was not approved. Reason: ${reason}`,
            type: 'system',
            metadata: { action: 'listing_rejected', postId: post.id, communityId: currentCommunity.id, reason }
          });
        }
      }
    } catch (error) {
      console.error('Failed to reject public listing:', error);
    }
  };

  const handleRequestChanges = async (post: any, note: string) => {
    try {
      await updatePost({ ...post, status: 'ChangesRequested', changes_requested_note: note });
      if (currentCommunity?.id) {
        const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
        const logRef = doc(db, 'communities', currentCommunity.id, 'moderation_logs', logId);
        await setDoc(logRef, {
          id: logId,
          community_id: currentCommunity.id,
          moderator_id: auth.currentUser?.uid,
          action: 'request_changes',
          target_id: post.id,
          target_type: 'post',
          timestamp: serverTimestamp()
        });
        if (post.author_id && post.author_id !== auth.currentUser?.uid) {
          await addNotification(post.author_id, {
            title: 'Changes Requested',
            message: `A moderator has requested changes to your listing "${post.title}": ${note}`,
            type: 'system',
            metadata: { action: 'changes_requested', postId: post.id, communityId: currentCommunity.id, note }
          });
        }
      }
    } catch (error) {
      console.error('Failed to request changes:', error);
    }
  };

  const handleApproveBusiness = async (business: Business) => {
    if (!currentCommunity?.id) return;
    try {
      await updateCommunityBusiness(currentCommunity.id, {
        ...business,
        isVerified: true
      });

      // Log the action
      const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
      const logRef = doc(db, 'communities', currentCommunity.id, 'moderation_logs', logId);
      await setDoc(logRef, {
        id: logId,
        community_id: currentCommunity.id,
        moderator_id: auth.currentUser?.uid,
        action: 'approve',
        target_id: business.id,
        target_type: 'business',
        timestamp: serverTimestamp()
      });

      // Notify business owner if tracked
      if ((business as any).owner_id && (business as any).owner_id !== auth.currentUser?.uid) {
        await addNotification((business as any).owner_id, {
          title: 'Business Approved',
          message: `Your business "${business.name}" has been verified by an admin.`,
          type: 'system',
          metadata: { action: 'business_approved', businessId: business.id, communityId: currentCommunity.id }
        });
      }
    } catch (error) {
      console.error('Failed to approve business:', error);
    }
  };

  const handleToggleFeatured = async (business: Business) => {
    if (!currentCommunity?.id) return;
    try {
      const newFeaturedStatus = !business.isFeatured;
      await updateCommunityBusiness(currentCommunity.id, {
        ...business,
        isFeatured: newFeaturedStatus
      });

      // Log the action
      const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
      const logRef = doc(db, 'communities', currentCommunity.id, 'moderation_logs', logId);
      await setDoc(logRef, {
        id: logId,
        community_id: currentCommunity.id,
        moderator_id: auth.currentUser?.uid,
        action: 'update',
        target_id: business.id,
        target_type: 'business',
        timestamp: serverTimestamp(),
        details: `Business "${business.name}" ${newFeaturedStatus ? 'featured' : 'unfeatured'}`
      });

      // Notify business owner if tracked
      if (newFeaturedStatus && (business as any).owner_id && (business as any).owner_id !== auth.currentUser?.uid) {
        await addNotification((business as any).owner_id, {
          title: 'Business Featured',
          message: `Your business "${business.name}" has been featured by an admin.`,
          type: 'system',
          metadata: { action: 'business_featured', businessId: business.id, communityId: currentCommunity.id }
        });
      }
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
    }
  };

  const handleRemoveBusiness = async (business: Business) => {
    if (!currentCommunity?.id) return;
    
    try {
      await removeCommunityBusiness(currentCommunity.id, business.id);

      // Log the action
      const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
      const logRef = doc(db, 'communities', currentCommunity.id, 'moderation_logs', logId);
      await setDoc(logRef, {
        id: logId,
        community_id: currentCommunity.id,
        moderator_id: auth.currentUser?.uid,
        action: 'delete',
        target_id: business.id,
        target_type: 'business',
        timestamp: serverTimestamp()
      });

      // Notify business owner if tracked
      if ((business as any).owner_id && (business as any).owner_id !== auth.currentUser?.uid) {
        await addNotification((business as any).owner_id, {
          title: 'Business Removed',
          message: `Your business "${business.name}" has been removed by an admin.`,
          type: 'system',
          metadata: { action: 'business_removed', businessId: business.id, communityId: currentCommunity.id }
        });
      }
    } catch (error) {
      console.error('Failed to remove business:', error);
    }
  };

  const tabs = [
    { id: 'members', label: 'Members', icon: Users, count: members.length > 0 ? members.length : undefined },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'businesses', label: 'Businesses', icon: Store, count: currentCommunity?.businesses?.length || undefined },
    { id: 'categories', label: 'Categories', icon: Filter },
    { id: 'rules', label: 'Rules', icon: Settings },
    { id: 'coverage', label: 'Coverage', icon: Map },
    { id: 'logs', label: 'Audit Logs', icon: History },
  ];

  const renderCoverage = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Map className="w-5 h-5" />
          </div>
          <h3 className="text-2xl font-headline font-bold text-primary">Community Coverage Area</h3>
        </div>
        <button 
          onClick={handleSaveCoverage}
          className="px-6 py-2 bg-primary text-white text-xs font-bold rounded-full shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-6">
            <div className="relative">
              <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-2 ml-1">Search Location</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input 
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={!ready}
                  placeholder="Search for a suburb or area..."
                  className="w-full bg-surface-container-lowest border-none rounded-2xl pl-12 pr-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-sm"
                />
              </div>
              
              <AnimatePresence>
                {status === "OK" && (
                  <motion.ul 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden"
                  >
                    {data.map(({ place_id, description }) => (
                      <li 
                        key={place_id} 
                        onClick={() => handleSelect(description)}
                        className="px-5 py-3 hover:bg-surface-container-low cursor-pointer text-sm transition-colors border-b border-outline-variant/5 last:border-none"
                      >
                        {description}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-2 ml-1">Latitude</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={tempCoverage.latitude}
                  onChange={(e) => setTempCoverage({ ...tempCoverage, latitude: parseFloat(e.target.value) })}
                  className="w-full bg-surface-container-lowest border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-2 ml-1">Longitude</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={tempCoverage.longitude}
                  onChange={(e) => setTempCoverage({ ...tempCoverage, longitude: parseFloat(e.target.value) })}
                  className="w-full bg-surface-container-lowest border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 shadow-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="text-xs font-bold text-outline uppercase tracking-widest">Radius (km)</label>
                <span className="text-primary font-bold text-sm">{tempCoverage.radius} km</span>
              </div>
              <input 
                type="range"
                min="1"
                max="200"
                value={tempCoverage.radius}
                onChange={(e) => setTempCoverage({ ...tempCoverage, radius: parseInt(e.target.value) })}
                className="w-full h-2 bg-surface-container-lowest rounded-lg appearance-none cursor-pointer accent-primary hover:accent-secondary transition-all"
              />
              <div className="flex justify-between text-[10px] text-outline mt-2 px-1">
                <span>1km</span>
                <span>100km</span>
                <span>200km</span>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
            <div className="space-y-1">
              <h4 className="font-bold text-primary text-sm">Active Monitoring Zone</h4>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                This area defines the primary coverage for emergency alerts, community notices, and security responder visibility. Users within this radius will receive high-priority notifications.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10 min-h-[400px] relative group shadow-sm">
          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="w-full h-full"
              center={{
                lat: tempCoverage.latitude,
                lng: tempCoverage.longitude
              }}
              zoom={11}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              }}
            >
              <Circle
                center={{
                  lat: tempCoverage.latitude,
                  lng: tempCoverage.longitude
                }}
                radius={tempCoverage.radius * 1000}
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
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderInviteMembers = () => (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setMemberSubView('list')}
          className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h3 className="text-2xl font-headline font-bold text-primary">Invite New Members</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Invite Methods */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-secondary" />
              <h4 className="text-lg font-bold text-primary">Add via Email</h4>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
              <input 
                type="text" 
                placeholder="Enter user email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-32 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20"
              />
              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            {searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((u) => (
                  <div key={u.id} className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between border border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{u.name}</p>
                        <p className="text-xs text-outline">{u.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleInviteMember(u.id)}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold flex items-center gap-2"
                    >
                      <Mail className="w-3 h-3" />
                      Send Invite
                    </button>
                  </div>
                ))}
              </div>
            ) : searchQuery && !isSearching ? (
              <div className="p-4 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 flex items-center justify-center text-outline text-sm italic">
                No users found with that email.
              </div>
            ) : (
              <div className="p-4 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 flex items-center justify-center text-outline text-sm italic">
                Search for users by email to add them to the community
              </div>
            )}
          </section>

          <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <Link className="w-6 h-6 text-secondary" />
              <h4 className="text-lg font-bold text-primary">Share Invite Link</h4>
            </div>
            <p className="text-sm text-on-surface-variant">Share this link via WhatsApp, SMS, or send it directly by email through Lalela.</p>
            {activeCommunityLink ? (
              <div className="space-y-3">
                <div className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between border border-outline-variant/10">
                  <code className="text-[10px] font-mono truncate mr-2 text-on-surface">{`${window.location.origin}?join=${activeCommunityLink.id}`}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}?join=${activeCommunityLink.id}`);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className="p-2 hover:bg-surface-container-high rounded-lg transition-colors text-primary"
                  >
                    {linkCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-outline">
                  <span>Expires {activeCommunityLink.expires_at instanceof Timestamp ? activeCommunityLink.expires_at.toDate().toLocaleDateString() : 'N/A'}</span>
                  <span>{activeCommunityLink.uses} {activeCommunityLink.uses === 1 ? 'use' : 'uses'}</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Recipient Email</label>
                  <input
                    type="email"
                    value={inviteEmailRecipient}
                    onChange={(e) => setInviteEmailRecipient(e.target.value)}
                    placeholder="person@example.com"
                    className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/10 rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {inviteEmailStatus && (
                  <div className={cn(
                    "px-4 py-3 rounded-xl text-xs font-bold",
                    inviteEmailStatus.type === 'success' ? "bg-emerald-500/10 text-emerald-700" : "bg-error/10 text-error"
                  )}>
                    {inviteEmailStatus.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 flex items-center justify-center text-outline text-sm italic">
                No active link. Generate one below.
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setGeneratingLink(true);
                  try {
                    await generateInviteLink();
                  } catch (err: any) {
                    console.error('Failed to generate link:', err);
                    alert(err.message || 'Failed to generate invite link.');
                  } finally {
                    setGeneratingLink(false);
                  }
                }}
                disabled={generatingLink}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {activeCommunityLink ? 'Regenerate Link' : 'Generate Link'}
              </button>
              {activeCommunityLink && (
                <button
                  onClick={handleSendInviteEmail}
                  disabled={isSendingInviteEmail}
                  className="py-3 px-4 bg-surface-container-low text-primary rounded-xl font-bold text-xs border border-outline-variant/10 hover:bg-surface-container-high transition-all flex items-center gap-2"
                >
                  {isSendingInviteEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {isSendingInviteEmail ? 'Sending' : 'Email'}
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Pending Invitations */}
        <div className="space-y-6">
          <section className="bg-secondary text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Link className="w-24 h-24 rotate-45" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xl font-headline font-bold mb-2">Pending Invitations</h4>
                <p className="text-white/80 text-xs leading-relaxed">{communityInvitations.filter(inv => inv.status === 'pending').length} pending invitation{communityInvitations.filter(inv => inv.status === 'pending').length !== 1 ? 's' : ''}</p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {communityInvitations.filter(inv => inv.status === 'pending').length > 0 ? (
                  communityInvitations.filter(inv => inv.status === 'pending').map((inv) => (
                    <div key={inv.id} className="bg-white/10 rounded-xl p-3 flex items-center justify-between border border-white/20">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span className="text-xs truncate">{inv.invited_user_id.slice(0, 12)}...</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full">{inv.role}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-white/50 text-xs text-center py-4 italic">No pending invitations</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const renderMemberDetails = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMemberSubView('list')}
            className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <h3 className="text-2xl font-headline font-bold text-primary">Member Profile</h3>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-full bg-error/10 text-error text-xs font-bold hover:bg-error/20 transition-colors">
            Permanent Ban
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="space-y-6">
          <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm text-center">
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-4 border-primary/10">
              <img src={selectedMember.image} alt={selectedMember.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <h4 className="text-xl font-bold text-on-surface">{selectedMember.name}</h4>
            <p className="text-sm text-outline font-medium mb-4">{selectedMember.email}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase">{selectedMember.role}</span>
              <span className="bg-surface-container-high text-outline text-[10px] font-bold px-3 py-1 rounded-full uppercase">{selectedMember.status}</span>
            </div>
            <div className="mt-8 pt-8 border-t border-outline-variant/10 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-[10px] font-black text-outline uppercase mb-1">Joined</p>
                <p className="text-sm font-bold text-primary">
                  {selectedMember.joined_at?.toDate ? selectedMember.joined_at.toDate().toLocaleDateString() : 'Recently'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-outline uppercase mb-1">Activity</p>
                <p className="text-sm font-bold text-primary">High</p>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
            <h5 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Authority Controls
            </h5>
            <div className="space-y-3">
              {currentCommunity?.userRole === 'Admin' && selectedMember.user_id !== auth.currentUser?.uid && selectedMember.role !== 'Admin' && (
                <button 
                  onClick={() => handleUpdateRole(selectedMember.user_id, selectedMember.role === 'Moderator' ? 'Member' : 'Moderator')}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-between group",
                    selectedMember.role === 'Moderator' 
                      ? "bg-secondary/10 text-secondary hover:bg-secondary/20" 
                      : "bg-surface-container-low hover:bg-primary/10 hover:text-primary text-on-surface-variant"
                  )}
                >
                  {selectedMember.role === 'Moderator' ? 'Remove Moderator Privileges' : 'Promote to Moderator'}
                  {selectedMember.role === 'Moderator' ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              )}
              <button className="w-full py-3 px-4 bg-surface-container-low hover:bg-error/10 hover:text-error rounded-xl text-xs font-bold text-on-surface-variant transition-all flex items-center justify-between group">
                Restrict Posting
                <Ban className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </section>
        </div>

        {/* Activity Log */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-lg font-bold text-primary flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Member Activity Log
              </h4>
              <button className="text-xs font-bold text-outline hover:text-primary transition-colors">View All History</button>
            </div>
            <div className="space-y-6">
              {[
                { action: 'Posted Notice', target: 'Community Garden Update', time: '2h ago', icon: FileText, color: 'text-primary' },
                { action: 'Commented', target: 'Road Closure Sector 4', time: '5h ago', icon: MessageSquare, color: 'text-secondary' },
                { action: 'Warning Issued', target: 'Spamming in Market', time: '2 days ago', icon: AlertTriangle, color: 'text-error' },
                { action: 'Joined Community', target: 'Parkwood', time: 'Oct 12, 2025', icon: UserCheck, color: 'text-emerald-600' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 relative">
                  {idx !== 3 && <div className="absolute left-5 top-10 bottom-0 w-px bg-outline-variant/20" />}
                  <div className={cn("w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center shrink-0", item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-on-surface">
                        {item.action} <span className="text-outline font-medium">on</span> {item.target}
                      </p>
                      <span className="text-[10px] font-bold text-outline uppercase">{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-error/5 border border-error/10 p-6 rounded-3xl flex items-center justify-between">
            {selectedMember.user_id !== auth.currentUser?.uid && selectedMember.role !== 'Admin' ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error">
                    <UserMinus className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-error">Remove Member</h5>
                    <p className="text-[11px] text-on-surface-variant">Instantly revoke all access to this community.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleRemoveMember(selectedMember.user_id)}
                    className="px-4 py-2 bg-error/10 text-error text-xs font-bold rounded-full hover:bg-error/20 transition-all"
                  >
                    Deactivate
                  </button>
                  <button 
                    onClick={() => handleDeleteMember(selectedMember.user_id)}
                    className="px-4 py-2 bg-error text-white text-xs font-bold rounded-full shadow-lg shadow-error/20 active:scale-95 transition-all"
                  >
                    Permanently Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4 w-full justify-center py-2">
                <p className="text-xs font-medium text-outline italic">Self-management is restricted in moderation center</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );

  const renderMembers = () => {
    if (memberSubView === 'invite') return renderInviteMembers();
    if (memberSubView === 'details' && selectedMember) return renderMemberDetails();

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-headline font-bold text-primary">Member Management</h3>
            <p className="text-xs text-on-surface-variant font-medium">Manage roles, permissions, and community growth.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setMemberSubView('invite')}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add Members
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input 
              type="text" 
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2">
            <select className="bg-surface-container-low border-none rounded-xl text-xs font-bold px-4 py-2.5 text-on-surface-variant">
              <option>All Roles</option>
              <option>Admin</option>
              <option>Moderator</option>
              <option>Member</option>
            </select>
            <select className="bg-surface-container-low border-none rounded-xl text-xs font-bold px-4 py-2.5 text-on-surface-variant">
              <option>All Status</option>
              <option>Active</option>
              <option>Muted</option>
              <option>Flagged</option>
              <option>Unlicensed</option>
            </select>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-outline">Member</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-outline">Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-outline">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-outline">Activity</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-outline text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {/* Pending Invitations */}
              {communityInvitations.filter(inv => inv.status === 'pending').map((inv) => (
                <tr key={inv.id} className="bg-surface-container-low/30 hover:bg-surface-container-low/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-outline">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-on-surface block">Invited User</span>
                        <span className="text-[10px] text-outline font-medium">{inv.invited_user_id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-surface-container-high text-outline">
                      {inv.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-medium text-amber-600 uppercase tracking-widest">Pending Invite</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-on-surface-variant font-medium">
                    {inv.created_at instanceof Timestamp ? inv.created_at.toDate().toLocaleDateString() : 'Recently'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        className="p-2 rounded-full hover:bg-error/10 text-error transition-colors"
                        title="Cancel Invitation"
                        onClick={async () => {
                          if (window.confirm('Cancel this invitation?')) {
                            await deleteDoc(doc(db, 'community_invitations', inv.id));
                          }
                        }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {members.map((member, idx) => (
                <tr key={member.user_id} className="hover:bg-surface-bright transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high">
                        <img src={member.image} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <span className="font-bold text-on-surface">{member.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider",
                      member.role === 'Admin' ? "bg-primary text-white" : 
                      member.role === 'Moderator' ? "bg-secondary text-white" : "bg-surface-container-high text-outline"
                    )}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        member.status === 'ACTIVE' ? "bg-emerald-500" :
                        member.status === 'READ-ONLY' ? "bg-amber-500" : "bg-outline"
                      )} />
                      <span className="text-xs font-medium">{member.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-on-surface-variant font-medium">
                    {member.joined_at?.toDate ? 'Active' : 'New'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setSelectedMember(member);
                          setMemberSubView('details');
                        }}
                        className="p-2 rounded-full hover:bg-surface-container-low text-outline" title="View Details"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBusinesses = () => {
    if (businessSubView === 'import') return <BusinessImportTool onBack={() => setBusinessSubView('list')} />;

    const communityBusinesses = currentCommunity?.businesses || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-headline font-bold text-primary">Business Approvals</h3>
            <p className="text-xs text-on-surface-variant font-medium">Review and manage community business listings.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setBusinessSubView('import')}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Businesses (Smart Import)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communityBusinesses.length > 0 ? communityBusinesses.map((biz, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 shadow-sm flex flex-col gap-4"
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-container-high shrink-0">
                  <img src={biz.image || `https://picsum.photos/seed/${biz.name}/400/400`} alt={biz.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-xl text-primary">{biz.name}</h4>
                    <span className="text-[10px] font-bold text-outline uppercase">{biz.category}</span>
                  </div>
                  <p className={cn(
                    "text-xs font-medium mb-2",
                    biz.isVerified ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {biz.isVerified ? "Verified Listing" : "Pending Verification"}
                  </p>
                  <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                    {biz.description || 'No description provided.'}
                  </p>
                  {(biz.phone || biz.website || biz.address) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-outline">
                      {biz.phone && <span>📞 {biz.phone}</span>}
                      {biz.website && <a href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">🌐 Website</a>}
                      {biz.address && <span className="truncate max-w-[200px]">📍 {biz.address}</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                {!biz.isVerified ? (
                  <button 
                    onClick={() => handleApproveBusiness(biz)}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                ) : (
                  <button 
                    onClick={() => handleToggleFeatured(biz)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2",
                      biz.isFeatured 
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                    )}
                  >
                    <Star className={cn("w-4 h-4", biz.isFeatured && "fill-current")} />
                    {biz.isFeatured ? "Featured" : "Feature"}
                  </button>
                )}
                <button 
                  onClick={() => handleRemoveBusiness(biz)}
                  className="flex-1 py-3 rounded-xl bg-error/10 text-error text-xs font-bold hover:bg-error/20 active:scale-95 transition-all flex items-center justify-center gap-2 border border-error/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="md:col-span-2 p-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
              <Store className="w-12 h-12 text-primary mb-4 opacity-20" />
              <h4 className="text-lg font-bold text-primary mb-1">No Businesses Listed</h4>
              <p className="text-sm text-on-surface-variant">Start by importing businesses or adding them manually.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCategories = () => {
    const enabledCategories = currentCommunity?.enabledCategories || BUSINESS_CATEGORIES.map(c => c.id);

    const toggleCategory = async (id: string) => {
      const newCategories = enabledCategories.includes(id)
        ? enabledCategories.filter(c => c !== id)
        : [...enabledCategories, id];
      await updateCommunityCategories(currentCommunity.id, newCategories);
    };

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-headline font-bold text-primary">Category Management</h3>
            <p className="text-xs text-on-surface-variant font-medium">Manage which business categories are active in your community.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => updateCommunityCategories(currentCommunity.id, BUSINESS_CATEGORIES.map(c => c.id))}
              className="px-4 py-2 rounded-full bg-surface-container-low text-xs font-bold text-outline hover:bg-surface-container-high transition-colors"
            >
              Enable All
            </button>
            <button 
              onClick={() => updateCommunityCategories(currentCommunity.id, [])}
              className="px-4 py-2 rounded-full bg-surface-container-low text-xs font-bold text-outline hover:bg-surface-container-high transition-colors"
            >
              Disable All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUSINESS_CATEGORIES.map((cat) => (
            <motion.div 
              key={cat.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                "p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center justify-between group",
                enabledCategories.includes(cat.id)
                  ? "bg-primary/5 border-primary shadow-sm"
                  : "bg-surface-container-lowest border-outline-variant/10 opacity-60 grayscale"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm",
                  enabledCategories.includes(cat.id) ? "bg-white" : "bg-surface-container-low"
                )}>
                  {cat.icon}
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">{cat.label}</h4>
                  <p className="text-[10px] text-outline font-bold uppercase tracking-widest">
                    {cat.types.length} Types
                  </p>
                </div>
              </div>
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                enabledCategories.includes(cat.id)
                  ? "bg-primary border-primary text-white"
                  : "border-outline-variant"
              )}>
                {enabledCategories.includes(cat.id) && <CheckCircle2 className="w-4 h-4" />}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-secondary/5 border border-secondary/10 p-8 rounded-[2.5rem] flex items-start gap-6">
          <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-white shrink-0">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-primary mb-2">Dynamic Market Population</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              The categories you enable here will automatically populate the Market search filters and the "Add Business" modal for all community members.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderRules = () => (
    <div className="space-y-8">
      <h3 className="text-2xl font-headline font-bold text-primary">Governance & Rules</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-6 h-6 text-secondary" />
            <h4 className="text-lg font-bold text-primary">Posting Limits</h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
              <span className="text-sm font-medium">Max posts per user / day</span>
              <input type="number" defaultValue={3} className="w-16 bg-white border-none rounded-lg text-center font-bold text-primary" />
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
              <span className="text-sm font-medium">Max listings per week</span>
              <input type="number" defaultValue={5} className="w-16 bg-white border-none rounded-lg text-center font-bold text-primary" />
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-secondary" />
            <h4 className="text-lg font-bold text-primary">Access Control</h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
              <span className="text-sm font-medium">Allow unverified users to post</span>
              <div className="w-10 h-5 bg-outline-variant rounded-full relative">
                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
              <span className="text-sm font-medium">Require business verification</span>
              <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="bg-primary/5 border border-primary/10 p-8 rounded-[2.5rem] flex items-start gap-6">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-primary mb-2">Auto-Moderation (AI Layer)</h4>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
            Configure automated filters for spam, hate speech, and misinformation. Our AI layer can flag or automatically remove high-confidence violations.
          </p>
          <button className="px-6 py-2 bg-primary text-white text-xs font-bold rounded-full shadow-lg shadow-primary/20">
            Configure AI Filters
          </button>
        </div>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-headline font-bold text-primary">Audit & Logs</h3>
        <button className="text-primary font-bold text-sm flex items-center gap-2 hover:underline">
          Download CSV <History className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {logs.length > 0 ? logs.map((log) => {
          const actionConfig: Record<string, { icon: any, color: string }> = {
            approve: { icon: CheckCircle2, color: 'text-emerald-600' },
            reject: { icon: XCircle, color: 'text-error' },
            delete: { icon: Trash2, color: 'text-error' },
            warn: { icon: AlertTriangle, color: 'text-amber-600' },
            ban: { icon: UserX, color: 'text-error' }
          };
          const config = actionConfig[log.action] || { icon: History, color: 'text-outline' };

          return (
            <div key={log.id} className="bg-surface-container-lowest p-4 rounded-2xl flex items-center justify-between border border-outline-variant/5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center", config.color)}>
                  <config.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-on-surface">
                    <span className="capitalize">{log.action}</span> <span className="text-outline font-medium">on</span> {log.target_type}
                  </p>
                  <p className="text-[10px] text-on-surface-variant font-medium">
                    Moderator: <span className="text-primary">{log.moderator_id}</span> • Target: {log.target_id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-outline">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase">
                  {log.timestamp instanceof Timestamp ? log.timestamp.toDate().toLocaleTimeString() : 'Recently'}
                </span>
              </div>
            </div>
          );
        }) : (
          <div className="p-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
            <History className="w-12 h-12 text-primary mb-4 opacity-20" />
            <h4 className="text-lg font-bold text-primary mb-1">No Audit Logs</h4>
            <p className="text-sm text-on-surface-variant">Moderation actions will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    const communityBusinesses = currentCommunity?.businesses || [];
    const pendingPublic = posts.filter(p => p.status === 'PendingPublic');

    const filteredItems = (() => {
      const activePosts = posts.filter(p => p.status !== 'deleted');
      switch (contentFilter) {
        case 'notices': return activePosts.filter(p => p.type === 'notice');
        case 'listings': return activePosts.filter(p => p.type === 'listing');
        case 'businesses': return [];
        case 'public_queue': return pendingPublic;
        default: return activePosts;
      }
    })();

    const statusBadge = (status?: string) => {
      const map: Record<string, { label: string; cls: string }> = {
        Pinned: { label: 'Pinned', cls: 'bg-primary/10 text-primary' },
        Active: { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-600' },
        PendingPublic: { label: 'Pending Review', cls: 'bg-amber-500/10 text-amber-600' },
        Rejected: { label: 'Rejected', cls: 'bg-error/10 text-error' },
        ChangesRequested: { label: 'Changes Requested', cls: 'bg-orange-500/10 text-orange-600' },
        Archived: { label: 'Archived', cls: 'bg-outline/10 text-outline' },
      };
      const cfg = map[status || 'Active'] || map.Active;
      return <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full", cfg.cls)}>{cfg.label}</span>;
    };

    const filterTabs = [
      { key: 'all' as const, label: 'All', count: posts.filter(p => p.status !== 'deleted').length },
      { key: 'notices' as const, label: 'Notices', count: posts.filter(p => p.status !== 'deleted' && p.type === 'notice').length },
      { key: 'listings' as const, label: 'Listings', count: posts.filter(p => p.status !== 'deleted' && p.type === 'listing').length },
      { key: 'businesses' as const, label: 'Businesses', count: communityBusinesses.length },
      { key: 'public_queue' as const, label: 'Public Queue', count: pendingPublic.length },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-headline font-bold text-primary">Content & Notice Control</h3>
          <button className="px-6 py-2 bg-secondary text-white text-xs font-bold rounded-full shadow-lg shadow-secondary/20 flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            New Announcement
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setContentFilter(tab.key)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                contentFilter === tab.key
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "ml-2 text-[10px] px-1.5 py-0.5 rounded-full",
                  contentFilter === tab.key ? "bg-white/20" : "bg-outline/10"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">

            {/* Business list when businesses filter is active */}
            {contentFilter === 'businesses' && (
              communityBusinesses.length > 0 ? communityBusinesses.map((biz: any) => (
                <div key={biz.id} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface">{biz.name}</h4>
                      <p className="text-[10px] text-on-surface-variant font-medium">{biz.category} • {biz.isVerified ? 'Verified' : 'Unverified'}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                    biz.isVerified ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  )}>
                    {biz.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              )) : (
                <div className="p-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
                  <Store className="w-12 h-12 text-primary mb-4 opacity-20" />
                  <h4 className="text-lg font-bold text-primary mb-1">No Businesses</h4>
                  <p className="text-sm text-on-surface-variant">Community businesses will appear here.</p>
                </div>
              )
            )}

            {/* Post / notice / listing feed */}
            {contentFilter !== 'businesses' && (
              filteredItems.length > 0 ? filteredItems.map((notice) => (
                <div key={notice.id} className={cn(
                  "bg-surface-container-lowest p-4 rounded-2xl border shadow-sm transition-all",
                  notice.status === 'Pinned' ? "border-primary/20 ring-1 ring-primary/10" : "border-outline-variant/10"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        notice.status === 'PendingPublic' ? "bg-amber-500/10 text-amber-600" :
                        notice.category === 'Emergency' ? "bg-error/10 text-error" :
                        notice.type === 'listing' ? "bg-tertiary/10 text-tertiary" :
                        "bg-secondary/10 text-secondary"
                      )}>
                        {notice.status === 'PendingPublic' ? <Globe className="w-5 h-5" /> :
                         notice.type === 'listing' ? <Tag className="w-5 h-5" /> :
                         <Pin className={cn("w-5 h-5", notice.status === 'Pinned' && "fill-current")} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-on-surface truncate">{notice.title}</h4>
                          {statusBadge(notice.status)}
                          {notice.isPublic && notice.status !== 'PendingPublic' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 flex items-center gap-0.5">
                              <Globe className="w-2.5 h-2.5" /> Public
                            </span>
                          )}
                          {notice.type === 'notice' && notice.urgency_level && (
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                              notice.urgency_level === 'emergency' ? "bg-error/10 text-error" :
                              notice.urgency_level === 'warning' ? "bg-amber-500/10 text-amber-600" :
                              notice.urgency_level === 'info' ? "bg-blue-500/10 text-blue-600" :
                              "bg-emerald-500/10 text-emerald-600"
                            )}>
                              {notice.urgency_level}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-on-surface-variant font-medium truncate">
                          By {notice.authorName} • {notice.type === 'listing' ? 'Listing' : 'Notice'} • {notice.category}
                          {notice.price != null && <> • R{notice.price}</>}
                        </p>
                      </div>
                    </div>

                    {/* Actions for regular posts */}
                    {notice.status !== 'PendingPublic' && (
                      <div className="flex gap-1 shrink-0 ml-2">
                        {notice.type === 'notice' && (
                          <button 
                            onClick={() => setUrgencyChangePost(notice)}
                            className="p-2 rounded-full hover:bg-amber-500/10 text-amber-600 transition-colors"
                            title="Change Urgency"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleTogglePin(notice)}
                          className={cn(
                            "p-2 rounded-full transition-colors",
                            notice.status === 'Pinned' ? "bg-primary/10 text-primary" : "hover:bg-surface-container-low text-outline"
                          )}
                          title={notice.status === 'Pinned' ? "Unpin" : "Pin"}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePost(notice.id)}
                          className="p-2 rounded-full hover:bg-error/5 text-error"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Actions for pending public listings */}
                    {notice.status === 'PendingPublic' && (
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button 
                          onClick={() => handleApprovePublicListing(notice)}
                          className="p-2 rounded-full hover:bg-emerald-500/10 text-emerald-600"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            const reason = window.prompt('Reason for rejection:');
                            if (reason) handleRejectPublicListing(notice, reason);
                          }}
                          className="p-2 rounded-full hover:bg-error/5 text-error"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            const note = window.prompt('What changes are needed?');
                            if (note) handleRequestChanges(notice, note);
                          }}
                          className="p-2 rounded-full hover:bg-amber-500/10 text-amber-600"
                          title="Request Changes"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Price comparison for pending public listings */}
                  {notice.status === 'PendingPublic' && (notice.public_price != null || notice.charity_amount != null) && (
                    <div className="mt-3 pt-3 border-t border-outline-variant/10 flex gap-4 text-[10px]">
                      {notice.price != null && (
                        <span className="flex items-center gap-1 text-on-surface-variant">
                          <DollarSign className="w-3 h-3" /> Member: R{notice.price}
                        </span>
                      )}
                      {notice.public_price != null && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Globe className="w-3 h-3" /> Public: R{notice.public_price}
                        </span>
                      )}
                      {notice.charity_amount != null && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Package className="w-3 h-3" /> Charity: R{notice.charity_amount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )) : (
                <div className="p-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
                  <FileText className="w-12 h-12 text-primary mb-4 opacity-20" />
                  <h4 className="text-lg font-bold text-primary mb-1">
                    {contentFilter === 'public_queue' ? 'No Pending Listings' : 'No Content'}
                  </h4>
                  <p className="text-sm text-on-surface-variant">
                    {contentFilter === 'public_queue' 
                      ? 'Public listing submissions will appear here for review.'
                      : 'Community notices and listings will appear here.'}
                  </p>
                </div>
              )
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/10 space-y-3">
              <h4 className="text-sm font-bold text-primary">Content Overview</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Active', value: posts.filter(p => p.status === 'Active' || p.status === 'Pinned').length, color: 'text-emerald-600' },
                  { label: 'Pending', value: pendingPublic.length, color: 'text-amber-600' },
                  { label: 'Listings', value: posts.filter(p => p.type === 'listing' && p.status !== 'deleted').length, color: 'text-tertiary' },
                  { label: 'Businesses', value: communityBusinesses.length, color: 'text-secondary' },
                ].map(stat => (
                  <div key={stat.label} className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/5">
                    <p className={cn("text-lg font-black", stat.color)}>{stat.value}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-outline">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/10">
              <h4 className="text-sm font-bold text-primary mb-3">Recent Activity</h4>
              <div className="space-y-2">
                {logs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center gap-2 text-[10px]">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      log.action === 'delete' ? "bg-error" :
                      log.action === 'reject_public' ? "bg-amber-500" :
                      log.action === 'approve' || log.action === 'approve_public' ? "bg-emerald-500" :
                      log.action === 'request_changes' ? "bg-blue-500" :
                      "bg-outline"
                    )} />
                    <span className="text-on-surface-variant truncate">
                      <span className="font-bold capitalize">{log.action.replace('_', ' ')}</span> {log.target_type}
                    </span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-[10px] text-outline">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (embedded) {
    return (
      <div className="flex flex-col md:flex-row w-full gap-8">
        {/* Sidebar Nav - Simplified for embedded view */}
        <aside className="w-full md:w-64 space-y-2">
          <div className="mb-4 px-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-outline">Moderation Menu</h4>
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ModTab)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm",
                activeTab === tab.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                  : "text-on-surface-variant hover:bg-surface-container-low"
              )}
            >
              <div className="flex items-center gap-3">
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </div>
              {tab.count && (
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full",
                  activeTab === tab.id ? "bg-white text-primary" : "bg-error text-white"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'members' && renderMembers()}
              {activeTab === 'businesses' && renderBusinesses()}
              {activeTab === 'categories' && renderCategories()}
              {activeTab === 'rules' && renderRules()}
              {activeTab === 'logs' && renderLogs()}
              {activeTab === 'content' && renderContent()}
              {activeTab === 'coverage' && renderCoverage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col organic-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 px-6 py-4">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-surface-container-low rounded-full transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-primary font-headline">Moderation Center</h2>
              <p className="text-[10px] text-outline font-bold uppercase tracking-widest">{currentCommunity?.name || 'Community'} Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse" />
              Live Monitoring Active
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20">
              <img src="https://picsum.photos/seed/admin/100/100" alt="Admin" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 p-6 border-r border-outline-variant/5 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ModTab)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm",
                activeTab === tab.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                  : "text-on-surface-variant hover:bg-surface-container-low"
              )}
            >
              <div className="flex items-center gap-3">
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </div>
              {tab.count && (
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full",
                  activeTab === tab.id ? "bg-white text-primary" : "bg-error text-white"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'members' && renderMembers()}
              {activeTab === 'businesses' && renderBusinesses()}
              {activeTab === 'categories' && renderCategories()}
              {activeTab === 'rules' && renderRules()}
              {activeTab === 'logs' && renderLogs()}
              {activeTab === 'content' && renderContent()}
              {activeTab === 'coverage' && renderCoverage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Urgency Change Modal */}
      <AnimatePresence>
        {urgencyChangePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setUrgencyChangePost(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-outline-variant/10">
                <h3 className="text-lg font-bold text-primary font-headline">Change Urgency Level</h3>
                <p className="text-xs text-on-surface-variant mt-1 truncate">"{urgencyChangePost.title}"</p>
              </div>
              <div className="p-6 space-y-3">
                {([
                  { key: 'emergency' as const, label: 'Emergency', desc: 'Critical alert — triggers emergency mode', cls: 'border-error/30 hover:bg-error/5', activeCls: 'bg-error/10 border-error ring-1 ring-error/20', textCls: 'text-error' },
                  { key: 'warning' as const, label: 'Warning', desc: 'High priority community warning', cls: 'border-amber-500/30 hover:bg-amber-500/5', activeCls: 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/20', textCls: 'text-amber-600' },
                  { key: 'information' as const, label: 'Information', desc: 'Low priority informational notice', cls: 'border-blue-500/30 hover:bg-blue-500/5', activeCls: 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/20', textCls: 'text-blue-600' },
                  { key: 'normal' as const, label: 'General', desc: 'Standard community notice', cls: 'border-emerald-500/30 hover:bg-emerald-500/5', activeCls: 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/20', textCls: 'text-emerald-600' },
                ]).map((option) => {
                  const currentLevel = urgencyChangePost.postSubtype || urgencyChangePost.urgency_level || 'normal';
                  const isCurrent = currentLevel === option.key || 
                    (option.key === 'normal' && currentLevel === 'general') ||
                    (option.key === 'information' && currentLevel === 'info');
                  return (
                    <button
                      key={option.key}
                      disabled={isCurrent}
                      onClick={() => handleChangeUrgency(urgencyChangePost, option.key)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all",
                        isCurrent ? option.activeCls : option.cls,
                        isCurrent && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={cn("text-sm font-bold", option.textCls)}>{option.label}</h4>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">{option.desc}</p>
                        </div>
                        {isCurrent && (
                          <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full", option.activeCls)}>
                            Current
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {(urgencyChangePost.urgency === 'emergency' || urgencyChangePost.urgency_level === 'emergency') && (
                  <p className="text-[10px] text-amber-600 bg-amber-500/5 p-3 rounded-xl font-medium">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Downgrading from Emergency will end the community emergency mode.
                  </p>
                )}
              </div>
              <div className="p-4 border-t border-outline-variant/10">
                <button
                  onClick={() => setUrgencyChangePost(null)}
                  className="w-full py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
