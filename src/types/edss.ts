// ============================================================================
// EDSS-RELATED TYPES
// ============================================================================

export const assistanceLevelIds = [
  "none",
  "uni_50_plus",
  "uni_under_50",
  "bi_120_plus",
  "bi_5_to_120",
  "bi_under_5",
  "wheel_self",
  "wheel_some_help",
  "wheel_dependent",
  "bed_chair_arms_ok",
  "bed_chair_limited_arms",
  "helpless",
  "total_care"
] as const;

export type AssistanceId = typeof assistanceLevelIds[number];

export type EyeAcuity = "1.0" | "0.68-0.99" | "0.34-0.67" | "0.21-0.33" | "0.10-0.20" | "lt_0.10";

export type Severity = 'normal' | 'mild' | 'moderate' | 'marked' | 'absent';
