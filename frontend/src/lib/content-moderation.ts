/* ──────────────────────────────────────────────
   Client-side content moderation engine.
   Screens posts against community guidelines:
   - Hate speech / slurs
   - Violence / threats
   - Bullying / harassment
   - Spam / scam patterns
   - Medical misinformation keywords
   
   This is a first-pass filter. Flagged posts are
   surfaced to the admin for final review.
   ────────────────────────────────────────────── */

export type ViolationType =
  | "hate_speech"
  | "violence"
  | "bullying"
  | "spam"
  | "medical_misinformation"
  | "profanity";

export interface ModerationResult {
  passed: boolean;
  violations: { type: ViolationType; reason: string }[];
  severity: "none" | "low" | "medium" | "high";
  autoAction: "approve" | "flag" | "reject";
}

// Lowercase word/phrase lists for detection
// These are kept intentionally non-exhaustive and non-offensive in source

const HATE_SPEECH_PATTERNS = [
  // Racist / discriminatory language patterns
  /\b(n[i1]gg|k[i1]ke|sp[i1]c|ch[i1]nk|f[a@]g|tr[a@]nny|r[e3]t[a@]rd)\w*/i,
  /\b(white\s*supremac|aryan|nazi|apartheid\s*was\s*good)\b/i,
  /\b(go\s*back\s*to\s*(your|the)\s*country)\b/i,
  /\b(all\s*(blacks?|whites?|indians?|muslims?|jews?)\s*(are|should))\b/i,
];

const VIOLENCE_PATTERNS = [
  /\b(kill\s*(your|my|the|that)|murder|stab|shoot|bomb)\b/i,
  /\b(i('ll|'m\s*going\s*to)\s*(hurt|harm|beat|attack))\b/i,
  /\b(death\s*threat|threat(en)?)\b/i,
  /\b(self[- ]?harm|sui[c]ide)\b/i,
];

const BULLYING_PATTERNS = [
  /\b(you('re|r)\s*(stupid|ugly|fat|worthless|pathetic|useless|disgusting))\b/i,
  /\b(kill\s*yourself|kys|nobody\s*loves?\s*you)\b/i,
  /\b(shut\s*(the\s*f|up\s*b))\b/i,
  /\b(go\s*die|drop\s*dead)\b/i,
  /\b(you\s*deserve\s*(to\s*)?die)\b/i,
];

const SPAM_PATTERNS = [
  /\b(buy\s*now|click\s*(here|this\s*link)|free\s*money|make\s*\$?\d+k?)\b/i,
  /\b(dm\s*me\s*for|whatsapp\s*me|join\s*my|visit\s*my\s*link)\b/i,
  /(https?:\/\/[^\s]+){2,}/i,  // Multiple URLs
  /(.)\1{5,}/,  // Repeated character spam
];

const MEDICAL_MISINFO_PATTERNS = [
  /\b(vaccines?\s*(cause|are\s*poison)|anti[- ]?vax)\b/i,
  /\b(don'?t\s*(see|go\s*to)\s*(a\s*)?doctor)\b/i,
  /\b(bleach\s*(cure|treat)|ivermectin\s*(for|cure))\b/i,
  /\b(essential\s*oils?\s*(cure|treat|heal))\b/i,
];

const PROFANITY_PATTERNS = [
  /\b(f+u+c+k+|sh[i1]+t+|b[i1]+t+c+h+|a+s+s+h+o+l+e+|d+[i1]+c+k+|c+u+n+t+)\b/i,
  /\b(wtf|stfu|lmfao)\b/i,
];

function testPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/** Screen a post against community guidelines */
export function moderateContent(text: string): ModerationResult {
  const violations: ModerationResult["violations"] = [];

  if (testPatterns(text, HATE_SPEECH_PATTERNS)) {
    violations.push({ type: "hate_speech", reason: "Contains potentially discriminatory or hateful language" });
  }
  if (testPatterns(text, VIOLENCE_PATTERNS)) {
    violations.push({ type: "violence", reason: "Contains violent language or threats" });
  }
  if (testPatterns(text, BULLYING_PATTERNS)) {
    violations.push({ type: "bullying", reason: "Contains bullying or harassment" });
  }
  if (testPatterns(text, SPAM_PATTERNS)) {
    violations.push({ type: "spam", reason: "Matches spam or scam patterns" });
  }
  if (testPatterns(text, MEDICAL_MISINFO_PATTERNS)) {
    violations.push({ type: "medical_misinformation", reason: "Contains potential medical misinformation" });
  }
  if (testPatterns(text, PROFANITY_PATTERNS)) {
    violations.push({ type: "profanity", reason: "Contains strong profanity" });
  }

  const highSeverity = violations.some((v) =>
    v.type === "hate_speech" || v.type === "violence" || v.type === "bullying"
  );
  const mediumSeverity = violations.some((v) =>
    v.type === "medical_misinformation" || v.type === "spam"
  );

  const severity: ModerationResult["severity"] =
    highSeverity ? "high" : mediumSeverity ? "medium" : violations.length > 0 ? "low" : "none";

  const autoAction: ModerationResult["autoAction"] =
    highSeverity ? "reject" : violations.length > 0 ? "flag" : "approve";

  return {
    passed: violations.length === 0,
    violations,
    severity,
    autoAction,
  };
}
