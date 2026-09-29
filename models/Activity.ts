import mongoose, { Schema, Model } from 'mongoose';
import { IActivity } from '@/types';

const ActivitySchema = new Schema<IActivity>(
  {
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'El tablero es requerido'],
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    taskTitle: {
      type: String,
      maxlength: 200,
      default: '',
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    actorImage: {
      type: String,
      default: null,
    },
    action: {
      type: String,
      enum: {
        values: ['created', 'updated', 'moved', 'completed', 'deleted', 'commented', 'assigned'],
        message: 'Acción no válida',
      },
      required: true,
    },
    detail: {
      type: String,
      maxlength: 300,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ActivitySchema.index({ boardId: 1, createdAt: -1 });
ActivitySchema.index({ taskId: 1, createdAt: -1 });

const Activity: Model<IActivity> =
  mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);

export default Activity;
