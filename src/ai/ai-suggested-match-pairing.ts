'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting balanced match pairings
 * based on player skill levels, with constraints on player repetition from previous matches.
 *
 * - `suggestMatchPairing` - A function that suggests match pairings based on the given criteria.
 * - `SuggestMatchPairingInput` - The input type for the `suggestMatchPairing` function.
 * - `SuggestMatchPairingOutput` - The output type for the `suggestMatchPairing` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PlayerSchema = z.object({
  name: z.string().describe('The name of the player.'),
  skillLevel: z.number().describe('The skill level of the player (e.g., 1-10).'),
  age: z.number().describe('The age of the player.'),
  gender: z.string().describe('The gender of the player.'),
});

export type Player = z.infer<typeof PlayerSchema>;

const SuggestMatchPairingInputSchema = z.object({
  availablePlayers: z.array(PlayerSchema).describe('The list of available players for the match.'),
  previousMatches: z.array(z.array(PlayerSchema)).describe('The list of previous matches played today.'),
});
export type SuggestMatchPairingInput = z.infer<typeof SuggestMatchPairingInputSchema>;

const SuggestedTeamSchema = z.object({
  players: z.array(PlayerSchema).length(2).describe('Two players who will form a team.'),
  teamSkillLevel: z.number().describe('The combined skill level of the team'),
});

const SuggestMatchPairingOutputSchema = z.object({
  team1: SuggestedTeamSchema.describe('The first team.'),
  team2: SuggestedTeamSchema.describe('The second team.'),
  explanation: z.string().describe('Explanation of how the teams were selected.'),
});
export type SuggestMatchPairingOutput = z.infer<typeof SuggestMatchPairingOutputSchema>;

export async function suggestMatchPairing(input: SuggestMatchPairingInput): Promise<SuggestMatchPairingOutput> {
  return suggestMatchPairingFlow(input);
}

const suggestMatchPairingPrompt = ai.definePrompt({
  name: 'suggestMatchPairingPrompt',
  model: 'googleai/gemini-pro',
  input: {
    schema: SuggestMatchPairingInputSchema,
  },
  output: {
    schema: SuggestMatchPairingOutputSchema,
  },
  prompt: `You are an AI tournament organizer assistant. Your task is to suggest balanced match pairings for a badminton tournament.

You will receive a list of available players with their skill levels, ages and genders, and a list of previous matches played today.

Your goal is to create two teams of two players each, ensuring the teams are as balanced as possible in terms of skill level. The difference between the two teams' combined skill levels should be minimized, ideally 0 or 1. You should choose from ALL available players to find the most balanced match.

Available Players:
{{#each availablePlayers}}
- Name: {{this.name}}, Skill: {{this.skillLevel}}, Age: {{this.age}}, Gender: {{this.gender}}
{{/each}}

Previous Matches:
{{#each previousMatches}}
  - Team 1:
    {{#each this}}
      - Name: {{this.name}}, Skill: {{this.skillLevel}}
    {{/each}}
  {{/each}}



Suggest two teams, provide an explanation of how they were selected, and include the combined team skill level for each team. The output MUST adhere to the json schema. Make sure the teams each have exactly two players.
`,
});

const suggestMatchPairingFlow = ai.defineFlow(
  {
    name: 'suggestMatchPairingFlow',
    inputSchema: SuggestMatchPairingInputSchema,
    outputSchema: SuggestMatchPairingOutputSchema,
  },
  async input => {
    const {output} = await suggestMatchPairingPrompt(input);
    return output!;
  }
);
