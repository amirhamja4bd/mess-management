import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { connectToDatabase } from "@/lib/db/mongoose";
import { OrganizationModel } from "@/lib/models/organization.model";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSendResult {
  sent: boolean;
  reason?: string;
}

let cachedTransporter: Transporter | null = null;
let cachedOrgId: string | null = null;

async function getTransporter(orgId?: string): Promise<Transporter | null> {
  if (orgId) {
    try {
      await connectToDatabase();
      const org = await OrganizationModel.findById(orgId).select("settings.smtp").lean();
      const smtp = org?.settings?.smtp;

      if (smtp?.host) {
        if (cachedOrgId === orgId && cachedTransporter) {
          return cachedTransporter;
        }

        cachedTransporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port || 587,
          secure: (smtp.port || 587) === 465,
          auth: smtp.user && smtp.pass
            ? { user: smtp.user, pass: smtp.pass }
            : undefined,
        });
        cachedOrgId = orgId;
        return cachedTransporter;
      }
    } catch (err) {
      console.error("[mail] Failed to load SMTP settings from database:", err);
    }
  }

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  if (cachedTransporter && !cachedOrgId) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  cachedOrgId = null;
  return cachedTransporter;
}

/**
 * Send email via SMTP. Falls back to console logging when SMTP is not configured.
 * Returns a result object indicating whether the email was actually sent.
 */
export async function sendEmail(message: EmailMessage, orgId?: string): Promise<EmailSendResult> {
  const transport = await getTransporter(orgId);

  let from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@messmate.app";
  if (orgId) {
    try {
      await connectToDatabase();
      const org = await OrganizationModel.findById(orgId).select("settings.smtp.from").lean();
      if (org?.settings?.smtp?.from) {
        from = org.settings.smtp.from;
      }
    } catch {
      // Use default from
    }
  }

  if (!transport) {
    console.info(
      `[mail:console-log] SMTP not configured. Logging email instead.\n` +
      `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`
    );
    return { sent: false, reason: "SMTP not configured" };
  }

  try {
    await transport.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    console.info(`[mail:sent] to=${message.to} subject=${message.subject}`);
    return { sent: true };
  } catch (err) {
    console.error(`[mail:error] Failed to send to ${message.to}:`, err);
    return { sent: false, reason: err instanceof Error ? err.message : "Unknown error" };
  }
}

export function buildVerificationLink(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildResetLink(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export function buildInvitationLink(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/accept-invitation?token=${encodeURIComponent(token)}`;
}
