
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
}

type PlayerHistories = Record<string, History>;

function buildPlayerHistories(matches: Match[]): PlayerHistories {
    const histories: PlayerHistories = {};

    const ensureHistory = (playerId: string) => {
        if (!histories[playerId]) {
            histories[playerId] = {
                teammates: {},
                opponents: {},
                lightGames: 0,
            };
        }
    };

    for (const match of matches) {
        if (match.status !== 'completed') continue;

        const allPlayersInMatch = [...match.teamA, ...match.teamB];
        allPlayersInMatch.forEach(p => ensureHistory(p.id));
        
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
        const history = histories[player.id] || { teammates: {}, opponents: {}, lightGames: 0 };

        // Check teammate constraints
        const teammates = teamA.includes(player) ? teamA : teamB;
        for (const teammate of teammates) {
            if (player.id !== teammate.id) {
                if ((history.teammates[teammate.id] || 0) >= MAX_TEAMMATE_COUNT) {
                    issues.push(`${player.name} and ${teammate.name} have been teammates ${MAX_TEAMMATE_COUNT} times already.`);
                }
            }
        }
        
        // Check opponent constraints
        const opponents = teamA.includes(player) ? teamB : teamA;
        for (const opponent of opponents) {
             if ((history.opponents[opponent.id] || 0) >= MAX_OPPONENT_COUNT) {
                issues.push(`${player.name} has played against ${opponent.name} ${MAX_OPPONENT_COUNT} times already.`);
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

    const validMatchups = matchups.filter(m => m.issues.length === 0);
    
    if (validMatchups.length > 0) {
        // Prefer valid matchups with the smallest skill difference
        return validMatchups.sort((a, b) => a.diff - b.diff)[0];
    } else {
        // If no valid matchups, return the one with the fewest issues and smallest diff
        return matchups.sort((a, b) => a.issues.length - b.issues.length || a.diff - b.diff)[0];
    }
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
    const aHistory = histories[a.id] || { teammates: {}, opponents: {}, lightGames: 0 };
    const bHistory = histories[b.id] || { teammates: {}, opponents: {}, lightGames: 0 };
    const aMatchesPlayed = Object.keys(aHistory.teammates).length + Object.keys(aHistory.opponents).length;
    const bMatchesPlayed = Object.keys(bHistory.teammates).length + Object.keys(bHistory.opponents).length;

    if (aMatchesPlayed !== bMatchesPlayed) {
      return aMatchesPlayed - bMatchesPlayed;
    }
    return (a.availableSince || 0) - (b.availableSince || 0);
  });
  
  const initialPlayers = sortedPlayers.slice(0, 4);
  const remainingPlayers = sortedPlayers.slice(4);

  // 3. Try to find the best match with the top 4 players
  let bestMatchup = findBestMatchup(initialPlayers, histories);
  
  let explanation = `Selected top 4 players based on play count and wait time. `;

  if (bestMatchup && bestMatchup.diff <= 1 && bestMatchup.issues.length === 0) {
      explanation += `Found a valid and balanced pairing (skill diff: ${bestMatchup.diff}).`;
      return { ...bestMatchup, explanation };
  }

  // 4. If not ideal, try swapping players
  const MAX_WAIT_TIME_DIFF_MS = 10 * 60 * 1000;
  let swapped = false;

  for (let i = 0; i < initialPlayers.length; i++) {
      const playerToSwapOut = initialPlayers[i];
      for (const replacementPlayer of remainingPlayers) {
          const waitTimeDiff = Math.abs((playerToSwapOut.availableSince || 0) - (replacementPlayer.availableSince || 0));

          if (waitTimeDiff <= MAX_WAIT_TIME_DIFF_MS) {
              const potentialGroup = [...initialPlayers];
              potentialGroup[i] = replacementPlayer;

              const potentialMatchup = findBestMatchup(potentialGroup, histories);
              
              if (potentialMatchup && potentialMatchup.diff <= 1 && potentialMatchup.issues.length === 0) {
                   explanation = `Swapped '${playerToSwapOut.name}' with '${replacementPlayer.name}' to achieve a valid and balanced match (skill diff: ${potentialMatchup.diff}).`;
                   return { ...potentialMatchup, explanation };
              }
          }
      }
  }

  // 5. Final fallback
  if (bestMatchup) {
      if (bestMatchup.issues.length > 0) {
          explanation += `Could not find a perfectly valid match. Selected the option with the fewest rule violations (${bestMatchup.issues.length}) and best skill balance (diff: ${bestMatchup.diff}).`;
      } else {
          explanation += `Could not achieve ideal skill balance (diff <= 1) while respecting all rules. Selected the most balanced valid pairing (diff: ${bestMatchup.diff}).`;
      }
      return { ...bestMatchup, explanation };
  }
  
  // This should be unreachable if there are >= 4 players
  throw new Error("Could not generate any possible match configuration.");
}
