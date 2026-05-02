'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Composant invisible qui écoute les erreurs de permission Firestore émises globalement.
 * En développement, il affiche l'erreur dans la console pour faciliter le débogage des règles.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // On logue l'erreur de manière détaillée pour l'agent et le développeur
      console.error('Firestore Permission Denied:', {
        path: error.request.path,
        method: error.request.method,
        auth: error.request.auth?.uid,
        data: error.request.resource?.data
      });
      
      // Note: On ne "throw" plus ici pendant le rendu pour éviter de casser l'application entière.
      // Next.js affichera l'erreur si elle n'est pas gérée localement par un try/catch ou un .catch().
    };

    errorEmitter.on('permission-error', handleError);
    return () => errorEmitter.off('permission-error', handleError);
  }, []);

  return null;
}
