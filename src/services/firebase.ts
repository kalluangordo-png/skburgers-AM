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

// Log de depuração para o Vercel (sem mostrar a chave inteira por segurança)
if (typeof window !== 'undefined') {
  console.log("SK-Firebase: Inicializando com ProjectID:", firebaseConfig.projectId);
  if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    console.warn("SK-Firebase: VITE_FIREBASE_API_KEY não detectada nas variáveis de ambiente. Usando fallback.");
  }
}

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Resiliência SK-Maps: Ativar experimentalForceLongPolling e persistentLocalCache
// Adicionado suporte para databaseId customizado se necessário
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true
}, databaseId);
