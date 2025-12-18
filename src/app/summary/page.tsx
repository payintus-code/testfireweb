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
import { Trophy, Users } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

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

export default function SummaryPage() {
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedMatches = localStorage.getItem("matches");
    if (storedMatches) {
      const allMatches: Match[] = JSON.parse(storedMatches);
      setCompletedMatches(allMatches.filter((m) => m.status === "completed"));
    }
    setIsMounted(true);
  }, []);
  
  const handleClearHistory = () => {
    // Clear only completed matches from display and from localStorage
    const storedMatches = localStorage.getItem("matches");
    if (storedMatches) {
        const allMatches: Match[] = JSON.parse(storedMatches);
        const ongoingMatches = allMatches.filter(m => m.status !== 'completed');
        localStorage.setItem('matches', JSON.stringify(ongoingMatches));
    }
    setCompletedMatches([]);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Daily Match Summary</h1>
        <Button variant="outline" onClick={handleClearHistory} disabled={completedMatches.length === 0}>
            Clear History
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Completed Matches</CardTitle>
          <CardDescription>
            A log of all matches played today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedMatches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Court</TableHead>
                  <TableHead>Team A</TableHead>
                  <TableHead>Team B</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedMatches.map((match) => (
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
                    <TableCell className="text-right font-mono font-semibold">
                      {match.scoreA} - {match.scoreB}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px] p-6 text-muted-foreground">
              <Trophy className="w-12 h-12 mb-4" />
              <p className="font-semibold">No matches completed yet.</p>
              <p className="text-sm">
                Completed matches will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
