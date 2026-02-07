
"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Cette route "Catch-all" résout l'erreur critique de conflit de paramètres d'URL (slug names).
 * Elle redirige intelligemment toutes les anciennes tentatives d'édition vers la nouvelle structure stable.
 */
export default function AdminEditRedirect() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string[];

  useEffect(() => {
    if (slug && slug.length >= 2) {
      router.replace(`/admin/manage-question/${slug[0]}/${slug[1]}`);
    } else {
      router.replace('/admin/questions');
    }
  }, [slug, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground font-medium">Stabilisation des routes en cours...</p>
    </div>
  );
}
