import type { Resend } from "resend";

function _sendEmail(
  emailProvider: Resend,
  {
    to,
    subject,
    body,
  }: {
    to: string;
    body: string;
    subject: string;
  },
) {
  emailProvider.emails.send({
    from: "hello@daiko.run",
    to,
    subject,
    html: body,
  });
}
