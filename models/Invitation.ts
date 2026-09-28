import mongoose, { Schema, Model } from 'mongoose';
import { IInvitation } from '@/types';

const InvitationSchema = new Schema<IInvitation>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    resourceType: {
      type: String,
      enum: ['project', 'board', 'note'],
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    resourceName: {
      type: String,
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitedByName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['viewer', 'commenter', 'editor'],
      default: 'editor',
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

InvitationSchema.index({ email: 1, status: 1 });
InvitationSchema.index({ token: 1 });
InvitationSchema.index({ resourceId: 1, resourceType: 1 });

const Invitation: Model<IInvitation> =
  mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', InvitationSchema);

export default Invitation;
