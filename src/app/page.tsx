
"use client";

import { useState, useEffect } from "react";
import CourtCard from "@/components/court-card";
import type { Court, Match, Player } from "@/lib/types";
import { COURTS as DEFAULT_COURTS } from "@/lib/data";
import { CreateMatchDialog } from "@/components/match/create-match-dialog";

export default function Home() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  useEffect(() => {
    const storedCourts = localStorage.getItem("courts");
    if (storedCourts) {
      setCourts(JSON.parse(storedCourts));
    } else {
      setCourts(DEFAULT_COURTS);
    }
    
    const storedPlayers = localStorage.getItem("players");
    if (storedPlayers) {
      setPlayers(JSON.parse(storedPlayers));
    } else {
      setPlayers([]);
    }
    
    const storedMatches = localStorage.getItem("matches");
    if (storedMatches) {
      const parsedMatches: Match[] = JSON.parse(storedMatches);
      setMatches(parsedMatches.map(m => ({ ...m, shuttlecocksUsed: m.shuttlecocksUsed || 0 })));

      // Restore court and player states based on loaded matches
      const playersInMatches = new Set(parsedMatches.flatMap(m => m.status !== 'completed' && m.status !== 'cancelled' ? [...m.teamA, ...m.teamB].map(p => p.id) : []));
      
      setCourts(prev => {
         const storedC = localStorage.getItem("courts");
         const currentCourts = storedC ? JSON.parse(storedC) : DEFAULT_COURTS;
         return currentCourts.map((c: Court) => {
            const matchOnCourt = parsedMatches.find(m => m.courtId === c.id && m.status !== 'completed' && m.status !== 'cancelled');
            return { ...c, matchId: matchOnCourt ? matchOnCourt.id : null };
         });
      });
      
      setPlayers(prev => {
        const storedP = localStorage.getItem("players");
        const currentPlayers = storedP ? JSON.parse(storedP) : [];
        if (!currentPlayers || currentPlayers.length === 0) return [];
        return currentPlayers.map((p: Player) => ({
          ...p,
          matchesPlayed: p.matchesPlayed || 0,
          status: playersInMatches.has(p.id) ? 'in-match' : p.status === 'in-match' ? 'available' : p.status,
          availableSince: playersInMatches.has(p.id) ? undefined : p.availableSince ?? (p.status === 'available' ? Date.now() : undefined)
        }));
      });

    } else {
       setMatches([]);
    }

    setIsMounted(true);
  }, []);

  // Persist matches, players, and courts to localStorage whenever they change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("matches", JSON.stringify(matches));
      
      // Update court matchId based on matches
      const updatedCourts = courts.map(c => {
         const matchOnCourt = matches.find(m => m.courtId === c.id && m.status !== 'completed' && m.status !== 'cancelled');
         return { ...c, matchId: matchOnCourt ? matchOnCourt.id : null };
      });
      // Do not save the matchId to localStorage for courts to avoid stale data.
      // We only want to save the core court info (id, name).
      const courtsToStore = updatedCourts.map(({ id, name }) => ({ id, name }));
      localStorage.setItem("courts", JSON.stringify(courtsToStore));
    }
  }, [matches, isMounted, courts]);
  
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("players", JSON.stringify(players));
    }
  }, [players, isMounted]);

  const handleCreateMatchClick = (court: Court) => {
    setSelectedCourt(court);
    setDialogOpen(true);
  };
  
  const handleMatchCreate = (newMatch: Omit<Match, "id" | "status" | "scoreA" | "scoreB" | "shuttlecocksUsed">) => {
    if (!selectedCourt) return;

    const matchId = `match-${Date.now()}`;
    const matchWithId: Match = {
      ...newMatch,
      id: matchId,
      status: 'scheduled',
      scoreA: 0,
      scoreB: 0,
      shuttlecocksUsed: 1,
    };
    
    const isFirstMatch = matches.length === 0;
    const now = Date.now();

    setMatches(prev => [...prev, matchWithId]);
    
    setCourts(prev => prev.map(c => 
      c.id === selectedCourt.id ? { ...c, matchId: matchId } : c
    ));
    
    const playerIdsInMatch = [...newMatch.teamA, ...newMatch.teamB].map(p => p.id);

    setPlayers(prev => prev.map(p => {
      if (playerIdsInMatch.includes(p.id)) {
        return { ...p, status: 'in-match', availableSince: undefined };
      }
      // If it's the first match, set availableSince for all other available players
      if (isFirstMatch && p.status === 'available') {
        return { ...p, availableSince: now };
      }
      return p;
    }));

    setDialogOpen(false);
    setSelectedCourt(null);
  };

  const handleMatchUpdate = (matchId: string, updates: Partial<Omit<Match, 'id'>>) => {
    let playersToUpdate: string[] = [];
    
    const updatedMatches = matches.map(m => {
        if (m.id === matchId) {
            const originalStatus = m.status;
            const updatedMatch = { ...m, ...updates };

            if (updates.status && updates.status !== originalStatus) {
              if (updates.status === 'completed' || updates.status === 'cancelled') {
                playersToUpdate = [...m.teamA, ...m.teamB].map(p => p.id);
                updatedMatch.endTime = updatedMatch.endTime ?? Date.now();
              }
              if (updates.status === 'in-progress' && !m.startTime) {
                updatedMatch.startTime = Date.now();
              }
            }
            return updatedMatch;
        }
        return m;
    });
    setMatches(updatedMatches);

    const newStatus = updates.status;
    if (newStatus && (newStatus === 'completed' || newStatus === 'cancelled')) {
        setPlayers(prev => prev.map(p => {
          if (playersToUpdate.includes(p.id)) {
            const isCompleted = newStatus === 'completed';
            return { 
              ...p, 
              status: 'available', 
              availableSince: Date.now(),
              matchesPlayed: isCompleted ? (p.matchesPlayed || 0) + 1 : p.matchesPlayed 
            };
          }
          return p;
        }));
        setCourts(prev => prev.map(c => c.matchId === matchId ? {...c, matchId: null} : c));
    }
  };


  if (!isMounted) {
    return null;
  }
  
  const availablePlayers = players.filter(p => p.status === 'available');

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {courts.map((court) => {
          const match = matches.find(m => m.id === court.matchId) || null;
          return (
            <CourtCard
              key={court.id}
              court={court}
              match={match}
              onCreateMatch={() => handleCreateMatchClick(court)}
              onUpdateMatch={handleMatchUpdate}
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
