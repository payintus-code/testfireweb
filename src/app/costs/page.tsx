
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
  TableFooter,
} from "@/components/ui/table";
import { DollarSign, Users, Settings } from "lucide-react";
import Image from "next/image";
import { ShuttlecockIcon } from "@/components/icons/shuttlecock-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


type PlayerCost = {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  matchesPlayed: number;
  dailyFee: number;
  shuttlecockCost: number;
  totalCost: number;
};

export default function CostsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [dailyFee, setDailyFee] = useState(70);
  const [shuttlecockCost, setShuttlecockCost] = useState(100);


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

  const playerCosts = useMemo((): PlayerCost[] => {
    if (completedMatches.length === 0) return [];

    const playerCostsMap = new Map<string, PlayerCost>();
    
    // Initialize map for all players in the system
     players.forEach(p => {
        playerCostsMap.set(p.id, {
            playerId: p.id,
            playerName: p.name,
            playerAvatar: p.avatarUrl,
            matchesPlayed: 0,
            dailyFee: 0,
            shuttlecockCost: 0,
            totalCost: 0,
        });
    });


    completedMatches.forEach((match) => {
      const playersInMatch = [...match.teamA, ...match.teamB];
      const totalShuttlecocks = match.shuttlecocksUsed || 0;
      const shuttlecockCostPerPlayer = (totalShuttlecocks * shuttlecockCost) / playersInMatch.length;

      playersInMatch.forEach((player) => {
        if (!playerCostsMap.has(player.id)) return;

        const currentCost = playerCostsMap.get(player.id)!;

        currentCost.matchesPlayed += 1;
        currentCost.shuttlecockCost += shuttlecockCostPerPlayer;
        
        if (currentCost.dailyFee === 0) {
            currentCost.dailyFee = dailyFee;
        }
      });
    });

    const costs = Array.from(playerCostsMap.values())
        .map(cost => ({
            ...cost,
            totalCost: cost.dailyFee + cost.shuttlecockCost,
        }))
        .filter(cost => cost.matchesPlayed > 0);
        
    return costs.sort((a,b) => b.totalCost - a.totalCost);

  }, [completedMatches, players, dailyFee, shuttlecockCost]);

  const totalShuttlecocksUsed = useMemo(() => {
    return completedMatches.reduce((acc, match) => acc + (match.shuttlecocksUsed || 0), 0);
  }, [completedMatches]);

  const totalShuttlecockCost = totalShuttlecocksUsed * shuttlecockCost;
  const totalDailyFees = playerCosts.length * dailyFee;
  const grandTotal = totalDailyFees + totalShuttlecockCost;

  if (!isMounted) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Cost Summary</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Cost Summary</h1>
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Grand Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">฿{grandTotal.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Total revenue collected</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Daily Fees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">฿{totalDailyFees.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{playerCosts.length} players x ฿{dailyFee}</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Shuttlecock Cost</CardTitle>
                <ShuttlecockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">฿{totalShuttlecockCost.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{totalShuttlecocksUsed} shuttles x ฿{shuttlecockCost}</p>
            </CardContent>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5"/>Cost Configuration</CardTitle>
            <CardDescription>Adjust the fees used for cost calculation.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="daily-fee">Daily Fee (฿)</Label>
                <Input 
                    id="daily-fee"
                    type="number"
                    value={dailyFee}
                    onChange={(e) => setDailyFee(Number(e.target.value))}
                    placeholder="e.g. 70"
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="shuttle-cost">Shuttlecock Cost (฿)</Label>
                <Input 
                    id="shuttle-cost"
                    type="number"
                    value={shuttlecockCost}
                    onChange={(e) => setShuttlecockCost(Number(e.target.value))}
                    placeholder="e.g. 25"
                />
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Player Cost Breakdown</CardTitle>
          <CardDescription>
            Individual costs for each player based on participation and shuttlecock usage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {playerCosts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Matches Played</TableHead>
                  <TableHead className="text-right">Daily Fee</TableHead>
                  <TableHead className="text-right">Shuttlecock Cost</TableHead>
                  <TableHead className="text-right font-bold">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerCosts.map((cost) => (
                  <TableRow key={cost.playerId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Image
                          src={cost.playerAvatar}
                          alt={cost.playerName}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                        <span className="font-medium">{cost.playerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{cost.matchesPlayed}</TableCell>
                    <TableCell className="text-right">฿{cost.dailyFee.toFixed(2)}</TableCell>
                    <TableCell className="text-right">฿{cost.shuttlecockCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">฿{cost.totalCost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold">Grand Total</TableCell>
                    <TableCell className="text-right font-bold">฿{grandTotal.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px] p-6 text-muted-foreground">
              <DollarSign className="w-12 h-12 mb-4" />
              <p className="font-semibold">No costs to display.</p>
              <p className="text-sm">
                Complete a match to see the cost breakdown.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
