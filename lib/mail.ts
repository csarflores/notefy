import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;

function getTransporter() {
  if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
    throw new Error(
      'Faltan EMAIL_USER o EMAIL_APP_PASSWORD en .env.local. Genera una contraseña de aplicación en tu cuenta de Google.'
    );
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_APP_PASSWORD,
    },
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Notefy" <${EMAIL_USER}>`,
    to,
    subject: 'Recuperación de contraseña - Notefy',
    text: `Recibimos una solicitud para restablecer tu contraseña.\n\nHaz clic en el siguiente enlace (válido por 1 hora):\n\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este mensaje.`,
    html: `
      <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1d1d1f;">Restablecer contraseña</h2>
        <p style="color: #555;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en Notefy.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background: #0066cc; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; display: inline-block;">
            Restablecer contraseña
          </a>
        </p>
        <p style="color: #777; font-size: 13px;">Este enlace es válido por 1 hora. Si no solicitaste este cambio, ignora este mensaje.</p>
        <p style="color: #999; font-size: 12px; word-break: break-all;">${resetUrl}</p>
      </div>
    `,
  });
}
