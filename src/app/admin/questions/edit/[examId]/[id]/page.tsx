
"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectFix() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    if (params.examId && params.id) {
      router.replace(`/admin/manage-question/${params.examId}/${params.id}`);
    } else {
      router.replace('/admin/questions');
    }
  }, [params, router]);
  return <div className="p-8 text-center text-muted-foreground">Redirection vers l'éditeur...</div>;
}
