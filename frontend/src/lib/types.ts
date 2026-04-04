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

// ── Extended Profile ────────────────────────────

export interface ExtendedProfile {
  dateOfBirth?: string;        // ISO date — for age-based risk
  height?: number;             // cm
  prePregnancyWeight?: number; // kg
  cycleLength?: number;        // days (default 28) — for accurate EDD
  gravida?: number;            // total pregnancies including current
  para?: number;               // total births
  bloodType?: string;          // A+, A-, B+, B-, AB+, AB-, O+, O-
  allergies?: string[];
  currentMedications?: string[];
  medicalAidName?: string;
  medicalAidNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
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

// ── Community Posts ────────────────────────────

export type PostCategory = "tip" | "experience" | "hospital-review" | "question";
export type PostStatus = "pending" | "approved" | "rejected";

export interface CommunityPost {
  postId: string;
  userId: string;
  displayName: string;
  content: string;
  category: PostCategory;
  status: PostStatus;
  upvotes: number;
  downvotes: number;
  reportCount: number;
  createdAt: string;
  /** Which users have voted (keyed by `userId → "up" | "down"`) */
  votes?: Record<string, "up" | "down">;
}

export interface CreatePostInput {
  content: string;
  category: PostCategory;
  displayName: string;
}

// ── Partner Sharing ────────────────────────────

export interface PartnerLink {
  partnerId: string;        // unique share code
  partnerEmail: string;     // partner's email
  partnerName: string;      // display name
  status: "pending" | "active" | "revoked";
  createdAt: string;
  lastAccessedAt?: string;
  shareToken?: string;      // base64-encoded snapshot of sender's data
}

/** Snapshot of pregnancy data embedded in the share token */
export interface SharedJourney {
  version: 1;
  senderName: string;
  babyNickname?: string;
  lmpDate: string;
  eddDate: string;
  currentWeek: number;
  events: SharedEvent[];
  recentSymptoms: string[];
  photoCount: number;
  sharedAt: string;          // ISO timestamp
  dataSource?: "remote" | "local";
  sourceRecords?: {
    events: number;
    symptomsLast7Days: number;
    photos: number;
  };
}

export interface SharedEvent {
  date: string;
  title: string;
  type: string;
  completed: boolean;
}

// ── Community Comments ─────────────────────────

export interface CommunityComment {
  commentId: string;
  postId: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: string;
}

// ── Google Calendar Sync ───────────────────────

export interface CalendarSyncConfig {
  enabled: boolean;
  googleCalendarId?: string;
  lastSyncedAt?: string;
  syncEvents: boolean;       // sync appointments to Google Cal
  syncReminders: boolean;    // sync reminders to Google Cal
}
