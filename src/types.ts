export interface Child {
  id: number;
  name: string;
  grade: string | null;
  notes: string | null;
  createdAt: string;
  guardianCount?: number;
}

export interface ChildWithGuardians extends Child {
  guardians: Guardian[];
}

export interface Guardian {
  id: number;
  childId: number;
  name: string;
  relationship: string | null;
  phone: string | null;
  photoUrl: string;
  descriptor: number[];
  createdAt: string;
  childName?: string;
  childGrade?: string | null;
}

export interface PickupLog {
  id: number;
  childId: number | null;
  childName: string | null;
  guardianId: number | null;
  guardianName: string | null;
  guardianRelationship: string | null;
  matched: boolean;
  confidence: number | null;
  snapshotUrl: string | null;
  note: string | null;
  createdAt: string;
}
