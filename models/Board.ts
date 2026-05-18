import mongoose, { Schema, Model } from 'mongoose';
import { IBoard } from '@/types';

const TagSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [30, 'El texto del tag no puede exceder 30 caracteres'],
    },
    color: {
      type: String,
      required: true,
      match: [/^#[0-9A-F]{6}$/i, 'El color debe ser un código hexadecimal válido'],
    },
  },
  { _id: false }
);

const BoardSchema = new Schema<IBoard>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del tablero es requerido'],
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
    tags: {
      type: [TagSchema],
      default: [],
      validate: {
        validator: function (tags: any[]) {
          return tags.length <= 20;
        },
        message: 'No puedes agregar más de 20 tags al tablero',
      },
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    color: {
      type: String,
      default: '#6b7280',
      validate: {
        validator: function (color: string) {
          return /^#[0-9A-Fa-f]{6}$/.test(color);
        },
        message: 'El color debe ser un código hexadecimal válido (ej: #6b7280)',
      },
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas optimizadas
BoardSchema.index({ owner: 1 });
BoardSchema.index({ projectId: 1 });

// Eliminar el modelo existente si existe para forzar recarga con nuevo schema
if (mongoose.models.Board) {
  delete mongoose.models.Board;
}

const Board: Model<IBoard> = mongoose.model<IBoard>('Board', BoardSchema);

export default Board;
