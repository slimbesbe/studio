
"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Route neutralisée pour éviter le conflit 'examId' !== 'id'.
 * On redirige vers manage-question qui utilise une structure stable.
 */
export default function AdminEditRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params.examId && params.id) {
      router.replace(`/admin/manage-question/${params.examId}/${params.id}`);
    } else {
      router.replace('/admin/questions');
    }
  }, [params, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground font-medium">Stabilisation des routes en cours...</p>
    </div>
  );
}
