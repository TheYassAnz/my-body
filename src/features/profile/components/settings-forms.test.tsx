// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../settings-actions", () => ({
  saveProfileSettingsAction: vi.fn(),
  saveUnitsAction: vi.fn(),
  saveReminderWeekdayAction: vi.fn(),
}));

import {
  saveProfileSettingsAction,
  saveReminderWeekdayAction,
  saveUnitsAction,
} from "../settings-actions";
import { ProfileSettingsForm } from "./profile-settings-form";
import { ReminderSettingsForm } from "./reminder-settings-form";
import { UnitsSettingsForm } from "./units-settings-form";

afterEach(cleanup);

describe("settings forms", () => {
  it("profile: checks the current sex and shows the height in the display unit", () => {
    render(
      <ProfileSettingsForm
        defaults={{ sex: "male", heightCm: 167.6, birthDate: "1990-04-12", lengthUnit: "in" }}
      />,
    );

    expect((screen.getByLabelText("Homme") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Femme") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("Taille (in)") as HTMLInputElement).value).toBe("66,0");
    expect((screen.getByLabelText("Date de naissance") as HTMLInputElement).value).toBe(
      "1990-04-12",
    );
  });

  it("profile: tolerates a profile without height or birth date", () => {
    render(
      <ProfileSettingsForm
        defaults={{ sex: "female", heightCm: null, birthDate: null, lengthUnit: "cm" }}
      />,
    );

    expect((screen.getByLabelText("Taille (cm)") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Date de naissance") as HTMLInputElement).value).toBe("");
  });

  it("units: checks the current units", () => {
    render(<UnitsSettingsForm defaults={{ weightUnit: "lb", lengthUnit: "cm" }} />);

    expect((screen.getByLabelText("lb") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("kg") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("cm") as HTMLInputElement).checked).toBe(true);
  });

  it("reminder: offers none and the seven days, and selects the current one", () => {
    render(<ReminderSettingsForm defaults={{ weekday: 0 }} />);

    const select = screen.getByLabelText("Jour de mesure conseillé");
    expect((select as HTMLSelectElement).value).toBe("0");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Aucun",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ]);
  });

  it("reminder: 'none' is selected when no day is set", () => {
    render(<ReminderSettingsForm defaults={{ weekday: null }} />);
    expect((screen.getByLabelText("Jour de mesure conseillé") as HTMLSelectElement).value).toBe(
      "none",
    );
  });

  it.each([
    [
      "Unités",
      "Unités enregistrées",
      saveUnitsAction,
      <UnitsSettingsForm key="u" defaults={{ weightUnit: "kg", lengthUnit: "cm" }} />,
    ],
    [
      "Jour de mesure",
      "Jour de mesure enregistré",
      saveReminderWeekdayAction,
      <ReminderSettingsForm key="r" defaults={{ weekday: null }} />,
    ],
    [
      "Profil",
      "Profil enregistré",
      saveProfileSettingsAction,
      <ProfileSettingsForm
        key="p"
        defaults={{ sex: "male", heightCm: null, birthDate: null, lengthUnit: "cm" }}
      />,
    ],
  ])("%s: shows a toast after a successful save", async (name, message, action, form) => {
    vi.mocked(action).mockResolvedValue({ ok: true });
    render(<ToastProvider>{form}</ToastProvider>);

    fireEvent.submit(screen.getByRole("form", { name }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain(message));
  });

  it("profile: links a field error to the radio group", async () => {
    vi.mocked(saveProfileSettingsAction).mockResolvedValue({
      ok: false,
      fieldErrors: { sex: ["Choisis une silhouette."] },
    });
    render(
      <ToastProvider>
        <ProfileSettingsForm
          defaults={{ sex: "male", heightCm: null, birthDate: null, lengthUnit: "cm" }}
        />
      </ToastProvider>,
    );

    fireEvent.submit(screen.getByRole("form", { name: "Profil" }));

    const error = await screen.findByText("Choisis une silhouette.");
    const group = screen.getByRole("group", { name: "Silhouette" });
    expect(group.getAttribute("aria-describedby")).toBe(error.id);
    expect(group.getAttribute("aria-invalid")).toBe("true");
  });
});
