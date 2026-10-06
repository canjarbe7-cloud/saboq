"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/server/db";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { getRequestMeta } from "@/server/request";
import { escapeHtml, notifyTelegram } from "@/server/services/telegram";
import { env } from "@/server/env";
import { LEVELS, nameSchema, phoneSchema } from "@/lib/validation";

export type ApplicationState =
  | { ok: true; name: string }
  | { ok: false; error?: string; fieldErrors?: { name?: string; phone?: string }; values: { name: string; phone: string; level: string } }
  | null;

/** "+998901234567" → "+998 90 123 45 67" (Telegram'da bosilsa qo'ng'iroq qilinadi). */
const formatPhone = (p: string) => p.replace(/^(\+998)(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5");

const schema = z.object({ name: nameSchema, phone: phoneSchema, level: z.enum(LEVELS) });

/** "Kursga yozilish" arizasi — login'siz, shuning uchun IP bo'yicha cheklangan. */
export async function submitApplicationAction(_prev: ApplicationState, formData: FormData): Promise<ApplicationState> {
  const t = await getTranslations("site.contact");
  const values = {
    name: String(formData.get("name") ?? "").slice(0, 100),
    phone: String(formData.get("phone") ?? "").slice(0, 30),
    level: String(formData.get("level") ?? "unknown"),
  };

  // "Honeypot": odam ko'rmaydigan maydonni faqat botlar to'ldiradi — jimgina "qabul qilamiz"
  if (formData.get("website")) return { ok: true, name: values.name };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((i) => i.path[0]));
    return {
      ok: false,
      values,
      fieldErrors: {
        ...(fields.has("name") ? { name: t("errors.name") } : {}),
        ...(fields.has("phone") ? { phone: t("errors.phone") } : {}),
      },
    };
  }

  const { ip } = await getRequestMeta();
  // Bitta IP'dan soatiga 5 ta, butun sayt bo'yicha soatiga 200 ta ariza
  const allowed = (await consumeRateLimit(`apply:ip:${ip}`, 5, 3600)) && (await consumeRateLimit("apply:global", 200, 3600));
  if (!allowed) return { ok: false, values, error: t("errors.rateLimited") };

  try {
    const app = await db.application.create({ data: parsed.data });
    // Telegram xabari javobni kechiktirmasin va xato bo'lsa ham ariza saqlanib qolsin
    const time = new Intl.DateTimeFormat("uz-UZ", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tashkent" }).format(app.createdAt);
    const adminUrl = `${env.APP_URL}/admin/arizalar`;
    // Telegram tugmalarida localhost manzili qabul qilinmaydi — faqat haqiqiy domen bo'lsa qo'shamiz
    const isPublicUrl = !/\/\/(localhost|127\.|192\.168\.|10\.)/.test(env.APP_URL);
    void notifyTelegram(
      [
        "🆕 <b>YANGI ARIZA</b>",
        "━━━━━━━━━━━━━━━",
        `👤 <b>Ism:</b> ${escapeHtml(app.name)}`,
        `📞 <b>Telefon:</b> ${escapeHtml(formatPhone(app.phone))}`,
        `📊 <b>Daraja:</b> ${escapeHtml(t(`levels.${app.level}` as "levels.unknown"))}`,
        `🕐 <b>Vaqt:</b> ${time}`,
        ...(isPublicUrl ? [] : ["", `🔗 ${adminUrl}`]),
      ],
      [
        { text: "💬 Telegramda yozish", url: `https://t.me/${app.phone}` },
        ...(isPublicUrl ? [{ text: "📋 Admin panelda ochish", url: adminUrl }] : []),
      ],
    );
    return { ok: true, name: app.name };
  } catch (e) {
    console.error("[application]", e);
    return { ok: false, values, error: t("errors.unknown") };
  }
}
