/**
 * Bosh sahifadagi kontentning BOSHLANG'ICH (namunaviy) qiymatlari: ustozlar, natijalar, fikrlar, FAQ.
 * Haqiqiy ma'lumotlar admin panelning "Sayt kontenti" bo'limida kiritiladi va bazada saqlanadi —
 * bu fayl faqat admin hali hech narsa saqlamagan bo'limlar uchun ishlatiladi.
 */

export const stats = [
  { value: "500+", label: "bitiruvchi" },
  { value: "7.0", label: "o‘rtacha band score" },
  { value: "8 yil", label: "tajriba" },
  { value: "120+", label: "video dars" },
];

export const teachers = [
  { name: "Ustoz ismi", role: "Writing va Speaking", score: "IELTS 8.5", bio: "10 yillik tajriba. IELTS imtihon mezonlari bo‘yicha mutaxassis." },
  { name: "Ustoz ismi", role: "Listening va Reading", score: "IELTS 8.0", bio: "300 dan ortiq o‘quvchini 7.0+ natijaga olib chiqqan." },
  { name: "Ustoz ismi", role: "Grammar va Vocabulary", score: "IELTS 8.0", bio: "Murakkab mavzularni sodda tilda tushuntirish ustasi." },
];

export const results = [
  { name: "O‘quvchi ismi", score: "8.0", detail: "L 8.5 · R 8.5 · W 7.0 · S 7.5" },
  { name: "O‘quvchi ismi", score: "7.5", detail: "L 8.0 · R 8.0 · W 6.5 · S 7.0" },
  { name: "O‘quvchi ismi", score: "7.5", detail: "L 7.5 · R 8.0 · W 7.0 · S 7.0" },
  { name: "O‘quvchi ismi", score: "7.0", detail: "L 7.5 · R 7.0 · W 6.5 · S 7.0" },
];

export const testimonials = [
  { name: "O‘quvchi ismi", meta: "IELTS 7.5", text: "Video darslarni ishdan keyin, o‘zimga qulay vaqtda ko‘rdim. Writing bo‘yicha tushuntirishlar ayniqsa foydali bo‘ldi." },
  { name: "O‘quvchi ismi", meta: "IELTS 7.0", text: "Har bir dars qisqa va aniq. Progress foizini ko‘rib turish to‘xtab qolmaslikka yordam berdi." },
  { name: "O‘quvchi ismi", meta: "IELTS 8.0", text: "Listening strategiyalari natijamni 6.5 dan 8.5 ga ko‘tardi. Materiallarni yuklab olib, yo‘lda ham shug‘ullandim." },
];

export const faq = [
  { q: "Onlayn kursga qanday yozilaman?", a: "Saytdagi “Kursga yozilish” formasini to‘ldiring yoki bizga qo‘ng‘iroq qiling. Administrator siz bilan bog‘lanib, darajangizni aniqlaydi va login-parol beradi." },
  { q: "Saytda ro‘yxatdan o‘tish bormi?", a: "Yo‘q. Login va parolni faqat markaz beradi — bu darslarning sifati va xavfsizligi uchun." },
  { q: "Darslarni telefondan ko‘rsa bo‘ladimi?", a: "Ha. Sayt telefon, planshet va kompyuterda birdek qulay ishlaydi. Video tezligi va sifatini o‘zingiz tanlaysiz." },
  { q: "Bitta akkauntdan necha kishi foydalana oladi?", a: "Akkaunt shaxsiy. Bir vaqtda ko‘pi bilan ikkita qurilmada (masalan, telefon va noutbuk) ochiq turishi mumkin." },
  { q: "Kursga kirish muddati qancha?", a: "Muddat tanlangan kursga bog‘liq (odatda 3 oy). Muddat tugasa, progressingiz saqlanadi va uni uzaytirish mumkin." },
  { q: "Darslar bilan birga materiallar ham beriladimi?", a: "Ha. Har bir darsga PDF va audio materiallar biriktirilgan, ularni yuklab olishingiz mumkin." },
];
