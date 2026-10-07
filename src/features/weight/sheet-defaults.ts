import "server-only";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import type { CurrentUser } from "@/lib/session";
import { getLatestWeight } from "./queries";
import type { WeightSheetDefaults } from "./components/weight-sheet-provider";

/** Defaults of the "Nouvelle pesée" sheet; null until onboarding is completed (saving requires it). */
export async function getWeightSheetDefaults(
  user: CurrentUser,
): Promise<WeightSheetDefaults | null> {
  if (!user.profile?.onboardingCompletedAt) return null;
  const latest = await getLatestWeight(getDb(), user.userId);
  return {
    today: today(user.profile.timezone ?? "Europe/Paris"),
    // EF-WGT-01 CA3: pre-filled with the last weighing (the onboarding one at first).
    lastWeightKg: latest?.weightKg ?? null,
    unit: user.profile.weightUnit ?? "kg",
  };
}
