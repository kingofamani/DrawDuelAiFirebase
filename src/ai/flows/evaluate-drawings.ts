// src/ai/flows/evaluate-drawings.ts
'use server';
/**
 * @fileOverview Evaluates two drawings based on adherence to the topic and artistic merit, providing feedback in English and Traditional Chinese.
 *
 * - evaluateDrawings - A function that evaluates two drawings and provides scores and feedback.
 * - EvaluateDrawingsInput - The input type for the evaluateDrawings function.
 * - EvaluateDrawingsOutput - The return type for the evaluateDrawings function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateDrawingsInputSchema = z.object({
  topic: z.string().describe('The topic of the drawing (in English, for context).'),
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
  drawing1Feedback: z.string().describe('The feedback (max 50 characters per language) for the first drawing in English.'),
  drawing1FeedbackZh: z.string().describe('The feedback (max 50 characters per language) for the first drawing in Traditional Chinese.'),
  drawing2Score: z.number().describe('The score (0-100) for the second drawing.'),
  drawing2Feedback: z.string().describe('The feedback (max 50 characters per language) for the second drawing in English.'),
  drawing2FeedbackZh: z.string().describe('The feedback (max 50 characters per language) for the second drawing in Traditional Chinese.'),
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
  prompt: `You are an art critic evaluating two drawings based on adherence to the topic and artistic merit.

Topic (for context): {{{topic}}}

Drawing 1: {{media url=drawing1DataUri}}
Drawing 2: {{media url=drawing2DataUri}}

Evaluate each drawing and provide the following for each:
- A score (0-100).
- Feedback (max 50 characters per language) in English.
- Feedback (max 50 characters per language) in Traditional Chinese.

Determine the winner based on the scores and artistic merit. If they are of equal quality, mark it as a tie.

Ensure your output strictly adheres to the provided output schema, including fields for 'drawing1Score', 'drawing1Feedback', 'drawing1FeedbackZh', 'drawing2Score', 'drawing2Feedback', 'drawing2FeedbackZh', and 'winner'.`,
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
