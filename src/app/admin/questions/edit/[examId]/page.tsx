
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectFix() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/questions');
  }, [router]);
  return <div className="p-8 text-center text-muted-foreground">Redirection en cours...</div>;
}
