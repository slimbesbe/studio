
"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectPage() {
  const router = useRouter();
  const params = useParams();
  
  useEffect(() => {
    // Redirige vers la banque par défaut si l'examen n'est pas spécifié
    router.replace('/admin/questions');
  }, [router]);

  return null;
}
