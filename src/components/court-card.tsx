
"use client";

import { useState, useEffect } from "react";
import { Swords, Users, Calendar, Trophy, Play, Flag, Ban, Check, X, Clock, Plus, Minus } from "lucide-react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import type { Court, Match } from "@/lib/types";
import { ShuttlecockIcon } from "./icons/shuttlecock-icon";

type CourtCardProps = {
  court: Court;
  match: Match | null;
  onCreateMatch: (courtId: number) => void;
  onUpdateMatch: (matchId: string, updates: Partial<Omit<Match, 'id'>>) => void;
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

const EndMatchDialog = ({ match, onUpdateMatch, open, onOpenChange }: { match: Match, onUpdateMatch: CourtCardProps['onUpdateMatch'], open: boolean, onOpenChange: (open: boolean) => void }) => {
    const [scoreA, setScoreA] = useState(match.scoreA);
    const [scoreB, setScoreB] = useState(match.scoreB);
    
    useEffect(() => {
      if (open) {
        setScoreA(match.scoreA);
        setScoreB(match.scoreB);
      }
    }, [open, match.scoreA, match.scoreB]);


    const handleConfirmEnd = () => {
        onUpdateMatch(match.id, { status: 'completed', scoreA, scoreB, shuttlecocksUsed: match.shuttlecocksUsed });
        onOpenChange(false);
    }
    
    const handleScoreChange = (setter: (value: number) => void, value: string) => {
        const newScore = parseInt(value, 10);
        if (isNaN(newScore)) {
          setter(0);
        } else {
          setter(newScore);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>End Match on Court {match.courtId}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Please enter the final score for the match.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-start justify-center gap-4">
                      <div className="flex flex-col items-center gap-2 text-center">
                          <label htmlFor="scoreA" className="text-sm font-medium">Team A</label>
                           <div className="text-xs text-muted-foreground">
                            {match.teamA.map(p => p.name).join(' & ')}
                          </div>
                          <Input id="scoreA" type="number" value={scoreA || ''} onChange={(e) => handleScoreChange(setScoreA, e.target.value)} className="w-20 text-center text-lg" />
                      </div>
                      <span className="text-2xl font-bold pt-10">-</span>
                      <div className="flex flex-col items-center gap-2 text-center">
                          <label htmlFor="scoreB" className="text-sm font-medium">Team B</label>
                          <div className="text-xs text-muted-foreground">
                            {match.teamB.map(p => p.name).join(' & ')}
                          </div>
                          <Input id="scoreB" type="number" value={scoreB || ''} onChange={(e) => handleScoreChange(setScoreB, e.target.value)} className="w-20 text-center text-lg" />
                      </div>
                  </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmEnd}>
                        <Check className="mr-2 h-4 w-4" /> Confirm & End
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


const MatchTimer = ({ match }: { match: Match }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (match.status !== 'in-progress' || !match.startTime) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - (match.startTime ?? now)) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [match.status, match.startTime]);

  const getDuration = () => {
    if (match.status === 'in-progress' && match.startTime) {
        return formatDuration(elapsedSeconds);
    }
    if (match.status === 'completed' && match.startTime && match.endTime) {
      const duration = Math.floor((match.endTime - match.startTime) / 1000);
      return formatDuration(duration);
    }
    return '00:00';
  }

  return (
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <span>{getDuration()}</span>
      </div>
  )
}

const ShuttlecockCounter = ({ match, onUpdateMatch }: { match: Match, onUpdateMatch: CourtCardProps['onUpdateMatch'] }) => {
  const handleUpdate = (increment: number) => {
    const newCount = Math.max(0, (match.shuttlecocksUsed || 0) + increment);
    onUpdateMatch(match.id, { shuttlecocksUsed: newCount });
  }

  return (
    <div className="flex items-center gap-2">
      <ShuttlecockIcon className="w-4 h-4" />
      <span>{match.shuttlecocksUsed || 0}</span>
      {match.status === 'in-progress' && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdate(-1)}>
            <Minus className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdate(1)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default function CourtCard({
  court,
  match,
  onCreateMatch,
  onUpdateMatch,
}: CourtCardProps) {
  const [isEndMatchDialogOpen, setEndMatchDialogOpen] = useState(false);

  const renderMatchContent = () => {
    if (!match) return null;

    return (
      <>
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <TeamDisplay team={match.teamA} />
              <span className="text-muted-foreground text-sm pt-1">vs</span>
              <TeamDisplay team={match.teamB} />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tighter">
                {match.scoreA} - {match.scoreB}
              </div>
              <div className="text-xs text-muted-foreground uppercase">{match.status.replace('-', ' ')}</div>
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
              { (match.status === 'in-progress' || match.status === 'completed') && <MatchTimer match={match} /> }
              <ShuttlecockCounter match={match} onUpdateMatch={onUpdateMatch} />
          </div>
        </div>
        {match && <EndMatchDialog match={match} onUpdateMatch={onUpdateMatch} open={isEndMatchDialogOpen} onOpenChange={setEndMatchDialogOpen} />}
      </>
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
          {match ? `Match ${match.status.replace('-', ' ')}` : "Awaiting next match"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {match ? renderMatchContent() : renderEmptyContent()}
      </CardContent>
      {match && (
        <CardFooter className="bg-muted/50 p-3 flex justify-end gap-2">
          {match.status === 'scheduled' && (
             <Button variant="default" size="sm" onClick={() => onUpdateMatch(match.id, { status: 'in-progress' })}>
                <Play className="mr-2 h-4 w-4" /> Start Match
            </Button>
          )}
          {match.status === 'in-progress' && (
            <Button variant="destructive" size="sm" onClick={() => setEndMatchDialogOpen(true)}>
                <Flag className="mr-2 h-4 w-4" /> End Match
            </Button>
          )}
           {(match.status === 'scheduled' || match.status === 'in-progress') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will cancel the current match. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go Back</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onUpdateMatch(match.id, { status: 'cancelled' })}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
