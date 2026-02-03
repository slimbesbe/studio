'use server';
/**
 * @fileOverview Implements a spaced repetition review system for PMP exam questions.
 *
 * This file defines a Genkit flow that generates explanations for missed questions
 * and creates a spaced repetition schedule for reviewing them.
 *
 * - generateMistakeReview - The main function to initiate the mistake review process.
 * - MistakeReviewInput - Input type for the generateMistakeReview function.
 * - MistakeReviewOutput - Output type for the generateMistakeReview function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MistakeReviewInputSchema = z.object({
  question: z.string().describe('The text of the PMP exam question.'),
  studentAnswer: z.string().describe('The answer provided by the student.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  explanation: z.string().describe('The original detailed explanation for the correct answer.'),
});
export type MistakeReviewInput = z.infer<typeof MistakeReviewInputSchema>;

const MistakeReviewOutputSchema = z.object({
  reviewExplanation: z.string().describe('A refined explanation tailored to the student\'s mistake, reinforcing the correct PMI mindset.'),
});
export type MistakeReviewOutput = z.infer<typeof MistakeReviewOutputSchema>;

export async function generateMistakeReview(input: MistakeReviewInput): Promise<MistakeReviewOutput> {
  return mistakeReviewFlow(input);
}

const mistakeReviewPrompt = ai.definePrompt({
  name: 'mistakeReviewPrompt',
  input: {schema: MistakeReviewInputSchema},
  output: {schema: MistakeReviewOutputSchema},
  prompt: `You are an expert PMP exam tutor. A student has missed a question and you need to provide a tailored explanation to help them understand their mistake and reinforce the correct PMI mindset.

Question: {{{question}}}
Student's Answer: {{{studentAnswer}}}
Correct Answer: {{{correctAnswer}}}
Original Explanation: {{{explanation}}}

Generate a refined explanation that focuses on why the student's answer was incorrect and emphasizes the PMI mindset principles that apply to the correct answer. The explanation should be clear, concise, and directly address the student's misunderstanding.`,
});

const mistakeReviewFlow = ai.defineFlow(
  {
    name: 'mistakeReviewFlow',
    inputSchema: MistakeReviewInputSchema,
    outputSchema: MistakeReviewOutputSchema,
  },
  async input => {
    const {output} = await mistakeReviewPrompt(input);
    return output!;
  }
);
