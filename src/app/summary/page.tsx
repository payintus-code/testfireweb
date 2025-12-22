
"use client";

import { useState, useEffect } from "react";
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
import { Trophy, Clock, UserSearch } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ShuttlecockIcon } from "@/components/icons/shuttlecock-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";


const TeamDisplay = ({ team }: { team: Player[] }) => (
  <div className="flex items-center gap-2">
    <div className="flex -space-x-2 overflow-hidden">
      {team.map((player) => (
        <Image
          key={player.id}
          src={player.avatarUrl}
          alt={player.name}
          width={24}
          height={24}
          className="inline-block h-6 w-6 rounded-full ring-2 ring-background"
          data-ai-hint="player avatar"
        />
      ))}
    </div>
    <span className="text-sm text-muted-foreground">
      {team.map((p) => p.name.split(" ")[0]).join(" & ")}
    </span>
  </div>
);

const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function SummaryPage() {
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedMatches = localStorage.getItem("matches");
    if (storedMatches) {
      const allMatches: Match[] = JSON.parse(storedMatches);
      setCompletedMatches(allMatches.filter((m) => m.status === "completed"));
    }

    const storedPlayers = localStorage.getItem("players");
    if (storedPlayers) {
        setPlayers(JSON.parse(storedPlayers));
    }

    setIsMounted(true);
  }, []);
  
  const handleClearHistory = () => {
    // Clear completed matches from localStorage
    const storedMatches = localStorage.getItem("matches");
    if (storedMatches) {
        const allMatches: Match[] = JSON.parse(storedMatches);
        const ongoingMatches = allMatches.filter(m => m.status !== 'completed');
        localStorage.setItem('matches', JSON.stringify(ongoingMatches));
    }
    setCompletedMatches([]);
    setSelectedPlayerId(null);

    // Reset matchesPlayed for all players
    const storedPlayers = localStorage.getItem("players");
    if (storedPlayers) {
        const players: Player[] = JSON.parse(storedPlayers);
        const updatedPlayers = players.map(p => ({ ...p, matchesPlayed: 0 }));
        localStorage.setItem('players', JSON.stringify(updatedPlayers));
        setPlayers(updatedPlayers);
    }
  };

  const getDuration = (match: Match) => {
    if (match.startTime && match.endTime) {
      const durationSeconds = Math.floor((match.endTime - match.startTime) / 1000);
      return formatDuration(durationSeconds);
    }
    return "-";
  };

  const filteredMatches = selectedPlayerId
    ? completedMatches.filter(match => 
        match.teamA.some(p => p.id === selectedPlayerId) || 
        match.teamB.some(p => p.id === selectedPlayerId)
      )
    : completedMatches;

  const getPlayerResult = (match: Match, playerId: string | null) => {
    const finalScore = `${match.scoreA} - ${match.scoreB}`;
    
    if (!playerId) {
        return { result: 'neutral', score: finalScore };
    }
      
    const isOnTeamA = match.teamA.some(p => p.id === playerId);
    const isOnTeamB = match.teamB.some(p => p.id === playerId);

    if (!isOnTeamA && !isOnTeamB) {
        // This case should ideally not happen if matches are filtered correctly
        return { result: 'neutral', score: finalScore };
    }

    const teamAWon = match.scoreA > match.scoreB;

    if ((isOnTeamA && teamAWon) || (isOnTeamB && !teamAWon)) {
        return { result: 'win', score: finalScore };
    } else if ((isOnTeamA && !teamAWon) || (isOnTeamB && teamAWon)) {
        return { result: 'loss', score: finalScore };
    } else { // Draw
        return { result: 'neutral', score: finalScore };
    }
  };


  if (!isMounted) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Daily Match Summary</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Daily Match Summary</h1>
        <div className="flex items-center gap-2">
            <Select onValueChange={(value) => setSelectedPlayerId(value === "all" ? null : value)} value={selectedPlayerId || "all"}>
                <SelectTrigger className="w-[180px]">
                    <UserSearch className="w-4 h-4 mr-2"/>
                    <SelectValue placeholder="Select a player" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Players</SelectItem>
                    {players.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleClearHistory} disabled={completedMatches.length === 0}>
                Clear History
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Completed Matches</CardTitle>
          <CardDescription>
            {selectedPlayerId ? `A log of matches played by ${players.find(p => p.id === selectedPlayerId)?.name || ''}.` : 'A log of all matches played today.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMatches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Court</TableHead>
                  <TableHead>Team A</TableHead>
                  <TableHead>Team B</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Shuttles</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.map((match) => {
                  const { result, score } = getPlayerResult(match, selectedPlayerId);
                  return (
                      <TableRow key={match.id}>
                        <TableCell className="font-medium">
                          Court {match.courtId}
                        </TableCell>
                        <TableCell>
                          <TeamDisplay team={match.teamA} />
                        </TableCell>
                        <TableCell>
                          <TeamDisplay team={match.teamB} />
                        </TableCell>
                         <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4"/>
                            <span>{getDuration(match)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <ShuttlecockIcon className="w-4 h-4"/>
                            <span>{match.shuttlecocksUsed || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                            "text-right font-mono font-semibold",
                            result === 'win' && 'text-green-600',
                            result === 'loss' && 'text-red-600'
                        )}>
                          {score}
                        </TableCell>
                      </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px] p-6 text-muted-foreground">
              <Trophy className="w-12 h-12 mb-4" />
              <p className="font-semibold">No matches completed yet.</p>
              <p className="text-sm">
                {selectedPlayerId ? "This player hasn't completed any matches." : "Completed matches will appear here."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
