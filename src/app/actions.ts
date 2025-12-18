"use server";

import { suggestMatchPairing, SuggestMatchPairingInput } from "@/ai/ai-suggested-match-pairing";
import type { Player, Match } from "@/lib/types";

/**
 * Generates a balanced match using AI.
 *
 * @param availablePlayers - An array of players with 'available' status.
 * @param previousMatches - An array of previous matches to consider for player repetition constraints.
 * @returns An object containing teamA and teamB arrays of players, and an explanation.
 */
export async function generateAIMatch(
  availablePlayers: Player[],
  previousMatches: Match[]
): Promise<{ teamA: Player[]; teamB: Player[]; explanation: string }> {
  
  if (availablePlayers.length < 4) {
    throw new Error("Not enough players to generate a match.");
  }
  
  const previousMatchPlayers = previousMatches.map(match => [...match.teamA, ...match.teamB]);

  const input: SuggestMatchPairingInput = {
    availablePlayers: availablePlayers.map(p => ({ name: p.name, skillLevel: p.skillLevel, age: p.age, gender: p.gender })),
    previousMatches: previousMatchPlayers.map(team => team.map(p => ({ name: p.name, skillLevel: p.skillLevel, age: p.age, gender: p.gender }))),
  };

  const result = await suggestMatchPairing(input);

  // Helper to find the full Player object from the AI's response which only contains partial data
  const findFullPlayer = (playerName: string) => {
    const player = availablePlayers.find(p => p.name === playerName);
    if (!player) {
        throw new Error(`AI returned a player not in the available list: ${playerName}`);
    }
    return player;
  }

  const teamA = result.team1.players.map(p => findFullPlayer(p.name));
  const teamB = result.team2.players.map(p => findFullPlayer(p.name));

  return {
    teamA,
    teamB,
    explanation: result.explanation
  };
}
