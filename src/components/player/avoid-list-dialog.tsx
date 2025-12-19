
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Player } from "@/lib/types";

type AvoidListDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  player: Player;
  allPlayers: Player[];
  onSave: (playerId: string, avoidPlayerIds: string[]) => void;
};

export function AvoidListDialog({
  isOpen,
  onOpenChange,
  player,
  allPlayers,
  onSave,
}: AvoidListDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (player?.avoidPlayers) {
      setSelectedIds(player.avoidPlayers);
    }
  }, [player]);

  const handlePlayerSelect = (playerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleSave = () => {
    onSave(player.id, selectedIds);
  };

  const otherPlayers = allPlayers.filter(p => p.id !== player.id);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Avoid List for {player.name}</DialogTitle>
          <DialogDescription>
            Select players you do not want to be paired with.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64 rounded-md border p-4">
          <div className="space-y-2">
            {otherPlayers.map((p) => (
              <div key={p.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`avoid-${p.id}`}
                  checked={selectedIds.includes(p.id)}
                  onCheckedChange={() => handlePlayerSelect(p.id)}
                />
                <Label
                  htmlFor={`avoid-${p.id}`}
                  className="flex-1 cursor-pointer"
                >
                  {p.name}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
