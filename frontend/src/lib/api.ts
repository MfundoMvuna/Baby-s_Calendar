/* ──────────────────────────────────────────────
   API Client — talks to AWS API Gateway / Lambdas
   Falls back to localStorage for offline-first usage.
   ────────────────────────────────────────────── */

import type {
  CalendarEvent,
  CommunityPost,
  CreatePostInput,
  ExtendedProfile,
  OnboardingData,
  PhotoRecord,
  PregnancyRecord,
  SubscriptionStatus,
  SymptomEntry,
} from "./types";
import { calculateEDD, generateId, getCurrentWeek } from "./utils";
import { moderateContent } from "./content-moderation";
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

export function getOnboardingData(): OnboardingData | null {
  return lsGet<OnboardingData | null>("onboarding_data", null);
}

export function savePregnancyRecord(data: OnboardingData): PregnancyRecord {
  // Save full onboarding data for Profile editing
  lsSet("onboarding_data", data);

  const extProfile = getExtendedProfile();
  const edd = calculateEDD(data.lmpDate, extProfile.cycleLength);
  const record: PregnancyRecord = {
    userId: "local-user",
    lmpDate: data.lmpDate,
    eddDate: edd,
    currentWeek: data.weeksPregnant ?? getCurrentWeek(data.lmpDate),
    parity: extProfile.para ?? 0,
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

  // ── Community Posts ──────────────────────────

  async getPosts(): Promise<CommunityPost[]> {
    return apiFetch<CommunityPost[]>("/community/posts");
  },

  async createPost(input: CreatePostInput): Promise<CommunityPost> {
    return apiFetch<CommunityPost>("/community/posts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async votePost(postId: string, vote: "up" | "down"): Promise<void> {
    await apiFetch(`/community/posts/${postId}/vote`, {
      method: "POST",
      body: JSON.stringify({ vote }),
    });
  },

  async reportPost(postId: string, reason: string): Promise<void> {
    await apiFetch(`/community/posts/${postId}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
};

// ─── Extended Profile (localStorage) ───────────

export function getExtendedProfile(): ExtendedProfile {
  return lsGet<ExtendedProfile>("extended_profile", {});
}

export function saveExtendedProfile(profile: ExtendedProfile): void {
  lsSet("extended_profile", profile);
}

// ─── Community Posts (localStorage fallback) ───

export function getLocalPosts(): CommunityPost[] {
  return lsGet<CommunityPost[]>("community_posts", []);
}

export function saveLocalPost(input: CreatePostInput): CommunityPost {
  const posts = getLocalPosts();
  // Run auto-moderation at creation time
  const modResult = moderateContent(input.content);
  const autoStatus: CommunityPost["status"] =
    modResult.autoAction === "approve" ? "approved"
    : modResult.autoAction === "reject" ? "rejected"
    : "pending"; // flagged → pending for manual review
  const post: CommunityPost = {
    postId: generateId(),
    userId: "local-user",
    displayName: input.displayName,
    content: input.content,
    category: input.category,
    status: autoStatus,
    upvotes: 0,
    downvotes: 0,
    reportCount: 0,
    createdAt: new Date().toISOString(),
    votes: {},
  };
  posts.push(post);
  lsSet("community_posts", posts);
  return post;
}

export function voteLocalPost(postId: string, vote: "up" | "down"): void {
  const posts = getLocalPosts();
  const idx = posts.findIndex((p) => p.postId === postId);
  if (idx < 0) return;
  const post = posts[idx];
  const prevVote = post.votes?.["local-user"];

  // Remove previous vote
  if (prevVote === "up") post.upvotes = Math.max(0, post.upvotes - 1);
  if (prevVote === "down") post.downvotes = Math.max(0, post.downvotes - 1);

  // Toggle: if same vote again, just remove it
  if (prevVote === vote) {
    delete post.votes?.["local-user"];
  } else {
    if (vote === "up") post.upvotes++;
    else post.downvotes++;
    post.votes = { ...(post.votes ?? {}), ["local-user"]: vote };
  }

  posts[idx] = post;
  lsSet("community_posts", posts);
}

export function reportLocalPost(postId: string): void {
  const posts = getLocalPosts();
  const idx = posts.findIndex((p) => p.postId === postId);
  if (idx < 0) return;
  posts[idx].reportCount++;
  // Auto-hide if too many reports
  if (posts[idx].reportCount >= 3) posts[idx].status = "rejected";
  lsSet("community_posts", posts);
}

// ─── Admin: moderation helpers ─────────────────

export function getAllLocalPosts(): CommunityPost[] {
  return lsGet<CommunityPost[]>("community_posts", []);
}

export function updateLocalPostStatus(postId: string, status: CommunityPost["status"]): void {
  const posts = getLocalPosts();
  const idx = posts.findIndex((p) => p.postId === postId);
  if (idx < 0) return;
  posts[idx].status = status;
  lsSet("community_posts", posts);
}

export function deleteLocalPost(postId: string): void {
  const posts = getLocalPosts().filter((p) => p.postId !== postId);
  lsSet("community_posts", posts);
}

// ─── Admin PIN (localStorage) ──────────────────

const ADMIN_PIN_KEY = "admin_pin";

export function getAdminPin(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_PIN_KEY);
}

export function setAdminPin(pin: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_PIN_KEY, pin);
}

export function verifyAdminPin(pin: string): boolean {
  const stored = getAdminPin();
  // First-time setup: no pin stored yet
  if (!stored) return false;
  return stored === pin;
}
