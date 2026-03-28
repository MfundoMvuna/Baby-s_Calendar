/* ──────────────────────────────────────────────
   Clinical Timeline & Data Types
   ────────────────────────────────────────────── */

/** Trimester boundaries (0-indexed weeks) */
export const TRIMESTERS = {
  first: { start: 0, end: 13, label: "First Trimester", color: "purple" },
  second: { start: 14, end: 26, label: "Second Trimester", color: "pink" },
  third: { start: 27, end: 40, label: "Third Trimester", color: "green" },
} as const;

export type TrimesterKey = keyof typeof TRIMESTERS;

/** A single default milestone / appointment template */
export interface MilestoneTemplate {
  weekNumber: number;
  title: string;
  description: string;
  type: "appointment" | "scan" | "test" | "vaccine" | "milestone" | "reminder";
  questions?: string[];
}

/**
 * Default clinical milestones based on SA ANC guidelines &
 * international obstetric standards.
 */
export const DEFAULT_MILESTONES: MilestoneTemplate[] = [
  // ── First Trimester ──
  {
    weekNumber: 6,
    title: "Early Booking Visit",
    description:
      "Confirm pregnancy dates, calculate estimated due date (EDD), initial blood work (Hb, blood group, syphilis, HIV).",
    type: "appointment",
    questions: [
      "What was the date of your last menstrual period?",
      "Have you seen a doctor or midwife yet?",
      "Are you taking folic acid?",
    ],
  },
  {
    weekNumber: 8,
    title: "First Prenatal Check-up",
    description:
      "Blood pressure, urine test, discuss medical history, lifestyle and nutrition advice.",
    type: "appointment",
    questions: [
      "How did your doctor visit go?",
      "Were any concerns raised?",
      "Do you have any questions for your next visit?",
    ],
  },
  {
    weekNumber: 12,
    title: "Dating / Nuchal Scan",
    description:
      "First trimester ultrasound to confirm gestational age and screen for chromosomal anomalies (nuchal translucency).",
    type: "scan",
    questions: [
      "Did you complete the dating scan?",
      "What was the estimated gestational age?",
      "Any findings to note?",
    ],
  },

  // ── Second Trimester ──
  {
    weekNumber: 16,
    title: "Quickening Watch",
    description:
      "Between 16–20 weeks many women begin feeling the baby's first movements (quickening). Note when you first feel them!",
    type: "milestone",
    questions: [
      "Have you felt any fluttering or movement yet?",
      "How are you feeling emotionally?",
    ],
  },
  {
    weekNumber: 20,
    title: "Anatomy Scan (18–20 weeks)",
    description:
      "Detailed ultrasound to check baby's organs, limbs, placenta position. You may learn baby's sex!",
    type: "scan",
    questions: [
      "Did you complete the anatomy scan?",
      "Would you like to record any findings?",
      "Did you find out baby's sex?",
    ],
  },
  {
    weekNumber: 24,
    title: "Gestational Diabetes Screening",
    description:
      "Glucose challenge test (GCT) recommended between 24–28 weeks to screen for gestational diabetes.",
    type: "test",
    questions: [
      "Have you scheduled your glucose test?",
      "Did you receive the results?",
      "Were there any concerns?",
    ],
  },
  {
    weekNumber: 26,
    title: "Follow-up ANC Visit (26–28 weeks)",
    description:
      "Blood pressure check, fundal height measurement, urine dip, review glucose results. Rh immunoglobulin if Rh-negative.",
    type: "appointment",
    questions: [
      "How did your appointment go?",
      "Is baby's growth on track?",
    ],
  },

  // ── Third Trimester ──
  {
    weekNumber: 28,
    title: "Tdap Vaccine Window Opens",
    description:
      "The Tdap vaccine is recommended between 27–36 weeks to protect your baby from whooping cough after birth.",
    type: "vaccine",
    questions: [
      "Have you discussed the Tdap vaccine with your provider?",
      "Have you received the vaccine?",
    ],
  },
  {
    weekNumber: 32,
    title: "Third Trimester Check-up",
    description:
      "Monitor fetal growth, blood pressure, repeat Hb test. SA guidelines repeat HIV/syphilis screening if previously negative.",
    type: "appointment",
    questions: [
      "How is baby's position?",
      "Any swelling, headaches or vision changes?",
    ],
  },
  {
    weekNumber: 34,
    title: "Birth Plan Discussion",
    description:
      "Start thinking about your birth preferences — hospital bag, labour support, pain management options.",
    type: "reminder",
    questions: [
      "Have you started packing your hospital bag?",
      "Do you have a birth plan in mind?",
      "Who will be your support person during labour?",
    ],
  },
  {
    weekNumber: 36,
    title: "Group B Strep (GBS) Test",
    description:
      "Screening for GBS bacteria (35–37 weeks) to determine if antibiotics are needed during labour.",
    type: "test",
    questions: [
      "Has your GBS test been scheduled?",
      "Have you received the results?",
    ],
  },
  {
    weekNumber: 37,
    title: "Weekly Visits Begin",
    description:
      "From 36–37 weeks, visits become weekly. Monitor fetal position (head-down expected), heart rate, and signs of labour.",
    type: "appointment",
    questions: [
      "Is baby head-down?",
      "Are you experiencing any contractions or pressure?",
    ],
  },
  {
    weekNumber: 38,
    title: "ANC Visit — 38 Weeks",
    description:
      "Blood pressure, fundal height, repeat Hb. Discuss signs of labour and when to go to hospital.",
    type: "appointment",
    questions: [
      "How are you feeling?",
      "Do you know the signs of labour to watch for?",
    ],
  },
  {
    weekNumber: 40,
    title: "Due Date!",
    description:
      "Your estimated due date. Only ~5% of babies arrive exactly on this day — perfectly normal to go a little earlier or later.",
    type: "milestone",
    questions: [
      "Any signs of labour yet?",
      "Have you discussed a plan if you go past your due date?",
    ],
  },
  {
    weekNumber: 41,
    title: "Post-term Monitoring",
    description:
      "If you haven't delivered by 41 weeks, your provider may recommend monitoring or discuss induction options.",
    type: "appointment",
    questions: [
      "Has your provider discussed induction?",
      "How are you feeling emotionally?",
    ],
  },
];

/** Baby size comparisons by week */
export const BABY_SIZE_COMPARISONS: Record<number, { fruit: string; size: string }> = {
  4: { fruit: "🫐 Poppy seed", size: "~2 mm" },
  5: { fruit: "🍎 Apple seed", size: "~3 mm" },
  6: { fruit: "🫘 Lentil", size: "~6 mm" },
  7: { fruit: "🫐 Blueberry", size: "~1 cm" },
  8: { fruit: "🫒 Raspberry", size: "~1.6 cm" },
  9: { fruit: "🍒 Cherry", size: "~2.3 cm" },
  10: { fruit: "🍇 Kumquat", size: "~3.1 cm" },
  11: { fruit: "🫒 Fig", size: "~4.1 cm" },
  12: { fruit: "🍑 Lime", size: "~5.4 cm" },
  13: { fruit: "🍋 Lemon", size: "~7.4 cm" },
  14: { fruit: "🍊 Nectarine", size: "~8.7 cm" },
  15: { fruit: "🍎 Apple", size: "~10 cm" },
  16: { fruit: "🥑 Avocado", size: "~11.6 cm" },
  17: { fruit: "🍐 Pear", size: "~13 cm" },
  18: { fruit: "🫑 Bell pepper", size: "~14.2 cm" },
  19: { fruit: "🥭 Mango", size: "~15.3 cm" },
  20: { fruit: "🍌 Banana", size: "~25 cm" },
  21: { fruit: "🥕 Carrot", size: "~26.7 cm" },
  22: { fruit: "🌽 Corn", size: "~27.8 cm" },
  23: { fruit: "🥭 Large mango", size: "~28.9 cm" },
  24: { fruit: "🫒 Cantaloupe", size: "~30 cm" },
  25: { fruit: "🥦 Cauliflower", size: "~34.6 cm" },
  26: { fruit: "🥬 Lettuce head", size: "~35.6 cm" },
  27: { fruit: "🥒 Cucumber", size: "~36.6 cm" },
  28: { fruit: "🍆 Aubergine", size: "~37.6 cm" },
  29: { fruit: "🎃 Butternut squash", size: "~38.6 cm" },
  30: { fruit: "🥥 Coconut", size: "~39.9 cm" },
  31: { fruit: "🍍 Pineapple", size: "~41.1 cm" },
  32: { fruit: "🎃 Squash", size: "~42.4 cm" },
  33: { fruit: "🥬 Celery bunch", size: "~43.7 cm" },
  34: { fruit: "🍈 Honeydew melon", size: "~45 cm" },
  35: { fruit: "🍈 Cantaloupe", size: "~46.2 cm" },
  36: { fruit: "🥬 Romaine lettuce", size: "~47.4 cm" },
  37: { fruit: "🧅 Winter melon", size: "~48.6 cm" },
  38: { fruit: "🍉 Mini watermelon", size: "~49.8 cm" },
  39: { fruit: "🍉 Small watermelon", size: "~50.7 cm" },
  40: { fruit: "🍉 Watermelon", size: "~51.2 cm" },
};

/** Compute which trimester a given week falls in */
export function getTrimester(week: number): TrimesterKey {
  if (week <= 13) return "first";
  if (week <= 26) return "second";
  return "third";
}

/** Trimester display color class */
export function trimesterColorClass(week: number): string {
  const t = getTrimester(week);
  return `trimester-${t === "first" ? 1 : t === "second" ? 2 : 3}`;
}
