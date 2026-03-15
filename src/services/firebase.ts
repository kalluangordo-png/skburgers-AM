import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

// Configuração oficial SK BURGERS
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBh3hP90N3atIJO1o1gd0PfBdDYeM2YVVA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "skburgers.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "skburgers",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "skburgers.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "272321954556",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:272321954556:web:41bb8cd7c357e39209cd79",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-BEW46FDE2Z"
};

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Resiliência SK-Maps: Ativar experimentalForceLongPolling e persistentLocalCache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true
});
