
"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectFix() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    // Redirection stable vers le nouveau chemin unique
    router.replace(`/admin/manage-question/${params.examId}/${params.id}`);
  }, [params, router]);
  return null;
}
