"use server";

import type { Player } from "@/lib/types";


/**
 * Generates a balanced match by prioritizing players who have played fewer matches and have been waiting longer.
 * After selecting the top 4 players based on this priority, it pairs the highest and lowest skilled players together.
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

  // Sort the 4 selected players by skill level to create balanced teams
  selectedPlayers.sort((a, b) => a.skillLevel - b.skillLevel);

  const teamA = [selectedPlayers[0], selectedPlayers[3]]; // Lowest + Highest
  const teamB = [selectedPlayers[1], selectedPlayers[2]]; // Middle two

  const teamASkill = teamA.reduce((sum, p) => sum + p.skillLevel, 0);
  const teamBSkill = teamB.reduce((sum, p) => sum + p.skillLevel, 0);

  const explanation = `Teams were created by prioritizing players with fewer games and longer wait times, then balancing skill levels. Team A has a combined skill of ${teamASkill} and Team B has ${teamBSkill}.`;

  return {
    teamA,
    teamB,
    explanation
  };
}
