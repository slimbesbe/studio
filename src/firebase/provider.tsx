
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, Timestamp, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useRouter, usePathname } from 'next/navigation';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  profile: any | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  profile: any | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

const ADMIN_EMAILS = ['slim.besbes@yahoo.fr', 'jedgrira1@gmail.com'];
const ADMIN_UIDS = ['Adknzym5N6cMeJnYBCRaAdBrA0r1', 'vwyrAnNtQkSojYSEEK2qkRB5feh2', 'GPgreBe1JzZYbEHQGn3xIdcQGQs1'];

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  // 1. Gérer l'état d'authentification
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setIsUserLoading(false);
      }
    }, (error) => {
      console.error("Auth error:", error);
      setUserError(error);
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // 2. Gérer le profil Firestore
  useEffect(() => {
    if (!firestore || !user) {
      if (!user) setIsUserLoading(false);
      return;
    }

    setIsUserLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    
    // Détection Super Admin robuste (Email ou UID)
    const isSA = (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) || 
                 ADMIN_UIDS.includes(user.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const profileData = docSnap.data();
        
        let isExpired = false;
        if (profileData.expiresAt) {
          const expiryDate = profileData.expiresAt instanceof Timestamp 
            ? profileData.expiresAt.toDate() 
            : new Date(profileData.expiresAt);
          if (expiryDate < new Date()) isExpired = true;
        }

        const currentStatus = isExpired ? 'expired' : (profileData.status || 'active');
        const role = isSA ? 'super_admin' : (profileData.role || 'user');

        setProfile({ ...profileData, id: user.uid, status: currentStatus, role });
      } else if (isSA) {
        const initialAdmin = {
          id: user.uid,
          email: user.email,
          firstName: user.email?.split('@')[0] || 'Admin',
          lastName: 'Simu-lux',
          role: 'super_admin',
          status: 'active',
          createdAt: serverTimestamp()
        };
        setDoc(userDocRef, initialAdmin, { merge: true }).catch(console.error);
        setProfile(initialAdmin);
      } else {
        setProfile(null);
      }
      setIsUserLoading(false);
    }, (error) => {
      console.error("Profile sync error:", error);
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  // 3. Suivi du temps d'étude
  useEffect(() => {
    if (!firestore || !user || user.isAnonymous || !profile) return;
    const interval = setInterval(() => {
      setDoc(doc(firestore, 'users', user.uid), { 
        totalTimeSpent: increment(60),
        lastLoginAt: serverTimestamp() 
      }, { merge: true }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [firestore, user, profile]);

  const contextValue = useMemo((): FirebaseContextState => ({
    areServicesAvailable: !!(firebaseApp && firestore && auth),
    firebaseApp,
    firestore,
    auth,
    user,
    profile,
    isUserLoading,
    userError,
  }), [firebaseApp, firestore, auth, user, profile, isUserLoading, userError]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useFirebase must be used within a FirebaseProvider.');
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    profile: context.profile,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
export const useUser = () => {
  const { user, profile, isUserLoading, userError } = useFirebase();
  return { user, profile, isUserLoading, userError };
};

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T & {__memo?: boolean} {
  const memoized = React.useMemo(factory, deps);
  if(typeof memoized === 'object' && memoized !== null) {
    (memoized as any).__memo = true;
  }
  return memoized as any;
}
