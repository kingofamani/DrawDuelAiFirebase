// src/ai/flows/evaluate-drawings.ts
'use server';
/**
 * @fileOverview Evaluates two drawings based on adherence to the topic and artistic merit.
 *
 * - evaluateDrawings - A function that evaluates two drawings and provides scores and feedback.
 * - EvaluateDrawingsInput - The input type for the evaluateDrawings function.
 * - EvaluateDrawingsOutput - The return type for the evaluateDrawings function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateDrawingsInputSchema = z.object({
  topic: z.string().describe('The topic of the drawing.'),
  drawing1DataUri: z
    .string()
    .describe(
      "The first drawing as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  drawing2DataUri: z
    .string()
    .describe(
      "The second drawing as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type EvaluateDrawingsInput = z.infer<typeof EvaluateDrawingsInputSchema>;

const EvaluateDrawingsOutputSchema = z.object({
  drawing1Score: z.number().describe('The score (0-100) for the first drawing.'),
  drawing1Feedback: z.string().describe('The feedback (max 50 characters) for the first drawing.'),
  drawing2Score: z.number().describe('The score (0-100) for the second drawing.'),
  drawing2Feedback: z.string().describe('The feedback (max 50 characters) for the second drawing.'),
  winner: z.enum(['drawing1', 'drawing2', 'tie']).describe('The winner of the drawing competition.'),
});
export type EvaluateDrawingsOutput = z.infer<typeof EvaluateDrawingsOutputSchema>;

export async function evaluateDrawings(input: EvaluateDrawingsInput): Promise<EvaluateDrawingsOutput> {
  return evaluateDrawingsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateDrawingsPrompt',
  input: {schema: EvaluateDrawingsInputSchema},
  output: {schema: EvaluateDrawingsOutputSchema},
  prompt: `You are an art critic evaluating two drawings based on adherence to the topic and artistic merit.\n\nTopic: {{{topic}}}\n\nDrawing 1: {{media url=drawing1DataUri}}\nDrawing 2: {{media url=drawing2DataUri}}\n\nEvaluate each drawing and provide a score (0-100) and feedback (max 50 characters). Determine the winner based on the scores and artistic merit. If they are of equal quality, mark it as a tie.\n\nDrawing 1 Score: {{drawing1Score}}\nDrawing 1 Feedback: {{drawing1Feedback}}\nDrawing 2 Score: {{drawing2Score}}\nDrawing 2 Feedback: {{drawing2Feedback}}\nWinner: {{winner}}`,
});

const evaluateDrawingsFlow = ai.defineFlow(
  {
    name: 'evaluateDrawingsFlow',
    inputSchema: EvaluateDrawingsInputSchema,
    outputSchema: EvaluateDrawingsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
