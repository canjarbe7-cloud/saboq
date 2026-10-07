# Saboq School — IELTS onlayn video kurslar platformasi

Saboq School o‘quv markazi uchun yopiq video darslar sayti: ochiq sahifalar (bosh sahifa, aloqa, ariza),
o‘quvchi kabineti va admin panel.

- **Ro‘yxatdan o‘tish yo‘q.** Login va parolni faqat admin beradi.
- **Videolar o‘z serveringizda saqlanmaydi** — Bunny Stream orqali, imzolangan qisqa muddatli havolalar bilan uzatiladi.
- **Til:** o‘zbek (lotin). Rus va ingliz tilini qo‘shish uchun tayyor (quyida).

> Bu qo‘llanma dasturchi bo‘lmagan odam uchun yozilgan. Buyruqlarni ketma-ket nusxalab,
> terminalga qo‘ying. `#` bilan boshlangan qatorlar — izoh.

## Mundarija

1. [Kompyuterda ishga tushirish](#1-kompyuterda-ishga-tushirish)
2. [Birinchi qadamlar: admin, kurs, o‘quvchi](#2-birinchi-qadamlar)
3. [Video xizmatini ulash (Bunny)](#3-video-xizmatini-ulash-bunny)
4. [Telegram botni ulash](#4-telegram-botni-ulash)
5. [Serverga joylash (VPS)](#5-serverga-joylash-vps)
6. [Vercel’ga joylash (muqobil)](#6-vercelga-joylash-muqobil)
7. [Domen ulash](#7-domen-ulash)
8. [Bazani zaxiralash va tiklash](#8-bazani-zaxiralash-va-tiklash)
9. [Saytni yangilash](#9-saytni-yangilash)
10. [Matn, rang va kontentni o‘zgartirish](#10-matn-rang-va-kontentni-ozgartirish)
11. [Xavfsizlik: nima qilingan va nimaga e’tibor berish kerak](#11-xavfsizlik)
12. [Loyiha tuzilmasi](#12-loyiha-tuzilmasi)
13. [Tez-tez uchraydigan muammolar](#13-tez-tez-uchraydigan-muammolar)

---

## 1. Kompyuterda ishga tushirish

Kerak bo‘ladi: **Node.js 22+** va **PostgreSQL 15+**.

```bash
# 1) Kutubxonalarni o‘rnatish
npm install

# 2) Sozlamalar faylini yaratish
cp .env.example .env
```

`.env` faylini oching va kamida `DATABASE_URL` ni to‘ldiring
(masalan `postgresql://postgres:PAROL@127.0.0.1:5432/admire?schema=public`).
Baza hali yo‘q bo‘lsa: `createdb admire`.

```bash
# 3) Bazada jadvallarni yaratish
npm run db:deploy

# 4) Birinchi adminni yaratish (parol terminalda BIR MARTA ko‘rsatiladi — yozib oling)
npm run db:seed

# 5) Saytni ishga tushirish
npm run dev
```

Brauzerda oching: <http://localhost:3000>

**Shu kompyuter haqida.** Loyihani qurishda `.pgdata` papkasida alohida lokal baza yaratilgan
(5433-port) va `.env` shunga sozlangan. Kompyuter o‘chib yonganidan keyin uni qayta yoqish:

```bash
npm run db:local:start   # to‘xtatish: npm run db:local:stop
```

Admin logini `admin`, paroli `.env` faylidagi `SEED_ADMIN_PASSWORD` qatorida.

### Foydali buyruqlar

| Buyruq | Nima qiladi |
|---|---|
| `npm run dev` | Saytni ishlab chiqish rejimida ochadi |
| `npm run build` va `npm start` | Production rejimida yig‘adi va ishga tushiradi |
| `npm test` | Avtomatik testlar (login, ruxsatlar, parol, sessiya limiti) |
| `npm run lint`, `npm run typecheck` | Kod sifatini tekshiradi |
| `npm run db:studio` | Bazani brauzerda ko‘rish |

Testlar alohida bazada ishlaydi: `.env.test` faylidagi `DATABASE_URL` nomida `test` so‘zi bor
bazaga qarashi shart (masalan `admire_test`), aks holda testlar ishlamaydi — bu asosiy bazani
tasodifan tozalab yuborishdan himoya.

---

## 2. Birinchi qadamlar

1. `/kirish` sahifasida admin logini bilan kiring. Birinchi kirishda parolni o‘zgartirish so‘raladi.
2. **Kurslar → Kurs qo‘shish.** Kurs ichida modul, modul ichida dars yarating.
   Tartibni chap tomondagi ⋮⋮ belgisidan ushlab surib o‘zgartirasiz.
3. Darsni oching, **video yuklang** (3-bo‘limga qarang), kerak bo‘lsa PDF/audio biriktiring.
4. Video “tayyor” bo‘lgach, dars holatini **Nashr qilingan** qiling. Modul va kursni ham nashr qiling —
   qoralama holatidagi narsalarni o‘quvchilar ko‘rmaydi.
5. **O‘quvchilar → O‘quvchi qo‘shish.** Sayt login va vaqtinchalik parolni ko‘rsatadi —
   “Hammasini nusxalash” tugmasi bilan o‘quvchiga yuboring. Bu parol qayta ko‘rsatilmaydi.
6. O‘quvchi sahifasida unga ochiq kurslarni belgilang va muddat bering (1, 3, 6 oy, 1 yil yoki muddatsiz).

O‘quvchi sahifasida yana: bloklash, parolni tiklash, progressni ko‘rish, faol qurilmalarni ko‘rish va chiqarib yuborish.

---

## 3. Video xizmatini ulash (Bunny)

Nega Bunny Stream: arzon (taxminan har GB uchun bir necha sent), o‘zi videoni telefon uchun
turli sifatlarga o‘giradi, uzilganda davom etadigan yuklashni va imzolangan havolalarni qo‘llaydi.

### 3.1. Stream (videolar)

1. <https://bunny.net> da ro‘yxatdan o‘ting → **Stream → Add Video Library**. Nom bering,
   “Main Storage Region” uchun Yevropani tanlang (O‘zbekistonga eng yaqin).
2. Kutubxona ichida **API** bo‘limini oching va `.env` ga yozing:
   - `BUNNY_STREAM_LIBRARY_ID` — “Video Library ID”
   - `BUNNY_STREAM_API_KEY` — “API Key”
   - `BUNNY_STREAM_CDN_HOST` — “CDN Hostname” (masalan `vz-abc123-456.b-cdn.net`, `https://` siz)
3. **Security** bo‘limida:
   - **CDN Token Authentication** ni yoqing va “Token Authentication Key” ni `BUNNY_STREAM_TOKEN_KEY` ga yozing.
     Shundan keyin videoni faqat saytingiz bergan qisqa muddatli havola bilan ochish mumkin.
   - **Block direct URL file access** ni o‘chirilgan qoldiring (himoyani token bajaradi; yoqilsa pleyer ishlamaydi).
   - **Allowed Domains** ga o‘z domeningizni qo‘shing.
4. **Encoding** bo‘limida 360p, 480p, 720p (xohlasangiz 1080p) ni belgilang.

### 3.2. Storage (PDF va audio materiallar)

1. **Storage → Add Storage Zone.**
2. Zona ichida **FTP & API Access**: `BUNNY_STORAGE_ZONE` — zona nomi, `BUNNY_STORAGE_API_KEY` — “Password”.
3. Region Yevropadan boshqa bo‘lsa, `BUNNY_STORAGE_HOST` ni o‘sha sahifadagi “Hostname” ga almashtiring.

Storage sozlanmasa, materiallar serverdagi `storage/` papkasiga saqlanadi. Bu bitta VPS uchun
yaroqli, **Vercel’da esa ishlamaydi** — u yerda Bunny Storage shart.

`.env` o‘zgargandan keyin saytni qayta ishga tushiring.

### 3.3. Videoni yuklash qanday ishlaydi

Video brauzeringizdan to‘g‘ridan-to‘g‘ri Bunny’ga boradi (sayt serveridan o‘tmaydi), shuning uchun
2 GB+ fayllar ham muammo emas. Internet uzilsa, yuklash o‘zi qayta urinadi. Sahifa yopilib qolgan bo‘lsa,
dars sahifasini ochib **o‘sha faylni** qayta tanlang — to‘xtagan joyidan davom etadi.

### 3.4. Watermark haqida halol gap

Video ustida o‘quvchining ismi va telefoni joyini o‘zgartirib turadi. Bu ekrandan yozib tarqatishni
**qiyinlashtiradi va kim tarqatganini ko‘rsatadi**, lekin 100% oldini olmaydi — buni hech qaysi sayt
qila olmaydi. Kuchliroq himoya kerak bo‘lsa, Bunny’ning pullik **MediaCage DRM** xizmatini yoqish mumkin.

---

## 4. Telegram botni ulash

Yangi ariza kelganda sizga xabar yuboradi.

1. Telegram’da **@BotFather** ga `/newbot` yozing, nom bering. U bergan tokenni `TELEGRAM_BOT_TOKEN` ga yozing.
2. Yangi botingizga `/start` yozing.
3. Brauzerda `https://api.telegram.org/bot<TOKEN>/getUpdates` ni oching (`<TOKEN>` o‘rniga tokeningiz).
   Javobdagi `"chat":{"id":123456789` raqamini `TELEGRAM_CHAT_ID` ga yozing.
   Guruhga yuborilishi kerak bo‘lsa, botni guruhga qo‘shing va guruh `id` sini (minus bilan boshlanadi) yozing.
4. Saytni qayta ishga tushiring va `/aloqa` sahifasidan sinov arizasi yuboring.

Bot sozlanmagan bo‘lsa ham arizalar admin panelga tushaveradi.

---

## 5. Serverga joylash (VPS)

Tavsiya: 2 GB RAM, Ubuntu 22.04/24.04. Loyihada Docker fayllari tayyor: sayt, PostgreSQL va
**Caddy** (HTTPS sertifikatini o‘zi oladi va yangilaydi).

```bash
# 1) Serverga kiring
ssh root@SERVER_IP

# 2) Docker o‘rnating
curl -fsSL https://get.docker.com | sh

# 3) Loyihani serverga ko‘chiring (GitHub orqali yoki scp bilan)
git clone https://github.com/SIZNING/REPO.git admire && cd admire

# 4) Sozlamalar
cp .env.example .env
nano .env
```

`.env` da to‘ldiring:

| O‘zgaruvchi | Qiymat |
|---|---|
| `DOMAIN` | `admire.uz` (o‘z domeningiz, `https://` siz) |
| `DB_PASSWORD` | uzun tasodifiy parol (`openssl rand -hex 24` buyrug‘i beradi) |
| `APP_URL` | `https://admire.uz` |
| `SEED_ADMIN_*` | birinchi admin ma’lumotlari |
| `BUNNY_*`, `TELEGRAM_*` | 3 va 4-bo‘limlardan |

```bash
# 5) Ishga tushirish (birinchi marta 3–5 daqiqa oladi)
docker compose up -d --build

# 6) Birinchi adminni yaratish (parolni yozib oling!)
docker compose exec app npm run db:seed

# Holatni ko‘rish / loglar
docker compose ps
docker compose logs -f app
```

Server xavfsizligi uchun faqat kerakli portlarni oching:

```bash
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
```

> **Eslatma.** Docker fayllari yozilgan, lekin shu kompyuterda Docker yo‘qligi uchun sinab ko‘rilmagan.
> Birinchi ishga tushirishda xato chiqsa, `docker compose logs app` natijasini saqlab qo‘ying.

---

## 6. Vercel’ga joylash (muqobil)

Server boshqarishni xohlamasangiz:

1. Bazani <https://neon.tech> yoki Supabase’da yarating, ulanish satrini oling.
2. Loyihani GitHub’ga yuklang, <https://vercel.com> da **Import Project**.
3. **Environment Variables** ga `.env.example` dagi hamma qiymatlarni kiriting (`DOMAIN` va `DB_PASSWORD` kerak emas).
4. **Build Command:** `prisma migrate deploy && npm run build`.
5. Adminni yaratish uchun o‘z kompyuteringizda `.env` ga o‘sha baza manzilini qo‘yib, `npm run db:seed` ni ishga tushiring.

Vercel’da **Bunny Storage majburiy** (3.2-bo‘lim) va bitta material hajmi 4 MB dan oshmaydi
(Vercel cheklovi). Katta PDF/audio kerak bo‘lsa — VPS tanlang.

---

## 7. Domen ulash

1. Domen sotib olgan joyingizda (masalan ahost.uz, webname.uz) **DNS** bo‘limini oching.
2. Ikkita yozuv qo‘shing:

   | Tur | Nom | Qiymat |
   |---|---|---|
   | A | `@` | serveringiz IP manzili |
   | A | `www` | serveringiz IP manzili |

3. 10–60 daqiqa kuting. `.env` dagi `DOMAIN` va `APP_URL` to‘g‘ri ekanini tekshiring, so‘ng
   `docker compose up -d`. Caddy HTTPS sertifikatini o‘zi oladi.

Vercel’da: **Project → Settings → Domains** ga domenni yozing va u ko‘rsatgan DNS yozuvlarini qo‘shing.

**Muhim:** sayt production’da faqat **HTTPS** orqali ishlaydi. HTTP orqali ochilsa, login qilib bo‘lmaydi —
sessiya cookie’si xavfsizlik uchun faqat HTTPS’da qabul qilinadi.

---

## 8. Bazani zaxiralash va tiklash

Bazada o‘quvchilar, kurslar tuzilmasi va progress turadi. Videolar Bunny’da, ular alohida.

```bash
# Qo‘lda zaxira olish (backups/ papkasiga, 14 kundan eskilari o‘chadi)
./scripts/backup.sh
```

Har kuni soat 03:00 da avtomatik:

```bash
crontab -e
# ochilgan faylga shu qatorni qo‘shing (yo‘lni o‘zingiznikiga moslang):
0 3 * * * cd /root/admire && ./scripts/backup.sh >> backups/backup.log 2>&1
```

**Zaxirani boshqa joyga ham ko‘chiring** (kompyuteringiz yoki bulut) — server buzilsa, undagi zaxira ham yo‘qoladi:

```bash
# o‘z kompyuteringizda
scp -r root@SERVER_IP:/root/admire/backups ./admire-backups
```

Tiklash:

```bash
gunzip -c backups/admire-2026-10-04-0300.sql.gz | docker compose exec -T db psql -U admire admire
```

Materiallar serverda saqlanayotgan bo‘lsa (Bunny Storage ulanmagan), ularni ham zaxiralang:

```bash
docker run --rm -v admire_storage:/data -v "$PWD/backups":/out alpine tar czf /out/storage.tar.gz -C /data .
```

Vercel + Neon’da zaxirani Neon o‘zi yuritadi (panelida “Restore” bor).

---

## 9. Saytni yangilash

```bash
cd admire
./scripts/backup.sh          # avval zaxira
git pull
docker compose up -d --build # baza o‘zgarishlari avtomatik qo‘llanadi
```

---

## 10. Matn, rang va kontentni o‘zgartirish

| Nima | Qayerda |
|---|---|
| Manzil, telefon, Telegram, xarita, ish vaqti | `src/config/site.config.ts` |
| Ustozlar, natijalar, izohlar, FAQ, raqamlar | `src/config/content.ts` |
| Saytdagi barcha matnlar | `messages/uz/*.json` |
| Brend ranglari (yorug‘ va qorong‘i rejim) | `src/app/globals.css` boshidagi `--brand`, `--accent` |
| Sayt ikonkasi (brauzer yorlig‘i, telefon bosh ekrani) | `src/app/icon.svg`, `src/app/favicon.ico`, `src/app/apple-icon.png`, `public/icon-*.png` |
| IELTS bo‘limlarining ikonka va ranglari | `src/lib/sections.ts` |
| Qurilmalar limiti, sessiya muddati | `.env`: `SESSION_MAX_DEVICES`, `SESSION_TTL_DAYS` |

> ⚠️ `site.config.ts` va `content.ts` da hozir **namunaviy ma’lumotlar** turibdi.
> Saytni ochishdan oldin haqiqiy manzil, telefon, ustozlar va natijalar bilan almashtiring.

**Xarita:** Google Maps’da markazni toping → Share → Embed a map → `src="..."` ichidagi havolani
`mapEmbedUrl` ga qo‘ying.

### Yangi til qo‘shish (rus, ingliz)

1. `messages/uz` papkasidan nusxa oling: `messages/ru`, ichidagi matnlarni tarjima qiling.
2. `src/i18n/request.ts` da `LOCALES` ga `"ru"` qo‘shing va tilni cookie’dan o‘qing.
3. Til almashtirish tugmasini qo‘shing (cookie’ga yozadi). Sahifalar kodini o‘zgartirish shart emas —
   hamma matnlar tarjima fayllaridan olinadi.

### Kelajak uchun tayyorlangan joylar

- **To‘lov (Click/Payme):** kursga kirish `Enrollment` jadvalida (`expiresAt` muddati bilan). To‘lov
  tasdiqlanganda shu yozuvni yaratish/uzaytirish kifoya — `src/server/services/students.ts` dagi
  `setEnrollments` namuna bo‘ladi. `Payment` jadvali `Enrollment` ga bog‘lanadi.
- **Mock testlar:** kurs tuzilmasiga tegmasdan alohida jadvallar (`MockTest`, `MockAttempt`) va
  `/kabinet/testlar` bo‘limi sifatida qo‘shiladi. Ruxsat tekshiruvi uchun `src/server/services/learning.ts`
  dagi `getLessonAccess` qolipidan foydalaning.
- **Boshqa video xizmati:** faqat `src/server/video/bunny.ts` almashtiriladi.

---

## 11. Xavfsizlik

**Nima qilingan**

- Parollar **argon2id** bilan hash’lanadi; ochiq ko‘rinishda hech qayerda saqlanmaydi va jurnalga yozilmaydi.
- Sessiyalar bazada; cookie `httpOnly`, `secure`, `sameSite=lax`, production’da `__Host-` prefiksi bilan.
  Cookie’da tasodifiy token, bazada faqat uning hash’i.
- **Brute-force:** bitta login bo‘yicha 5 ta xato urinishdan keyin 15 daqiqa blok; bitta IP’dan juda ko‘p xato bo‘lsa — IP cheklanadi.
- Har bir sahifa, Server Action va API **server tomonida** rol va ruxsatni tekshiradi (`src/server/auth/guards.ts`).
- Bitta akkaunt bir vaqtda ko‘pi bilan 2 qurilmada. 3-qurilma kirsa, eng eski sessiya chiqariladi.
- Parol o‘zgarsa yoki tiklansa, boshqa barcha sessiyalar tugaydi. Bloklangan o‘quvchi darhol chiqariladi.
- Video: har so‘rovda ruxsat tekshiriladi, havola imzolangan va muddatli; ustida watermark.
- Kiruvchi ma’lumotlar **Zod** bilan tekshiriladi; baza so‘rovlari parametrli (SQL injection yo‘q);
  CSRF — origin tekshiruvi; XSS — React + qat’iy CSP (har so‘rovda yangi nonce).
- Header’lar: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- Fayl yuklash: tur fayl ichidagi baytlar bo‘yicha aniqlanadi (PDF/audio), hajm 50 MB gacha, nomi serverda yaratiladi.
- Admin harakatlari jurnali: `/admin/jurnal`.
- Kirishdan keyin oldingi sahifaga qaytish (`/kirish?next=...`) faqat foydalanuvchining o‘z bo‘limi
  (`/kabinet` yoki `/admin`) ichidagi manzillarga ishlaydi — begona saytga yo‘naltirib bo‘lmaydi.

**Sizdan talab qilinadigan narsalar**

- `.env` faylini hech kimga bermang va GitHub’ga yuklamang (u `.gitignore` da).
- Admin paroli uzun va noyob bo‘lsin.
- Serverni yangilab turing: `apt update && apt upgrade`.
- Zaxira nusxalarni muntazam oling va boshqa joyda saqlang.

**Bilib qo‘ying**

- Login bo‘yicha blok tufayli kimdir o‘quvchining loginini bilsa, ataylab xato parol kiritib uni 15 daqiqaga
  bloklab qo‘yishi mumkin. Bunday holda o‘quvchi sahifasida **Parolni tiklash** blokni ham yechadi.
- Sayt proxy (Caddy/Nginx/Vercel) ortida ishlashi kerak — mijoz IP’si `X-Real-IP` sarlavhasidan olinadi.
  Loyihadagi `Caddyfile` buni to‘g‘ri sozlaydi.

---

## 12. Loyiha tuzilmasi

```
prisma/              baza sxemasi (schema.prisma), migratsiyalar, seed.ts (birinchi admin)
messages/uz/         barcha matnlar (tarjima fayllari)
src/
  app/
    (public)/        bosh sahifa, aloqa
    (auth)/          kirish, parol yangilash
    (student)/       o‘quvchi kabineti: kurslar, dars, profil
    admin/           admin panel
    api/             video havolasi, progress, materiallar
  components/        ui/ (umumiy), admin/, student/, site/, auth/
  server/
    auth/            parol, sessiya, rate-limit, login, ruxsat tekshiruvi
    actions/         Server Action’lar (auth, admin, student, public)
    services/        o‘quvchilar, kurslar, o‘qish jarayoni, audit, Telegram
    video/           Bunny Stream
    storage/         materiallar ombori
  lib/               umumiy yordamchi funksiyalar va Zod sxemalar
  config/            markaz ma’lumotlari va bosh sahifa kontenti
  proxy.ts           CSP va yopiq sahifalar uchun dastlabki tekshiruv
tests/               avtomatik testlar
Dockerfile, docker-compose.yml, Caddyfile, scripts/backup.sh
```

---

## 13. Tez-tez uchraydigan muammolar

| Muammo | Yechim |
|---|---|
| Login qilganda yana login sahifasi chiqadi (production) | Sayt HTTPS orqali ochilmagan. Domen va sertifikatni tekshiring. |
| “Video xizmati hali ulanmagan” | `.env` da `BUNNY_STREAM_*` to‘rtalasi ham to‘ldirilmagan. To‘ldirib, saytni qayta ishga tushiring. |
| Video yuklandi, lekin “qayta ishlanmoqda” da qolib ketdi | Bunny videoni kodlamoqda (uzun video 10–30 daqiqa olishi mumkin). “Holatni tekshirish” ni bosing. |
| Pleyer “Videoni yuklab bo‘lmadi” deydi | Bunny’da Token Authentication yoqilganini, `BUNNY_STREAM_TOKEN_KEY` to‘g‘riligini va “Block direct URL file access” o‘chiqligini tekshiring. |
| O‘quvchi “juda ko‘p xato urinish” xabarini ko‘rdi | 15 daqiqa kutadi yoki siz **Parolni tiklash** ni bosasiz. |
| Telegram’ga xabar kelmayapti | Botga `/start` yozilganmi? `TELEGRAM_CHAT_ID` to‘g‘rimi? `docker compose logs app` da `[telegram]` qatorini qidiring. |
| Admin parolini unutdingiz | Serverda: `docker compose exec db psql -U admire admire -c "DELETE FROM \"User\" WHERE role='ADMIN'"`, keyin 5-bo‘limdagi seed buyrug‘i. |
| `.env` dagi xato haqida xabar chiqdi | Xabar qaysi qiymat noto‘g‘riligini aytadi — o‘sha qatorni tuzating. |
