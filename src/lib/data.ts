import type { Player, Court } from './types';

export const PLAYERS: Player[] = [
  { id: 'p1', name: 'Alex Johnson', age: 28, gender: 'Male', skillLevel: 5, status: 'available', avatarUrl: 'https://picsum.photos/seed/p1/100/100', matchesPlayed: 0 },
  { id: 'p2', name: 'Brenda Smith', age: 25, gender: 'Female', skillLevel: 4, status: 'available', avatarUrl: 'https://picsum.photos/seed/p2/100/100', matchesPlayed: 0 },
  { id: 'p3', name: 'Charlie Brown', age: 32, gender: 'Male', skillLevel: 3, status: 'available', avatarUrl: 'https://picsum.photos/seed/p3/100/100', matchesPlayed: 0 },
  { id: 'p4', name: 'Diana Prince', age: 29, gender: 'Female', skillLevel: 5, status: 'available', avatarUrl: 'https://picsum.photos/seed/p4/100/100', matchesPlayed: 0 },
  { id: 'p5', name: 'Ethan Hunt', age: 35, gender: 'Male', skillLevel: 2, status: 'available', avatarUrl: 'https://picsum.photos/seed/p5/100/100', matchesPlayed: 0 },
  { id: 'p6', name: 'Fiona Glenanne', age: 22, gender: 'Female', skillLevel: 3, status: 'available', avatarUrl: 'https://picsum.photos/seed/p6/100/100', matchesPlayed: 0 },
  { id: 'p7', name: 'George Costanza', age: 41, gender: 'Male', skillLevel: 1, status: 'unavailable', avatarUrl: 'https://picsum.photos/seed/p7/100/100', matchesPlayed: 0 },
  { id: 'p8', name: 'Hannah Montana', age: 19, gender: 'Female', skillLevel: 4, status: 'available', avatarUrl: 'https://picsum.photos/seed/p8/100/100', matchesPlayed: 0 },
  { id: 'p9', name: 'Ian Malcolm', age: 38, gender: 'Male', skillLevel: 4, status: 'available', avatarUrl: 'https://picsum.photos/seed/p9/100/100', matchesPlayed: 0 },
  { id: 'p10', name: 'Jane Doe', age: 26, gender: 'Female', skillLevel: 2, status: 'available', avatarUrl: 'https://picsum.photos/seed/p10/100/100', matchesPlayed: 0 },
  { id: 'p11', name: 'Kevin McCallister', age: 30, gender: 'Male', skillLevel: 3, status: 'available', avatarUrl: 'https://picsum.photos/seed/p11/100/100', matchesPlayed: 0 },
  { id: 'p12', name: 'Laura Palmer', age: 27, gender: 'Female', skillLevel: 5, status: 'available', avatarUrl: 'https://picsum.photos/seed/p12/100/100', matchesPlayed: 0 },
];

export const COURTS: Court[] = [
  { id: 1, name: 'Court 1', matchId: null },
  { id: 2, name: 'Court 2', matchId: null },
  { id: 3, name: 'Court 3', matchId: null },
  { id: 4, name: 'Court 4', matchId: null },
];
