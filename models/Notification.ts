import mongoose, { Schema, Model } from 'mongoose';
import { INotification } from '@/types';

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: {
        values: ['assigned', 'comment', 'reply', 'mention', 'invite', 'member', 'reminder'],
        message: 'Tipo de notificación inválido',
      },
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'El mensaje no puede exceder 500 caracteres'],
    },
    link: {
      type: String,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
