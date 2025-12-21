
"use server";

import type { Player, Match } from "@/lib/types";

const MAX_TEAMMATE_COUNT = 2;
const MAX_OPPONENT_COUNT = 2;
const MAX_LIGHT_GAMES = 2;
const SKILL_DIFF_FOR_LIGHT_GAME = 2;

type History = {
    teammates: Record<string, number>;
    opponents: Record<string, number>;
    lightGames: number;
    lastTeammates: string[];
    lastOpponents: string[];
}

type PlayerHistories = Record<string, History>;

function buildPlayerHistories(matches: Match[]): PlayerHistories {
    const histories: PlayerHistories = {};
    const playerLastMatch: Record<string, Match> = {};

    // Sort matches by end time to correctly determine the last match
    const sortedMatches = [...matches].filter(m => m.status === 'completed' && m.endTime).sort((a, b) => a.endTime! - b.endTime!);

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

    for (const match of sortedMatches) {
        const allPlayersInMatch = [...match.teamA, ...match.teamB];
        allPlayersInMatch.forEach(p => {
            ensureHistory(p.id);
            playerLastMatch[p.id] = match; // Update last match for each player
        });
        
        // Update teammate and opponent counts
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
        
        // Check for light games
        for (const player of allPlayersInMatch) {
            let isLightGame = false;
            for (const otherPlayer of allPlayersInMatch) {
                if (player.id !== otherPlayer.id && player.skillLevel >= otherPlayer.skillLevel + SKILL_DIFF_FOR_LIGHT_GAME) {
                    isLightGame = true;
                    break;
                }
            }
            if (isLightGame) {
                histories[player.id].lightGames += 1;
            }
        }
    }
    
    // After processing all matches, determine last teammates/opponents
    for (const playerId in playerLastMatch) {
        const lastMatch = playerLastMatch[playerId];
        const playerIsOnTeamA = lastMatch.teamA.some(p => p.id === playerId);
        
        if (playerIsOnTeamA) {
            histories[playerId].lastTeammates = lastMatch.teamA.filter(p => p.id !== playerId).map(p => p.id);
            histories[playerId].lastOpponents = lastMatch.teamB.map(p => p.id);
        } else {
            histories[playerId].lastTeammates = lastMatch.teamB.filter(p => p.id !== playerId).map(p => p.id);
            histories[playerId].lastOpponents = lastMatch.teamA.map(p => p.id);
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

        // Check teammate constraints
        const teammates = teamA.includes(player) ? teamA : teamB;
        for (const teammate of teammates) {
            if (player.id !== teammate.id) {
                if ((history.teammates[teammate.id] || 0) >= MAX_TEAMMATE_COUNT) {
                    issues.push(`${player.name} and ${teammate.name} have been teammates ${MAX_TEAMMATE_COUNT} times already.`);
                }
                // NEW: Check for immediate re-teaming
                if (history.lastTeammates.includes(teammate.id)) {
                    issues.push(`${player.name} and ${teammate.name} were teammates in the last match.`);
                }
            }
        }
        
        // Check opponent constraints
        const opponents = teamA.includes(player) ? teamB : teamA;
        for (const opponent of opponents) {
             if ((history.opponents[opponent.id] || 0) >= MAX_OPPONENT_COUNT) {
                issues.push(`${player.name} has played against ${opponent.name} ${MAX_OPPONENT_COUNT} times already.`);
            }
            // NEW: Check for immediate opposition
            if (history.lastOpponents.includes(opponent.id)) {
                issues.push(`${player.name} played against ${opponent.name} in the last match.`);
            }
        }

        // Check light game constraints
        let isLightGame = false;
        for (const otherPlayer of playersInMatch) {
            if (player.id !== otherPlayer.id && player.skillLevel >= otherPlayer.skillLevel + SKILL_DIFF_FOR_LIGHT_GAME) {
                isLightGame = true;
                break;
            }
        }

        if (isLightGame && history.lightGames >= MAX_LIGHT_GAMES) {
            issues.push(`${player.name} would be playing a 3rd light game.`);
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
    // There are 3 possible pairings for 4 players (p1,p2 vs p3,p4), (p1,p3 vs p2,p4), (p1,p4 vs p2,p3)
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
    
    // Sort by number of issues, then by skill difference
    return matchups.sort((a, b) => a.issues.length - b.issues.length || a.diff - b.diff)[0];
}


export async function generateBalancedMatch(
  availablePlayers: Player[],
  previousMatches: Match[]
): Promise<{ teamA: Player[]; teamB: Player[]; explanation: string, issues: string[] } | null> {
  
  if (availablePlayers.length < 4) {
    throw new Error("Not enough players to generate a match.");
  }

  const histories = buildPlayerHistories(previousMatches);

  // 1 & 2: Sort by matches played, then by wait time
  const sortedPlayers = [...availablePlayers].sort((a, b) => {
    // Get total matches played from histories for consistency
    const aMatchesPlayed = Object.values(histories[a.id]?.teammates || {}).reduce((s, c) => s + c, 0) / 2 + Object.values(histories[a.id]?.opponents || {}).reduce((s, c) => s + c, 0);
    const bMatchesPlayed = Object.values(histories[b.id]?.teammates || {}).reduce((s, c) => s + c, 0) / 2 + Object.values(histories[b.id]?.opponents || {}).reduce((s, c) => s + c, 0);
    
    if (aMatchesPlayed !== bMatchesPlayed) {
      return aMatchesPlayed - bMatchesPlayed;
    }
    return (a.availableSince || 0) - (b.availableSince || 0);
  });
  
  const initialPlayers = sortedPlayers.slice(0, 4);
  const remainingPlayers = sortedPlayers.slice(4);

  // 3. Find the best possible match with the top 4 players
  let bestMatchup = findBestMatchup(initialPlayers, histories);
  
  let explanation = `Selected top 4 players based on play count and wait time: ${initialPlayers.map(p => p.name).join(', ')}. `;

  // If the best match with the initial group is perfect (no issues, diff <= 1), we can consider it
  if (bestMatchup && bestMatchup.issues.length === 0 && bestMatchup.diff <= 1) {
      explanation += `Found a valid and balanced pairing (skill diff: ${bestMatchup.diff}).`;
      return { ...bestMatchup, explanation, issues: bestMatchup.issues };
  }

  // 4. If not ideal, try swapping players to find a "perfect" match (no issues, diff <=1)
  const MAX_WAIT_TIME_DIFF_MS = 10 * 60 * 1000;
  
  for (let i = 3; i >= 0; i--) { // Iterate backwards to swap out lowest priority players first
      const playerToSwapOut = initialPlayers[i];
      for (const replacementPlayer of remainingPlayers) {
          // Skip players who have waited much longer
          if ((replacementPlayer.availableSince || 0) < (playerToSwapOut.availableSince || 0) - MAX_WAIT_TIME_DIFF_MS) continue;

          const potentialGroup = [...initialPlayers];
          potentialGroup[i] = replacementPlayer;

          const potentialMatchup = findBestMatchup(potentialGroup, histories);
          
          if (potentialMatchup && potentialMatchup.issues.length === 0 && potentialMatchup.diff <= 1) {
               explanation = `Swapped '${playerToSwapOut.name}' with '${replacementPlayer.name}' to achieve a valid and more balanced match (skill diff: ${potentialMatchup.diff}). Players considered: ${potentialGroup.map(p => p.name).join(', ')}.`;
               return { ...potentialMatchup, explanation, issues: potentialMatchup.issues };
          }
      }
  }

  // 5. If no "perfect" swap was found, return the best matchup from the initial group.
  if (bestMatchup) {
      if (bestMatchup.issues.length > 0) {
          explanation += `Could not find a perfectly valid match. The selected option violates ${bestMatchup.issues.length} rule(s) but is the most balanced choice (skill diff: ${bestMatchup.diff}).`;
      } else {
          explanation += `Could not achieve ideal skill balance (diff <= 1) while respecting all rules. Selected the most balanced valid pairing available (skill diff: ${bestMatchup.diff}).`;
      }
      return { ...bestMatchup, explanation, issues: bestMatchup.issues };
  }
  
  // This should be unreachable if there are >= 4 players
  throw new Error("Could not generate any possible match configuration.");
}
