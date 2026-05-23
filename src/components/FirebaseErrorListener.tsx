'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Composant invisible qui écoute les erreurs de permission Firestore émises globalement.
 * En développement, il affiche l'erreur de manière détaillée pour faciliter le débogage.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // On logue l'erreur de manière explicite pour éviter les affichages vides "{}"
      const { path, method, auth, resource } = error.request;
      
      console.group('🔥 Firestore Permission Denied');
      console.error('Message:', error.message);
      console.error('Path:', path);
      console.error('Method:', method);
      console.error('User UID:', auth?.uid || 'Unauthenticated');
      if (resource?.data) {
        console.error('Request Data:', resource.data);
      }
      console.groupEnd();
    };

    errorEmitter.on('permission-error', handleError);
    return () => errorEmitter.off('permission-error', handleError);
  }, []);

  return null;
}
