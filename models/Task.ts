import mongoose, { Schema, Model } from 'mongoose';
import { ITask, ITag } from '@/types';

const ReplySchema = new Schema(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorImage: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'La respuesta no puede exceder 2000 caracteres'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const CommentSchema = new Schema(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorImage: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'El comentario no puede exceder 2000 caracteres'],
    },
    replies: {
      type: [ReplySchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const AttachmentSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: [200, 'El nombre del archivo no puede exceder 200 caracteres'],
    },
    size: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
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

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'El título es requerido'],
      trim: true,
      maxlength: [200, 'El título no puede exceder 200 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [50000, 'La descripción no puede exceder 50000 caracteres (incluye etiquetas HTML del editor de texto rico)'],
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in-progress', 'done'],
        message: 'El estado debe ser: todo, in-progress o done',
      },
      default: 'todo',
    },
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'El tablero es requerido'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedTo: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    imageUrl: {
      type: String,
      default: null,
    },
    attachments: {
      type: [AttachmentSchema],
      default: [],
      validate: {
        validator: function (attachments: unknown[]) {
          return attachments.length <= 20;
        },
        message: 'No puedes agregar más de 20 adjuntos',
      },
    },
    tags: {
      type: [TagSchema],
      default: [],
      validate: {
        validator: function (tags: ITag[]) {
          return tags.length <= 10;
        },
        message: 'No puedes agregar más de 10 tags',
      },
    },
    order: {
      type: Number,
      default: 0,
    },
    comments: {
      type: [CommentSchema],
      default: [],
    },
    dueDate: {
      type: Date,
      default: null,
    },
    deliveryDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas optimizadas
TaskSchema.index({ boardId: 1, status: 1 });
TaskSchema.index({ boardId: 1, order: 1 });

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;
