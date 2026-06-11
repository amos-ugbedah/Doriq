import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDz-XeDNEVZoAL3mrcNYrIOO84rqDU4nt8",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "doriq-e0e2a.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "doriq-e0e2a",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "doriq-e0e2a.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "444027998115",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:444027998115:web:4a96fc7a274e118874d416"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Named exports
export { auth, db, onAuthStateChanged, app as firebaseApp };

// Default export
export default app;