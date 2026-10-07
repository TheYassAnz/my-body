"use client";

import { Button } from "@/components/ui/button";
import { useOpenWeightSheet } from "./weight-sheet-provider";

export function NewWeightButton({
  className = "",
  label = "+ Nouvelle pesée",
}: {
  className?: string;
  label?: string;
}) {
  const open = useOpenWeightSheet();
  return (
    <Button type="button" onClick={open} className={className}>
      {label}
    </Button>
  );
}
