/**
 * Message for the `error` query parameter Better Auth adds to `errorCallbackURL`
 * when a Google sign-in fails.
 */
export function googleErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  // requireLocalEmailVerified: an unverified email/password account is never linked to Google.
  if (code === "account_not_linked") {
    return "Un compte existe déjà avec cet email. Connecte-toi avec ton mot de passe et confirme ton email : tu pourras ensuite utiliser Google.";
  }
  return "La connexion avec Google a échoué. Réessaie.";
}
