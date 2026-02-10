"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Composant interne pour la gestion des questions
function QuestionsList() {
  const router = useRouter();
  const firestore = useFirestore();
  const user = useUser();
  
  // Exemple de récupération de collection (adaptez le chemin si nécessaire)
  const questionsQuery = useMemoFirebase(() => collection(firestore, 'questions'), [firestore]);
  const { data: questions, loading, error } = useCollection(questionsQuery);

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette question ?')) {
      await deleteDoc(doc(firestore, 'questions', id));
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement des questions...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Erreur : {error.message}</div>;

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions?.map((q: any) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">{q.text || q.label || 'Sans titre'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/admin/questions/edit/${q.id}`)}>
                      Modifier
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(q.id)}>
                      Supprimer
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {questions?.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4">Aucune question trouvée.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Composant principal de la page
export default function QuestionsPage() {
  return (
    <section className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestion des Questions</h1>
        <Button onClick={() => window.location.href = '/admin/questions/new'}>
          Ajouter une question
        </Button>
      </div>

      <Suspense fallback={<div className="text-center p-10">Chargement du module...</div>}>
        <QuestionsList />
      </Suspense>
    </section>
  );
}