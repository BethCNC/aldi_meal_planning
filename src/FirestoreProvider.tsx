// src/FirestoreProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { firebaseAuth, firestore } from './lib/firestore';
import type { User } from 'firebase/auth';

interface FirestoreContextType {
  auth: typeof firebaseAuth;
  db: typeof firestore;
  user: User | null;
}

const FirestoreContext = createContext<FirestoreContextType | undefined>(undefined);

export const FirestoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  const value: FirestoreContextType = {
    auth: firebaseAuth,
    db: firestore,
    user,
  };

  return <FirestoreContext.Provider value={value}>{children}</FirestoreContext.Provider>;
};

export const useFirestore = () => {
  const ctx = useContext(FirestoreContext);
  if (!ctx) throw new Error('useFirestore must be used within a FirestoreProvider');
  return ctx;
};
