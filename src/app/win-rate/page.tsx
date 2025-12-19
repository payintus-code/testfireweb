
"use client";

import { useState, useEffect, useMemo } from "react";
import type { Match, Player } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Medal, Percent } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type PlayerWinRate = {
  player: Player;
  wins: number;
  losses: number;
  matchesPlayed: number;
  winRate: number;
};

const MedalIcon = ({ rank }: { rank: number }) => {
  if (rank > 2) return null;
  const colors = ["text-yellow-400", "text-slate-400", "text-amber-600"];
  return <Medal className={cn("w-5 h-5", colors[rank])} />;
};

export default function WinRatePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedPlayers = localStorage.getItem("players");
    if (storedPlayers) {
      setPlayers(JSON.parse(storedPlayers));
    }
    const storedMatches = localStorage.getItem("matches");
    if (storedMatches) {
      const allMatches: Match[] = JSON.parse(storedMatches);
      setCompletedMatches(allMatches.filter((m) => m.status === "completed"));
    }
    setIsMounted(true);
  }, []);

  const winRateStats = useMemo((): PlayerWinRate[] => {
    const stats: { [playerId: string]: { wins: number; matchesPlayed: number } } = {};

    players.forEach(p => {
        stats[p.id] = { wins: 0, matchesPlayed: 0 };
    });

    completedMatches.forEach((match) => {
      const teamAWon = match.scoreA > match.scoreB;
      const winners = teamAWon ? match.teamA : match.teamB;
      const losers = teamAWon ? match.teamB : match.teamA;

      winners.forEach((player) => {
        if (!stats[player.id]) stats[player.id] = { wins: 0, matchesPlayed: 0 };
        stats[player.id].wins += 1;
        stats[player.id].matchesPlayed += 1;
      });
      
      losers.forEach((player) => {
        if (!stats[player.id]) stats[player.id] = { wins: 0, matchesPlayed: 0 };
        stats[player.id].matchesPlayed += 1;
      });
    });

    return players
      .map((player) => {
        const playerStats = stats[player.id];
        if (!playerStats || playerStats.matchesPlayed === 0) {
            return {
                player,
                wins: 0,
                losses: 0,
                matchesPlayed: 0,
                winRate: 0,
            };
        }
        
        const losses = playerStats.matchesPlayed - playerStats.wins;
        const winRate = (playerStats.wins / playerStats.matchesPlayed) * 100;
        
        return {
          player,
          wins: playerStats.wins,
          losses,
          matchesPlayed: playerStats.matchesPlayed,
          winRate,
        };
      })
      .filter(s => s.matchesPlayed > 0)
      .sort((a, b) => b.winRate - a.winRate || b.matchesPlayed - a.matchesPlayed);
      
  }, [players, completedMatches]);

  const getRankedStats = () => {
    let rank = 0;
    let lastWinRate = -1;
    let playersAtCurrentRank = 1;
    
    return winRateStats.map((stat, index) => {
      if (stat.winRate !== lastWinRate) {
        rank += playersAtCurrentRank;
        playersAtCurrentRank = 1;
        lastWinRate = stat.winRate;
      } else {
        playersAtCurrentRank++;
      }
      return { ...stat, rank: rank -1 };
    });
  };

  const rankedStats = getRankedStats();

  if (!isMounted) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Player Win Rates</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Player Win Rates</h1>
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            Player rankings based on match win rates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rankedStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-center">Total Played</TableHead>
                  <TableHead className="text-center">Wins</TableHead>
                  <TableHead className="text-center">Losses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedStats.map((stat, index) => (
                  <TableRow key={stat.player.id}>
                    <TableCell className="font-bold text-lg">
                      <div className="flex items-center gap-2">
                        <MedalIcon rank={stat.rank} />
                        <span>{stat.rank + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Image
                          src={stat.player.avatarUrl}
                          alt={stat.player.name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                        <span className="font-medium">{stat.player.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{stat.winRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-center">{stat.matchesPlayed}</TableCell>
                    <TableCell className="text-center text-green-600">{stat.wins}</TableCell>
                    <TableCell className="text-center text-red-600">{stat.losses}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px] p-6 text-muted-foreground">
              <Percent className="w-12 h-12 mb-4" />
              <p className="font-semibold">No statistics to display.</p>
              <p className="text-sm">
                Complete at least one match to see player win rates.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
