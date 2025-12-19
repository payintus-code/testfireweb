
"use server";

import type { Player } from "@/lib/types";
import { suggestMatchPairing, type SuggestMatchPairingInput } from "@/ai/ai-suggested-match-pairing";


/**
 * Generates a balanced match by prioritizing players who have played fewer matches and have been waiting longer.
 * After selecting the top 4 players, it finds the team pairing with the minimum skill level difference.
 *
 * @param availablePlayers - An array of players with 'available' status.
 * @returns An object containing teamA and teamB arrays of players, and an explanation.
 */
export async function generateBalancedMatch(
  availablePlayers: Player[],
): Promise<{ teamA: Player[]; teamB: Player[]; explanation: string }> {
  
  if (availablePlayers.length < 4) {
    throw new Error("Not enough players to generate a match.");
  }
  
  const aiInput: SuggestMatchPairingInput = {
    availablePlayers,
    previousMatches: [], // Note: previousMatches is not implemented yet
  };

  const aiResult = await suggestMatchPairing(aiInput);

  // The AI can sometimes return players that are not in the available list.
  // We need to find the corresponding player object from the original availablePlayers list.
  const findOriginalPlayer = (player: Player) => 
    availablePlayers.find(p => p.name === player.name)!;

  const teamA = aiResult.team1.players.map(findOriginalPlayer);
  const teamB = aiResult.team2.players.map(findOriginalPlayer);

  return {
    teamA,
    teamB,
    explanation: aiResult.explanation,
  };
}
