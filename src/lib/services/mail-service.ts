'use client';

import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Service de gestion des emails automatisés.
 * Utilise la collection 'mail' compatible avec l'extension Firebase "Trigger Email".
 */

export const ADMIN_EMAIL = 'slim.besbes@yahoo.fr';

/**
 * Envoie un email de bienvenue au nouvel utilisateur.
 */
export async function sendWelcomeEmail(db: Firestore, userEmail: string, firstName: string) {
  if (!userEmail) return;
  
  try {
    await addDoc(collection(db, 'mail'), {
      to: userEmail,
      message: {
        subject: 'Bienvenue sur Simu-Lux ! 🚀',
        text: `Bonjour ${firstName},

Bienvenue dans l'aventure Simu-Lux ! Nous sommes ravis de vous accompagner dans votre parcours de certification.

Pour garantir la sécurité de votre accès, votre mot de passe ne sera pas envoyé ici : il vous sera communiqué personnellement en privé.

Préparez-vous à dominer l'examen !`,
      },
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Failed to queue welcome email:", e);
  }
}

/**
 * Alerte l'administrateur lors de la première connexion d'un utilisateur.
 */
export async function sendAdminAlertOnFirstLogin(db: Firestore, userName: string, userEmail: string) {
  try {
    await addDoc(collection(db, 'mail'), {
      to: ADMIN_EMAIL,
      message: {
        subject: '🔔 Nouveau participant connecté sur Simu-Lux',
        text: `Hello Admin,

Le participant ${userName} (${userEmail}) vient de se connecter à la plateforme. C'est le moment de lui transmettre son mot de passe en privé comme convenu.

Suivi requis immédiatement.`,
      },
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Failed to queue admin alert email:", e);
  }
}
