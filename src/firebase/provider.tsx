
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, Timestamp, setDoc, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useRouter, usePathname } from 'next/navigation';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  profile: any | null;
  isUserLoading: boolean;
  userError: Error | null;
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

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    profile: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth || !firestore) return;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Track connection timestamps
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        
        // Listen to profile
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            
            // Check expiry
            let isExpired = false;
            if (profileData.expiresAt) {
              const expiryDate = profileData.expiresAt instanceof Timestamp 
                ? profileData.expiresAt.toDate() 
                : new Date(profileData.expiresAt);
              if (expiryDate < new Date()) {
                isExpired = true;
              }
            }

            const currentStatus = isExpired ? 'expired' : profileData.status;

            setUserAuthState(prev => ({ 
              ...prev, 
              user: firebaseUser, 
              profile: { ...profileData, status: currentStatus }, 
              isUserLoading: false 
            }));

            // Update login timestamps if needed (only once per session ideally)
            if (!sessionStorage.getItem(`logged_${firebaseUser.uid}`)) {
              const updateData: any = { lastLoginAt: serverTimestamp() };
              if (!profileData.firstLoginAt) {
                updateData.firstLoginAt = serverTimestamp();
              }
              setDoc(userDocRef, updateData, { merge: true });
              sessionStorage.setItem(`logged_${firebaseUser.uid}`, 'true');
            }

            // Redirect if not active
            if (currentStatus !== 'active' && pathname.startsWith('/dashboard') && !firebaseUser.isAnonymous) {
               router.push('/access-denied');
            }
          } else {
            setUserAuthState(prev => ({ ...prev, user: firebaseUser, isUserLoading: false }));
          }
        });

        return () => unsubscribeProfile();
      } else {
        setUserAuthState({ user: null, profile: null, isUserLoading: false, userError: null });
      }
    });

    return () => unsubscribeAuth();
  }, [auth, firestore, pathname, router]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      profile: userAuthState.profile,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

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
