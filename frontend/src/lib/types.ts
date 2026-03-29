/* ──────────────────────────────────────────────
   Shared TypeScript types for the app
   ────────────────────────────────────────────── */

export interface User {
  userId: string;
  email: string;
  displayName: string;
  region: string;
  createdAt: string;
}

export interface PregnancyRecord {
  userId: string;
  lmpDate: string;           // ISO date of last menstrual period
  eddDate: string;           // Estimated due date
  currentWeek: number;
  parity: number;            // Number of previous pregnancies
  riskFactors: string[];
  babyNickname?: string;
}

export type EventType =
  | "appointment"
  | "scan"
  | "test"
  | "vaccine"
  | "milestone"
  | "reminder"
  | "photo"
  | "journal";

export interface CalendarEvent {
  eventId: string;
  userId: string;
  date: string;              // ISO date
  title: string;
  description: string;
  type: EventType;
  completed: boolean;
  notes?: string;
  questions?: string[];
  answers?: Record<string, string>;
}

export interface SymptomEntry {
  entryId: string;
  userId: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  symptoms: string[];
  weight?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  notes?: string;
}

export interface PhotoRecord {
  photoId: string;
  userId: string;
  date: string;
  s3Key: string;
  caption?: string;
  weekNumber: number;
  type: "ultrasound" | "bump" | "test" | "other";
  presignedUrl?: string;     // Temporary URL for display
}

export interface OnboardingData {
  displayName: string;
  lmpDate: string;
  weeksPregnant?: number;
  hasSeenDoctor: boolean;
  doctorName?: string;
  hospitalClinic?: string;
  riskFactors: string[];
  babyNickname?: string;
  extraNotes?: string;
}

// ── Subscription / Payment ─────────────────────

export interface SubscriptionStatus {
  plan: "free" | "premium";
  status: "active" | "expired";
  expiresAt?: string;
  photoCount: number;
  customEventCount: number;
  limits: SubscriptionLimits;
}

export interface SubscriptionLimits {
  maxPhotos: number;
  maxCustomEvents: number;
  isPremium: boolean;
}
