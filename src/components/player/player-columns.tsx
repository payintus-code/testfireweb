"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
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
    accessorKey: "age",
    header: "Age",
  },
  {
    accessorKey: "gender",
    header: "Gender",
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
