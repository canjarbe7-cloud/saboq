"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { logoutOtherDevicesAction } from "@/server/actions/student";

export function LogoutOthersButton() {
  const t = useTranslations("student.profile");
  const { run, pending, error } = useAction(logoutOtherDevicesAction);
  return (
    <>
      {error && <Alert>{error}</Alert>}
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run({})}>
        {t("logoutOthers")}
      </Button>
    </>
  );
}
