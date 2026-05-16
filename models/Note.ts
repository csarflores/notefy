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
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas optimizadas
NoteSchema.index({ owner: 1 });
NoteSchema.index({ projectId: 1 });
NoteSchema.index({ owner: 1, projectId: 1 });

// Eliminar el modelo existente si existe para forzar recarga con nuevo schema
if (mongoose.models.Note) {
  delete mongoose.models.Note;
}

const Note: Model<INote> = mongoose.model<INote>('Note', NoteSchema);

export default Note;
