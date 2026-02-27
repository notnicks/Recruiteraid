import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// (Auto-populated by Firebase Hosting implicitly, but we need it local for dev)
const firebaseConfig = {
    projectId: "recruiteraid",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
