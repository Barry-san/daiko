import { sql } from "bun"
import { Resend } from "resend"
import { ENV } from "./env"

type EmailJob = {
  email_id?: string,
  type: "OTP" | "RESET",
  recipient: string
  content: string
}

type EmailPayload<T extends keyof EmailTemplate> = {
  recipient: string
  variables: EmailTemplate[T]["variables"]
}

type EmailTemplate = {
  OTP: {
    variables: {
      otp_code: string
    }
  },
  RESET: {
    variables: {
      link: string
    }
  }
}

const emailTemplateIds: Record<keyof EmailTemplate, string> = {
  OTP: ENV.OTP_EMAIL_TEMPLATE,
  RESET: ENV.PASSWORD_RESET_EMAIL_TEMPLATE
}

export function sendEmail(type: keyof EmailTemplate, { recipient, variables }: EmailPayload<typeof type>) {
  const emailProvider = new Resend();

  return emailProvider.emails.send({
    to: recipient,
    template: {
      id: emailTemplateIds[type],
      variables
    }
  })
}

export async function createEmailJob(db: Bun.SQL, job: EmailJob) {
  try {

  const res = await db`INSERT INTO emails ${sql(job)} returning *`
  return res
  }
  catch (e) {
    console.log(e)
  }
}
