/**
 * Foydalanuvchiga ko'rsatiladigan kutilgan xato. `code` — messages/uz.json dagi
 * "errors.<code>" kaliti; shu orqali xabar tarjima qilinadi.
 */
export class AppError extends Error {
  constructor(public code: string, public params?: Record<string, string | number>) {
    super(code);
    this.name = "AppError";
  }
}
