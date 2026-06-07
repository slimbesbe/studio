
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, Timestamp, setDoc, serverTimestamp, increment, collection, addDoc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { logActivity } from '@/lib/services/logging-service';
import { sendAdminAlertOnFirstLogin } from '@/lib/services/mail-service';
import { useRouter } from 'next/navigation';

interface FirebaseContextState {
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

const ADMIN_EMAILS = ['slim.besbes@yahoo.fr', 'contact@inovexio.com', 'jedgrira1@gmail.com'];
const ADMIN_UIDS = ['vwyrAnNtQkSojYSEEK2qkRB5feh2', 'GPgreBe1JzZYbEHQGn3xIdcQGQs1', 've5V0MUPoccuOdBNGYsz6QYY89L2', 'Adknzym5N6cMeJnYbCRaAdBrA0r1'];

export const FirebaseProvider: React.FC<{children: ReactNode, firebaseApp: FirebaseApp, firestore: Firestore, auth: Auth}> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const router = useRouter();
  
  const welcomeTriggered = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setIsUserLoading(false);
      }
    }, (error) => {
      setUserError(error);
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!firestore || !user) {
      if (!user) {
        setIsUserLoading(false);
        setProfile(null);
      }
      return;
    }

    setIsUserLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const isHardcodedAdmin = (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) || 
                             ADMIN_UIDS.includes(user.uid);

    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const profileData = docSnap.data();
        
        if (profileData.isLocked === true && !isHardcodedAdmin) {
          localStorage.clear();
          sessionStorage.clear();
          await signOut(auth);
          router.replace('/access-denied');
          return;
        }

        let isExpired = false;
        if (profileData.expiresAt) {
          try {
            const expiryDate = profileData.expiresAt instanceof Timestamp 
              ? profileData.expiresAt.toDate() 
              : new Date(profileData.expiresAt);
            if (expiryDate < new Date()) isExpired = true;
          } catch {
            isExpired = false;
          }
        }

        const currentStatus = isExpired ? 'expired' : (profileData.status || 'active');
        const finalRole = isHardcodedAdmin ? (profileData.role || 'super_admin') : (profileData.role || 'user');

        setProfile({ 
          ...profileData, 
          id: user.uid, 
          status: currentStatus, 
          role: finalRole 
        });
        setIsUserLoading(false);
      } else {
        // AUTO-CRÉATION POUR ADMINS OU DEMO
        if (isHardcodedAdmin) {
          const initialAdmin = {
            id: user.uid,
            email: user.email,
            firstName: user.email?.split('@')[0] || 'Admin',
            lastName: 'Simu-lux',
            role: 'super_admin',
            status: 'active',
            isLocked: false,
            createdAt: serverTimestamp()
          };
          await setDoc(userDocRef, initialAdmin, { merge: true });
        } else if (user.isAnonymous) {
          // AUTO-CRÉATION POUR ESSAI GRATUIT
          const demoProfile = {
            id: user.uid,
            role: 'demo',
            groupId: 'DEMO',
            firstName: 'Visiteur',
            lastName: 'Démo',
            status: 'active',
            isLocked: false,
            createdAt: serverTimestamp(),
            simulationsCount: 0,
            averageScore: 0,
            totalTimeSpent: 0
          };
          await setDoc(userDocRef, demoProfile, { merge: true });
        } else {
          setProfile({ id: user.uid, email: user.email, role: 'user', status: 'active', isLocked: false });
        }
        setIsUserLoading(false);
      }
    });

    return () => unsubscribe();
  }, [firestore, user, auth, router]);

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
