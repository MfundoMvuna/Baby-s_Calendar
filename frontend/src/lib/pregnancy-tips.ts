/* ──────────────────────────────────────────────
   Curated pregnancy tips & suggestions by week.
   Safe, supportive content only — no alarming info.
   ────────────────────────────────────────────── */

export interface PregnancyTip {
  weekStart: number;
  weekEnd: number;
  title: string;
  body: string;
  category: "nutrition" | "wellness" | "exercise" | "preparation" | "emotional";
}

export const PREGNANCY_TIPS: PregnancyTip[] = [
  // ── First Trimester (weeks 1–13) ──
  {
    weekStart: 1, weekEnd: 6,
    title: "Start your prenatal vitamins",
    body: "Folic acid (400 mcg daily) is essential in the first trimester to support your baby's neural tube development. If you haven't started yet, today is a great day!",
    category: "nutrition",
  },
  {
    weekStart: 1, weekEnd: 13,
    title: "Listen to your body",
    body: "Fatigue is very common in the first trimester. Rest when you need to — growing a human takes serious energy. Short naps and early bedtimes are perfectly okay.",
    category: "wellness",
  },
  {
    weekStart: 4, weekEnd: 12,
    title: "Small, frequent meals can help with nausea",
    body: "If morning sickness is visiting you, try eating small meals every 2-3 hours. Ginger tea, plain crackers, and cold foods tend to be easier on the tummy.",
    category: "nutrition",
  },
  {
    weekStart: 6, weekEnd: 13,
    title: "Stay hydrated",
    body: "Aim for 8-10 glasses of water daily. Your blood volume is increasing by up to 50%! Add slices of lemon, cucumber or mint if plain water feels bleh.",
    category: "nutrition",
  },
  {
    weekStart: 8, weekEnd: 13,
    title: "Gentle movement is your friend",
    body: "Walking, prenatal yoga, and swimming are wonderful first-trimester exercises. Even 15 minutes a day can boost your mood and energy levels.",
    category: "exercise",
  },
  {
    weekStart: 10, weekEnd: 13,
    title: "It's okay to feel all the feelings",
    body: "Hormones are doing a lot right now. Joy, anxiety, excitement, and worry can all show up in the same hour. You're not alone — and you're doing beautifully.",
    category: "emotional",
  },

  // ── Second Trimester (weeks 14–26) ──
  {
    weekStart: 14, weekEnd: 20,
    title: "The 'golden trimester'",
    body: "Many mothers feel a surge of energy in the second trimester. This is a great time to set up the nursery, do some gentle exercise, and enjoy the glow!",
    category: "wellness",
  },
  {
    weekStart: 14, weekEnd: 26,
    title: "Iron-rich foods for growing baby",
    body: "Your iron needs double during pregnancy. Dark leafy greens, lean red meat, lentils, and fortified cereals are great choices. Pair them with vitamin C for better absorption.",
    category: "nutrition",
  },
  {
    weekStart: 16, weekEnd: 22,
    title: "Waiting for those first kicks?",
    body: "First-time moms usually feel movement between 18-22 weeks, but it can happen as early as 16 weeks. It might feel like bubbles, fluttering, or gentle taps. Such a magical moment!",
    category: "wellness",
  },
  {
    weekStart: 18, weekEnd: 26,
    title: "Pelvic floor exercises",
    body: "Kegels help prepare your body for labour and recovery. Try holding for 5 seconds, release, repeat 10 times. You can do them anywhere — nobody will know!",
    category: "exercise",
  },
  {
    weekStart: 20, weekEnd: 26,
    title: "Talk, sing, or read to your baby",
    body: "From about 20 weeks, your baby can hear your voice! Talking, singing, or reading to your bump helps with bonding and your baby's auditory development.",
    category: "emotional",
  },
  {
    weekStart: 22, weekEnd: 26,
    title: "Sleep on your side",
    body: "From mid-pregnancy, side-sleeping (especially left side) is recommended to optimise blood flow to your baby. A pregnancy pillow can make it much comfier.",
    category: "wellness",
  },

  // ── Third Trimester (weeks 27–40) ──
  {
    weekStart: 27, weekEnd: 33,
    title: "Start your birth plan",
    body: "Think about your preferences for labour: pain relief options, who you'd like as your support person, music, and your ideal environment. Write it down — even if plans change, it feels empowering!",
    category: "preparation",
  },
  {
    weekStart: 28, weekEnd: 36,
    title: "Protein power",
    body: "Your baby is growing rapidly now. Aim for 70-100g protein daily — eggs, chicken, fish, beans, and nuts are all excellent sources to support baby's growth.",
    category: "nutrition",
  },
  {
    weekStart: 30, weekEnd: 36,
    title: "Perineal massage",
    body: "From about 34 weeks, gentle perineal massage (5-10 minutes, a few times a week) may help reduce tearing during delivery. Ask your midwife for guidance.",
    category: "preparation",
  },
  {
    weekStart: 32, weekEnd: 38,
    title: "Pack your hospital bag",
    body: "Around 35 weeks is a great time to pack: comfy clothes, toiletries, snacks, phone charger, baby's first outfit, nappies, and your medical records. Being ready brings peace of mind.",
    category: "preparation",
  },
  {
    weekStart: 34, weekEnd: 40,
    title: "Breathing exercises for labour",
    body: "Practising slow, deep breathing now can help during contractions. Breathe in for 4 counts, out for 6. This activates your calm nervous system and helps manage pain.",
    category: "exercise",
  },
  {
    weekStart: 36, weekEnd: 40,
    title: "You've got this, mama",
    body: "The final stretch! Your body has done something incredible. Whatever birth looks like for you — natural, assisted, or caesarean — every path brings your baby into the world, and every path is brave.",
    category: "emotional",
  },
  {
    weekStart: 37, weekEnd: 40,
    title: "Know the signs of labour",
    body: "Key signs to watch for: regular contractions that get closer together, waters breaking, a 'show' (mucus plug), and strong lower back pain. Call your hospital if contractions are 5 minutes apart.",
    category: "preparation",
  },
  {
    weekStart: 38, weekEnd: 42,
    title: "Rest and recharge",
    body: "Baby could come any day now. Use this time to rest, eat well, and do things that bring you joy. A well-rested mama is a strong mama.",
    category: "wellness",
  },
];

/** Get tips relevant to a specific gestational week */
export function getTipsForWeek(week: number): PregnancyTip[] {
  return PREGNANCY_TIPS.filter((t) => week >= t.weekStart && week <= t.weekEnd);
}
