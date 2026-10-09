// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { Input } from "./input";
import { Sheet } from "./sheet";
import { Slider } from "./slider";
import { ToastProvider, useToast } from "./toast";

afterEach(cleanup);

describe("Input", () => {
  it("links the error message to the field for screen readers", () => {
    render(<Input label="Email" name="email" error="Email invalide" />);
    const field = screen.getByLabelText("Email");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    const describedBy = field.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe("Email invalide");
  });

  it("has no error attributes when valid", () => {
    render(<Input label="Email" name="email" />);
    const field = screen.getByLabelText("Email");
    expect(field.hasAttribute("aria-invalid")).toBe(false);
    expect(field.hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("Button", () => {
  it("is disabled and busy while loading", () => {
    render(<Button loading>Envoyer</Button>);
    const button = screen.getByRole("button", { name: "Envoyer" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
});

describe("Sheet", () => {
  it("is a dialog named by its title that closes with Escape", () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange} title="Nouvelle pesée">
        <p>contenu</p>
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog", { name: "Nouvelle pesée" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: "Fermer" })).toBeTruthy();
  });
});

describe("Toast", () => {
  function Trigger() {
    const toast = useToast();
    return <button onClick={() => toast("Pesée enregistrée")}>go</button>;
  }

  it("announces a message, then hides it after 3 s", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByRole("status").textContent).toBe("Pesée enregistrée");
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("status").textContent).toBe("");
    vi.useRealTimers();
  });
});

describe("Toast with action", () => {
  it("runs the action once, hides the toast, and lasts the given duration", () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    function Trigger() {
      const toast = useToast();
      return (
        <button
          onClick={() =>
            toast("Pesée supprimée", { action: { label: "Annuler", onClick }, durationMs: 5000 })
          }
        >
          go
        </button>
      );
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    act(() => vi.advanceTimersByTime(4000));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("status").textContent).toBe("");
    vi.useRealTimers();
  });
});

describe("Slider", () => {
  it("is a range input with a label, a value and the step", () => {
    const onChange = vi.fn();
    render(
      <Slider
        label="Rythme"
        name="rate"
        value={0.5}
        onChange={onChange}
        min={0.25}
        max={1.5}
        step={0.05}
        format={(v) => `${v} %/sem`}
      />,
    );
    const input = screen.getByLabelText("Rythme") as HTMLInputElement;
    expect(input.type).toBe("range");
    expect(input.getAttribute("step")).toBe("0.05");
    expect(input.value).toBe("0.5");
    expect(screen.getByText("0.5 %/sem")).toBeTruthy();
    fireEvent.change(input, { target: { value: "0.75" } });
    expect(onChange).toHaveBeenCalledWith(0.75);
  });
});
