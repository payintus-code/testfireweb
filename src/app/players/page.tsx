"use client";

import { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { columns } from "@/components/player/player-columns";
import { PlayerDataTable } from "@/components/player/player-data-table";
import { PlayerForm } from "@/components/player/player-form";
import { AvoidListDialog } from "@/components/player/avoid-list-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Player } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>(undefined);
  const [isAvoidListDialogOpen, setAvoidListDialogOpen] = useState(false);
  const [playerForAvoidList, setPlayerForAvoidList] = useState<Player | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedPlayers = localStorage.getItem("players");
    if (storedPlayers) {
      setPlayers(JSON.parse(storedPlayers));
    } else {
      setPlayers([]);
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("players", JSON.stringify(players));
    }
  }, [players, isMounted]);

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormOpen(true);
  };

  const handleDelete = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    toast({
        title: "Player Deleted",
        description: "The player has been removed from the list.",
    });
  };

  const handleFormSubmit = (playerData: Omit<Player, "id" | "avatarUrl" | "status" | "matchesPlayed">, id?: string) => {
    if (id) {
      // Edit existing player
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...playerData } : p
        )
      );
      toast({
        title: "Player Updated",
        description: "The player's details have been updated successfully.",
      });
    } else {
      // Add new player
      const newPlayer: Player = {
        ...playerData,
        id: `p${Date.now()}`,
        status: 'available',
        avatarUrl: `https://picsum.photos/seed/p${Date.now()}/100/100`,
        availableSince: Date.now(),
        matchesPlayed: 0,
        avoidPlayers: [],
      };
      setPlayers((prev) => [...prev, newPlayer]);
      toast({
        title: "Player Added",
        description: "The new player has been added to the list.",
      });
    }
    setFormOpen(false);
    setEditingPlayer(undefined);
  };
  
  const handleManageAvoidList = (player: Player) => {
    setPlayerForAvoidList(player);
    setAvoidListDialogOpen(true);
  };

  const handleAvoidListSave = (playerId: string, avoidPlayerIds: string[]) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, avoidPlayers: avoidPlayerIds } : p
    ));
    toast({
      title: "Avoid List Updated",
      description: "The player's avoid list has been saved.",
    });
    setAvoidListDialogOpen(false);
    setPlayerForAvoidList(null);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Player Management</h1>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setFormOpen(isOpen); if (!isOpen) setEditingPlayer(undefined); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingPlayer ? 'Edit Player' : 'Add New Player'}</DialogTitle>
              <DialogDescription>
                {editingPlayer ? "Update the player's details below." : "Enter the details for the new player."}
              </DialogDescription>
            </DialogHeader>
            <PlayerForm onSubmit={handleFormSubmit} player={editingPlayer} />
          </DialogContent>
        </Dialog>
      </div>
      <PlayerDataTable columns={columns({ onEdit: handleEdit, onDelete: handleDelete, onManageAvoidList: handleManageAvoidList })} data={players} />

      {playerForAvoidList && (
        <AvoidListDialog
          isOpen={isAvoidListDialogOpen}
          onOpenChange={setAvoidListDialogOpen}
          player={playerForAvoidList}
          allPlayers={players}
          onSave={handleAvoidListSave}
        />
      )}
    </div>
  );
}
