
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, Timestamp, setDoc, serverTimestamp, increment, getDoc } from 'firebase/firestore';
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

const ADMIN_EMAIL = 'slim.besbes@yahoo.fr';
const ADMIN_UID = 'GPgreBe1JzZYbEHQGn3xIdcQGQs1';

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

  // Track auth state and profile
  useEffect(() => {
    if (!auth || !firestore) return;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        
        // Bootstrap Admin Direct (Sans await pour ne pas bloquer le rendu)
        if (firebaseUser.email === ADMIN_EMAIL || firebaseUser.uid === ADMIN_UID) {
          const adminDocRef = doc(firestore, 'roles_admin', firebaseUser.uid);
          setDoc(adminDocRef, { 
            createdAt: serverTimestamp(),
            email: firebaseUser.email || ADMIN_EMAIL,
            isSuperAdmin: true
          }, { merge: true }).catch(() => {});
        }

        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            
            let isExpired = false;
            if (profileData.expiresAt) {
              const expiryDate = profileData.expiresAt instanceof Timestamp 
                ? profileData.expiresAt.toDate() 
                : new Date(profileData.expiresAt);
              if (expiryDate < new Date()) {
                isExpired = true;
              }
            }

            const currentStatus = isExpired ? 'expired' : (profileData.status || 'active');

            setUserAuthState(prev => ({ 
              ...prev, 
              user: firebaseUser, 
              profile: { ...profileData, id: firebaseUser.uid, status: currentStatus }, 
              isUserLoading: false 
            }));

            // Stats de connexion (Une fois par session navigateur)
            const sessionKey = `session_v6_${firebaseUser.uid}`;
            if (!sessionStorage.getItem(sessionKey)) {
              const now = serverTimestamp();
              const updateData: any = { 
                lastLoginAt: now,
                updatedAt: now,
                id: firebaseUser.uid
              };
              
              // On ne définit firstLoginAt QUE si aucun champ de date n'existe (Respect de l'ancienneté)
              if (!profileData.firstLoginAt && !profileData.createdAt) {
                updateData.firstLoginAt = now;
                updateData.createdAt = now;
              }

              setDoc(userDocRef, updateData, { merge: true }).catch(() => {});
              sessionStorage.setItem(sessionKey, 'true');
            }

            // Global access control
            if (!firebaseUser.isAnonymous && currentStatus !== 'active' && pathname.startsWith('/dashboard')) {
               router.push('/access-denied');
            }
          } else {
            // Création automatique du profil si inexistant pour le Super Admin
            if (firebaseUser.email === ADMIN_EMAIL || firebaseUser.uid === ADMIN_UID) {
              const now = serverTimestamp();
              const initialData = {
                id: firebaseUser.uid,
                email: firebaseUser.email || ADMIN_EMAIL,
                firstName: 'Slim',
                lastName: 'Besbes',
                role: 'super_admin',
                status: 'active',
                createdAt: now,
                firstLoginAt: now,
                lastLoginAt: now
              };
              setDoc(userDocRef, initialData).catch(() => {});
              setUserAuthState(prev => ({ ...prev, user: firebaseUser, profile: initialData, isUserLoading: false }));
            } else {
              setUserAuthState(prev => ({ ...prev, user: firebaseUser, isUserLoading: false }));
            }
          }
        }, (error) => {
          console.error("Profile snapshot error:", error);
          setUserAuthState(prev => ({ ...prev, user: firebaseUser, isUserLoading: false }));
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

  // Heartbeat to track "Time Spent on Site"
  useEffect(() => {
    if (!auth || !firestore || !userAuthState.user || userAuthState.user.isAnonymous) return;

    const interval = setInterval(() => {
      const userDocRef = doc(firestore, 'users', userAuthState.user!.uid);
      setDoc(userDocRef, { 
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
