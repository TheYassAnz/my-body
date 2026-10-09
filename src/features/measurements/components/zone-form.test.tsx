// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import type { SheetData } from "../summary";

const saveZoneAction = vi.hoisted(() => vi.fn());
vi.mock("../actions", () => ({ saveZoneAction }));

import { ZoneForm } from "./zone-form";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const DATA: SheetData = {
  label: "Taille",
  protocol: "Au niveau du nombril, ventre relâché.",
  prefill: "84,5",
  previousText: "Précédente : 84,5 cm · il y a 7 j",
};
const renderForm = (data = DATA, onSaved = vi.fn(), unit: "cm" | "in" = "cm") => {
  render(
    <ToastProvider>
      <ZoneForm zone="waist" unit={unit} today="2026-10-03" data={data} onSaved={onSaved} />
    </ToastProvider>,
  );
  return onSaved;
};

describe("ZoneForm", () => {
  it("shows the previous value, the protocol, today's date and a pre-filled value", () => {
    renderForm();
    expect(screen.getByText("Précédente : 84,5 cm · il y a 7 j")).toBeTruthy();
    expect(screen.getByText(/Au niveau du nombril/)).toBeTruthy();
    expect(screen.getByLabelText("Date")).toHaveProperty("value", "2026-10-03");
    expect(screen.getByLabelText("Date").getAttribute("max")).toBe("2026-10-03");
    expect(screen.getByLabelText("Mesure")).toHaveProperty("value", "84,5");
  });

  it("starts empty for a zone never measured", () => {
    renderForm({ ...DATA, prefill: null, previousText: null });
    expect(screen.getByLabelText("Mesure")).toHaveProperty("value", "");
    expect(screen.queryByText(/Précédente/)).toBeNull();
  });

  it("sends the zone and the unit with the value", async () => {
    saveZoneAction.mockResolvedValue({ ok: true });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(saveZoneAction).toHaveBeenCalled());
    const fd = saveZoneAction.mock.calls[0][1] as FormData;
    expect([fd.get("zone"), fd.get("unit"), fd.get("value"), fd.get("date")]).toEqual([
      "waist",
      "cm",
      "84,5",
      "2026-10-03",
    ]);
  });

  it("closes with a toast once saved", async () => {
    saveZoneAction.mockResolvedValue({ ok: true });
    const onSaved = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(screen.getByText("Mesure enregistrée")).toBeTruthy();
  });

  it("asks for confirmation and resubmits with it", async () => {
    saveZoneAction
      .mockResolvedValueOnce({
        ok: false,
        needsConfirmation: { reason: "replace", message: "Remplacer 84,5 cm par 83,9 cm ?" },
        values: { date: "2026-10-03", zone: "waist", value: "83,9", unit: "cm", confirmed: "" },
      })
      .mockResolvedValueOnce({ ok: true });
    const onSaved = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Remplacer 84,5 cm par 83,9 cm/);
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const fd = saveZoneAction.mock.calls[1][1] as FormData;
    expect(fd.get("confirm")).toBe("replace");
  });

  it("shows the field error of the server", async () => {
    saveZoneAction.mockResolvedValue({
      ok: false,
      fieldErrors: { value: ["Mesure entre 10 et 250 cm"] },
      values: { date: "2026-10-03", zone: "waist", value: "5", unit: "cm" },
    });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Mesure entre 10 et 250 cm")).toBeTruthy();
  });

  it("voids the confirmation when the value is edited", async () => {
    saveZoneAction
      .mockResolvedValueOnce({
        ok: false,
        needsConfirmation: { reason: "replace", message: "Remplacer 84,5 cm par 83,9 cm ?" },
        values: {
          date: "2026-10-03",
          zone: "waist",
          value: "83,9",
          unit: "cm",
          confirmed: "replace",
        },
      })
      .mockResolvedValueOnce({ ok: true });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByRole("button", { name: "Confirmer" });
    fireEvent.change(screen.getByLabelText("Mesure"), { target: { value: "82,0" } });
    expect(screen.queryByRole("button", { name: "Confirmer" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(saveZoneAction).toHaveBeenCalledTimes(2));
    const fd = saveZoneAction.mock.calls[1][1] as FormData;
    expect([fd.get("confirmed"), fd.get("confirm")]).toEqual(["", null]);
  });

  it("shows a form-level error", async () => {
    saveZoneAction.mockResolvedValue({
      ok: false,
      formError: "Impossible d'enregistrer",
      values: { date: "2026-10-03", zone: "waist", value: "84,5", unit: "cm" },
    });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Impossible d'enregistrer");
  });

  it("pre-fills in inches for an imperial profile", () => {
    renderForm({ ...DATA, prefill: "33,3" }, vi.fn(), "in");
    expect(screen.getByLabelText("Mesure")).toHaveProperty("value", "33,3");
  });
});
