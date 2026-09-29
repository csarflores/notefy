import mongoose, { Schema, Model } from 'mongoose';
import { INote } from '@/types';

const NoteVersionSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 100000 },
    savedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    savedByName: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const NoteCommentSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    authorImage: { type: String, default: null },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'El comentario no puede exceder 2000 caracteres'],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

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
    publicToken: {
      type: String,
      default: null,
      index: true,
    },
    linkedNotes: {
      type: [Schema.Types.ObjectId],
      ref: 'Note',
      default: [],
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
    versions: {
      type: [NoteVersionSchema],
      default: [],
      validate: {
        validator: function (versions: unknown[]) {
          return versions.length <= 30;
        },
        message: 'El historial de versiones no puede exceder 30 entradas',
      },
    },
    comments: {
      type: [NoteCommentSchema],
      default: [],
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

// Índices para búsquedas optimizadas
NoteSchema.index({ owner: 1 });
NoteSchema.index({ projectId: 1 });
NoteSchema.index({ owner: 1, projectId: 1 });
NoteSchema.index({ members: 1 });

const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

export default Note;
