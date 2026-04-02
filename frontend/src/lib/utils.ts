/* ──────────────────────────────────────────────
   Date & pregnancy calculation utilities
   ────────────────────────────────────────────── */

import { addDays, differenceInWeeks, differenceInDays, format, parseISO } from "date-fns";

/** Standard pregnancy duration in days */
const PREGNANCY_DAYS = 280; // 40 weeks

/** Calculate EDD from LMP date, optionally adjusted for cycle length (modified Naegele's rule) */
export function calculateEDD(lmpDate: string, cycleLength?: number): string {
  const lmp = parseISO(lmpDate);
  // Modified Naegele's rule: LMP + 280 days + (cycleLength - 28) days
  const adjustment = cycleLength && cycleLength !== 28 ? cycleLength - 28 : 0;
  return format(addDays(lmp, PREGNANCY_DAYS + adjustment), "yyyy-MM-dd");
}

/** Calculate current gestational week from LMP */
export function getCurrentWeek(lmpDate: string): number {
  const lmp = parseISO(lmpDate);
  const weeks = differenceInWeeks(new Date(), lmp);
  return Math.min(Math.max(weeks, 0), 42);
}

/** Calculate gestational week + day (e.g. "12 weeks, 3 days") */
export function getGestationalAge(lmpDate: string): { weeks: number; days: number } {
  const lmp = parseISO(lmpDate);
  const totalDays = differenceInDays(new Date(), lmp);
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return { weeks: Math.min(Math.max(weeks, 0), 42), days: Math.max(days, 0) };
}

/** Format a date for display */
export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "d MMM yyyy");
}

/** Format date to shorter form */
export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), "d MMM");
}

/** Get the date for a specific gestational week from LMP */
export function dateForWeek(lmpDate: string, week: number): string {
  const lmp = parseISO(lmpDate);
  return format(addDays(lmp, week * 7), "yyyy-MM-dd");
}

/** Calculate progress percentage (0–100) */
export function pregnancyProgress(lmpDate: string): number {
  const lmp = parseISO(lmpDate);
  const totalDays = differenceInDays(new Date(), lmp);
  return Math.min(Math.max((totalDays / PREGNANCY_DAYS) * 100, 0), 100);
}

/** Generate a unique ID (browser-safe, no crypto dependency) */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
