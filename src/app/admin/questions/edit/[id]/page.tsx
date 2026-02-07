
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Route neutralisée pour éviter le conflit de paramètres.
 */
export default function AdminEditRedirectId() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/questions');
  }, [router]);

  return null;
}
