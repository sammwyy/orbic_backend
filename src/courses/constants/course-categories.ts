export const COURSE_CATEGORIES = [
  "mathematics",
  "science",
  "technology",
  "language",
  "history",
  "art",
  "business",
  "health",
  "other",
] as const;

export type CourseCategoryType = (typeof COURSE_CATEGORIES)[number];

export const COURSE_CATEGORY_LABELS: Record<CourseCategoryType, string> = {
  mathematics: "Mathematics",
  science: "Science",
  technology: "Technology",
  language: "Language",
  history: "History",
  art: "Art",
  business: "Business",
  health: "Health",
  other: "Other",
};
