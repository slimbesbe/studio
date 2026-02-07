
"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectEdit() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    if (params.examId && params.id) {
      router.replace(`/admin/manage-question/${params.examId}/${params.id}`);
    }
  }, [params, router]);
  return null;
}
