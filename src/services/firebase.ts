import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

// Agora os dados estão fixos, não precisa mais do arquivo .env para o Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBh3hP90N3atIJO1o1gd0PfBdDYeM2YVVA",
  authDomain: "skburgers.firebaseapp.com",
  projectId: "skburgers",
  storageBucket: "skburgers.firebasestorage.app",
  messagingSenderId: "272321954556",
  appId: "1:272321954556:web:41bb8cd7c357e39209cd79",
  measurementId: "G-BEW46FDE2Z"
};

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Resiliência SK-Maps
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true
});