"use server";

import type { Player, Match } from "@/lib/types";

/**
 * Shuffles an array in place.
 * @param array The array to shuffle.
 */
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}


/**
 * Generates a balanced match by pairing the highest and lowest skilled players.
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

  // Shuffle players to get a random set of 4
  const shuffledPlayers = shuffle([...availablePlayers]);
  const selectedPlayers = shuffledPlayers.slice(0, 4);

  // Sort the 4 selected players by skill level to create balanced teams
  selectedPlayers.sort((a, b) => a.skillLevel - b.skillLevel);

  const teamA = [selectedPlayers[0], selectedPlayers[3]]; // Lowest + Highest
  const teamB = [selectedPlayers[1], selectedPlayers[2]]; // Middle two

  const teamASkill = teamA.reduce((sum, p) => sum + p.skillLevel, 0);
  const teamBSkill = teamB.reduce((sum, p) => sum + p.skillLevel, 0);

  const explanation = `Teams were created by selecting 4 random players and balancing their skill levels. Team A has a combined skill of ${teamASkill} and Team B has ${teamBSkill}.`;

  return {
    teamA,
    teamB,
    explanation
  };
}
