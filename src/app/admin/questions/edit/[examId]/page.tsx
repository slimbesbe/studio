
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy path neutralization to avoid slug name conflicts.
 */
export default function RedirectFix() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/questions');
  }, [router]);
  return null;
}
