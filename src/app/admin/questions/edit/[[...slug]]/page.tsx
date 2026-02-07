
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectCatchAll() {
  const router = useRouter();
  useEffect(() => {
    // Redirige systématiquement pour éviter les conflits de routes dynamiques
    // et centraliser la gestion des questions
    router.replace('/admin/questions');
  }, [router]);
  
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}
