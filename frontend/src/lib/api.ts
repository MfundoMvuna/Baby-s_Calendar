/* ──────────────────────────────────────────────
   API Client — talks to AWS API Gateway / Lambdas
   Falls back to localStorage for offline-first usage.
   ────────────────────────────────────────────── */

import type {
  CalendarEvent,
  OnboardingData,
  PhotoRecord,
  PregnancyRecord,
  SubscriptionStatus,
  SymptomEntry,
} from "./types";
import { calculateEDD, generateId, getCurrentWeek } from "./utils";
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** True when we have a backend URL configured */
const hasBackend = API_BASE.length > 0;

// ─── localStorage helpers ──────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Pregnancy Record ──────────────────────────────

export function getPregnancyRecord(): PregnancyRecord | null {
  return lsGet<PregnancyRecord | null>("pregnancy_record", null);
}

export function savePregnancyRecord(data: OnboardingData): PregnancyRecord {
  const edd = calculateEDD(data.lmpDate);
  const record: PregnancyRecord = {
    userId: "local-user",
    lmpDate: data.lmpDate,
    eddDate: edd,
    currentWeek: data.weeksPregnant ?? getCurrentWeek(data.lmpDate),
    parity: 0,
    riskFactors: data.riskFactors,
    babyNickname: data.babyNickname,
  };
  lsSet("pregnancy_record", record);
  return record;
}

// ─── Calendar Events ───────────────────────────────

export function getEvents(): CalendarEvent[] {
  return lsGet<CalendarEvent[]>("calendar_events", []);
}

export function saveEvent(event: Omit<CalendarEvent, "eventId" | "userId">): CalendarEvent {
  const events = getEvents();
  const newEvent: CalendarEvent = {
    ...event,
    eventId: generateId(),
    userId: "local-user",
  };
  events.push(newEvent);
  lsSet("calendar_events", events);
  return newEvent;
}

export function updateEvent(eventId: string, patch: Partial<CalendarEvent>): void {
  const events = getEvents();
  const idx = events.findIndex((e) => e.eventId === eventId);
  if (idx >= 0) {
    events[idx] = { ...events[idx], ...patch };
    lsSet("calendar_events", events);
  }
}

export function deleteEvent(eventId: string): void {
  const events = getEvents().filter((e) => e.eventId !== eventId);
  lsSet("calendar_events", events);
}

// ─── Symptom / Journal ─────────────────────────────

export function getSymptomEntries(): SymptomEntry[] {
  return lsGet<SymptomEntry[]>("symptom_entries", []);
}

export function saveSymptomEntry(entry: Omit<SymptomEntry, "entryId" | "userId">): SymptomEntry {
  const entries = getSymptomEntries();
  const newEntry: SymptomEntry = {
    ...entry,
    entryId: generateId(),
    userId: "local-user",
  };
  entries.push(newEntry);
  lsSet("symptom_entries", entries);
  return newEntry;
}

// ─── Photos ────────────────────────────────────────

export function getPhotos(): PhotoRecord[] {
  return lsGet<PhotoRecord[]>("photo_records", []);
}

export function savePhotoRecord(photo: Omit<PhotoRecord, "photoId" | "userId">): PhotoRecord {
  const photos = getPhotos();
  const newPhoto: PhotoRecord = {
    ...photo,
    photoId: generateId(),
    userId: "local-user",
  };
  photos.push(newPhoto);
  lsSet("photo_records", photos);
  return newPhoto;
}

// ─── Remote API (when backend is configured) ───────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let authHeader: Record<string, string> = {};
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) authHeader = { Authorization: token };
  } catch {
    // no session — request will be sent without auth
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export const remoteApi = {
  available: hasBackend,

  async getRecord(): Promise<PregnancyRecord> {
    return apiFetch<PregnancyRecord>("/pregnancy");
  },
  async createRecord(data: OnboardingData): Promise<PregnancyRecord> {
    return apiFetch<PregnancyRecord>("/pregnancy", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async getEvents(): Promise<CalendarEvent[]> {
    return apiFetch<CalendarEvent[]>("/events");
  },
  async createEvent(event: Omit<CalendarEvent, "eventId" | "userId">): Promise<CalendarEvent> {
    return apiFetch<CalendarEvent>("/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
  },
  async getUploadUrl(filename: string): Promise<{ uploadUrl: string; s3Key: string }> {
    return apiFetch("/photos/upload-url", {
      method: "POST",
      body: JSON.stringify({ filename }),
    });
  },

  /** Upload a file directly to S3 via presigned URL, then save metadata */
  async uploadPhoto(
    file: File,
    weekNumber: number,
    type: PhotoRecord["type"],
    caption: string,
    date: string,
  ): Promise<PhotoRecord> {
    // 1. Get presigned PUT URL
    const { uploadUrl, s3Key } = await this.getUploadUrl(file.name);

    // 2. Upload directly to S3
    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/*" },
      body: file,
    });

    // 3. Save metadata to backend
    return apiFetch<PhotoRecord>("/photos", {
      method: "POST",
      body: JSON.stringify({ s3Key, weekNumber, type, caption, date }),
    });
  },

  /** Get all photos with presigned GET URLs */
  async getPhotos(): Promise<PhotoRecord[]> {
    return apiFetch<PhotoRecord[]>("/photos");
  },

  // ── Subscription ─────────────────────────────

  async getSubscription(): Promise<SubscriptionStatus> {
    return apiFetch<SubscriptionStatus>("/subscription");
  },

  async processPayment(yocoToken: string): Promise<{ message: string; plan: string; expiresAt: string }> {
    return apiFetch("/subscription/pay", {
      method: "POST",
      body: JSON.stringify({ token: yocoToken }),
    });
  },
};
