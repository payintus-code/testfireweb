
"use server";

import type { Player } from "@/lib/types";


/**
 * Generates a balanced match by prioritizing players based on a set of rules.
 * 1. Sort players by matches played (asc), then by time available (asc).
 * 2. Select the top 4 players.
 * 3. Find all possible pairings for these 4 players.
 * 4. Choose the best pairing:
 *    - If a pairing with a skill difference <= 1 exists, choose it.
 *    - If not, and if the wait time difference between the 4 players is <= 5 mins, prioritize pairing the 1st player with the 4th.
 *    - Otherwise, choose the pairing with the minimum skill difference.
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
  
  // 1 & 2: Sort by matches played (asc) then by time available (asc, older times first)
  const sortedPlayers = [...availablePlayers].sort((a, b) => {
    const matchesPlayedDiff = (a.matchesPlayed || 0) - (b.matchesPlayed || 0);
    if (matchesPlayedDiff !== 0) {
      return matchesPlayedDiff;
    }
    // availableSince is a timestamp, smaller value means waiting longer
    return (a.availableSince || 0) - (b.availableSince || 0);
  });

  const selectedPlayers = sortedPlayers.slice(0, 4);
  const [p1, p2, p3, p4] = selectedPlayers;

  // There are 3 possible pairings for 4 players:
  // Pairing 1: (p1, p2) vs (p3, p4)
  // Pairing 2: (p1, p3) vs (p2, p4)
  // Pairing 3: (p1, p4) vs (p2, p3)
  const pairings = [
    { teamA: [p1, p2], teamB: [p3, p4], id: 1 },
    { teamA: [p1, p3], teamB: [p2, p4], id: 2 },
    { teamA: [p1, p4], teamB: [p2, p3], id: 3 },
  ];

  const getTeamSkill = (team: Player[]) => team.reduce((acc, p) => acc + p.skillLevel, 0);

  const pairingsWithDiff = pairings.map(p => ({
    ...p,
    diff: Math.abs(getTeamSkill(p.teamA) - getTeamSkill(p.teamB)),
  }));

  // Find the pairing with the minimum difference first
  let bestPairing = pairingsWithDiff.reduce((prev, curr) => (prev.diff < curr.diff ? prev : curr));
  let explanation = `Selected top 4 players based on wait time and matches played. The teams are balanced to have the smallest skill level difference (Team A: ${getTeamSkill(bestPairing.teamA)}, Team B: ${getTeamSkill(bestPairing.teamB)}).`;

  // 3. Check if there's a pairing with a skill diff of 1 or less
  const idealPairing = pairingsWithDiff.find(p => p.diff <= 1);
  if (idealPairing) {
    bestPairing = idealPairing;
    explanation = `Selected top 4 players. Found an ideal pairing with a skill difference of ${bestPairing.diff}. (Team A: ${getTeamSkill(bestPairing.teamA)}, Team B: ${getTeamSkill(bestPairing.teamB)}).`;
  } else {
    // 4. If no ideal pairing, check the wait time condition
    const waitTimeP1 = p1.availableSince || 0;
    const waitTimeP4 = p4.availableSince || 0;
    const waitTimeDifferenceMinutes = Math.abs(waitTimeP4 - waitTimeP1) / (1000 * 60);
    
    // If wait time difference is small, prioritize rule #2 (wait time) by splitting the top players
    if (waitTimeDifferenceMinutes <= 5) {
        // Pairing #3 is (p1, p4) vs (p2, p3), which respects the wait time priority logic.
        const priorityPairing = pairingsWithDiff.find(p => p.id === 3)!;
        bestPairing = priorityPairing;
        explanation = `Selected top 4 players. No ideal skill balance found, but wait times were similar. Prioritized pairing players who waited longest with players who waited less. (Team A: ${getTeamSkill(bestPairing.teamA)}, Team B: ${getTeamSkill(bestPairing.teamB)}).`;
    }
    // If wait times are not similar, the default `bestPairing` with the minimum skill difference is already selected.
  }
  
  const { teamA, teamB } = bestPairing;

  return {
    teamA,
    teamB,
    explanation,
  };
}
