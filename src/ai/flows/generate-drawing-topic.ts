// src/ai/flows/generate-drawing-topic.ts
'use server';
/**
 * @fileOverview An AI agent that generates a drawing topic for the game.
 *
 * - generateDrawingTopic - A function that generates a drawing topic.
 * - GenerateDrawingTopicInput - The input type for the generateDrawingTopic function. Currently empty.
 * - GenerateDrawingTopicOutput - The return type for the generateDrawingTopic function, containing the topic.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDrawingTopicInputSchema = z.object({});
export type GenerateDrawingTopicInput = z.infer<typeof GenerateDrawingTopicInputSchema>;

const GenerateDrawingTopicOutputSchema = z.object({
  topic: z.string().describe('The generated drawing topic.'),
});
export type GenerateDrawingTopicOutput = z.infer<typeof GenerateDrawingTopicOutputSchema>;

export async function generateDrawingTopic(
  input: GenerateDrawingTopicInput
): Promise<GenerateDrawingTopicOutput> {
  return generateDrawingTopicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDrawingTopicPrompt',
  input: {schema: GenerateDrawingTopicInputSchema},
  output: {schema: GenerateDrawingTopicOutputSchema},
  prompt: `You are a creative assistant helping a teacher generate drawing topics for a drawing game.

  Generate a single, imaginative and engaging drawing topic suitable for students.
  The topic should be something that is easy to draw and fun for students of all skill levels.
  Avoid topics that are too specific or require advanced drawing skills.

  Topic: `,
});

const generateDrawingTopicFlow = ai.defineFlow(
  {
    name: 'generateDrawingTopicFlow',
    inputSchema: GenerateDrawingTopicInputSchema,
    outputSchema: GenerateDrawingTopicOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
