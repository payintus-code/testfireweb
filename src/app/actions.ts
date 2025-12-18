"use server";

import type { Player } from "@/lib/types";

/**
 * Simulates a random match generation process.
 * Selects 4 players from the available pool and divides them into two teams.
 *
 * @param availablePlayers - An array of players with 'available' status.
 * @returns An object containing teamA and teamB arrays of players.
 */
export async function generateRandomMatch(
  availablePlayers: Player[]
): Promise<{ teamA: Player[]; teamB: Player[] }> {
  
  // 1. Ensure we have at least 4 players.
  if (availablePlayers.length < 4) {
    // Not enough players to form a match.
    return { teamA: [], teamB: [] };
  }

  // 2. Shuffle players to get a random set of 4 for the match.
  const shuffled = [...availablePlayers].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 4);

  // 3. Split the 4 selected players into two teams.
  const teamA = [selected[0], selected[1]];
  const teamB = [selected[2], selected[3]];
  
  // Add a small delay to simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    teamA,
    teamB,
  };
}
