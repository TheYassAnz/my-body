import { describe, expect, it } from "vitest";
import { googleErrorMessage } from "./google-error";

describe("googleErrorMessage", () => {
  it("is silent when there is no error", () => {
    expect(googleErrorMessage(undefined)).toBeNull();
  });

  it("explains why an unverified email account cannot use Google", () => {
    expect(googleErrorMessage("account_not_linked")).toBe(
      "Un compte existe déjà avec cet email. Connecte-toi avec ton mot de passe et confirme ton email : tu pourras ensuite utiliser Google.",
    );
  });

  it("falls back to a generic message for other errors", () => {
    expect(googleErrorMessage("state_mismatch")).toBe(
      "La connexion avec Google a échoué. Réessaie.",
    );
  });
});
