
"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Route Catch-all pour rediriger tous les anciens chemins d'édition vers la nouvelle structure stable.
 * Résout l'erreur critique Next.js : "different slug names for the same dynamic path".
 */
export default function AdminCatchAllRedirect() {
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
      <p className="text-muted-foreground font-medium">Synchronisation des accès d'administration...</p>
    </div>
  );
}
