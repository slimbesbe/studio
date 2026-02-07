
"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Legacy path neutralization to avoid slug name conflicts.
 */
export default function RedirectFix() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    router.replace(`/admin/manage-question/default/${params.id}`);
  }, [params, router]);
  return null;
}
