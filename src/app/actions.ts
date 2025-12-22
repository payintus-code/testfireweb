
"use server";

import type { Player, Match } from "@/lib/types";

const MAX_TEAMMATE_COUNT = 2;
const MAX_OPPONENT_COUNT = 2;
const MAX_LIGHT_GAMES = 2;
const SKILL_DIFF_FOR_LIGHT_GAME = 2;
const MAX_WAIT_TIME_DIFF_MS = 10 * 60 * 1000; // 10 minutes

type History = {
    teammates: Record<string, number>;
    opponents: Record<string, number>;
    lightGames: number;
    lastTeammates: string[];
    lastOpponents: string[];
}

type PlayerHistories = Record<string, History>;

function buildPlayerHistories(matches: Match[], allPlayers: Player[]): PlayerHistories {
    const histories: PlayerHistories = {};

    const ensureHistory = (playerId: string) => {
        if (!histories[playerId]) {
            histories[playerId] = {
                teammates: {},
                opponents: {},
                lightGames: 0,
                lastTeammates: [],
                lastOpponents: [],
            };
        }
    };
    
    // Ensure all players have a history entry initialized
    allPlayers.forEach(p => ensureHistory(p.id));

    const sortedMatches = [...matches].filter(m => m.status === 'completed' && m.endTime).sort((a, b) => a.endTime! - b.endTime!);
    
    const playerLastMatch: Record<string, Match> = {};

    for (const match of sortedMatches) {
        const allPlayersInMatch = [...match.teamA, ...match.teamB];

        allPlayersInMatch.forEach(p => {
            ensureHistory(p.id);
            playerLastMatch[p.id] = match; 
        });
        
        for (const player of match.teamA) {
            for (const teammate of match.teamA) {
                if (player.id !== teammate.id) {
                    histories[player.id].teammates[teammate.id] = (histories[player.id].teammates[teammate.id] || 0) + 1;
                }
            }
            for (const opponent of match.teamB) {
                histories[player.id].opponents[opponent.id] = (histories[player.id].opponents[opponent.id] || 0) + 1;
            }
        }
        for (const player of match.teamB) {
            for (const teammate of match.teamB) {
                if (player.id !== teammate.id) {
                    histories[player.id].teammates[teammate.id] = (histories[player.id].teammates[teammate.id] || 0) + 1;
                }
            }
            for (const opponent of match.teamA) {
                histories[player.id].opponents[opponent.id] = (histories[player.id].opponents[opponent.id] || 0) + 1;
            }
        }
        
        const teamASkillSum = match.teamA.reduce((sum, p) => sum + p.skillLevel, 0);
        const teamBSkillSum = match.teamB.reduce((sum, p) => sum + p.skillLevel, 0);
        const avgSkillA = teamASkillSum / match.teamA.length;
        const avgSkillB = teamBSkillSum / match.teamB.length;

        for (const player of allPlayersInMatch) {
            const isPlayerOnTeamA = match.teamA.some(p => p.id === player.id);
            const opponentTeamAvg = isPlayerOnTeamA ? avgSkillB : avgSkillA;
            if (player.skillLevel >= opponentTeamAvg + SKILL_DIFF_FOR_LIGHT_GAME) {
                 histories[player.id].lightGames += 1;
            }
        }
    }
    
    for (const playerId in playerLastMatch) {
        const lastMatch = playerLastMatch[playerId];
        const playerIsOnTeamA = lastMatch.teamA.some(p => p.id === playerId);
        
        if (histories[playerId]) {
            histories[playerId].lastTeammates = (playerIsOnTeamA ? lastMatch.teamA : lastMatch.teamB)
              .filter(p => p.id !== playerId)
              .map(p => p.id);
            histories[playerId].lastOpponents = (playerIsOnTeamA ? lastMatch.teamB : lastMatch.teamA)
              .map(p => p.id);
        }
    }

    return histories;
}

function checkPairingConstraints(
    teamA: Player[],
    teamB: Player[],
    histories: PlayerHistories
): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const playersInMatch = [...teamA, ...teamB];

    for (const player of playersInMatch) {
        const history = histories[player.id] || { teammates: {}, opponents: {}, lightGames: 0, lastTeammates: [], lastOpponents: [] };
        
        const teammates = teamA.some(p => p.id === player.id) ? teamA : teamB;
        for (const teammate of teammates) {
            if (player.id !== teammate.id) {
                if ((history.teammates[teammate.id] || 0) >= MAX_TEAMMATE_COUNT) {
                    issues.push(`${player.name} and ${teammate.name} have been teammates ${MAX_TEAMMATE_COUNT} times already.`);
                }
                if (history.lastTeammates.includes(teammate.id)) {
                    issues.push(`${player.name} and ${teammate.name} were teammates in the last match.`);
                }
            }
        }
        
        const opponents = teamA.some(p => p.id === player.id) ? teamB : teamA;
        for (const opponent of opponents) {
             if ((history.opponents[opponent.id] || 0) >= MAX_OPPONENT_COUNT) {
                issues.push(`${player.name} has played against ${opponent.name} ${MAX_OPPONENT_COUNT} times already.`);
            }
            if (history.lastOpponents.includes(opponent.id)) {
                issues.push(`${player.name} played against ${opponent.name} in the last match.`);
            }
        }

        const teamASkillSum = teamA.reduce((sum, p) => sum + p.skillLevel, 0);
        const teamBSkillSum = teamB.reduce((sum, p) => sum + p.skillLevel, 0);
        const avgSkillA = teamASkillSum / teamA.length;
        const avgSkillB = teamBSkillSum / teamB.length;
        const opponentTeamAvg = teamA.some(p => p.id === player.id) ? avgSkillB : avgSkillA;

        if (player.skillLevel >= opponentTeamAvg + SKILL_DIFF_FOR_LIGHT_GAME && history.lightGames >= MAX_LIGHT_GAMES) {
            issues.push(`${player.name} would be playing a 3rd light game.`);
        }

        const avoidIds = player.avoidPlayers || [];
        if (avoidIds.length > 0) {
            for (const otherPlayer of playersInMatch) {
                if (player.id !== otherPlayer.id && avoidIds.includes(otherPlayer.id)) {
                    issues.push(`${player.name} wants to avoid ${otherPlayer.name}.`);
                }
            }
        }
    }
    
    return { isValid: issues.length === 0, issues };
}

function getCombinations<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    function backtrack(startIndex: number, currentCombination: T[]) {
        if (currentCombination.length === size) {
            result.push([...currentCombination]);
            return;
        }
        for (let i = startIndex; i < array.length; i++) {
            currentCombination.push(array[i]);
            backtrack(i + 1, currentCombination);
            currentCombination.pop();
        }
    }
    backtrack(0, []);
    return result;
}

type Matchup = {
    teamA: Player[];
    teamB: Player[];
    diff: number;
    issues: string[];
}

function findBestMatchup(
    fourPlayers: Player[],
    histories: PlayerHistories
): Matchup | null {
    if (fourPlayers.length !== 4) return null;

    const pairings = getCombinations(fourPlayers, 2);
    const getTeamSkill = (team: Player[]) => team.reduce((acc, p) => acc + p.skillLevel, 0);

    const matchups: Matchup[] = [];
    for (let i = 0; i < pairings.length / 2; i++) {
        const teamA = pairings[i];
        const teamB = fourPlayers.filter(p => !teamA.includes(p));
        
        const { issues } = checkPairingConstraints(teamA, teamB, histories);
        
        matchups.push({
            teamA,
            teamB,
            diff: Math.abs(getTeamSkill(teamA) - getTeamSkill(teamB)),
            issues,
        });
    }
    
    return matchups.sort((a, b) => a.issues.length - b.issues.length || a.diff - b.diff)[0];
}


// Fisher-Yates shuffle algorithm
function shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}


export async function generateBalancedMatch(
  availablePlayers: Player[],
  previousMatches: Match[]
): Promise<{ teamA: Player[]; teamB: Player[]; explanation: string, issues: string[] } | null> {
  
  if (availablePlayers.length < 4) {
    throw new Error("Not enough players to generate a match.");
  }

  const histories = buildPlayerHistories(previousMatches, availablePlayers);

  // Create all possible groups of 4 players
  const allPlayerGroups = getCombinations(availablePlayers, 4);

  // Shuffle the groups to randomize the search order
  const shuffledPlayerGroups = shuffle(allPlayerGroups);
  
  let bestFoundMatchup: Matchup | null = null;

  for (const group of shuffledPlayerGroups) {
    const matchup = findBestMatchup(group, histories);

    if (matchup) {
      // If we find a "perfect" match (no issues, balanced skill), return it immediately.
      if (matchup.issues.length === 0 && matchup.diff <= 1) {
        const playerNames = group.map(p => p.name).join(', ');
        const explanation = `Found a perfect match with players: ${playerNames}. The teams are balanced (skill diff: ${matchup.diff}) and there are no rule violations.`;
        return { ...matchup, explanation, issues: matchup.issues };
      }

      // If it's not a perfect match, keep it as the best option found so far
      // if it's better than what we previously found.
      if (!bestFoundMatchup || 
          matchup.issues.length < bestFoundMatchup.issues.length ||
          (matchup.issues.length === bestFoundMatchup.issues.length && matchup.diff < bestFoundMatchup.diff)) 
      {
          bestFoundMatchup = matchup;
      }
    }
  }
  
  if (bestFoundMatchup) {
      const playerNames = [...bestFoundMatchup.teamA, ...bestFoundMatchup.teamB].map(p => p.name).join(', ');
      let explanation = `After checking all possibilities, the best available match is with players: ${playerNames}. `;
      if (bestFoundMatchup.issues.length > 0) {
          explanation += `This option is chosen despite violating ${bestFoundMatchup.issues.length} rule(s), as it is the most compliant option available. Skill difference is ${bestFoundMatchup.diff}.`;
      } else {
          explanation += `This pairing respects all history rules and is the most balanced option available (skill diff: ${bestFoundMatchup.diff}).`;
      }
      return { ...bestFoundMatchup, explanation, issues: bestFoundMatchup.issues };
  }
  
  // This should be unreachable if there are >= 4 players
  throw new Error("Could not generate any possible match configuration. This might happen if player constraints are too restrictive.");
}
    
