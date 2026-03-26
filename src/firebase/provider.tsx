
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

const ADMIN_EMAIL = 'slim.besbes@yahoo.fr'.toLowerCase();

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
        const isSA = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL;
        
        // Souscription au profil Firestore
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
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
            // Priorité absolue au rôle Super Admin si l'email correspond
            const role = isSA ? 'super_admin' : (profileData.role || 'user');

            setUserAuthState({ 
              user: firebaseUser, 
              profile: { ...profileData, id: firebaseUser.uid, status: currentStatus, role }, 
              isUserLoading: false,
              userError: null
            });
          } else {
            // Création automatique du profil si Admin
            if (isSA) {
              const initialAdmin = {
                id: firebaseUser.uid,
                email: ADMIN_EMAIL,
                firstName: 'Slim',
                lastName: 'Besbes',
                role: 'super_admin',
                status: 'active',
                createdAt: serverTimestamp()
              };
              setDoc(userDocRef, initialAdmin, { merge: true }).catch(() => {});
              setUserAuthState({ user: firebaseUser, profile: initialAdmin, isUserLoading: false, userError: null });
            } else {
              setUserAuthState({ user: firebaseUser, profile: null, isUserLoading: false, userError: null });
            }
          }
        }, (error) => {
          console.error("Profile sync error:", error);
          // Fallback pour l'admin en cas d'erreur Firestore
          if (isSA) {
            setUserAuthState({ 
              user: firebaseUser, 
              profile: { id: firebaseUser.uid, email: ADMIN_EMAIL, role: 'super_admin', status: 'active' }, 
              isUserLoading: false, 
              userError: null 
            });
          }
        });

        return () => unsubscribeProfile();
      } else {
        setUserAuthState({ user: null, profile: null, isUserLoading: false, userError: null });
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
          router.push('/');
        }
      }
    });

    return () => unsubscribeAuth();
  }, [auth, firestore, pathname, router]);

  // Track time spent only for registered users
  useEffect(() => {
    if (!auth || !firestore || !userAuthState.user || userAuthState.user.isAnonymous) return;
    const interval = setInterval(() => {
      setDoc(doc(firestore, 'users', userAuthState.user!.uid), { 
        totalTimeSpent: increment(60),
        lastLoginAt: serverTimestamp() 
      }, { merge: true }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [auth, firestore, userAuthState.user]);

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
