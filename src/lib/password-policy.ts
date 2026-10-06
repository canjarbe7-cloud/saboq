/**
 * Parol qoidalari — server ham, brauzer ham (kuchlilik ko'rsatkichi) shu fayldan foydalanadi.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export type PasswordIssue = "tooShort" | "tooLong" | "needLetter" | "needDigit" | "containsUsername";

export function checkPassword(password: string, username?: string): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  if (password.length < PASSWORD_MIN) issues.push("tooShort");
  if (password.length > PASSWORD_MAX) issues.push("tooLong");
  if (!/\p{L}/u.test(password)) issues.push("needLetter");
  if (!/\d/.test(password)) issues.push("needDigit");
  if (username && username.length >= 3 && password.toLowerCase().includes(username.toLowerCase())) {
    issues.push("containsUsername");
  }
  return issues;
}

/** 0 (juda zaif) … 4 (juda kuchli). */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= PASSWORD_MIN) score++;
  if (password.length >= 12) score++;
  if (/\p{Ll}/u.test(password) && /\p{Lu}/u.test(password)) score++;
  if (/\d/.test(password) && /[^\p{L}\d]/u.test(password)) score++;
  else if (/\d/.test(password) && password.length >= 10) score += 0.5;
  // Takrorlanuvchi yoki ketma-ket belgilar bahoni tushiradi
  if (/^(.)\1+$/.test(password) || /^(1234|qwer|abcd|pass)/i.test(password)) score = Math.min(score, 1);
  return Math.max(0, Math.min(4, Math.floor(score))) as 0 | 1 | 2 | 3 | 4;
}
