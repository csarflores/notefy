import mongoose, { Schema, Model } from 'mongoose';
import { IBoard, IBoardColumn, ITag } from '@/types';

const ColumnSchema = new Schema<IBoardColumn>(
  {
    id: { type: String, required: true, maxlength: 40 },
    title: { type: String, required: true, trim: true, maxlength: 30 },
    color: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
  },
  { _id: false }
);

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
    tags: {
      type: [TagSchema],
      default: [],
      validate: {
        validator: function (tags: ITag[]) {
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
    icon: {
      type: String,
      maxlength: [8, 'El icono no puede exceder 8 caracteres'],
      default: null,
    },
    publicToken: {
      type: String,
      default: null,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    columns: {
      // Si está vacío se usan las 3 columnas por defecto (todo/in-progress/done)
      type: [ColumnSchema],
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
BoardSchema.index({ owner: 1 });
BoardSchema.index({ projectId: 1 });
BoardSchema.index({ members: 1 });

const Board: Model<IBoard> =
  mongoose.models.Board || mongoose.model<IBoard>('Board', BoardSchema);

export default Board;
