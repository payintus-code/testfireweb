"use client";

import { useState, useEffect } from "react";
import CourtCard from "@/components/court-card";
import type { Court, Match, Player } from "@/lib/types";
import { COURTS, PLAYERS } from "@/lib/data";
import { CreateMatchDialog } from "@/components/match/create-match-dialog";

export default function Home() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  useEffect(() => {
    setCourts(COURTS);
    setPlayers(PLAYERS);
    setIsMounted(true);
  }, []);

  const handleCreateMatchClick = (court: Court) => {
    setSelectedCourt(court);
    setDialogOpen(true);
  };
  
  const handleMatchCreate = (newMatch: Omit<Match, "id" | "status" | "scoreA" | "scoreB">) => {
    if (!selectedCourt) return;

    const matchId = `match-${Date.now()}`;
    const matchWithId: Match = {
      ...newMatch,
      id: matchId,
      status: 'scheduled',
      scoreA: 0,
      scoreB: 0,
    };

    setMatches(prev => [...prev, matchWithId]);
    
    setCourts(prev => prev.map(c => 
      c.id === selectedCourt.id ? { ...c, matchId: matchId } : c
    ));
    
    const playerIdsInMatch = [...newMatch.teamA, ...newMatch.teamB].map(p => p.id);
    setPlayers(prev => prev.map(p => 
      playerIdsInMatch.includes(p.id) ? { ...p, status: 'in-match' } : p
    ));

    setDialogOpen(false);
    setSelectedCourt(null);
  };

  const handleMatchUpdate = (matchId: string, newStatus: Match['status']) => {
    setMatches(prev => prev.map(m => m.id === matchId ? {...m, status: newStatus} : m));

    if (newStatus === 'completed') {
      const match = matches.find(m => m.id === matchId);
      if (match) {
        const playerIdsInMatch = [...match.teamA, ...match.teamB].map(p => p.id);
        setPlayers(prev => prev.map(p => 
          playerIdsInMatch.includes(p.id) ? { ...p, status: 'available' } : p
        ));
        setCourts(prev => prev.map(c => c.matchId === matchId ? {...c, matchId: null} : c));
      }
    }
  };


  if (!isMounted) {
    return null;
  }
  
  const availablePlayers = players.filter(p => p.status === 'available');

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {courts.map((court) => {
          const match = matches.find(m => m.id === court.matchId) || null;
          return (
            <CourtCard
              key={court.id}
              court={court}
              match={match}
              onCreateMatch={() => handleCreateMatchClick(court)}
              onUpdateMatchStatus={handleMatchUpdate}
            />
          );
        })}
      </div>
      {selectedCourt && (
        <CreateMatchDialog
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          court={selectedCourt}
          availablePlayers={availablePlayers}
          onMatchCreate={handleMatchCreate}
        />
      )}
    </div>
  );
}
