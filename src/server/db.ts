import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const firebaseConfig = require('../../firebase-applet-config.json');

// Initialize Firebase Admin SDK (uses Application Default Credentials in production,
// or GOOGLE_APPLICATION_CREDENTIALS env var for local development)
function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // If a service account key file is provided via env var, use it
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });
  }

  // Otherwise initialize with just project ID (works in Firebase/GCloud environments)
  return initializeApp({ projectId: firebaseConfig.projectId });
}

const app = initAdmin();
export const adminDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// --- Public Data Queries ---

export async function getPublicCommunities() {
  const snapshot = await adminDb
    .collection('communities')
    .where('status', '==', 'ACTIVE')
    .get();

  const communities = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();

      // Get member count
      const membersSnap = await adminDb
        .collection('communities')
        .doc(doc.id)
        .collection('members')
        .count()
        .get();

      // Get active public listing count
      const listingsSnap = await adminDb
        .collection('communities')
        .doc(doc.id)
        .collection('posts')
        .where('type', '==', 'listing')
        .where('status', '==', 'Active')
        .count()
        .get();

      // Get active business count
      const businessSnap = await adminDb
        .collection('user_businesses')
        .where('communityIds', 'array-contains', doc.id)
        .where('status', '==', 'ACTIVE')
        .count()
        .get();

      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        status: data.status,
        coverageArea: data.coverageArea || null,
        memberCount: membersSnap.data().count,
        listingCount: listingsSnap.data().count,
        businessCount: businessSnap.data().count,
      };
    })
  );

  // Only return communities with a valid coverage area (needed for map)
  return communities.filter((c) => c.coverageArea);
}

export default adminDb;
