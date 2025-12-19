
"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Trash2, Sprout, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Court } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { COURTS as DEFAULT_COURTS } from "@/lib/data";

const CourtForm = ({ court, onSubmit, onCancel }: { court?: Court; onSubmit: (name: string, id?: number) => void; onCancel: () => void; }) => {
    const [name, setName] = useState(court?.name || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(name, court?.id);
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                        Name
                    </Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g. Court 1" />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Court</Button>
            </DialogFooter>
        </form>
    );
};

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    const storedCourts = localStorage.getItem("courts");
    if (storedCourts) {
      try {
        const parsedCourts = JSON.parse(storedCourts);
        setCourts(parsedCourts);
      } catch (e) {
        setCourts(DEFAULT_COURTS);
      }
    } else {
      setCourts(DEFAULT_COURTS);
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("courts", JSON.stringify(courts));
    }
  }, [courts, isMounted]);
  
  const handleOpenForm = (court?: Court) => {
    setEditingCourt(court);
    setFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setEditingCourt(undefined);
    setFormOpen(false);
  }

  const handleDelete = (courtId: number) => {
    // Check if court is in use
    const storedMatches = localStorage.getItem("matches");
    if (storedMatches) {
        const matches: any[] = JSON.parse(storedMatches);
        const isCourtInUse = matches.some(m => m.courtId === courtId && m.status !== 'completed' && m.status !== 'cancelled');
        if (isCourtInUse) {
            toast({
                title: "Cannot Delete Court",
                description: "This court is currently in use for a match.",
                variant: "destructive",
            });
            return;
        }
    }

    setCourts((prev) => prev.filter((c) => c.id !== courtId));
    toast({
        title: "Court Deleted",
        description: "The court has been removed from the list.",
    });
  };

  const handleFormSubmit = (name: string, id?: number) => {
    if (id) {
      // Edit existing court
      setCourts((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, name } : c
        )
      );
      toast({
        title: "Court Updated",
        description: "The court's details have been updated successfully.",
      });
    } else {
      // Add new court
      const newCourt: Court = {
        name,
        id: courts.length > 0 ? Math.max(...courts.map(c => c.id)) + 1 : 1,
      };
      setCourts((prev) => [...prev, newCourt]);
      toast({
        title: "Court Added",
        description: "The new court has been added to the list.",
      });
    }
    handleCloseForm();
  };
  

  if (!isMounted) {
    return null;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Court Management</h1>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseForm(); else setFormOpen(true); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Court
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCourt ? 'Edit Court' : 'Add New Court'}</DialogTitle>
              <DialogDescription>
                {editingCourt ? "Update the court's name below." : "Enter the name for the new court."}
              </DialogDescription>
            </DialogHeader>
            <CourtForm onSubmit={handleFormSubmit} court={editingCourt} onCancel={handleCloseForm} />
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Court List</CardTitle>
            <CardDescription>A list of all available courts in the facility.</CardDescription>
        </CardHeader>
        <CardContent>
            {courts.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Court ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {courts.map((court) => (
                            <TableRow key={court.id}>
                                <TableCell className="font-medium">#{court.id}</TableCell>
                                <TableCell>{court.name}</TableCell>
                                <TableCell className="text-right">
                                     <Button variant="ghost" size="icon" onClick={() => handleOpenForm(court)} className="mr-2">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the court.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(court.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px] p-6 text-muted-foreground">
                  <Sprout className="w-12 h-12 mb-4" />
                  <p className="font-semibold">No courts found.</p>
                  <p className="text-sm">
                    Click "Add Court" to get started.
                  </p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
