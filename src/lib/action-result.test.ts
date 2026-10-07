import { describe, expect, it } from "vitest";
import {
  confirmedReasons,
  fieldError,
  fieldValue,
  keepValues,
  type ActionResult,
} from "./action-result";

describe("action results", () => {
  const failed: ActionResult = {
    ok: false,
    fieldErrors: { email: ["Adresse email invalide"] },
    values: { email: "julie@" },
  };

  it("exposes the first error and the submitted value of a field", () => {
    expect(fieldError(failed, "email")).toBe("Adresse email invalide");
    expect(fieldValue(failed, "email")).toBe("julie@");
    expect(fieldError({ ok: true }, "email")).toBeUndefined();
    expect(fieldValue(null, "email")).toBeUndefined();
  });

  it("keeps only the requested fields, never the others", () => {
    const fd = new FormData();
    fd.set("email", "julie@example.com");
    fd.set("password", "secret-secret");
    expect(keepValues(fd, "email")).toEqual({ email: "julie@example.com" });
  });
});

describe("confirmedReasons", () => {
  const form = (values: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, v);
    return fd;
  };

  it("merges reasons confirmed earlier with the button just pressed", () => {
    expect(confirmedReasons(form({ confirmed: "replace", confirm: "suspicious" }))).toEqual(
      new Set(["replace", "suspicious"]),
    );
  });

  it("ignores unknown or missing reasons", () => {
    expect(confirmedReasons(form({ confirmed: "hack,", confirm: "x" }))).toEqual(new Set());
    expect(confirmedReasons(new FormData())).toEqual(new Set());
  });
});
