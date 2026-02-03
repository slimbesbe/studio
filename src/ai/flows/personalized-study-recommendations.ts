// src/ai/flows/personalized-study-recommendations.ts
'use server';

/**
 * @fileOverview Provides personalized study recommendations to participants based on their past performance.
 *
 * This file exports:
 * - `getPersonalizedStudyRecommendations`: A function to retrieve personalized study recommendations.
 * - `PersonalizedStudyRecommendationsInput`: The input type for the `getPersonalizedStudyRecommendations` function.
 * - `PersonalizedStudyRecommendationsOutput`: The output type for the `getPersonalizedStudyRecommendations` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for personalized study recommendations.
const PersonalizedStudyRecommendationsInputSchema = z.object({
  userId: z.string().describe('The ID of the user requesting study recommendations.'),
  examHistory: z.array(
    z.object({
      examId: z.string().describe('The ID of the exam taken.'),
      score: z.number().describe('The score achieved on the exam.'),
      domainPerformance: z.record(z.string(), z.number()).describe('Performance in each domain of the exam.'),
    })
  ).describe('The user examination history, which includes the exam ID, score, and domain performance.'),
});
export type PersonalizedStudyRecommendationsInput = z.infer<typeof PersonalizedStudyRecommendationsInputSchema>;

// Output schema for personalized study recommendations.
const PersonalizedStudyRecommendationsOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      domain: z.string().describe('The specific domain to focus on.'),
      reason: z.string().describe('The reason for recommending this domain.'),
      suggestedResources: z.array(z.string()).describe('List of recommended resources for studying this domain.'),
    })
  ).describe('A list of personalized study recommendations.'),
});
export type PersonalizedStudyRecommendationsOutput = z.infer<typeof PersonalizedStudyRecommendationsOutputSchema>;

/**
 * Retrieves personalized study recommendations for a given user based on their exam history.
 * @param input - The input containing the user ID and exam history.
 * @returns A promise that resolves to the personalized study recommendations.
 */
export async function getPersonalizedStudyRecommendations(input: PersonalizedStudyRecommendationsInput): Promise<PersonalizedStudyRecommendationsOutput> {
  return personalizedStudyRecommendationsFlow(input);
}

// Define the prompt for generating personalized study recommendations.
const personalizedStudyRecommendationsPrompt = ai.definePrompt({
  name: 'personalizedStudyRecommendationsPrompt',
  input: {schema: PersonalizedStudyRecommendationsInputSchema},
  output: {schema: PersonalizedStudyRecommendationsOutputSchema},
  prompt: `You are an AI study advisor specializing in PMP exam preparation. Analyze the user's exam history to provide personalized study recommendations.

User ID: {{{userId}}}
Exam History:
{{#each examHistory}}
  - Exam ID: {{{examId}}}, Score: {{{score}}}
    Domain Performance:
    {{#each (each @key domainPerformance)}}
      - {{{@key}}}: {{{this}}}
    {{/each}}
{{/each}}

Based on this data, recommend specific domains for the user to focus on, explain why each domain is recommended, and suggest resources for studying each domain. The goal is to provide actionable and personalized advice to improve the user's overall score.

Output the results in JSON format.`, // Ensure valid JSON format
});

// Define the Genkit flow for personalized study recommendations.
const personalizedStudyRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedStudyRecommendationsFlow',
    inputSchema: PersonalizedStudyRecommendationsInputSchema,
    outputSchema: PersonalizedStudyRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await personalizedStudyRecommendationsPrompt(input);
    return output!;
  }
);
