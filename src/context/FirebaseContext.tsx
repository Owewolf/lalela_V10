import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut , RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, Timestamp, serverTimestamp, collectionGroup, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, user?: User | null) {
  const currentUser = user || auth.currentUser;
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface FirebaseContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;

  confirmationResult: ConfirmationResult | null;
  setupRecaptcha: (containerId: string) => void;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  verifySmsCode: (code: string) => Promise<any>;
  clearPhoneAuth: () => void;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifier = React.useRef<RecaptchaVerifier | null>(null);

  const setupRecaptcha = useCallback((containerId: string) => {
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
      });
    }
  }, []);

  const signInWithPhone = useCallback(async (phoneNumber: string) => {
    if (!recaptchaVerifier.current) {
      throw new Error('reCAPTCHA not initialized');
    }
    const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier.current);
    setConfirmationResult(result);
  }, []);

  const verifySmsCode = useCallback(async (code: string) => {
    if (!confirmationResult) {
      throw new Error('No SMS verification in progress');
    }
    const result = await confirmationResult.confirm(code);
    setConfirmationResult(null);
    return result;
  }, [confirmationResult]);

  const clearPhoneAuth = useCallback(() => {
    setConfirmationResult(null);
  }, []);
  const lastMemberSyncKeyRef = React.useRef<string | null>(null);

  const syncMembershipLocation = async (payload: Pick<Partial<UserProfile>, 'defaultLocation' | 'locationSharingEnabled'>) => {
    if (!user) return;

    const hasLocation = !!payload.defaultLocation;
    const hasSharingFlag = payload.locationSharingEnabled !== undefined;
    if (!hasLocation && !hasSharingFlag) return;

    const membersQuery = query(collectionGroup(db, 'members'), where('user_id', '==', user.uid));
    const memberDocs = await getDocs(membersQuery);

    await Promise.all(memberDocs.docs.map((memberDoc) => {
      const memberUpdates: { latitude?: number; longitude?: number; locationSharingEnabled?: boolean } = {};

      if (payload.defaultLocation) {
        memberUpdates.latitude = payload.defaultLocation.latitude;
        memberUpdates.longitude = payload.defaultLocation.longitude;
      }

      if (payload.locationSharingEnabled !== undefined) {
        memberUpdates.locationSharingEnabled = payload.locationSharingEnabled;
      }

      if (Object.keys(memberUpdates).length === 0) {
        return Promise.resolve();
      }

      return updateDoc(memberDoc.ref, memberUpdates);
    }));
  };

  useEffect(() => {
    if (user && userProfile) {
      const syncPublicProfile = async () => {
        const publicDocRef = doc(db, 'users_public', user.uid);
        const searchDocRef = doc(db, 'user_search', (user.email || '').toLowerCase());
        try {
          const publicDoc = await getDoc(publicDocRef);
          if (!publicDoc.exists() || 
              publicDoc.data().name !== userProfile.name || 
              publicDoc.data().profile_image !== userProfile.profile_image) {
            await setDoc(publicDocRef, {
              name: userProfile.name,
              profile_image: userProfile.profile_image || `https://picsum.photos/seed/${user.uid}/100/100`,
              updated_at: serverTimestamp()
            }, { merge: true });
          }

          if (user.email) {
            await setDoc(searchDocRef, {
              uid: user.uid,
              name: userProfile.name,
              email: user.email
            }, { merge: true });
          }
        } catch (err) {
          console.error("Error syncing public profile:", err);
        }
      };
      syncPublicProfile();

      const profileSyncKey = [
        user.uid,
        userProfile.defaultLocation?.latitude ?? 'none',
        userProfile.defaultLocation?.longitude ?? 'none',
        userProfile.locationSharingEnabled ?? 'unset'
      ].join('|');

      if (lastMemberSyncKeyRef.current !== profileSyncKey) {
        lastMemberSyncKeyRef.current = profileSyncKey;
        syncMembershipLocation({
          defaultLocation: userProfile.defaultLocation,
          locationSharingEnabled: userProfile.locationSharingEnabled,
        }).catch((error) => {
          console.error('Failed to backfill member location from profile:', error);
        });
      }
    }
  }, [user, userProfile]);

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const publicDocRef = doc(db, 'users_public', user.uid);

    try {
      // Update private profile
      await setDoc(userDocRef, data, { merge: true });

      // Keep community member records in sync with saved account location.
      if (data.defaultLocation || data.locationSharingEnabled !== undefined) {
        await syncMembershipLocation({
          defaultLocation: data.defaultLocation,
          locationSharingEnabled: data.locationSharingEnabled,
        });
      }

      // Update public profile if name or image is changed
      if (data.name || data.profile_image !== undefined) {
        const publicData: any = {};
        if (data.name) publicData.name = data.name;
        if (data.profile_image !== undefined) publicData.profile_image = data.profile_image;
        publicData.updated_at = serverTimestamp();
        await setDoc(publicDocRef, publicData, { merge: true });

        // Also update user_search if name changed
        if (data.name && user.email) {
          await setDoc(doc(db, 'user_search', user.email.toLowerCase()), {
            name: data.name
          }, { merge: true });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userDocRef.path, user);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      const email = user.email;
      const uid = user.uid;

      // 1. Add email to blacklist to prevent re-registration
      if (email) {
        await setDoc(doc(db, 'blacklisted_emails', email), {
          deleted_at: serverTimestamp(),
          original_uid: uid
        });
      }

      // 2. Delete user profile data
      await setDoc(doc(db, 'users', uid), { 
        deleted: true, 
        deleted_at: serverTimestamp(),
        email: null, // Remove PII
        name: 'Deleted User'
      }, { merge: true });

      // 3. Delete the auth account
      await user.delete();
      
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);

      if (firebaseUser) {
        // Listen to user profile changes
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, userDocRef.path, firebaseUser);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, userProfile, loading, isAuthReady, updateUserProfile, signOut, deleteAccount , confirmationResult, setupRecaptcha, signInWithPhone, verifySmsCode, clearPhoneAuth }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
