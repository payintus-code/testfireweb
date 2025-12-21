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
import { generateBalancedMatch } from '@/app/actions';
import type { Match, Player } from '@/lib/types';


const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().describe('The name of the player.'),
  skillLevel: z.number().describe('The skill level of the player (e.g., 1-10).'),
  age: z.number().describe('The age of the player.'),
  gender: z.string().describe('The gender of the player.'),
  status: z.enum(['available', 'in-match', 'unavailable']),
  avatarUrl: z.string(),
  availableSince: z.number().optional(),
  matchesPlayed: z.number(),
  avoidPlayers: z.array(z.string()).optional(),
});


const MatchSchema = z.object({
    id: z.string(),
    courtId: z.number(),
    teamA: z.array(PlayerSchema),
    teamB: z.array(PlayerSchema),
    scoreA: z.number(),
    scoreB: z.number(),
    status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
    shuttlecocksUsed: z.number(),
});


const SuggestMatchPairingInputSchema = z.object({
  availablePlayers: z.array(PlayerSchema).describe('The list of available players for the match.'),
  previousMatches: z.array(MatchSchema).describe('The list of previous matches played today.'),
});
export type SuggestMatchPairingInput = z.infer<typeof SuggestMatchPairingInputSchema>;

const SuggestedTeamSchema = z.object({
  players: z.array(PlayerSchema).length(2).describe('Two players who will form a team.'),
  teamSkillLevel: z.number().describe('The combined skill level of the team'),
});

const SuggestMatchPairingOutputSchema = z.object({
  teamA: z.array(PlayerSchema),
  teamB: z.array(PlayerSchema),
  explanation: z.string().describe('Explanation of how the teams were selected.'),
  issues: z.array(z.string()).optional().describe('An array of any broken rules or warnings.'),
});
export type SuggestMatchPairingOutput = z.infer<typeof SuggestMatchPairingOutputSchema>;

export async function suggestMatchPairing(input: SuggestMatchPairingInput): Promise<SuggestMatchPairingOutput> {
  return suggestMatchPairingFlow(input);
}


const suggestMatchPairingFlow = ai.defineFlow(
  {
    name: 'suggestMatchPairingFlow',
    inputSchema: SuggestMatchPairingInputSchema,
    outputSchema: SuggestMatchPairingOutputSchema,
  },
  async ({ availablePlayers, previousMatches }) => {
    
    const result = await generateBalancedMatch(availablePlayers as Player[], previousMatches as Match[]);

    if (!result) {
        throw new Error("Could not generate a match.");
    }
    
    return {
        teamA: result.teamA,
        teamB: result.teamB,
        explanation: result.explanation,
        issues: result.issues
    };
  }
);
