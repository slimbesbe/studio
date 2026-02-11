'use server';
/**
 * @fileOverview Flow Genkit pour générer une simulation complète de coaching (35 questions).
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuestionSchema = z.object({
  text: z.string().describe('Le scénario de la question PMP.'),
  choices: z.array(z.string()).length(4).describe('4 options de réponse.'),
  correctChoice: z.string().describe('L\'index de la bonne réponse (1, 2, 3 ou 4).'),
  explanation: z.string().describe('Explication détaillée basée sur le Mindset PMI.'),
  tags: z.object({
    domain: z.enum(['People', 'Process', 'Business']),
    approach: z.enum(['Predictive', 'Agile', 'Hybrid']),
    difficulty: z.enum(['Easy', 'Medium', 'Hard'])
  })
});

const SimulationOutputSchema = z.object({
  questions: z.array(QuestionSchema),
});

export type GeneratedCoachingQuestion = z.infer<typeof QuestionSchema> & { index: number };

export async function generateCoachingSimulation(title: string, start: number, end: number): Promise<GeneratedCoachingQuestion[]> {
  const count = end - start + 1;
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `Tu es un expert formateur PMP. Génère une simulation de ${count} questions d'entraînement pour la séance de coaching "${title}".
    Les questions doivent couvrir les index ${start} à ${end}.
    - Chaque question doit être un scénario professionnel complexe.
    - Il doit y avoir 4 choix de réponse crédibles.
    - La justification doit expliquer pourquoi la réponse choisie est la meilleure selon le Mindset PMI (Leader Serviteur, Proactivité, Analyse d'impact, etc.).
    - Varie les domaines (People, Process, Business Environment) et les approches (Agile, Waterfall, Hybride).`,
    output: { schema: SimulationOutputSchema },
  });

  if (!output || !output.questions) return [];

  return output.questions.map((q, i) => ({
    ...q,
    index: start + i
  }));
}
