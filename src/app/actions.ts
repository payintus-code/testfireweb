"use server";

import type { Player } from "@/lib/types";

/**
 * Simulates an AI-powered match generation process.
 * Selects 4 players from the available pool and attempts to create two teams
 * with the most balanced total skill levels.
 *
 * @param availablePlayers - An array of players with 'available' status.
 * @returns An object containing teamA and teamB arrays of players.
 */
export async function generateBalancedMatch(
  availablePlayers: Player[]
): Promise<{ teamA: Player[]; teamB: Player[] }> {
  // This is a simulation of the GenAI flow.
  // A real implementation would call the GenAI model here.

  // 1. Ensure we have at least 4 players.
  if (availablePlayers.length < 4) {
    // Not enough players to form a match.
    return { teamA: [], teamB: [] };
  }

  // 2. Shuffle players to get a random set of 4 for consideration.
  const shuffled = [...availablePlayers].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 4);

  let bestCombination: { teamA: Player[]; teamB: Player[]; diff: number } | null = null;

  // 3. Find the best combination of players into two teams.
  // There are only 3 ways to split 4 players into 2 teams of 2.
  const combinations = [
    { teamA: [selected[0], selected[1]], teamB: [selected[2], selected[3]] },
    { teamA: [selected[0], selected[2]], teamB: [selected[1], selected[3]] },
    { teamA: [selected[0], selected[3]], teamB: [selected[1], selected[2]] },
  ];

  for (const combo of combinations) {
    const skillA = combo.teamA.reduce((sum, p) => sum + p.skillLevel, 0);
    const skillB = combo.teamB.reduce((sum, p) => sum + p.skillLevel, 0);
    const diff = Math.abs(skillA - skillB);

    if (bestCombination === null || diff < bestCombination.diff) {
      bestCombination = { ...combo, diff };
    }
  }
  
  // Add a small delay to simulate network latency for the AI call
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (!bestCombination) {
     // Should not happen with 4 players, but as a fallback.
     return { teamA: [selected[0], selected[1]], teamB: [selected[2], selected[3]] };
  }

  return {
    teamA: bestCombination.teamA,
    teamB: bestCombination.teamB,
  };
}
