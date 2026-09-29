import mongoose, { Schema, Model } from 'mongoose';
import { IProject } from '@/types';

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del proyecto es requerido'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El propietario es requerido'],
    },
    members: {
      type: [String],
      default: [],
      validate: {
        validator: function (emails: string[]) {
          return emails.every((email) => /^\S+@\S+\.\S+$/.test(email));
        },
        message: 'Todos los miembros deben tener emails válidos',
      },
    },
    // Objeto plano { email: rol }; los Maps de Mongoose no admiten '.' en las claves
    memberRoles: {
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function (roles: Record<string, string>) {
          return (
            !roles ||
            (typeof roles === 'object' &&
              Object.values(roles).every((r) => ['viewer', 'commenter', 'editor'].includes(r)))
          );
        },
        message: 'Los roles de miembro deben ser válidos',
      },
    },
    color: {
      type: String,
      default: '#0066cc',
      validate: {
        validator: function (color: string) {
          return /^#[0-9A-Fa-f]{6}$/.test(color);
        },
        message: 'El color debe ser un código hexadecimal válido (ej: #0066cc)',
      },
    },
    icon: {
      type: String,
      maxlength: [8, 'El icono no puede exceder 8 caracteres'],
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Índice para búsquedas por propietario
ProjectSchema.index({ owner: 1 });
ProjectSchema.index({ members: 1 });

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
