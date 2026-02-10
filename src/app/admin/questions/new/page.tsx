"use client";

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// On sépare le formulaire dans un composant interne pour utiliser useSearchParams en toute sécurité
function QuestionForm() {
  const router = useRouter();
  const searchParams = useSearchParams(); // C'est ce hook qui causait l'erreur
  const firestore = useFirestore();
  const user = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Votre logique d'ajout ici
    // const formData = new FormData(e.currentTarget as HTMLFormElement);
    // await addDoc(collection(firestore, 'questions'), { ... });
    router.push('/admin/questions');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Détails de la nouvelle question</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ajoutez vos champs de formulaire ici */}
          <div className="flex gap-4">
            <Button type="submit">Enregistrer</Button>
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Composant principal exporté
export default function NewQuestionPage() {
  return (
    <section className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Ajouter une Question</h1>
      
      {/* Le Suspense est INDISPENSABLE ici pour useSearchParams */}
      <Suspense fallback={<div className="p-10 text-center">Chargement du formulaire...</div>}>
        <QuestionForm />
      </Suspense>
    </section>
  );
}