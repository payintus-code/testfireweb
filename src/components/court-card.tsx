"use client";

import { Swords, Users, Calendar, Trophy, Play, Flag, Ban } from "lucide-react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Court, Match } from "@/lib/types";

type CourtCardProps = {
  court: Court;
  match: Match | null;
  onCreateMatch: (courtId: number) => void;
  onUpdateMatchStatus: (matchId: string, newStatus: Match['status']) => void;
};

const TeamDisplay = ({ team }: { team: Match['teamA'] }) => (
  <div className="flex -space-x-2 overflow-hidden">
    {team.map((player) => (
      <Image
        key={player.id}
        src={player.avatarUrl}
        alt={player.name}
        width={32}
        height={32}
        className="inline-block h-8 w-8 rounded-full ring-2 ring-background"
        data-ai-hint="player avatar"
      />
    ))}
  </div>
);

export default function CourtCard({
  court,
  match,
  onCreateMatch,
  onUpdateMatchStatus,
}: CourtCardProps) {

  const renderMatchContent = () => {
    if (!match) return null;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <TeamDisplay team={match.teamA} />
            <span className="text-muted-foreground text-sm">vs</span>
            <TeamDisplay team={match.teamB} />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-tighter">
              {match.scoreA} - {match.scoreB}
            </div>
            <div className="text-xs text-muted-foreground uppercase">{match.status}</div>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{match.teamA[0].name.split(' ')[0]} & {match.teamA[1].name.split(' ')[0]}</span>
            </div>
             <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{match.teamB[0].name.split(' ')[0]} & {match.teamB[1].name.split(' ')[0]}</span>
            </div>
        </div>
      </div>
    );
  };
  
  const renderEmptyContent = () => (
    <div className="flex flex-col items-center justify-center text-center h-full min-h-[160px] p-6">
        <div className="p-3 rounded-full bg-primary/10 mb-4">
            <Calendar className="w-8 h-8 text-primary" />
        </div>
      <p className="font-semibold">Court is available</p>
      <p className="text-sm text-muted-foreground mb-4">Create a new match to get started.</p>
      <Button onClick={() => onCreateMatch(court.id)}>
        <Swords className="mr-2 h-4 w-4" /> Create Match
      </Button>
    </div>
  );

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{court.name}</CardTitle>
        <CardDescription>
          {match ? `Match in progress` : "Awaiting next match"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {match ? renderMatchContent() : renderEmptyContent()}
      </CardContent>
      {match && (
        <CardFooter className="bg-muted/50 p-3 flex justify-end gap-2">
          {match.status === 'scheduled' && (
             <Button variant="default" size="sm" onClick={() => onUpdateMatchStatus(match.id, 'in-progress')}>
                <Play className="mr-2 h-4 w-4" /> Start Match
            </Button>
          )}
          {match.status === 'in-progress' && (
            <Button variant="default" size="sm" onClick={() => onUpdateMatchStatus(match.id, 'completed')}>
                <Flag className="mr-2 h-4 w-4" /> End Match
            </Button>
          )}
           {match.status !== 'completed' && (
            <Button variant="outline" size="sm" onClick={() => onUpdateMatchStatus(match.id, 'completed')}>
                <Ban className="mr-2 h-4 w-4" /> Cancel
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
