/**
 * Yutuq nishonlari ro'yxati. Yangi nishon qo'shish uchun shu yerga qator qo'shing
 * va messages/uz/student.json → achievements bo'limiga nomini yozing.
 */
export const ACHIEVEMENTS = [
  { code: "FIRST_LESSON", kind: "lessons", threshold: 1, emoji: "🚀" },
  { code: "LESSONS_10", kind: "lessons", threshold: 10, emoji: "📚" },
  { code: "LESSONS_50", kind: "lessons", threshold: 50, emoji: "🏆" },
  { code: "STREAK_3", kind: "streak", threshold: 3, emoji: "🔥" },
  { code: "STREAK_7", kind: "streak", threshold: 7, emoji: "⚡" },
  { code: "STREAK_30", kind: "streak", threshold: 30, emoji: "💎" },
  { code: "COURSE_COMPLETE", kind: "course", threshold: 1, emoji: "🎓" },
] as const;

export type AchievementCode = (typeof ACHIEVEMENTS)[number]["code"];
