
"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateBalancedMatch } from "@/app/actions";
import type { Court, Player, Match } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Users, Loader2, Star, Shield, Dices, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type CreateMatchDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  court: Court;
  availablePlayers: Player[];
  onMatchCreate: (newMatch: Omit<Match, "id" | "status" | "scoreA" | "scoreB" | "shuttlecocksUsed">) => void;
};

const PlayerSelectionList = ({
  title,
  players,
  selectedPlayers,
  onPlayerSelect,
  otherTeamPlayers,
}: {
  title: string;
  players: Player[];
  selectedPlayers: Player[];
  onPlayerSelect: (player: Player) => void;
  otherTeamPlayers: Player[];
}) => {
  const otherTeamIds = useMemo(() => new Set(otherTeamPlayers.map(p => p.id)), [otherTeamPlayers]);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-center">{title}</h3>
      <ScrollArea className="h-48 rounded-md border p-4">
        <div className="space-y-2">
          {players.map((player) => {
            const isSelected = !!selectedPlayers.find((p) => p.id === player.id);
            const isInOtherTeam = otherTeamIds.has(player.id);
            const isDisabled = (!isSelected && selectedPlayers.length >= 2) || isInOtherTeam;

            return (
              <div key={player.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`player-${title}-${player.id}`}
                  checked={isSelected || isInOtherTeam}
                  onCheckedChange={() => onPlayerSelect(player)}
                  disabled={isDisabled}
                />
                <Label
                  htmlFor={`player-${title}-${player.id}`}
                  className={cn("flex-1 cursor-pointer", isDisabled && "text-muted-foreground")}
                >
                  {player.name} (Skill: {player.skillLevel}, Played: {player.matchesPlayed || 0})
                </Label>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="text-sm text-muted-foreground text-center">Selected {selectedPlayers.length} of 2</div>
    </div>
  );
};


const AvoidanceWarnings = ({ teamA, teamB }: { teamA: Player[], teamB: Player[] }) => {
    const warnings: string[] = [];
    const allSelectedPlayers = [...teamA, ...teamB];

    allSelectedPlayers.forEach(player => {
        const avoidIds = player.avoidPlayers || [];
        if (avoidIds.length > 0) {
            allSelectedPlayers.forEach(otherPlayer => {
                if (player.id !== otherPlayer.id && avoidIds.includes(otherPlayer.id)) {
                    warnings.push(`${player.name} wants to avoid ${otherPlayer.name}.`);
                }
            });
        }
    });

    if (warnings.length === 0) {
        return null;
    }

    return (
        <Alert variant="default" className="mt-4 border-yellow-500/50 text-yellow-700 dark:border-yellow-500/50 [&>svg]:text-yellow-600 dark:text-yellow-400 dark:[&>svg]:text-yellow-400">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle className="text-yellow-700 dark:text-yellow-400">Pairing Warning</AlertTitle>
            <AlertDescription>
                <ul className="list-disc pl-5">
                    {warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    );
};


export function CreateMatchDialog({
  isOpen,
  onOpenChange,
  court,
  availablePlayers,
  onMatchCreate,
}: CreateMatchDialogProps) {
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [generatedMatch, setGeneratedMatch] = useState<{ teamA: Player[], teamB: Player[], explanation: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handlePlayerSelect = (player: Player, team: 'A' | 'B') => {
    const [setter, currentTeam] = team === 'A' ? [setTeamA, teamA] : [setTeamB, teamB];
    
    setter((prev) =>
      prev.find((p) => p.id === player.id)
        ? prev.filter((p) => p.id !== player.id)
        : [...prev, player]
    );
  };
  
  const handleManualCreate = () => {
    if (teamA.length !== 2 || teamB.length !== 2) {
      toast({
        title: "Invalid Selection",
        description: "Please select exactly 2 players for each team.",
        variant: "destructive",
      });
      return;
    }
    onMatchCreate({ courtId: court.id, teamA, teamB });
    resetState();
  };

  const handleRandomGenerate = async () => {
    setIsGenerating(true);
    setGeneratedMatch(null);
    try {
      if (!availablePlayers || availablePlayers.length < 4) {
        throw new Error("Not enough available players to generate a match.");
      }
      const result = await generateBalancedMatch(availablePlayers);
      setGeneratedMatch(result);
    } catch (error) {
        console.error(error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate a match. Please try again or select manually.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratedCreate = () => {
    if (!generatedMatch) {
      toast({
        title: "No Match Generated",
        description: "Please generate a match first.",
        variant: "destructive",
      });
      return;
    }
    onMatchCreate({ courtId: court.id, teamA: generatedMatch.teamA, teamB: generatedMatch.teamB });
    resetState();
  };

  const resetState = () => {
    setTeamA([]);
    setTeamB([]);
    setGeneratedMatch(null);
  }

  const teamSkillLevel = (team: Player[]) => team.reduce((acc, p) => acc + p.skillLevel, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="sm:max-w-md md:sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Match on {court.name}</DialogTitle>
          <DialogDescription>
            Use random generation for a balanced match or assemble teams manually.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="random"><Dices className="mr-2 h-4 w-4"/>Random</TabsTrigger>
              <TabsTrigger value="manual"><Users className="mr-2 h-4 w-4"/>Manual</TabsTrigger>
            </TabsList>
            
            <TabsContent value="random" className="mt-4">
              <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                      Let us suggest a balanced match based on player skill levels.
                  </p>
                  <Button onClick={handleRandomGenerate} disabled={isGenerating || availablePlayers.length < 4}>
                      {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isGenerating ? "Generating..." : "Suggest Match"}
                  </Button>

                  {generatedMatch && (
                      <div className="mt-4 rounded-lg border p-4 text-left space-y-4">
                          <h3 className="font-semibold mb-2 text-center">Suggested Match</h3>
                          <div className="flex justify-around items-start">
                              <div className="w-1/2 pr-2 border-r">
                                  <h4 className="font-medium flex items-center justify-center mb-2">Team A <Shield className="ml-2 h-4 w-4 text-blue-500" /></h4>
                                  {generatedMatch.teamA.map(p => <p key={p.id} className="text-sm text-muted-foreground text-center">{p.name}</p>)}
                                  <p className="text-xs font-bold text-center mt-2 flex items-center justify-center gap-1">{teamSkillLevel(generatedMatch.teamA)} <Star className="h-3 w-3 text-yellow-400"/></p>
                              </div>
                              <div className="w-1/2 pl-2">
                                  <h4 className="font-medium flex items-center justify-center mb-2">Team B <Shield className="ml-2 h-4 w-4 text-red-500" /></h4>
                                  {generatedMatch.teamB.map(p => <p key={p.id} className="text-sm text-muted-foreground text-center">{p.name}</p>)}
                                  <p className="text-xs font-bold text-center mt-2 flex items-center justify-center gap-1">{teamSkillLevel(generatedMatch.teamB)} <Star className="h-3 w-3 text-yellow-400"/></p>
                              </div>
                          </div>
                          <Alert>
                              <Info className="h-4 w-4" />
                              <AlertTitle>Explanation</AlertTitle>
                              <AlertDescription>
                                  {generatedMatch.explanation}
                              </AlertDescription>
                          </Alert>
                          <DialogFooter className="mt-4">
                              <Button onClick={handleGeneratedCreate}>Schedule This Match</Button>
                          </DialogFooter>
                      </div>
                  )}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PlayerSelectionList 
                      title="Team A"
                      players={availablePlayers}
                      selectedPlayers={teamA}
                      onPlayerSelect={(player) => handlePlayerSelect(player, 'A')}
                      otherTeamPlayers={teamB}
                  />
                  <PlayerSelectionList 
                      title="Team B"
                      players={availablePlayers}
                      selectedPlayers={teamB}
                      onPlayerSelect={(player) => handlePlayerSelect(player, 'B')}
                      otherTeamPlayers={teamA}
                  />
                </div>
                
                <AvoidanceWarnings teamA={teamA} teamB={teamB} />

                <DialogFooter>
                    <Button onClick={handleManualCreate} disabled={teamA.length !== 2 || teamB.length !== 2}>Schedule Match</Button>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
