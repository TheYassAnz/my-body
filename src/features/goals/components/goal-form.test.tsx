// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { GoalForm } from "./goal-form";

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof GoalForm>[0]> = {}) =>
  render(
    <ToastProvider>
      <GoalForm
        action={vi.fn(async () => ({ ok: true as const }))}
        unit="kg"
        referenceKg={78}
        today="2026-10-07"
        active={null}
        submitLabel="Enregistrer"
        {...over}
      />
    </ToastProvider>,
  );

describe("GoalForm", () => {
  it("offers the four goal types and shows the current trend read-only", () => {
    setup();
    for (const name of [/Perdre du poids/, /Prendre du poids/, /Recomposition/, /Maintien/]) {
      expect(screen.getByRole("radio", { name })).toBeTruthy();
    }
    const trend = screen.getByLabelText("Actuel (tendance)") as HTMLInputElement;
    expect(trend.value).toBe("78,0");
    expect(trend.hasAttribute("readonly")).toBe(true);
  });

  it("hides target and rate for a maintenance goal", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /Maintien/ }));
    expect(screen.queryByLabelText("Cible")).toBeNull();
    expect(screen.queryByLabelText(/Rythme/)).toBeNull();
  });

  it("previews the weekly pace and the theoretical date", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Cible"), { target: { value: "74" } });
    // 0.5 % × 78 kg = 0.39 kg/week; 4 kg / 0.39 × 7 = 72 days from 2026-10-07 → 2026-12-18
    expect(screen.getByText(/≈ 0,39 kg\/sem · atteinte vers le 18 déc\./)).toBeTruthy();
  });

  it("shows the aggressive-pace alert past the recommended zone", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/Rythme/), { target: { value: "1.25" } });
    expect(screen.getByText(/Rythme agressif/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Rythme/), { target: { value: "0.75" } });
    expect(screen.queryByText(/Rythme agressif/)).toBeNull();
  });

  it("resets the rate to the default of the new type", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /Prendre du poids/ }));
    expect((screen.getByLabelText(/Rythme/) as HTMLInputElement).value).toBe("0.25");
  });

  it("asks to confirm an archive, with a Confirmer button carrying the reason", async () => {
    const action = vi.fn(async () => ({
      ok: false as const,
      needsConfirmation: {
        reason: "archive" as const,
        message: "Changer d'objectif archive « Perdre du poids ». Continuer ?",
      },
      values: { type: "gain", target: "85", rate: "0.25", unit: "kg", confirmed: "" },
    }));
    setup({ action, active: { type: "lose", targetKg: 74, weeklyRatePct: 0.5 } });
    fireEvent.click(screen.getByRole("radio", { name: /Prendre du poids/ }));
    fireEvent.change(screen.getByLabelText("Cible"), { target: { value: "85" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("archive");
    expect(screen.getByRole("button", { name: "Confirmer" }).getAttribute("value")).toBe("archive");
  });
});
