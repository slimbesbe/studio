'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, Timestamp, setDoc, serverTimestamp, increment, collection, addDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { logActivity } from '@/lib/services/logging-service';
import { sendAdminAlertOnFirstLogin } from '@/lib/services/mail-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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
      } else {
        logActivity(firestore, firebaseUser.uid, 'login', { email: firebaseUser.email });
      }
    }, (error) => {
      setUserError(error);
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, [auth, firestore]);

  /**
   * SESSION GUARD & REAL-TIME LOCK DETECTION
   * Écoute le document utilisateur en temps réel pour détecter un verrouillage de sécurité.
   */
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
        
        // PROTECTION CRITIQUE : Déconnexion forcée si le compte est verrouillé (Anti-Partage)
        if (profileData.isLocked === true && !isHardcodedAdmin) {
          console.warn("ALERTE SÉCURITÉ : Compte verrouillé détecté - Déconnexion forcée.");
          // Nettoyage complet des traces locales
          localStorage.clear();
          sessionStorage.clear();
          // Déconnexion Firebase
          await signOut(auth);
          // Redirection vers la page d'accès refusé
          router.replace('/access-denied');
          return;
        }

        // Vérification expiration de l'accès
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
      } else if (isHardcodedAdmin) {
        // Auto-création du profil admin si manquant
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
        setDoc(userDocRef, initialAdmin, { merge: true }).catch(() => {});
        setProfile(initialAdmin);
      } else {
        setProfile({ id: user.uid, email: user.email, role: 'user', status: 'active', isLocked: false });
      }
      setIsUserLoading(false);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user, auth, router]);

  // Gestion du premier login et bienvenue
  useEffect(() => {
    if (!firestore || !user || user.isAnonymous || !profile || profile.firstLoginAt) return;
    if (welcomeTriggered.current === user.uid) return;
    
    welcomeTriggered.current = user.uid;
    
    const now = serverTimestamp();
    const fullName = `${profile.firstName || 'Nouvel'} ${profile.lastName || 'Utilisateur'}`;
    const userDocRef = doc(firestore, 'users', user.uid);
    
    setDoc(userDocRef, { firstLoginAt: now }, { merge: true }).catch(() => {});
    
    const supportMsgRef = collection(firestore, 'supportMessages');
    addDoc(supportMsgRef, {
      userId: user.uid,
      userEmail: user.email,
      userName: fullName,
      subject: "Bienvenue",
      message: `Première connexion détectée pour ${fullName}. Bienvenue sur la plateforme Simu-lux !`,
      type: 'welcome',
      status: 'unread',
      createdAt: now
    }).catch(() => {});
    
    sendAdminAlertOnFirstLogin(firestore, fullName, user.email || user.uid);
    logActivity(firestore, user.uid, 'first_login');
  }, [firestore, user, profile]);

  // Tracker de temps d'étude
  useEffect(() => {
    if (!firestore || !user || user.isAnonymous || !profile || profile.role !== 'user' || profile.isLocked) return;
    const interval = setInterval(() => {
      const userRef = doc(firestore, 'users', user.uid);
      setDoc(userRef, { 
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