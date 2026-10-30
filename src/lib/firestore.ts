// src/lib/firestore.ts
import { initializeApp } from 'firebase/app';
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

let app: any;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // If the app is already initialized, reuse it (safe for hot reloads).
}

export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);

export async function sendEmailSignInLink(email: string) {
  const actionCodeSettings = {
    // Redirect back to the app. The app should call `signInWithEmailLink` when loaded with the link.
    url: typeof window !== 'undefined' ? window.location.origin : undefined,
    handleCodeInApp: true,
  } as any;

  await sendSignInLinkToEmail(firebaseAuth, email, actionCodeSettings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('emailForSignIn', email);
  }
}

export function isEmailSignInLink(link: string) {
  return isSignInWithEmailLink(firebaseAuth, link);
}

export async function verifySignInWithEmailLink(link: string) {
  if (typeof window === 'undefined') throw new Error('verifySignInWithEmailLink must run in browser');
  const email = window.localStorage.getItem('emailForSignIn') || window.prompt('Please provide your email for confirmation');
  if (!email) throw new Error('Email required to complete sign-in');
  const result = await signInWithEmailLink(firebaseAuth, email, link);
  window.localStorage.removeItem('emailForSignIn');
  return result.user;
}
