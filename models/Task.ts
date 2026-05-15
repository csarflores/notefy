import mongoose, { Schema, Model } from 'mongoose';
import { ITask } from '@/types';

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
      maxlength: [2000, 'La descripción no puede exceder 2000 caracteres'],
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in-progress', 'done'],
        message: 'El estado debe ser: todo, in-progress o done',
      },
      default: 'todo',
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'El proyecto es requerido'],
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
    tags: {
      type: [TagSchema],
      default: [],
      validate: {
        validator: function (tags: any[]) {
          return tags.length <= 10;
        },
        message: 'No puedes agregar más de 10 tags',
      },
    },
    order: {
      type: Number,
      default: 0,
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
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ projectId: 1, order: 1 });

// Eliminar el modelo existente si existe para forzar recarga con nuevo schema
if (mongoose.models.Task) {
  delete mongoose.models.Task;
}

const Task: Model<ITask> = mongoose.model<ITask>('Task', TaskSchema);

export default Task;
