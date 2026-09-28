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
    memberRoles: {
      type: Map,
      of: { type: String, enum: ['viewer', 'commenter', 'editor'] },
      default: {},
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
