
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
    
    // Ensure all players (even those who haven't played) have a history entry initialized
    allPlayers.forEach(p => ensureHistory(p.id));


    // Sort matches by end time to correctly determine the last match
    const sortedMatches = [...matches].filter(m => m.status === 'completed' && m.endTime).sort((a, b) => a.endTime! - b.endTime!);
    
    const playerLastMatch: Record<string, Match> = {};

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
        const teamASkillSum = match.teamA.reduce((sum, p) => sum + p.skillLevel, 0);
        const teamBSkillSum = match.teamB.reduce((sum, p) => sum + p.skillLevel, 0);
        const avgSkillA = teamASkillSum / match.teamA.length;
        const avgSkillB = teamBSkillSum / match.teamB.length;

        for (const player of allPlayersInMatch) {
            const opponentTeamAvg = match.teamA.some(p => p.id === player.id) ? avgSkillB : avgSkillA;
            if (player.skillLevel >= opponentTeamAvg + SKILL_DIFF_FOR_LIGHT_GAME) {
                 histories[player.id].lightGames += 1;
            }
        }
    }
    
    // After processing all matches, determine last teammates/opponents
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
        // Ensure player has a history, even if they haven't played before
        const history = histories[player.id] || { teammates: {}, opponents: {}, lightGames: 0, lastTeammates: [], lastOpponents: [] };

        // Check teammate constraints
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
        
        // Check opponent constraints
        const opponents = teamA.some(p => p.id === player.id) ? teamB : teamA;
        for (const opponent of opponents) {
             if ((history.opponents[opponent.id] || 0) >= MAX_OPPONENT_COUNT) {
                issues.push(`${player.name} has played against ${opponent.name} ${MAX_OPPONENT_COUNT} times already.`);
            }
            if (history.lastOpponents.includes(opponent.id)) {
                issues.push(`${player.name} played against ${opponent.name} in the last match.`);
            }
        }

        // Check light game constraints
        const teamASkillSum = teamA.reduce((sum, p) => sum + p.skillLevel, 0);
        const teamBSkillSum = teamB.reduce((sum, p) => sum + p.skillLevel, 0);
        const avgSkillA = teamASkillSum / teamA.length;
        const avgSkillB = teamBSkillSum / teamB.length;
        const opponentTeamAvg = teamA.some(p => p.id === player.id) ? avgSkillB : avgSkillA;

        if (player.skillLevel >= opponentTeamAvg + SKILL_DIFF_FOR_LIGHT_GAME && history.lightGames >= MAX_LIGHT_GAMES) {
            issues.push(`${player.name} would be playing a 3rd light game.`);
        }


        // Check avoid list constraint
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
    
    // Sort by number of issues (Priority 3), then by skill difference (Priority 4)
    return matchups.sort((a, b) => a.issues.length - b.issues.length || a.diff - b.diff)[0];
}


export async function generateBalancedMatch(
  availablePlayers: Player[],
  previousMatches: Match[]
): Promise<{ teamA: Player[]; teamB: Player[]; explanation: string, issues: string[] } | null> {
  
  if (availablePlayers.length < 4) {
    throw new Error("Not enough players to generate a match.");
  }

  const histories = buildPlayerHistories(previousMatches, availablePlayers);

  // Priority 1 & 2: Sort by matches played, then by wait time
  const sortedPlayers = [...availablePlayers].sort((a, b) => {
    const aMatchesPlayed = a.matchesPlayed || 0;
    const bMatchesPlayed = b.matchesPlayed || 0;
    
    if (aMatchesPlayed !== bMatchesPlayed) {
      return aMatchesPlayed - bMatchesPlayed;
    }
    return (a.availableSince || 0) - (b.availableSince || 0);
  });
  
  let currentPlayers = sortedPlayers.slice(0, 4);
  const remainingPlayers = sortedPlayers.slice(4);

  // 3. Find the best possible match with the top 4 players based on Priority 3 (history) and 4 (skill)
  let bestMatchup = findBestMatchup(currentPlayers, histories);
  
  let explanation = `Selected top 4 players based on play count and wait time: ${currentPlayers.map(p => p.name).join(', ')}. `;

  // If the best match with the initial group is perfect (no issues, diff <= 1), we can consider it
  if (bestMatchup && bestMatchup.issues.length === 0 && bestMatchup.diff <= 1) {
      explanation += `Found a valid and perfectly balanced pairing (skill diff: ${bestMatchup.diff}).`;
      return { ...bestMatchup, explanation, issues: bestMatchup.issues };
  }

  // 4 & 5. If not ideal, try swapping players to find a "perfect" match (no issues, diff <=1)
  // This is a more complex iterative swapping logic.
  for (let i = 0; i < currentPlayers.length; i++) { // Iterate through each position in the current group
      const playerToSwapOut = currentPlayers[i];
      for (const replacementPlayer of remainingPlayers) {
           // Skip if this replacement has already been part of a considered group to avoid cycles
          if (currentPlayers.some(p => p.id === replacementPlayer.id)) continue;
        
          // Priority 5: player being swapped must not have waited more than 10 mins longer
          if ((replacementPlayer.availableSince || 0) > (playerToSwapOut.availableSince || 0) + MAX_WAIT_TIME_DIFF_MS) {
              continue;
          }
          
          // Create a new potential group
          const potentialGroup = [...currentPlayers];
          potentialGroup[i] = replacementPlayer;

          const potentialMatchup = findBestMatchup(potentialGroup, histories);
          
          // Check if this new matchup is "perfect"
          if (potentialMatchup && potentialMatchup.issues.length === 0 && potentialMatchup.diff <= 1) {
               explanation = `Swapped '${playerToSwapOut.name}' with '${replacementPlayer.name}' to achieve a valid and perfectly balanced match (skill diff: ${potentialMatchup.diff}). New group: ${potentialGroup.map(p => p.name).join(', ')}.`;
               return { ...potentialMatchup, explanation, issues: potentialMatchup.issues };
          }
      }
  }


  // 6. If no "perfect" swap was found, return the best matchup from the initial group.
  if (bestMatchup) {
      if (bestMatchup.issues.length > 0) {
          explanation += `Could not find a perfectly valid match after trying swaps. The selected option is the best choice from the initial priority group, but violates ${bestMatchup.issues.length} history rule(s). It's the most balanced choice (skill diff: ${bestMatchup.diff}) among the possibilities.`;
      } else {
          explanation += `Could not achieve ideal skill balance (diff <= 1) while respecting all history rules, even after trying swaps. This is the most balanced valid pairing available from the initial priority group (skill diff: ${bestMatchup.diff}).`;
      }
      return { ...bestMatchup, explanation, issues: bestMatchup.issues };
  }
  
  // This should be unreachable if there are >= 4 players
  throw new Error("Could not generate any possible match configuration.");
}

    
