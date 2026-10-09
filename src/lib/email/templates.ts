import type { EmailMessage } from "./types";

type Template = Omit<EmailMessage, "to">;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function verificationEmail(url: string): Template {
  return {
    subject: "Confirme ton email · my-body",
    text: `Bienvenue sur my-body !\n\nConfirme ton adresse email en ouvrant ce lien :\n${url}\n\nSi tu n'es pas à l'origine de cette inscription, ignore ce message.`,
    html: `<p>Bienvenue sur my-body !</p><p><a href="${escapeHtml(url)}">Confirmer mon adresse email</a></p><p>Si tu n'es pas à l'origine de cette inscription, ignore ce message.</p>`,
  };
}

export function resetPasswordEmail(url: string): Template {
  return {
    subject: "Réinitialise ton mot de passe · my-body",
    text: `Pour choisir un nouveau mot de passe, ouvre ce lien (valable 1 heure) :\n${url}\n\nSi tu n'as rien demandé, ignore ce message : ton mot de passe reste inchangé.`,
    html: `<p><a href="${escapeHtml(url)}">Choisir un nouveau mot de passe</a> (lien valable 1 heure)</p><p>Si tu n'as rien demandé, ignore ce message : ton mot de passe reste inchangé.</p>`,
  };
}

/** EF-SET-05 CA3: sent after the deletion. No health data, no link. */
export function accountDeletedEmail(): Template {
  return {
    subject: "Ton compte my-body est supprimé",
    text: "Ton compte my-body et toutes tes données ont été supprimés définitivement.\n\nMerci d'avoir utilisé my-body.",
    html: "<p>Ton compte my-body et toutes tes données ont été supprimés définitivement.</p><p>Merci d'avoir utilisé my-body.</p>",
  };
}
