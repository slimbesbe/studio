
'use client';

import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { SidebarLayout } from '@/components/dashboard/SidebarLayout';
import { useEffect } from 'react';

/**
 * RootLayout implémente la protection globale contre la copie et le clic droit.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  useEffect(() => {
    // 1. DÉSACTIVE LE CLIC DROIT
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. DÉSACTIVE LES RACCOURCIS DE COPIE ET D'IMPRESSION
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloque Ctrl+C, Ctrl+U, Ctrl+P, Ctrl+S, Ctrl+Shift+I
      if (
        (e.ctrlKey || e.metaKey) && 
        (['c', 'u', 'p', 's', 'i', 'j'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
      }
      
      // Bloque F12 (Inspecteur)
      if (e.key === 'F12') {
        e.preventDefault();
      }
    };

    // 3. DÉSACTIVE L'ÉVÉNEMENT DE COPIE (Simple preventDefault pour éviter Clipboard API Permission error)
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('copy', handleCopy);
    };
  }, []);

  return (
    <html lang="fr" suppressHydrationWarning className="min-h-screen">
      <head>
        <title>Simu-lux PMP Exam Simulator</title>
        <meta name="description" content="Plateforme professionnelle de simulation d'examen PMP" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-primary/20 min-h-screen bg-background">
        <FirebaseClientProvider>
          <SidebarLayout>
            {children}
          </SidebarLayout>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
