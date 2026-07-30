import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function enviarEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ enviado: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) {
    console.warn(
      `SMTP no configurado: no se envio el email "${params.subject}" a ${params.to}`,
    );
    return { enviado: false, error: "SMTP no configurado" };
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM ?? "CRM <no-reply@localhost>",
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { enviado: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`Error enviando email a ${params.to}:`, error);
    return { enviado: false, error };
  }
}
