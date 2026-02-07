
"use client";
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectLegacyNested() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    router.replace(`/admin/manage-question/${params.examId}/${params.id}`);
  }, [params, router]);
  return null;
}
