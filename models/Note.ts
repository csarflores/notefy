import mongoose, { Schema, Model } from 'mongoose';
import { INote } from '@/types';

const NoteSchema = new Schema<INote>(
  {
    title: {
      type: String,
      required: [true, 'El título de la nota es requerido'],
      trim: true,
      maxlength: [200, 'El título no puede exceder 200 caracteres'],
    },
    content: {
      type: String,
      default: '',
      maxlength: [100000, 'El contenido no puede exceder 100000 caracteres (incluye etiquetas HTML del editor)'],
    },
    visibility: {
      type: String,
      enum: {
        values: ['private', 'shared'],
        message: 'La visibilidad debe ser: private o shared',
      },
      default: 'private',
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
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    color: {
      type: String,
      default: '#f59e0b',
      validate: {
        validator: function (color: string) {
          return /^#[0-9A-Fa-f]{6}$/.test(color);
        },
        message: 'El color debe ser un código hexadecimal válido (ej: #f59e0b)',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas optimizadas
NoteSchema.index({ owner: 1 });
NoteSchema.index({ projectId: 1 });
NoteSchema.index({ owner: 1, projectId: 1 });
NoteSchema.index({ members: 1 });

const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

export default Note;
