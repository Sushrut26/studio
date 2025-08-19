'use server';

/**
 * @fileOverview Suggests relevant questions based on user interests.
 *
 * - suggestRelevantQuestions - A function that suggests relevant questions.
 * - SuggestRelevantQuestionsInput - The input type for the suggestRelevantQuestions function.
 * - SuggestRelevantQuestionsOutput - The return type for the suggestRelevantQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRelevantQuestionsInputSchema = z.object({
  interests: z
    .string()
    .describe('The user interests, taken from recent activity.'),
  questionList: z
    .string()
    .describe('A list of the most recent questions asked.'),
});
export type SuggestRelevantQuestionsInput = z.infer<
  typeof SuggestRelevantQuestionsInputSchema
>;

const SuggestedQuestionSchema = z.object({
  questionText: z.string().describe('A relevant question to ask the user.'),
});

const SuggestRelevantQuestionsOutputSchema = z.object({
  suggestedQuestions: z
    .array(SuggestedQuestionSchema)
    .describe('An array of relevant questions based on user interests.'),
});
export type SuggestRelevantQuestionsOutput = z.infer<
  typeof SuggestRelevantQuestionsOutputSchema
>;

export async function suggestRelevantQuestions(
  input: SuggestRelevantQuestionsInput
): Promise<SuggestRelevantQuestionsOutput> {
  return suggestRelevantQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRelevantQuestionsPrompt',
  input: {schema: SuggestRelevantQuestionsInputSchema},
  output: {schema: SuggestRelevantQuestionsOutputSchema},
  prompt: `You are an AI poll question suggestion tool. Given the user's interests and a list of recent questions, you will return a list of relevant questions to ask the user.

User Interests: {{{interests}}}
Recent Questions: {{{questionList}}}

Based on the above information, suggest some relevant questions to ask the user. The questions should be engaging and thought-provoking. Limit the number of questions to 5.

{{outputFormat schema=SuggestRelevantQuestionsOutputSchema}}`,
});

const suggestRelevantQuestionsFlow = ai.defineFlow(
  {
    name: 'suggestRelevantQuestionsFlow',
    inputSchema: SuggestRelevantQuestionsInputSchema,
    outputSchema: SuggestRelevantQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
