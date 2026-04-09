
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, Timestamp, setDoc, serverTimestamp, increment, collection, addDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { logActivity } from '@/lib/services/logging-service';
import { sendAdminAlertOnFirstLogin } from '@/lib/services/mail-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

const ADMIN_EMAILS = ['slim.besbes@yahoo.fr'];
const ADMIN_UIDS = ['vwyrAnNtQkSojYSEEK2qkRB5feh2', 'GPgreBe1JzZYbEHQGn3xIdcQGQs1'];

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
  
  // Verrou pour empêcher la duplication du message de bienvenue pendant la session
  const welcomeTriggered = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setIsUserLoading(false);
      } else {
        // Log login action
        logActivity(firestore, firebaseUser.uid, 'login', { email: firebaseUser.email });
      }
    }, (error) => {
      setUserError(error);
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, [auth, firestore]);

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

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const profileData = docSnap.data();
        
        // --- FIRST LOGIN DETECTION & NOTIFICATION ---
        if (!profileData.firstLoginAt && !isHardcodedAdmin && !user.isAnonymous && welcomeTriggered.current !== user.uid) {
          welcomeTriggered.current = user.uid;
          
          const now = serverTimestamp();
          const firstName = profileData.firstName || 'Nouvel';
          const lastName = profileData.lastName || 'Utilisateur';
          const fullName = `${firstName} ${lastName}`;
          
          // 1. Update user profile (Atomic update)
          setDoc(userDocRef, { firstLoginAt: now }, { merge: true }).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'update',
              requestResourceData: { firstLoginAt: now }
            }));
          });
          
          // 2. Create internal support message (Welcome)
          const supportMsgRef = collection(firestore, 'supportMessages');
          const supportMsgData = {
            userId: user.uid,
            userEmail: user.email,
            userName: fullName,
            subject: "Bienvenue",
            message: `Première connexion détectée pour ${fullName}. Bienvenue sur la plateforme Simu-lux !`,
            type: 'welcome',
            status: 'unread',
            createdAt: now
          };
          addDoc(supportMsgRef, supportMsgData).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: supportMsgRef.path,
              operation: 'create',
              requestResourceData: supportMsgData
            }));
          });
          
          // 3. Trigger Admin Email Alert
          sendAdminAlertOnFirstLogin(firestore, fullName, user.email || user.uid);
          
          // 4. Log activity
          logActivity(firestore, user.uid, 'first_login');
        }

        let isExpired = false;
        if (profileData.expiresAt) {
          const expiryDate = profileData.expiresAt instanceof Timestamp 
            ? profileData.expiresAt.toDate() 
            : new Date(profileData.expiresAt);
          if (expiryDate < new Date()) isExpired = true;
        }

        const currentStatus = isExpired ? 'expired' : (profileData.status || 'active');
        const finalRole = isHardcodedAdmin ? (profileData.role || 'super_admin') : 'user';

        setProfile({ 
          ...profileData, 
          id: user.uid, 
          status: currentStatus, 
          role: finalRole 
        });
      } else if (isHardcodedAdmin) {
        const initialAdmin = {
          id: user.uid,
          email: user.email,
          firstName: user.email?.split('@')[0] || 'Admin',
          lastName: 'Simu-lux',
          role: 'super_admin',
          status: 'active',
          createdAt: serverTimestamp()
        };
        setDoc(userDocRef, initialAdmin, { merge: true }).catch(() => {});
        setProfile(initialAdmin);
      } else {
        setProfile({ id: user.uid, email: user.email, role: 'user', status: 'active' });
      }
      setIsUserLoading(false);
    }, (error) => {
      setIsUserLoading(false);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'get'
      }));
    });

    return () => unsubscribe();
  }, [firestore, user]);

  useEffect(() => {
    if (!firestore || !user || user.isAnonymous || !profile || profile.role !== 'user') return;
    const interval = setInterval(() => {
      const userRef = doc(firestore, 'users', user.uid);
      const updateData = { 
        totalTimeSpent: increment(60),
        lastLoginAt: serverTimestamp() 
      };
      setDoc(userRef, updateData, { merge: true }).catch(() => {});
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
