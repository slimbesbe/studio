
"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function Redirect() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => { 
    if (params.examId && params.id) {
      router.replace(`/admin/edit-question/${params.examId}/${params.id}`); 
    }
  }, [params, router]);
  return null;
}
