
"use server";

import type { Player } from "@/lib/types";


/**
 * Generates a balanced match by prioritizing players who have played fewer matches and have been waiting longer.
 * After selecting the top 4 players, it finds the team pairing with the minimum skill level difference,
 * ensuring the difference is no more than 1.
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

  // Sort players to prioritize those with fewer matches and longer wait times
  const sortedPlayers = [...availablePlayers].sort((a, b) => {
    // Players with fewer matches have higher priority
    const matchesPlayedDiff = (a.matchesPlayed || 0) - (b.matchesPlayed || 0);
    if (matchesPlayedDiff !== 0) {
      return matchesPlayedDiff;
    }
    // For players with the same number of matches, prioritize who has been waiting longer
    // A smaller 'availableSince' timestamp means they have been waiting longer
    return (a.availableSince || 0) - (b.availableSince || 0);
  });
  
  // Select the top 4 prioritized players
  const selectedPlayers = sortedPlayers.slice(0, 4);

  // Find the best pairing out of the 3 possible combinations for 4 players
  const [p1, p2, p3, p4] = selectedPlayers.sort((a, b) => a.skillLevel - b.skillLevel);

  const pairings = [
    { teamA: [p1, p4], teamB: [p2, p3] }, // 1st + 4th vs 2nd + 3rd
    { teamA: [p1, p3], teamB: [p2, p4] }, // 1st + 3rd vs 2nd + 4th
    { teamA: [p1, p2], teamB: [p3, p4] }, // 1st + 2nd vs 3rd + 4th
  ];

  let bestPairing = null;
  let minDiff = Infinity;

  for (const pairing of pairings) {
    const teamASkill = pairing.teamA.reduce((sum, p) => sum + p.skillLevel, 0);
    const teamBSkill = pairing.teamB.reduce((sum, p) => sum + p.skillLevel, 0);
    const diff = Math.abs(teamASkill - teamBSkill);

    if (diff < minDiff) {
      minDiff = diff;
      bestPairing = pairing;
    }
  }

  if (bestPairing === null || minDiff > 1) {
    // This case should be rare, but as a fallback, we use the default pairing.
    // Or we could throw an error if a strict balance is required.
    // Let's throw an error to signal that balancing failed under the new rule.
    throw new Error("Could not find a balanced match where team skill difference is 1 or less. Please select manually.");
  }

  const { teamA, teamB } = bestPairing;
  const teamASkill = teamA.reduce((sum, p) => sum + p.skillLevel, 0);
  const teamBSkill = teamB.reduce((sum, p) => sum + p.skillLevel, 0);

  const explanation = `Teams were created by prioritizing players with fewer games and longer wait times, then finding the most balanced skill pairing. Team A has a combined skill of ${teamASkill} and Team B has ${teamBSkill}.`;

  return {
    teamA,
    teamB,
    explanation
  };
}
