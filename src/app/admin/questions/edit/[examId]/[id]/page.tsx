
"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectToNewPath() {
  const router = useRouter();
  const params = useParams();
  
  useEffect(() => {
    router.replace(`/admin/edit-question/${params.examId}/${params.id}`);
  }, [params, router]);

  return null;
}
