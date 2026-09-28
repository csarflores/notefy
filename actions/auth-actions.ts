'use server';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/mail';
import { ApiResponse } from '@/types';

const isMailConfigured = () => !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Genera un token de verificación, lo guarda hasheado y envía el email
async function issueVerificationToken(user: { _id: Types.ObjectId; email: string; name: string }) {
  const token = crypto.randomBytes(32).toString('hex');
  await User.updateOne(
    { _id: user._id },
    {
      verifyEmailToken: hashToken(token),
      verifyEmailExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
  );

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  await sendVerificationEmail(user.email, user.name, `${baseUrl}/auth/verify-email?token=${token}`);
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<ApiResponse<{ email: string; verificationRequired: boolean }>> {
  try {
    if (!name || !email || !password) {
      return { success: false, error: 'Todos los campos son requeridos' };
    }

    if (password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
    }

    await connectDB();

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return { success: false, error: 'El email ya está registrado' };
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      // Sin SMTP configurado el email se considera verificado (entorno dev)
      emailVerified: isMailConfigured() ? null : new Date(),
    });

    // Enviar email de verificación si hay transporte de mail
    if (isMailConfigured()) {
      try {
        await issueVerificationToken(newUser);
      } catch (err) {
        console.error('No se pudo enviar el email de verificación:', err);
        // Si el envío falla, no bloquear al usuario
        await User.updateOne({ _id: newUser._id }, { emailVerified: new Date() });
      }
    }

    return {
      success: true,
      data: { email: newUser.email, verificationRequired: isMailConfigured() && !newUser.emailVerified },
    };
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return { success: false, error: 'Error al crear la cuenta' };
  }
}

// Verificar el email con el token enviado por correo
export async function verifyEmail(token: string): Promise<ApiResponse<null>> {
  try {
    if (!token) {
      return { success: false, error: 'Token inválido' };
    }

    await connectDB();

    const user = await User.findOneAndUpdate(
      {
        verifyEmailToken: hashToken(token),
        verifyEmailExpires: { $gt: new Date() },
      },
      {
        emailVerified: new Date(),
        $unset: { verifyEmailToken: 1, verifyEmailExpires: 1 },
      }
    );

    if (!user) {
      return { success: false, error: 'El enlace es inválido o ya expiró' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error al verificar email:', error);
    return { success: false, error: 'Error al verificar el email' };
  }
}

// Reenviar el email de verificación (respuesta genérica para no filtrar emails)
export async function resendVerificationEmail(email: string): Promise<ApiResponse<null>> {
  try {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return { success: false, error: 'Ingresa un email válido' };
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.emailVerified) {
      return { success: true };
    }

    if (!isMailConfigured()) {
      // Sin SMTP: auto-verificar para no bloquear el entorno
      user.emailVerified = new Date();
      await user.save();
      return { success: true };
    }

    await issueVerificationToken(user);

    return { success: true };
  } catch (error) {
    console.error('Error al reenviar verificación:', error);
    return { success: false, error: 'Error al procesar la solicitud' };
  }
}

export async function requestPasswordReset(
  email: string
): Promise<ApiResponse<null>> {
  try {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return { success: false, error: 'Ingresa un email válido' };
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Siempre responder éxito para no revelar si el email está registrado
    if (!user) {
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    await sendPasswordResetEmail(
      user.email,
      `${baseUrl}/auth/reset-password?token=${token}`
    );

    return { success: true };
  } catch (error) {
    console.error('Error al solicitar recuperación de contraseña:', error);
    return { success: false, error: 'Error al procesar la solicitud' };
  }
}

export async function resetPassword(
  token: string,
  password: string
): Promise<ApiResponse<null>> {
  try {
    if (!token || !password) {
      return { success: false, error: 'Datos incompletos' };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres',
      };
    }

    await connectDB();

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOneAndUpdate(
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      },
      {
        password: await bcrypt.hash(password, 10),
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 },
      }
    );

    if (!user) {
      return { success: false, error: 'El enlace es inválido o ya expiró' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    return { success: false, error: 'Error al restablecer la contraseña' };
  }
}
