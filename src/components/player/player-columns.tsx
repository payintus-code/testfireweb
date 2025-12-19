"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { MoreHorizontal, Pencil, Star, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const statusVariant: { [key in Player["status"]]: "default" | "secondary" | "destructive" } = {
  available: "default",
  "in-match": "secondary",
  unavailable: "destructive",
};

const statusText: { [key in Player["status"]]: string } = {
    available: "Available",
    "in-match": "In Match",
    unavailable: "Unavailable",
};

type GetColumnsOptions = {
  onEdit: (player: Player) => void;
  onDelete: (playerId: string) => void;
};

const TimeAvailableCell = ({ row }: { row: { original: Player } }) => {
    const { status, availableSince } = row.original;
    const [elapsedTime, setElapsedTime] = useState('00:00');
  
    useEffect(() => {
      let interval: NodeJS.Timeout | undefined;
  
      if (status === 'available' && availableSince) {
        const updateElapsedTime = () => {
          const now = Date.now();
          const seconds = Math.floor((now - availableSince) / 1000);
          const minutes = Math.floor(seconds / 60);
          const displaySeconds = seconds % 60;
          setElapsedTime(`${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`);
        };
  
        updateElapsedTime();
        interval = setInterval(updateElapsedTime, 1000);
      } else {
        setElapsedTime('--:--');
      }
  
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }, [status, availableSince]);
  
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>{elapsedTime}</span>
      </div>
    );
};

export const columns = ({ onEdit, onDelete }: GetColumnsOptions): ColumnDef<Player>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const player = row.original;
      return (
        <div className="flex items-center gap-3">
          <Image
            src={player.avatarUrl}
            alt={player.name}
            width={40}
            height={40}
            className="rounded-full"
            data-ai-hint="player avatar"
          />
          <span className="font-medium">{player.name}</span>
        </div>
      );
    },
  },
    {
    accessorKey: "skillLevel",
    header: "Skill Level",
    cell: ({ row }) => {
      const level = row.original.skillLevel;
      return (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < level ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
              )}
            />
          ))}
          <span className="ml-2 text-muted-foreground">({level})</span>
        </div>
      );
    },
  },
  {
    accessorKey: "matchesPlayed",
    header: "Matches Played",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={statusVariant[status]}>
          {statusText[status]}
        </Badge>
      );
    },
  },
  {
    header: "Time Available",
    cell: TimeAvailableCell,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const player = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(player)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => onDelete(player.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
