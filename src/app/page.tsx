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
    // Load initial data
    setCourts(COURTS);
    setPlayers(PLAYERS);
    
    // Load matches from localStorage
    const storedMatches = localStorage.getItem("matches");
    if (storedMatches) {
      const parsedMatches: Match[] = JSON.parse(storedMatches);
      setMatches(parsedMatches);

      // Restore court and player states based on loaded matches
      const activeMatchIds = new Set(parsedMatches.map(m => m.id));
      const playersInMatches = new Set(parsedMatches.flatMap(m => [...m.teamA, ...m.teamB]).map(p => p.id));
      
      setCourts(prev => prev.map(c => {
        const matchOnCourt = parsedMatches.find(m => m.courtId === c.id && m.status !== 'completed');
        return { ...c, matchId: matchOnCourt ? matchOnCourt.id : null };
      }));
      
      setPlayers(prev => prev.map(p => ({
        ...p,
        status: playersInMatches.has(p.id) ? 'in-match' : 'available'
      })));

    }

    setIsMounted(true);
  }, []);

  // Persist matches to localStorage whenever they change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("matches", JSON.stringify(matches));
    }
  }, [matches, isMounted]);

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

  const handleMatchUpdate = (matchId: string, newStatus: Match['status'], scoreA?: number, scoreB?: number) => {
    setMatches(prev => prev.map(m => {
        if (m.id === matchId) {
            const updatedMatch = {...m, status: newStatus};
            if (scoreA !== undefined) updatedMatch.scoreA = scoreA;
            if (scoreB !== undefined) updatedMatch.scoreB = scoreB;
            return updatedMatch;
        }
        return m;
    }));

    if (newStatus === 'completed' || newStatus === 'cancelled') {
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
