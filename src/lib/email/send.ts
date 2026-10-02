import { Resend } from "resend";
import type { SendEmail } from "./types";

/** Resend in production; console output in local dev when no API key is set. */
export function createEmailSender(): SendEmail {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "my-body <noreply@example.com>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production" && !process.env.CI) {
      throw new Error("RESEND_API_KEY is required in production");
    }
    if (process.env.NODE_ENV === "development") {
      return async (m) => {
        console.info(`[dev-email] ${m.subject}\n${m.text}`);
      };
    }
    // CI/test without key: silent, the text contains token links.
    return async () => {};
  }

  const resend = new Resend(apiKey);
  return async (m) => {
    const { error } = await resend.emails.send({
      from,
      to: m.to,
      subject: m.subject,
      text: m.text,
      html: m.html,
    });
    // Never log the recipient: only the error type.
    if (error) console.error("email_send_failed", { name: error.name });
  };
}
