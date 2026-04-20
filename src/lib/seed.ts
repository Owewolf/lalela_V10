import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  setDoc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTIONS_TO_CLEAR = [
  'users',
  'users_public',
  'communities',
  'licenses',
  'user_businesses'
];

export const clearDatabase = async (currentUserId: string) => {
  console.log('Starting database clear...');
  
  // Collections to clear
  const collections = [
    'users',
    'users_public',
    'communities',
    'licenses',
    'user_businesses'
  ];

  for (const collectionName of collections) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    
    for (const document of querySnapshot.docs) {
      // Skip the current user's profile to avoid session issues
      if (collectionName === 'users' && document.id === currentUserId) continue;
      if (collectionName === 'users_public' && document.id === currentUserId) continue;

      const batch = writeBatch(db);
      
      // Clear subcollections for communities
      if (collectionName === 'communities') {
        const subcollections = [
          'members', 'charities', 'posts', 'reports', 
          'moderation_logs', 'security_events', 'system_metrics', 
          'member_locations', 'security_locations'
        ];
        for (const sub of subcollections) {
          const subSnapshot = await getDocs(collection(db, 'communities', document.id, sub));
          subSnapshot.forEach(subDoc => {
            batch.delete(subDoc.ref);
          });
        }
      }
      
      // Clear sessions for users
      if (collectionName === 'users') {
        const sessionsSnapshot = await getDocs(collection(db, 'users', document.id, 'sessions'));
        sessionsSnapshot.forEach(sessionDoc => {
          batch.delete(sessionDoc.ref);
        });
      }
      
      batch.delete(document.ref);
      await batch.commit();
    }
    console.log(`Cleared collection: ${collectionName}`);
  }
};

export const seedDatabase = async (userId: string, userEmail: string) => {
  console.log('Starting minimal database seed...');
  
  // We only ensure the current user has a valid profile
  // No sample communities, members, or posts are added
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    id: userId,
    name: 'Admin User',
    email: userEmail,
    license_status: 'LICENSED',
    status: 'ACTIVE',
    created_at: serverTimestamp(),
    locationSharingEnabled: true,
    isSecurityMember: true,
    defaultLocation: {
      name: 'Johannesburg, South Africa',
      latitude: -26.2041,
      longitude: 28.0473
    }
  }, { merge: true });

  const publicUserRef = doc(db, 'users_public', userId);
  await setDoc(publicUserRef, {
    name: 'Admin User',
    profile_image: `https://picsum.photos/seed/${userId}/100/100`,
    updated_at: serverTimestamp()
  }, { merge: true });

  console.log('Minimal seed complete!');

  // Add requested platform users for testing search
  const testUsers = [
    { uid: 'user_one', name: 'User One', email: 'one@one.com' },
    { uid: 'user_two', name: 'User Two', email: 'two@two.com' }
  ];

  for (const tu of testUsers) {
    await setDoc(doc(db, 'users', tu.uid), {
      id: tu.uid,
      name: tu.name,
      email: tu.email,
      license_status: 'UNLICENSED',
      status: 'ACTIVE',
      created_at: serverTimestamp()
    }, { merge: true });

    await setDoc(doc(db, 'users_public', tu.uid), {
      name: tu.name,
      profile_image: `https://picsum.photos/seed/${tu.uid}/100/100`,
      updated_at: serverTimestamp()
    }, { merge: true });

    await setDoc(doc(db, 'user_search', tu.email.toLowerCase()), {
      uid: tu.uid,
      name: tu.name,
      email: tu.email
    }, { merge: true });
  }
};
