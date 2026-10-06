import { env } from "@/server/env";

export type TelegramButton = { text: string; url: string };

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Admin'ga Telegram bot orqali xabar yuboradi. Bot sozlanmagan yoki
 * Telegram ishlamayotgan bo'lsa, jim o'tib ketadi — sayt ishi to'xtamaydi.
 */
export async function notifyTelegram(lines: string[], buttons: TelegramButton[] = []): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: lines.join("\n"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
        // Har bir tugma alohida qatorda — telefonda bosish qulay
        ...(buttons.length ? { reply_markup: { inline_keyboard: buttons.map((b) => [b]) } } : {}),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) console.error("[telegram]", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[telegram]", e);
    return false;
  }
}

export { escapeHtml };
