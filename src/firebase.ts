import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Support environment variables for local development
const config = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
};

// Initialize Firebase SDK
const app = initializeApp(config);
export const db = getFirestore(app, config.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Validate connection to Firestore
async function testConnection() {
  try {
    // Attempt to fetch a non-existent document to test the connection
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}

testConnection();
