import mongoose, { Schema, Model } from 'mongoose';
import { IUser } from '@/types';

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un email válido'],
    },
    password: {
      type: String,
      select: false,
    },
    image: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    // Favoritos: strings con formato "tipo:id" (project|board|note)
    favorites: {
      type: [String],
      default: [],
    },
    // Preferencias de notificación (qué tipos recibir in-app y si enviar email)
    notificationPrefs: {
      type: {
        assigned: { type: Boolean, default: true },
        comment: { type: Boolean, default: true },
        reply: { type: Boolean, default: true },
        mention: { type: Boolean, default: true },
        invite: { type: Boolean, default: true },
        member: { type: Boolean, default: true },
        reminder: { type: Boolean, default: true },
        emailEnabled: { type: Boolean, default: false },
      },
      default: () => ({}),
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    verifyEmailToken: {
      type: String,
      select: false,
    },
    verifyEmailExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
