import nodemailer from 'nodemailer';
import { MemberRole } from '@/types';
import { MEMBER_ROLE_LABELS } from '@/lib/roles';

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
    from: `"Harold" <${EMAIL_USER}>`,
    to,
    subject: 'Recuperación de contraseña - Harold',
    text: `Recibimos una solicitud para restablecer tu contraseña.\n\nHaz clic en el siguiente enlace (válido por 1 hora):\n\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este mensaje.`,
    html: `
      <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1d1d1f;">Restablecer contraseña</h2>
        <p style="color: #555;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en Harold.</p>
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

const RESOURCE_LABELS: Record<string, string> = {
  project: 'el proyecto',
  board: 'el tablero',
  note: 'la nota',
};

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  resourceType: 'project' | 'board' | 'note',
  resourceName: string,
  role: MemberRole,
  inviteUrl: string
): Promise<void> {
  const transporter = getTransporter();
  const resourceLabel = RESOURCE_LABELS[resourceType] ?? 'el recurso';
  const roleLabel = (MEMBER_ROLE_LABELS[role] ?? 'lector').toLowerCase();

  await transporter.sendMail({
    from: `"Harold" <${EMAIL_USER}>`,
    to,
    subject: `${inviterName} te invitó a ${resourceLabel} "${resourceName}" - Harold`,
    text: `${inviterName} te invitó a colaborar en ${resourceLabel} "${resourceName}" como ${roleLabel}.\n\nAcepta la invitación aquí (válida por 7 días):\n\n${inviteUrl}\n\nSi no esperabas esta invitación, ignora este mensaje.`,
    html: `
      <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1d1d1f;">Invitación a colaborar</h2>
        <p style="color: #555;"><strong>${inviterName}</strong> te invitó a ${resourceLabel} <strong>"${resourceName}"</strong> en Harold con rol de <strong>${roleLabel}</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}" style="background: #0066cc; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; display: inline-block;">
            Ver invitación
          </a>
        </p>
        <p style="color: #777; font-size: 13px;">Este enlace es válido por 7 días. Si no esperabas esta invitación, ignora este mensaje.</p>
        <p style="color: #999; font-size: 12px; word-break: break-all;">${inviteUrl}</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verifyUrl: string
): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Harold" <${EMAIL_USER}>`,
    to,
    subject: 'Verifica tu email - Harold',
    text: `Hola ${name},\n\nVerifica tu dirección de email haciendo clic en el siguiente enlace (válido por 24 horas):\n\n${verifyUrl}\n\nSi no creaste esta cuenta, ignora este mensaje.`,
    html: `
      <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1d1d1f;">Verifica tu email</h2>
        <p style="color: #555;">Hola ${name}, confirma tu dirección de email para terminar de configurar tu cuenta en Harold.</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background: #0066cc; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; display: inline-block;">
            Verificar email
          </a>
        </p>
        <p style="color: #777; font-size: 13px;">Este enlace es válido por 24 horas. Si no creaste esta cuenta, ignora este mensaje.</p>
        <p style="color: #999; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
      </div>
    `,
  });
}
