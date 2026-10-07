// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import type { WeightSheetDefaults } from "./weight-sheet-provider";

const saveWeightAction = vi.hoisted(() => vi.fn());
vi.mock("../actions", () => ({ saveWeightAction }));

import { WeightForm } from "./weight-form";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const DEFAULTS: WeightSheetDefaults = { today: "2026-10-03", lastWeightKg: 78.4, unit: "kg" };
const renderForm = (defaults = DEFAULTS, onSaved = vi.fn()) => {
  render(
    <ToastProvider>
      <WeightForm defaults={defaults} onSaved={onSaved} />
    </ToastProvider>,
  );
  return onSaved;
};

describe("WeightForm", () => {
  it("pre-fills today and the last weighing in the display unit", () => {
    renderForm({ ...DEFAULTS, unit: "lb" });
    expect(screen.getByLabelText("Poids")).toHaveProperty("value", "172,8");
    expect(screen.getByLabelText("Date")).toHaveProperty("value", "2026-10-03");
    expect(screen.getByLabelText("Date").getAttribute("max")).toBe("2026-10-03");
  });

  it("starts empty for an account without any weighing", () => {
    renderForm({ ...DEFAULTS, lastWeightKg: null });
    expect(screen.getByLabelText("Poids")).toHaveProperty("value", "");
  });

  it("asks for confirmation, resubmits with it, then closes with a toast", async () => {
    saveWeightAction
      .mockResolvedValueOnce({
        ok: false,
        needsConfirmation: { reason: "replace", message: "Remplacer 78,2 kg par 78,4 kg ?" },
        values: {
          date: "2026-10-03",
          weight: "78,4",
          unit: "kg",
          bodyFat: "",
          note: "",
          confirmed: "",
        },
      })
      .mockResolvedValueOnce({ ok: true });
    const onSaved = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Remplacer 78,2 kg par 78,4 kg ?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const second = saveWeightAction.mock.calls[1][1] as FormData;
    expect(second.get("confirm")).toBe("replace");
    expect(second.get("weight")).toBe("78,4");
    expect(second.get("unit")).toBe("kg");
    expect(screen.getByRole("status").textContent).toBe("Pesée enregistrée");
  });

  it.each([
    ["weight", () => fireEvent.change(screen.getByLabelText("Poids"), { target: { value: "40" } })],
    [
      "date",
      () => fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-10-01" } }),
    ],
  ])("voids the confirmation when the %s is edited", async (_field, edit) => {
    saveWeightAction.mockResolvedValueOnce({
      ok: false,
      needsConfirmation: { reason: "suspicious", message: "Écart de 17 kg, confirmer ?" },
      values: {
        date: "2026-10-03",
        weight: "95",
        unit: "kg",
        bodyFat: "",
        note: "",
        confirmed: "replace",
      },
    });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("button", { name: "Confirmer" })).toBeTruthy();

    edit();

    expect(screen.queryByRole("button", { name: "Confirmer" })).toBeNull();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeTruthy();
    expect(document.querySelector<HTMLInputElement>("input[name=confirmed]")?.value).toBe("");
  });

  it("shows field errors returned by the server", async () => {
    saveWeightAction.mockResolvedValueOnce({
      ok: false,
      fieldErrors: { weight: ["Poids entre 20 et 400 kg"] },
      values: { date: "2026-10-03", weight: "10", unit: "kg", bodyFat: "", note: "" },
    });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Poids entre 20 et 400 kg")).toBeTruthy();
  });

  it("appends note suggestions", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "sel" }));
    fireEvent.click(screen.getByRole("button", { name: "resto" }));
    expect(screen.getByLabelText("Note (optionnel)")).toHaveProperty("value", "sel, resto");
  });
});
