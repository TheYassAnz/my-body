// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZONES } from "@/lib/metrics";
import { ZONE_LABELS, PROTOCOLS } from "../copy";
import type { SessionZone } from "../summary";

const saveSessionZoneAction = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
vi.mock("../actions", () => ({ saveSessionZoneAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { MeasureSession } from "./measure-session";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const zones = (
  over: Partial<Record<(typeof ZONES)[number], Partial<SessionZone>>> = {},
): SessionZone[] =>
  ZONES.map((zone) => ({
    zone,
    label: ZONE_LABELS[zone],
    protocol: PROTOCOLS[zone],
    previousCm: null,
    previousText: null,
    todayCm: null,
    prefill: "",
    ...over[zone],
  }));
const renderSession = (props: Partial<Parameters<typeof MeasureSession>[0]> = {}) =>
  render(
    <MeasureSession
      sex="male"
      unit="cm"
      goal="lose"
      zones={zones()}
      startIndex={0}
      intro={false}
      {...props}
    />,
  );
const type = (value: string) =>
  fireEvent.change(screen.getByLabelText("Mesure"), { target: { value } });
const next = () => fireEvent.click(screen.getByRole("button", { name: /Zone suivante/ }));

describe("MeasureSession", () => {
  it("shows the general rules first for a first-time user, then the first zone", () => {
    renderSession({ intro: true });
    expect(screen.getByText(/ruban souple non extensible/i)).toBeTruthy();
    expect(screen.queryByLabelText("Mesure")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    expect(screen.getByText("1 / 8")).toBeTruthy();
    expect(screen.getByLabelText("Mesure")).toBeTruthy();
  });

  it("shows the zone, its previous value, the protocol and the progress", () => {
    renderSession({
      zones: zones({
        neck: {
          previousCm: 38,
          previousText: "Précédente : 38,0 cm · il y a 7 j",
          prefill: "38,0",
        },
      }),
    });
    expect(screen.getByRole("heading", { name: "Cou" })).toBeTruthy();
    expect(screen.getByText("Précédente : 38,0 cm · il y a 7 j")).toBeTruthy();
    expect(screen.getByText(/Juste sous la pomme d'Adam/)).toBeTruthy();
    expect(screen.getByLabelText("Mesure")).toHaveProperty("value", "38,0");
    expect(screen.getByText("1 / 8")).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("1");
    expect(bar.getAttribute("aria-valuemax")).toBe("8");
    expect(screen.getByRole("link", { name: /Quitter/ }).getAttribute("href")).toBe("/corps");
  });

  it("starts at the given zone (resuming a session)", () => {
    renderSession({ startIndex: 1 });
    expect(screen.getByText("2 / 8")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Épaules" })).toBeTruthy();
  });

  it("saves the zone when moving to the next one", async () => {
    saveSessionZoneAction.mockResolvedValue({ ok: true });
    renderSession();
    type("38,2");
    next();
    await waitFor(() => expect(screen.getByText("2 / 8")).toBeTruthy());
    const fd = saveSessionZoneAction.mock.calls[0][1] as FormData;
    expect([fd.get("zone"), fd.get("value"), fd.get("unit")]).toEqual(["neck", "38,2", "cm"]);
  });

  it("skips a zone without saving anything", () => {
    renderSession();
    fireEvent.click(screen.getByRole("button", { name: "Passer cette zone" }));
    expect(saveSessionZoneAction).not.toHaveBeenCalled();
    expect(screen.getByText("2 / 8")).toBeTruthy();
  });

  it("treats an emptied field as skipping", () => {
    renderSession({ zones: zones({ neck: { prefill: "38,0" } }) });
    type("");
    next();
    expect(saveSessionZoneAction).not.toHaveBeenCalled();
    expect(screen.getByText("2 / 8")).toBeTruthy();
  });

  it("goes back to the previous zone", () => {
    renderSession({ startIndex: 2 });
    fireEvent.click(screen.getByRole("button", { name: /Zone précédente/ }));
    expect(screen.getByText("2 / 8")).toBeTruthy();
  });

  it("has no previous zone before the first one", () => {
    renderSession();
    expect(screen.getByRole("button", { name: /Zone précédente/ })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("stays on the zone and shows the error when saving fails", async () => {
    saveSessionZoneAction.mockResolvedValue({
      ok: false,
      fieldErrors: { value: ["Mesure entre 10 et 250 cm"] },
    });
    renderSession();
    type("5");
    next();
    expect(await screen.findByText("Mesure entre 10 et 250 cm")).toBeTruthy();
    expect(screen.getByText("1 / 8")).toBeTruthy();
  });

  it("shows the recap after the last zone, with the delta against the previous measure", async () => {
    saveSessionZoneAction.mockResolvedValue({ ok: true });
    renderSession({
      startIndex: 7,
      zones: zones({
        waist: { previousCm: 86, todayCm: 84.5, prefill: "84,5" },
        calf: { previousCm: 38, prefill: "38,0" },
        neck: { todayCm: 38.2, prefill: "38,2" }, // never measured before
      }),
    });
    type("36,5");
    next();
    expect(await screen.findByRole("heading", { name: "Récapitulatif" })).toBeTruthy();
    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows.some((t) => /Taille.*84,5.cm.*−1,5.cm/.test(t ?? ""))).toBe(true);
    expect(rows.some((t) => /Mollet.*36,5.cm.*−1,5.cm/.test(t ?? ""))).toBe(true);
    expect(rows.some((t) => /Cou.*38,2.cm.*première mesure/.test(t ?? ""))).toBe(true);
    expect(rows.some((t) => /Épaules/.test(t ?? ""))).toBe(false); // nothing measured
  });

  it("leaves for the Corps screen with 'Terminer'", async () => {
    saveSessionZoneAction.mockResolvedValue({ ok: true });
    renderSession({ startIndex: 7 });
    type("36,5");
    next();
    fireEvent.click(await screen.findByRole("button", { name: "Terminer" }));
    expect(push).toHaveBeenCalledWith("/corps");
  });

  it("highlights the current zone on the silhouette", () => {
    const { container } = renderSession({ startIndex: 4 });
    expect(container.querySelector('rect[data-highlight="waist"]')).toBeTruthy();
  });
});
