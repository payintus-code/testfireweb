export type Player = {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  skillLevel: number; // 1 to 5
  status: 'available' | 'in-match' | 'unavailable';
  avatarUrl: string;
  availableSince?: number; // Timestamp for when the player became available
};

export type Match = {
  id: string;
  courtId: number;
  teamA: Player[];
  teamB: Player[];
  scoreA: number;
  scoreB: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  startTime?: number;
  endTime?: number;
};

export type Court = {
  id: number;
  name: string;
  matchId: string | null;
};
