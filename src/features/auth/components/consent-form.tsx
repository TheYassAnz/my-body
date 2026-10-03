"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { acceptConsentsAction } from "../actions";
import { ConsentCheckboxes } from "./consent-checkboxes";
import { FormError } from "./form-error";

export function ConsentForm() {
  const [state, action, pending] = useActionState(acceptConsentsAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <ConsentCheckboxes state={state} />
      <FormError state={state} />
      <Button type="submit" loading={pending} className="w-full">
        Continuer
      </Button>
    </form>
  );
}
