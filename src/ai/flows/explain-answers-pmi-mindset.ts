'use server';

/**
 * @fileOverview Explains answers with PMI mindset. This flow takes a question and answer choices, and provides
 * detailed explanations for why the correct answer is correct and why the incorrect answers are wrong,
 * all explained through the lens of the PMI mindset.
 *
 * - explainAnswersWithPMIMindset - A function that handles the answer explanation process.
 * - ExplainAnswersWithPMIMindsetInput - The input type for the explainAnswersWithPMIMindset function.
 * - ExplainAnswersWithPMIMindsetOutput - The return type for the explainAnswersWithPMIMindset function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainAnswersWithPMIMindsetInputSchema = z.object({
  question: z.string().describe('The question to be answered.'),
  choices: z.array(z.string()).describe('The answer choices for the question.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
});
export type ExplainAnswersWithPMIMindsetInput = z.infer<typeof ExplainAnswersWithPMIMindsetInputSchema>;

const ExplainAnswersWithPMIMindsetOutputSchema = z.object({
  explanation: z.string().describe('Detailed explanation of why the correct answer is correct and why the incorrect answers are wrong, all explained through the lens of the PMI mindset.'),
});
export type ExplainAnswersWithPMIMindsetOutput = z.infer<typeof ExplainAnswersWithPMIMindsetOutputSchema>;

export async function explainAnswersWithPMIMindset(input: ExplainAnswersWithPMIMindsetInput): Promise<ExplainAnswersWithPMIMindsetOutput> {
  return explainAnswersWithPMIMindsetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainAnswersWithPMIMindsetPrompt',
  input: {schema: ExplainAnswersWithPMIMindsetInputSchema},
  output: {schema: ExplainAnswersWithPMIMindsetOutputSchema},
  prompt: `You are an expert PMP exam coach. You will provide detailed explanations for each question, including why the correct answer is right and why the incorrect answers are wrong, all explained through the lens of the PMI mindset.

Question: {{{question}}}
Choices: {{#each choices}}{{{this}}}\n{{/each}}
Correct Answer: {{{correctAnswer}}}

Explanation:`, // The prompt should include the right answer, question and explanations
});

const explainAnswersWithPMIMindsetFlow = ai.defineFlow(
  {
    name: 'explainAnswersWithPMIMindsetFlow',
    inputSchema: ExplainAnswersWithPMIMindsetInputSchema,
    outputSchema: ExplainAnswersWithPMIMindsetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
