
"use server";

import type { Player } from "@/lib/types";


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
  
  // Sort by matches played (asc) then by time available (asc, older times first)
  const sortedPlayers = [...availablePlayers].sort((a, b) => {
    const matchesPlayedDiff = (a.matchesPlayed || 0) - (b.matchesPlayed || 0);
    if (matchesPlayedDiff !== 0) {
      return matchesPlayedDiff;
    }
    return (a.availableSince || 0) - (b.availableSince || 0);
  });

  const selectedPlayers = sortedPlayers.slice(0, 4);
  const [p1, p2, p3, p4] = selectedPlayers;

  // There are 3 possible pairings for 4 players:
  // 1. (p1, p2) vs (p3, p4)
  // 2. (p1, p3) vs (p2, p4)
  // 3. (p1, p4) vs (p2, p3)

  const pairings = [
    { teamA: [p1, p2], teamB: [p3, p4] },
    { teamA: [p1, p3], teamB: [p2, p4] },
    { teamA: [p1, p4], teamB: [p2, p3] },
  ];

  const getTeamSkill = (team: Player[]) => team.reduce((acc, p) => acc + p.skillLevel, 0);

  let bestPairing = pairings[0];
  let minDiff = Math.abs(getTeamSkill(pairings[0].teamA) - getTeamSkill(pairings[0].teamB));

  for (let i = 1; i < pairings.length; i++) {
    const diff = Math.abs(getTeamSkill(pairings[i].teamA) - getTeamSkill(pairings[i].teamB));
    if (diff < minDiff) {
      minDiff = diff;
      bestPairing = pairings[i];
    }
  }

  const { teamA, teamB } = bestPairing;

  const explanation = `Selected top 4 players based on wait time and matches played. The teams are balanced to have the smallest skill level difference (Team A: ${getTeamSkill(teamA)}, Team B: ${getTeamSkill(teamB)}).`;

  return {
    teamA,
    teamB,
    explanation,
  };
}
