
"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Global redirect fix to avoid slug name conflicts.
 * This catch-all route handles legacy or misconfigured paths.
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
    <div className="flex flex-col items-center justify-center h-screen space-y-6">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-white shadow-xl border-2">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
      <p className="text-slate-500 font-black uppercase tracking-[0.2em] animate-pulse">Synchronisation de l'accès...</p>
    </div>
  );
}
