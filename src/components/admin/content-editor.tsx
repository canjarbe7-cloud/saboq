"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Camera, CheckCircle2, ExternalLink, MapPin, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/admin-shell";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { useAction } from "@/hooks/use-action";
import { saveSiteContentAction } from "@/server/actions/admin";
import { CONTENT_KEYS, contactLinks, contentSchemas, photoUrl, type ContentKey, type SiteContent } from "@/lib/site-content";
import { formatPhone } from "@/lib/validation";
import { cn } from "@/lib/cn";

/** Sahifada har bo'lim qayerda ko'rinishi ("Saytda ko'rish" havolasi uchun). */
const VIEW: Record<ContentKey, string> = {
  teachers: "/#ustozlar", results: "/#natijalar", testimonials: "/#natijalar", faq: "/#savollar", stats: "/", contacts: "/aloqa",
};

type ListKey = Exclude<ContentKey, "contacts">;
const BLANK: { [K in ListKey]: SiteContent[K][number] } = {
  teachers: { name: "", role: "", score: "", bio: "", photo: null },
  results: { name: "", score: "", detail: "" },
  testimonials: { name: "", meta: "", text: "" },
  faq: { q: "", a: "" },
  stats: { value: "", label: "" },
};
const MAX: Record<ListKey, number> = { teachers: 12, results: 24, testimonials: 12, faq: 20, stats: 4 };

/** Formadagi aloqa maydonlari — hammasi matn (koordinatalar ham), saqlashda sxema raqamga aylantiradi. */
type ContactsForm = { phone: string; telegram: string; instagram: string; address: string; workingHours: string; lat: string; lng: string };
type Draft = Omit<SiteContent, "contacts"> & { contacts: ContactsForm };

const toDraft = (c: SiteContent): Draft => ({
  ...c,
  contacts: { ...c.contacts, phone: formatPhone(c.contacts.phone), telegram: `@${c.contacts.telegram}`, instagram: c.contacts.instagram && `@${c.contacts.instagram}`, lat: String(c.contacts.lat), lng: String(c.contacts.lng) },
});

/**
 * Rasmni brauzerning o'zida kvadrat qilib kesib, kichraytiradi (480×480, JPEG) —
 * telefonda olingan 5–10 MB rasm ham serverga ~50 KB bo'lib boradi.
 */
async function squarePhoto(file: File, size = 480): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  // Tik rasmlarda yuz odatda yuqoriroqda — kesishda yuqoriga biroz yaqin olinadi
  const sy = bitmap.height > bitmap.width ? (bitmap.height - side) * 0.25 : 0;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, sy, side, side, 0, 0, size, size);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.86));
}

function PhotoField({ photo, name, onChange }: { photo: string | null; name: string; onChange: (photo: string | null) => void }) {
  const t = useTranslations("admin.content.teachers");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      const body = new FormData();
      body.append("file", await squarePhoto(file), "photo.jpg");
      const res = await fetch("/api/admin/site/photo", { method: "POST", body });
      if (!res.ok) throw new Error(String(res.status));
      onChange(((await res.json()) as { name: string }).name);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className={cn("grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-soft font-display text-2xl font-black text-brand", busy && "animate-pulse")}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(photo)} alt="" className="size-full object-cover" />
        ) : (
          name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || <Camera className="size-7" />
        )}
      </span>
      <div className="min-w-0">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => void upload(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            <Camera className="size-4" /> {busy ? t("uploading") : photo ? t("change") : t("upload")}
          </Button>
          {photo && (
            <Button type="button" variant="ghost" size="sm" className="text-danger" disabled={busy} onClick={() => onChange(null)}>
              <Trash2 className="size-4" /> {t("removePhoto")}
            </Button>
          )}
        </div>
        <p className={cn("mt-1.5 text-xs", error ? "font-semibold text-danger" : "text-muted")}>{error ? t("photoError") : t("photoHint")}</p>
      </div>
    </div>
  );
}

/**
 * "Sayt kontenti": bosh sahifadagi ustozlar, natijalar, fikrlar, savollar, raqamlar va aloqa ma'lumotlari.
 * Har bo'lim alohida saqlanadi; saqlangach darhol saytda ko'rinadi.
 */
export function ContentEditor({ initial }: { initial: SiteContent }) {
  const t = useTranslations("admin.content");
  const [tab, setTab] = useState<ContentKey>("teachers");
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [dirty, setDirty] = useState<Partial<Record<ContentKey, boolean>>>({});
  const [savedKey, setSavedKey] = useState<ContentKey | null>(null);
  const [invalid, setInvalid] = useState(false);
  const save = useAction(saveSiteContentAction, { onSuccess: () => { setDirty((d) => ({ ...d, [tab]: false })); setSavedKey(tab); } });

  const touch = (key: ContentKey) => { setDirty((d) => ({ ...d, [key]: true })); setSavedKey(null); setInvalid(false); };
  // Yangilash har doim eng so'nggi holat ustida bajariladi: rasm yuklanayotganda yozilgan matn yo'qolib qolmasin
  const editList = <K extends ListKey>(key: K, change: (items: Draft[K][number][]) => Draft[K][number][]) => {
    setDraft((d) => ({ ...d, [key]: change(d[key] as Draft[K][number][]) }));
    touch(key);
  };
  const setContact = (field: keyof ContactsForm, value: string) => { setDraft((d) => ({ ...d, contacts: { ...d.contacts, [field]: value } })); touch("contacts"); };

  const submit = () => {
    // Brauzerda ham tekshiramiz — bo'sh qolgan majburiy maydon bo'lsa, serverga bormasdan aytiladi
    const parsed = contentSchemas[tab].safeParse(draft[tab]);
    if (!parsed.success && tab !== "contacts") return setInvalid(true);
    setInvalid(false);
    save.run({ key: tab, value: draft[tab] } as Parameters<typeof saveSiteContentAction>[0]);
  };

  /** Ro'yxatli bo'lim: har element kartochkada, yuqoriga/pastga surish va o'chirish tugmalari bilan. */
  function list<K extends ListKey>(key: K, row: (item: Draft[K][number], set: (patch: Partial<Draft[K][number]>) => void) => ReactNode) {
    const items = draft[key] as Draft[K][number][];
    const move = (i: number, by: number) => editList(key, (list) => { const next = [...list]; [next[i], next[i + by]] = [next[i + by], next[i]]; return next; });
    const icon = "grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent";
    return (
      <div className="space-y-3">
        {items.length === 0 && <p className="rounded-2xl border-2 border-dashed border-line p-6 text-center text-muted">{t("empty")}</p>}
        {items.map((item, i) => (
          <div key={i} className="rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="grid size-8 place-items-center rounded-full bg-brand-soft font-display text-sm font-black text-brand">{i + 1}</span>
              <span className="flex items-center gap-0.5">
                <button type="button" className={icon} disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("up")} title={t("up")}><ArrowUp className="size-4" /></button>
                <button type="button" className={icon} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t("down")} title={t("down")}><ArrowDown className="size-4" /></button>
                <button type="button" className={cn(icon, "hover:bg-danger-soft hover:text-danger")} onClick={() => editList(key, (list) => list.filter((_, n) => n !== i))} aria-label={t("remove")} title={t("remove")}><Trash2 className="size-4" /></button>
              </span>
            </div>
            <div className="space-y-3">{row(item, (patch) => editList(key, (list) => list.map((it, n) => (n === i ? { ...it, ...patch } : it))))}</div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" disabled={items.length >= MAX[key]} onClick={() => editList(key, (list) => [...list, { ...BLANK[key] } as Draft[K][number]])}>
            <Plus className="size-5" /> {t("add")}
          </Button>
          <span className="text-sm text-muted">{t("limit", { max: MAX[key] })}</span>
        </div>
      </div>
    );
  }

  const two = "grid grid-cols-1 gap-3 sm:grid-cols-2";
  const c = draft.contacts;
  const coords = contentSchemas.contacts.shape.lat.safeParse(c.lat).success && contentSchemas.contacts.shape.lng.safeParse(c.lng).success && c.lat.trim() && c.lng.trim()
    ? contactLinks({ ...initial.contacts, lat: Number(c.lat), lng: Number(c.lng) }).googleMapsHref
    : null;

  return (
    <>
      <PageHeader title={t("title")} />
      <p className="-mt-3 mb-5 max-w-2xl text-muted">{t("hint")}</p>

      <div className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist">
        {CONTENT_KEYS.map((key) => (
          <button
            key={key} type="button" role="tab" aria-selected={tab === key}
            onClick={() => { setTab(key); setSavedKey(null); setInvalid(false); save.clearError(); }}
            className={cn(
              "relative shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors",
              tab === key ? "bg-brand text-brand-fg shadow-md shadow-brand/25" : "bg-surface text-muted hover:text-fg",
            )}
          >
            {t(`tabs.${key}`)}
            {dirty[key] && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent ring-2 ring-bg" aria-label={t("unsaved")} />}
          </button>
        ))}
      </div>

      <form className="max-w-3xl" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <p className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-muted">
          {t(`${tab}.intro`)}
          <a href={VIEW[tab]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-brand hover:underline">
            {t("view")} <ExternalLink className="size-3.5" />
          </a>
        </p>

        {tab === "teachers" && list("teachers", (item, set) => (
          <>
            <PhotoField photo={item.photo} name={item.name} onChange={(photo) => set({ photo })} />
            <div className={two}>
              <Field label={t("teachers.name")} required maxLength={60} value={item.name} onChange={(e) => set({ name: e.target.value })} />
              <Field label={t("teachers.role")} maxLength={80} placeholder={t("teachers.rolePh")} value={item.role} onChange={(e) => set({ role: e.target.value })} />
            </div>
            <Field label={t("teachers.score")} maxLength={10} placeholder={t("teachers.scorePh")} value={item.score} onChange={(e) => set({ score: e.target.value })} />
            <Textarea label={t("teachers.bio")} maxLength={300} className="min-h-20" value={item.bio} onChange={(e) => set({ bio: e.target.value })} />
          </>
        ))}

        {tab === "results" && list("results", (item, set) => (
          <>
            <div className={two}>
              <Field label={t("results.name")} required maxLength={60} value={item.name} onChange={(e) => set({ name: e.target.value })} />
              <Field label={t("results.score")} required maxLength={6} placeholder={t("results.scorePh")} value={item.score} onChange={(e) => set({ score: e.target.value })} />
            </div>
            <Field
              label={t("results.detail")} maxLength={60} placeholder={t("results.detailPh")} value={item.detail} onChange={(e) => set({ detail: e.target.value })}
              hint={<p className="text-xs text-muted">{t("results.detailHint")}</p>}
            />
          </>
        ))}

        {tab === "testimonials" && list("testimonials", (item, set) => (
          <>
            <div className={two}>
              <Field label={t("testimonials.name")} required maxLength={60} value={item.name} onChange={(e) => set({ name: e.target.value })} />
              <Field label={t("testimonials.meta")} maxLength={40} placeholder={t("testimonials.metaPh")} value={item.meta} onChange={(e) => set({ meta: e.target.value })} />
            </div>
            <Textarea label={t("testimonials.text")} required maxLength={500} value={item.text} onChange={(e) => set({ text: e.target.value })} />
          </>
        ))}

        {tab === "faq" && list("faq", (item, set) => (
          <>
            <Field label={t("faq.q")} required maxLength={200} value={item.q} onChange={(e) => set({ q: e.target.value })} />
            <Textarea label={t("faq.a")} required maxLength={1000} value={item.a} onChange={(e) => set({ a: e.target.value })} />
          </>
        ))}

        {tab === "stats" && list("stats", (item, set) => (
          <div className={two}>
            <Field label={t("stats.value")} required maxLength={12} placeholder={t("stats.valuePh")} value={item.value} onChange={(e) => set({ value: e.target.value })} />
            <Field label={t("stats.label")} required maxLength={40} placeholder={t("stats.labelPh")} value={item.label} onChange={(e) => set({ label: e.target.value })} />
          </div>
        ))}

        {tab === "contacts" && (
          <div className="space-y-3 rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5">
            <div className={two}>
              <Field label={t("contacts.phone")} required type="tel" inputMode="tel" maxLength={20} placeholder="+998 90 123 45 67" value={c.phone} onChange={(e) => setContact("phone", e.target.value)} />
              <Field label={t("contacts.workingHours")} required maxLength={80} value={c.workingHours} onChange={(e) => setContact("workingHours", e.target.value)} />
            </div>
            <div className={two}>
              <Field label={t("contacts.telegram")} required maxLength={80} autoCapitalize="none" spellCheck={false} value={c.telegram} onChange={(e) => setContact("telegram", e.target.value)} />
              <Field
                label={t("contacts.instagram")} maxLength={80} autoCapitalize="none" spellCheck={false} value={c.instagram} onChange={(e) => setContact("instagram", e.target.value)}
                hint={<p className="text-xs text-muted">{t("contacts.instagramHint")}</p>}
              />
            </div>
            <Field label={t("contacts.address")} required maxLength={120} value={c.address} onChange={(e) => setContact("address", e.target.value)} />
            <div className={two}>
              <Field label={t("contacts.lat")} required inputMode="decimal" maxLength={12} placeholder="40.557149" value={c.lat} onChange={(e) => setContact("lat", e.target.value.replace(",", "."))} />
              <Field label={t("contacts.lng")} required inputMode="decimal" maxLength={12} placeholder="71.144170" value={c.lng} onChange={(e) => setContact("lng", e.target.value.replace(",", "."))} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-xs text-muted">{t("contacts.coordsHint")}</p>
              {coords && (
                <a href={coords} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "outline", size: "sm" })}>
                  <MapPin className="size-4 text-brand" /> {t("contacts.checkMap")}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Saqlash paneli ekran pastida turadi — uzun ro'yxatda ham qo'l ostida */}
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 mt-5 space-y-2 lg:bottom-4">
          {(save.error || invalid) && <Alert>{save.error ?? t("invalidLocal")}</Alert>}
          <div className="flex items-center gap-3 rounded-full border border-line bg-surface/95 p-2 pl-5 shadow-card backdrop-blur">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {savedKey === tab ? (
                <span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 className="size-4" /> {t("saved")}</span>
              ) : dirty[tab] ? (
                <span className="text-accent-fg dark:text-accent">{t("unsaved")}</span>
              ) : (
                <span className="text-muted">{t(`tabs.${tab}`)}</span>
              )}
            </p>
            <Button type="submit" disabled={save.pending || !dirty[tab]}>{save.pending ? t("saving") : t("save")}</Button>
          </div>
        </div>
      </form>
    </>
  );
}
