"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/actions/helpers";

/**
 * Server Action'ni chaqirish uchun yordamchi: "kutish" holati, xato matni
 * va muvaffaqiyatdan keyin sahifa ma'lumotlarini yangilash.
 */
export function useAction<I, R>(
  action: (input: I) => Promise<ActionResult<R>>,
  opts: { onSuccess?: (data: R) => void; refresh?: boolean } = {},
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { onSuccess, refresh = true } = opts;

  const run = useCallback(
    (input: I) => {
      setError(null);
      startTransition(async () => {
        try {
          const res = await action(input);
          if (res.ok) {
            onSuccess?.(res.data);
            if (refresh) router.refresh();
          } else setError(res.error);
        } catch {
          setError("Server bilan bog‘lanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.");
        }
      });
    },
    [action, onSuccess, refresh, router],
  );

  return { run, pending, error, clearError: () => setError(null) };
}
