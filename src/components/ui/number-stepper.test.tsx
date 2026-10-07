// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NumberStepper } from "./number-stepper";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Harness({ initial, error }: { initial: string; error?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <NumberStepper
      label="Poids"
      name="weight"
      unit="kg"
      value={value}
      onChange={setValue}
      min={20}
      max={400}
      fallback={70}
      error={error}
    />
  );
}
const field = () => screen.getByLabelText("Poids") as HTMLInputElement;
const plus = () => screen.getByRole("button", { name: "Augmenter de 0,1" });
const minus = () => screen.getByRole("button", { name: "Diminuer de 0,1" });

describe("NumberStepper", () => {
  it("steps by 0.1 from a comma value with the keyboard", () => {
    render(<Harness initial="78,4" />);
    fireEvent.click(minus(), { detail: 0 });
    expect(field().value).toBe("78,3");
    fireEvent.click(plus(), { detail: 0 });
    fireEvent.click(plus(), { detail: 0 });
    expect(field().value).toBe("78,5");
  });

  it("starts from the fallback when the field is empty", () => {
    render(<Harness initial="" />);
    fireEvent.click(plus(), { detail: 0 });
    expect(field().value).toBe("70,1");
  });

  it("stays within bounds", () => {
    render(<Harness initial="400" />);
    fireEvent.click(plus(), { detail: 0 });
    expect(field().value).toBe("400,0");
  });

  it("steps once per press and repeats on a long press", () => {
    vi.useFakeTimers();
    render(<Harness initial="78,0" />);
    fireEvent.pointerDown(plus(), { button: 0 });
    fireEvent.pointerUp(plus());
    fireEvent.click(plus(), { detail: 1 }); // the click that follows a pointer press is ignored
    expect(field().value).toBe("78,1");

    fireEvent.pointerDown(plus(), { button: 0 });
    act(() => vi.advanceTimersByTime(400 + 80 * 3));
    fireEvent.pointerUp(plus());
    act(() => vi.advanceTimersByTime(1000));
    expect(field().value).toBe("78,5");
  });

  it("lets the user type, with a decimal keyboard, and announces errors", () => {
    render(<Harness initial="" error="Poids entre 20 et 400 kg" />);
    fireEvent.change(field(), { target: { value: "81,2" } });
    expect(field().value).toBe("81,2");
    expect(field().getAttribute("inputmode")).toBe("decimal");
    expect(field().getAttribute("aria-invalid")).toBe("true");
    const describedBy = field().getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe("Poids entre 20 et 400 kg");
  });
});
