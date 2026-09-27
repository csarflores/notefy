'use server';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sendPasswordResetEmail } from '@/lib/mail';
import { ApiResponse } from '@/types';

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<ApiResponse<{ email: string }>> {
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
    });

    return {
      success: true,
      data: { email: newUser.email },
    };
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return { success: false, error: 'Error al crear la cuenta' };
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
