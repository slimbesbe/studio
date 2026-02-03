'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating detailed explanations for PMP exam question answers.
 *
 * It includes:
 * - `generateDetailedFeedback`:  A function that takes a question and answer choice and generates detailed feedback.
 * - `DetailedFeedbackInput`: The input type for the generateDetailedFeedback function.
 * - `DetailedFeedbackOutput`: The output type for the generateDetailedFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetailedFeedbackInputSchema = z.object({
  question: z.string().describe('The text of the PMP exam question.'),
  choices: z.array(z.string()).describe('The possible answer choices for the question.'),
  correctAnswer: z.string().describe('The correct answer choice for the question.'),
  explanation: z.string().optional().describe('Existing explanation (if any) for the question.'),
});
export type DetailedFeedbackInput = z.infer<typeof DetailedFeedbackInputSchema>;

const DetailedFeedbackOutputSchema = z.object({
  feedback: z.string().describe('Detailed explanation of why the correct answer is correct and why the incorrect answers are incorrect, aligned with PMI mindset.'),
});
export type DetailedFeedbackOutput = z.infer<typeof DetailedFeedbackOutputSchema>;

export async function generateDetailedFeedback(input: DetailedFeedbackInput): Promise<DetailedFeedbackOutput> {
  return detailedFeedbackFlow(input);
}

const detailedFeedbackPrompt = ai.definePrompt({
  name: 'detailedFeedbackPrompt',
  input: {schema: DetailedFeedbackInputSchema},
  output: {schema: DetailedFeedbackOutputSchema},
  prompt: `You are an expert PMP exam question explainer.

  Given a PMP exam question, its possible answers, and the correct answer, your task is to generate a comprehensive explanation.
  The explanation must explain why the correct answer is indeed correct, and also why each of the incorrect answers are incorrect.
  The explanation must be aligned with the PMI mindset and PMP best practices. Be concise and to the point. Don't be too verbose.

  Here is the question:
  {{{question}}}

  Here are the choices:
  {{#each choices}}
  - {{{this}}}
  {{/each}}

  The correct answer is: {{{correctAnswer}}}

  Explanation:
  {{#if explanation}}
  Existing explanation:
  {{{explanation}}}
  New explanation:
  {{else}}
  Explanation:
  {{/if}}
  `,
});

const detailedFeedbackFlow = ai.defineFlow(
  {
    name: 'detailedFeedbackFlow',
    inputSchema: DetailedFeedbackInputSchema,
    outputSchema: DetailedFeedbackOutputSchema,
  },
  async input => {
    const {output} = await detailedFeedbackPrompt(input);
    return output!;
  }
);
