import { HomeHeader } from "@/features/dashboard/components/home-header";
import { WeightBlock } from "@/features/dashboard/components/weight-block";
import { getDashboard } from "@/features/dashboard/queries";
import { GoalBlock } from "@/features/goals/components/goal-block";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { userId, profile } = await requireUser("app");
  const { email } = await searchParams;
  const unit = profile?.weightUnit ?? "kg";
  const todayDate = today(profile?.timezone ?? "Europe/Paris");
  const { weight, goal, rateTone } = await getDashboard(getDb(), userId, todayDate);

  return (
    <>
      <HomeHeader date={todayDate} />
      {email === "verifie" && (
        <p role="status" className="mt-3 text-sm text-positive">
          Email confirmé.
        </p>
      )}
      <WeightBlock summary={weight} unit={unit} rateTone={rateTone} />
      <GoalBlock summary={goal} unit={unit} today={todayDate} />
    </>
  );
}
