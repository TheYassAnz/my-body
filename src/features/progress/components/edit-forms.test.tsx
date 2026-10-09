// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { parseDecimal, toStoredCm, toStoredKg } from "@/lib/units";
import { exactLengthInput, exactWeightInput, type HistoryItem } from "../history-rows";

const a = vi.hoisted(() => ({
  updateWeightAction: vi.fn(),
  updateMeasureAction: vi.fn(),
  deleteWeightAction: vi.fn(),
  deleteMeasureAction: vi.fn(),
  restoreWeightAction: vi.fn(),
  restoreMeasureAction: vi.fn(),
}));
vi.mock("../actions", () => a);

import { HistoryList } from "./history-list";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const weighing = (date: string, weightKg = 78.45): HistoryItem => ({
  kind: "weight",
  date,
  label: "x",
  weightKg,
  bodyFatPct: 21.5,
  note: "Matin",
});
const measure: HistoryItem = {
  kind: "measure",
  date: "2026-10-01",
  zone: "waist",
  label: "84,0 cm",
  valueCm: 84,
};
const renderList = (items: HistoryItem[], extra: { moreHref?: string; unit?: "kg" | "lb" } = {}) =>
  render(
    <ToastProvider>
      <HistoryList
        items={items}
        moreHref={extra.moreHref ?? null}
        today="2026-10-09"
        weightUnit={extra.unit ?? "kg"}
        lengthUnit="cm"
      />
    </ToastProvider>,
  );

describe("HistoryList", () => {
  it("shows rows as 44px buttons and a plain 'Charger plus' link", () => {
    const items = Array.from({ length: 50 }, (_, i) =>
      weighing(
        `2026-${String(1 + Math.floor(i / 28)).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      ),
    );
    renderList(items, { moreHref: "/progres?n=100" });
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(50);
    expect(buttons[0].className).toContain("min-h-11");
    expect(screen.getByRole("link", { name: "Charger plus" }).getAttribute("href")).toBe(
      "/progres?n=100",
    );
  });

  it("opens a weighing prefilled in pounds", () => {
    renderList([weighing("2026-10-01", 78.4)], { unit: "lb" });
    fireEvent.click(screen.getByRole("button", { name: /Matin/ }));
    expect(screen.getByLabelText("Poids")).toHaveProperty("value", "172,8");
    expect(screen.getByLabelText("Date")).toHaveProperty("value", "2026-10-01");
    expect(screen.getByLabelText("% masse grasse (optionnel)")).toHaveProperty("value", "21,5");
    expect(screen.getByLabelText("Note (optionnel)")).toHaveProperty("value", "Matin");
  });

  it("sends the exact stored weight when untouched, the typed one otherwise", () => {
    renderList([weighing("2026-10-01", 78.45)], { unit: "lb" });
    fireEvent.click(screen.getByRole("button", { name: /Matin/ }));
    const hidden = () => document.querySelector<HTMLInputElement>('input[name="weight"]')!;
    expect(toStoredKg(parseDecimal(hidden().value), "lb")).toBe(78.45);
    fireEvent.change(screen.getByLabelText("Poids"), { target: { value: "170,0" } });
    expect(hidden().value).toBe("170,0");
  });

  it("shows the replace confirmation returned by the action", async () => {
    a.updateWeightAction.mockResolvedValue({
      ok: false,
      needsConfirmation: { reason: "replace", message: "Tu as déjà une pesée ce jour-là." },
      values: { confirmed: "" },
    });
    renderList([weighing("2026-10-01")]);
    fireEvent.click(screen.getByRole("button", { name: /Matin/ }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Tu as déjà une pesée ce jour-là.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeTruthy();
  });

  it("deletes after confirmation, then the toast undo restores the deleted payload", async () => {
    const deleted = { date: "2026-10-01", weightKg: 78.45, bodyFatPct: 21.5, note: "Matin" };
    a.deleteWeightAction.mockResolvedValue({ ok: true, deleted });
    a.restoreWeightAction.mockResolvedValue({ ok: true });
    renderList([weighing("2026-10-01")]);
    fireEvent.click(screen.getByRole("button", { name: /Matin/ }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(a.deleteWeightAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmer la suppression" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("Pesée supprimée"),
    );
    expect(a.deleteWeightAction).toHaveBeenCalledWith("2026-10-01");
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(a.restoreWeightAction).toHaveBeenCalledWith(deleted);
  });

  it("moves focus to the confirm button, then back to Supprimer on Garder", () => {
    renderList([weighing("2026-10-01")]);
    fireEvent.click(screen.getByRole("button", { name: /Matin/ }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Confirmer la suppression" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Garder" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Supprimer" }));
  });

  it("measure sheet exposes the value only", () => {
    renderList([measure]);
    fireEvent.click(screen.getByRole("button", { name: /84,0 cm/ }));
    expect(screen.getByLabelText("Mesure")).toHaveProperty("value", "84,0");
    expect(screen.queryByLabelText("Date")).toBeNull();
    expect(document.querySelector('input[name="zone"]')).toHaveProperty("type", "hidden");
  });
});

describe("unchanged round trip (Review Focus 7)", () => {
  it("keeps the stored value for kg and lb, 1 and 2 decimals", () => {
    for (let i = 0; i < 4000; i++) {
      const kg = Math.round((20 + i * 0.095) * 100) / 100; // 2-decimal values 20 to 400
      for (const unit of ["kg", "lb"] as const) {
        expect(toStoredKg(parseDecimal(exactWeightInput(kg, unit)), unit)).toBe(kg);
      }
    }
    for (let cm = 100; cm < 3000; cm += 1) {
      const v = cm / 10;
      for (const unit of ["cm", "in"] as const) {
        expect(toStoredCm(parseDecimal(exactLengthInput(v, unit)), unit)).toBe(v);
      }
    }
  });
});
