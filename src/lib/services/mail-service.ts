
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

  addDoc(mailRef, mailData).catch(() => {});
}

/**
 * Alerte de sécurité lors d'un blocage pour multi-appareils.
 */
export function sendSecurityLockEmails(db: Firestore, userEmail: string, userName: string) {
  if (!db) return;

  const mailRef = collection(db, 'mail');

  // 1. Email pour l'utilisateur
  addDoc(mailRef, {
    to: userEmail,
    message: {
      subject: '⚠️ Compte Simu-lux verrouillé (Sécurité)',
      text: `Bonjour ${userName},

Votre compte a été bloqué pour non-respect des règles de sécurité (connexion simultanée ou multi-appareils détectée).

Cette mesure vise à protéger l'intégrité de vos données et de nos contenus. 
Pour récupérer votre accès, veuillez contacter immédiatement l'administrateur.`,
    },
    createdAt: serverTimestamp()
  }).catch(() => {});

  // 2. Email pour l'admin
  addDoc(mailRef, {
    to: ADMIN_EMAIL,
    message: {
      subject: '🚨 Alerte Sécurité : Compte Verrouillé',
      text: `Alerte Sécurité : L'utilisateur ${userName} (${userEmail}) a tenté de se connecter en simultané ou depuis un nouvel appareil. 
      
Son compte a été automatiquement verrouillé par le système anti-partage.`,
    },
    createdAt: serverTimestamp()
  }).catch(() => {});
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

  addDoc(mailRef, mailData).catch(() => {});
}
