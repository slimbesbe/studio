'use server';

/**
 * @fileOverview Flow Genkit pour générer 10 questions de démo PMP.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuestionSchema = z.object({
  text: z.string().describe('Le texte de la question PMP.'),
  choiceA: z.string(),
  choiceB: z.string(),
  choiceC: z.string(),
  choiceD: z.string(),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().describe('Explication détaillée alignée sur le mindset PMI.'),
  domain: z.string().describe('Le domaine (People, Process, Business Environment).'),
});

const DemoQuestionsOutputSchema = z.object({
  questions: z.array(QuestionSchema).length(10),
});

export type DemoQuestionsOutput = z.infer<typeof DemoQuestionsOutputSchema>;

export async function generateDemoQuestions(): Promise<DemoQuestionsOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: 'Génère 10 questions de simulation d\'examen PMP variées (Agile, Prédictif, Hybride) avec leurs choix, la bonne réponse et une explication détaillée.',
    output: { schema: DemoQuestionsOutputSchema },
  });
  return output!;
}
