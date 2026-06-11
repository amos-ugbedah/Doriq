import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  // Paste your Firebase Config from the Firebase Console Settings here
  apiKey: "xxxxxxxx",
  authDomain: "doriq-e0e2a.firebaseapp.com",
  projectId: "doriq-e0e2a",
  storageBucket: "doriq-e0e2a.appspot.com",
  messagingSenderId: "xxxxxx",
  appId: "xxxxxx"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const listenToUserBalance = (userId, callback) => {
  return onSnapshot(doc(db, "users", userId), (doc) => {
    if (doc.exists()) callback(doc.data());
  });
};