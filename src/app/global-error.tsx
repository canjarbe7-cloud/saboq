"use client";

/** Eng yuqori darajadagi xato (layout ham ishlamay qolganda). Uslublar inline — CSS yuklanmasligi mumkin. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="uz">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>Nimadir xato ketdi</h1>
          <p style={{ color: "#5d6481" }}>Sahifani qayta yuklab ko‘ring.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 12, border: 0, background: "#4338ca", color: "#fff", fontWeight: 700, fontSize: 16 }}>
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
