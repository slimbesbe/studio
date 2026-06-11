
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
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

const ADMIN_EMAILS = [
  'slim.besbes@yahoo.fr', 
  'contact@inovexio.com', 
  'jedgrira1@gmail.com', 
  'a.oueslati@konexia-consulting.com'
];

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
    if (!firestore || !user) return;

    setIsUserLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.isLocked === true && !ADMIN_EMAILS.includes(user.email || '')) {
          await signOut(auth);
          router.replace('/access-denied');
          return;
        }

        // FORCE DEMO SECURITY: Tout utilisateur marqué "demo" ou anonyme est rattaché au groupe DEMO
        if ((data.role === 'demo' || user.isAnonymous) && data.groupId !== 'DEMO') {
          await setDoc(userDocRef, { groupId: 'DEMO', role: 'demo' }, { merge: true });
        }

        setProfile({ ...data, id: user.uid });
        setIsUserLoading(false);
      } else {
        // CRÉATION AUTOMATIQUE IMMÉDIATE POUR ESSAI GRATUIT / NOUVEAU COMPTE
        const isAnonymous = user.isAnonymous;
        const userEmailLower = (user.email || '').toLowerCase();
        const isHardcodedAdmin = ADMIN_EMAILS.includes(userEmailLower);

        const initialData = {
          id: user.uid,
          email: user.email || 'essai-gratuit@simu-lux.com',
          firstName: isAnonymous ? 'Visiteur' : (userEmailLower.split('@')[0] || 'Utilisateur'),
          lastName: isAnonymous ? 'Démo' : 'Simu-lux',
          role: isHardcodedAdmin ? 'super_admin' : (isAnonymous ? 'demo' : 'user'),
          groupId: isAnonymous ? 'DEMO' : null,
          status: 'active',
          isLocked: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          simulationsCount: 0,
          averageScore: 0,
          totalTimeSpent: 0,
          allowedExams: ['exam1']
        };

        await setDoc(userDocRef, initialData, { merge: true });
        
        if (isAnonymous) {
          await setDoc(doc(firestore, 'coachingGroups', 'DEMO'), {
            id: 'DEMO',
            name: 'Groupe DEMO (Accès Libres)',
            status: 'active',
            createdAt: serverTimestamp()
          }, { merge: true });
        }
      }
    }, (error) => {
      console.warn("Profile snapshot error:", error);
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
