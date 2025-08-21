import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Hardcoded Firebase config to prevent any environment variable loading issues.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'pollpulse-e3m7f.firebaseapp.com',
  projectId: 'pollpulse-e3m7f',
  storageBucket: 'pollpulse-e3m7f.appspot.com',
  messagingSenderId: '76495353023',
  appId: '1:76495353023:web:0b0432b13e1f0e42517855',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
