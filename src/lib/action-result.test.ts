import { describe, expect, it } from "vitest";
import { fieldError, fieldValue, keepValues, type ActionResult } from "./action-result";

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
