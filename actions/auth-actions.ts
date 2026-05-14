'use server';

import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
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
