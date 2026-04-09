
'use client';

import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Service de gestion des emails automatisés.
 * Utilise la collection 'mail' compatible avec l'extension Firebase "Trigger Email".
 */

export const ADMIN_EMAIL = 'slim.besbes@yahoo.fr';

/**
 * Envoie un email de bienvenue au nouvel utilisateur.
 */
export function sendWelcomeEmail(db: Firestore, userEmail: string, firstName: string) {
  if (!userEmail || !db) return;
  
  const mailRef = collection(db, 'mail');
  const mailData = {
    to: userEmail,
    message: {
      subject: 'Bienvenue sur Simu-Lux ! 🚀',
      text: `Bonjour ${firstName},

Bienvenue dans l'aventure Simu-Lux ! Nous sommes ravis de vous accompagner dans votre parcours de certification.

Pour garantir la sécurité de votre accès, votre mot de passe ne sera pas envoyé ici : il vous sera communiqué personnellement en privé.

Préparez-vous à dominer l'examen !`,
    },
    createdAt: serverTimestamp()
  };

  addDoc(mailRef, mailData).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: mailRef.path,
      operation: 'create',
      requestResourceData: mailData
    }));
  });
}

/**
 * Alerte l'administrateur lors de la première connexion d'un utilisateur.
 */
export function sendAdminAlertOnFirstLogin(db: Firestore, userName: string, userEmail: string) {
  if (!db) return;

  const mailRef = collection(db, 'mail');
  const mailData = {
    to: ADMIN_EMAIL,
    message: {
      subject: '🔔 Nouveau participant connecté sur Simu-Lux',
      text: `Hello Admin,

Le participant ${userName} (${userEmail}) vient de se connecter à la plateforme. C'est le moment de lui transmettre son mot de passe en privé comme convenu.

Suivi requis immédiatement.`,
    },
    createdAt: serverTimestamp()
  };

  addDoc(mailRef, mailData).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: mailRef.path,
      operation: 'create',
      requestResourceData: mailData
    }));
  });
}
