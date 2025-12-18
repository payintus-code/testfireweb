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
import { generateRandomMatch } from "@/app/actions";
import type { Court, Player, Match } from "@/lib/types";
import { Separator } from "../ui/separator";
import { Users, Wand2, Loader2, Star, Shield } from "lucide-react";

type CreateMatchDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  court: Court;
  availablePlayers: Player[];
  onMatchCreate: (newMatch: Omit<Match, "id" | "status" | "scoreA" | "scoreB">) => void;
};

export function CreateMatchDialog({
  isOpen,
  onOpenChange,
  court,
  availablePlayers,
  onMatchCreate,
}: CreateMatchDialogProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [generatedMatch, setGeneratedMatch] = useState<{ teamA: Player[], teamB: Player[] } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayers((prev) =>
      prev.find((p) => p.id === player.id)
        ? prev.filter((p) => p.id !== player.id)
        : [...prev, player]
    );
  };
  
  const handleManualCreate = () => {
    if (selectedPlayers.length !== 4) {
      toast({
        title: "Invalid Selection",
        description: "Please select exactly 4 players for a match.",
        variant: "destructive",
      });
      return;
    }
    const teamA = [selectedPlayers[0], selectedPlayers[1]];
    const teamB = [selectedPlayers[2], selectedPlayers[3]];
    onMatchCreate({ courtId: court.id, teamA, teamB });
    resetState();
  };

  const handleRandomGenerate = async () => {
    setIsGenerating(true);
    setGeneratedMatch(null);
    try {
      const result = await generateRandomMatch(availablePlayers);
      if (result.teamA.length === 2 && result.teamB.length === 2) {
        setGeneratedMatch(result);
        toast({
            title: "Match Generated",
            description: "A random match has been created.",
        });
      } else {
        throw new Error("Failed to generate a valid match.");
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate a match. Please try again or select manually.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandomCreate = () => {
    if (!generatedMatch) {
      toast({
        title: "No Match Generated",
        description: "Please generate a match first.",
        variant: "destructive",
      });
      return;
    }
    onMatchCreate({ courtId: court.id, ...generatedMatch });
    resetState();
  };

  const resetState = () => {
    setSelectedPlayers([]);
    setGeneratedMatch(null);
  }

  const teamSkillLevel = (team: Player[]) => team.reduce((acc, p) => acc + p.skillLevel, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="sm:max-w-md md:sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Match on {court.name}</DialogTitle>
          <DialogDescription>
            Assemble teams manually or generate a random match.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="random" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="random"><Wand2 className="mr-2 h-4 w-4"/>Random</TabsTrigger>
            <TabsTrigger value="manual"><Users className="mr-2 h-4 w-4"/>Manual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="random" className="mt-4">
             <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Create a random match from available players.
                </p>
                <Button onClick={handleRandomGenerate} disabled={isGenerating}>
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isGenerating ? "Generating..." : "Generate Random Match"}
                </Button>

                {generatedMatch && (
                    <div className="mt-4 rounded-lg border p-4 text-left">
                        <h3 className="font-semibold mb-4 text-center">Generated Match</h3>
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
                         <DialogFooter className="mt-4">
                            <Button onClick={handleRandomCreate}>Schedule This Match</Button>
                        </DialogFooter>
                    </div>
                )}
             </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label>Select 4 Players</Label>
                <p className="text-sm text-muted-foreground">
                  Selected {selectedPlayers.length} of 4 players. The first two selected will be Team A, the next two will be Team B.
                </p>
              </div>
              <ScrollArea className="h-64 rounded-md border p-4">
                <div className="space-y-2">
                  {availablePlayers.map((player) => (
                    <div key={player.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`player-${player.id}`}
                        checked={!!selectedPlayers.find((p) => p.id === player.id)}
                        onCheckedChange={() => handlePlayerSelect(player)}
                        disabled={
                          selectedPlayers.length >= 4 &&
                          !selectedPlayers.find((p) => p.id === player.id)
                        }
                      />
                      <Label
                        htmlFor={`player-${player.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {player.name} (Skill: {player.skillLevel})
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <DialogFooter>
                  <Button onClick={handleManualCreate} disabled={selectedPlayers.length !== 4}>Schedule Match</Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
