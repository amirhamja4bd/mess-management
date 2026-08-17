import { ok } from "@/lib/api-response";
import { parseBody } from "@/lib/api/helpers";
import { withOrgHandler } from "@/lib/api/with-handler";
import { PERMISSION } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/authorization";
import { sendEmail } from "@/lib/services/email.service";
import { z } from "zod";

const testEmailSchema = z.object({ to: z.email() }).strict();

export const POST = withOrgHandler(async (request, { context }) => {
  requirePermission(context, PERMISSION.SETTINGS_MANAGE);
  const { to } = await parseBody(request, testEmailSchema);

  const result = await sendEmail(
    {
      to,
      subject: "MessMate - Test Email",
      text: `This is a test email from MessMate.\n\nIf you received this, your SMTP configuration is working correctly.\n\nOrganization: ${context.organizationName}`,
    },
    context.organizationId
  );

  if (result.sent) {
    return ok({ success: true, message: "Test email sent successfully!" });
  }

  return ok({
    success: false,
    message: result.reason === "SMTP not configured"
      ? "SMTP is not configured. Please save your SMTP settings first."
      : `Failed to send email: ${result.reason}`,
  });
});
