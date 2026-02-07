
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Cette route remplace l'ancienne route conflictuelle [id] pour éviter l'erreur de slug.
 * Elle redirige simplement vers la banque de questions.
 */
export default function RedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/questions');
  }, [router]);

  return null;
}
