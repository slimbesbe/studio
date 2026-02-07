
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Page désactivée pour résoudre le conflit de slugs Next.js.
 */
export default function LegacyRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/questions');
  }, [router]);

  return null;
}
