
"use server";

import type { Player } from "@/lib/types";

/**
 * Finds all combinations of 2 players from a given array of players.
 * @param players - Array of players to combine.
 * @returns An array of player pairs.
 */
function getPlayerCombinations(players: Player[]): [Player, Player][] {
    const combinations: [Player, Player][] = [];
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            combinations.push([players[i], players[j]]);
        }
    }
    return combinations;
}

/**
 * Finds a balanced match from a group of 4 players.
 * @param fourPlayers - An array of exactly 4 players.
 * @returns The best pairing and its skill difference, or null if input is invalid.
 */
function findBestPairing(fourPlayers: Player[]): { teamA: Player[], teamB: Player[], diff: number, explanation: string } | null {
    if (fourPlayers.length !== 4) return null;

    const [p1, p2, p3, p4] = fourPlayers;

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
    const bestOverallPairing = pairingsWithDiff.reduce((prev, curr) => (prev.diff < curr.diff ? prev : curr));

    // Case 1: Ideal balance (diff <= 1)
    const idealPairing = pairingsWithDiff.find(p => p.diff <= 1);
    if (idealPairing) {
        return {
            ...idealPairing,
            explanation: `Found an ideal pairing with a skill difference of ${idealPairing.diff}. (Team A: ${getTeamSkill(idealPairing.teamA)}, Team B: ${getTeamSkill(idealPairing.teamB)}).`
        };
    }
    
    // Case 2: Wait time priority (wait time diff <= 5 mins)
    // Note: The players are pre-sorted by wait time, so p1 has waited longest, p4 the least among the four.
    const waitTimeP1 = p1.availableSince || 0;
    const waitTimeP4 = p4.availableSince || 0;
    const waitTimeDifferenceMinutes = Math.abs(waitTimeP4 - waitTimeP1) / (1000 * 60);

    if (waitTimeDifferenceMinutes <= 5) {
        const priorityPairing = pairingsWithDiff.find(p => p.id === 3)!; // (p1, p4) vs (p2, p3)
        return {
            ...priorityPairing,
            explanation: `No ideal skill balance found. Prioritized pairing players who waited longest with players who waited less as wait times were similar. (Team A: ${getTeamSkill(priorityPairing.teamA)}, Team B: ${getTeamSkill(priorityPairing.teamB)}).`
        };
    }

    // Case 3: Default to best skill balance if no other condition is met
    return {
        ...bestOverallPairing,
        explanation: `Selected players with longest wait times. The teams are balanced for the smallest skill level difference. (Team A: ${getTeamSkill(bestOverallPairing.teamA)}, Team B: ${getTeamSkill(bestOverallPairing.teamB)}).`
    };
}


/**
 * Generates a balanced match by prioritizing players and then finding the best pairing,
 * with a fallback to swap players for better balance.
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
    return (a.availableSince || 0) - (b.availableSince || 0);
  });

  const selectedPlayers = sortedPlayers.slice(0, 4);
  const remainingPlayers = sortedPlayers.slice(4);

  // 3. Try to find a balanced match (diff <= 1) with the top 4 players
  let bestPairing = findBestPairing(selectedPlayers);
  if (bestPairing && bestPairing.diff <= 1) {
    return { teamA: bestPairing.teamA, teamB: bestPairing.teamB, explanation: `Selected top 4 players based on wait time and matches played. ${bestPairing.explanation}` };
  }

  // 4. If no ideal balance, try to swap one player from top 4 with one from the rest
  const MAX_WAIT_TIME_DIFF_MS = 10 * 60 * 1000; // 10 minutes

  // Iterate through each of the top 4 players to consider swapping them out
  for (let i = 0; i < selectedPlayers.length; i++) {
    const playerToSwapOut = selectedPlayers[i];
    
    // Iterate through remaining players to find a suitable replacement
    for (const replacementPlayer of remainingPlayers) {
        const waitTimeDiff = Math.abs((playerToSwapOut.availableSince || 0) - (replacementPlayer.availableSince || 0));

        if (waitTimeDiff <= MAX_WAIT_TIME_DIFF_MS) {
            // Create a new potential group of 4
            const potentialGroup = [...selectedPlayers];
            potentialGroup[i] = replacementPlayer;

            // Check if this new group can form a balanced match
            const potentialPairing = findBestPairing(potentialGroup);
            
            if (potentialPairing && potentialPairing.diff <= 1) {
                // Found a better, balanced group!
                return {
                    teamA: potentialPairing.teamA,
                    teamB: potentialPairing.teamB,
                    explanation: `Swapped '${playerToSwapOut.name}' with '${replacementPlayer.name}' to achieve a better skill balance. ${potentialPairing.explanation}`
                };
            }
        }
    }
  }

  // 5. Final fallback: If no swap results in a perfect balance, use the original best (but not ideal) pairing from the top 4
  if (bestPairing) {
     return { teamA: bestPairing.teamA, teamB: bestPairing.teamB, explanation: `Could not find an ideal match (skill diff <= 1), even after trying to swap players. Using the most balanced pairing from the top 4 waiting players. ${bestPairing.explanation}` };
  }
  
  // This should theoretically not be reached if there are >= 4 players
  throw new Error("Could not generate any match. Please select players manually.");
}
