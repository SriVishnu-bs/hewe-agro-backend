import mongoose from 'mongoose';

const adminSentNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['general', 'offer', 'product', 'order'],
      default: 'general',
    },
    target: {
      type: String,
      enum: ['all', 'single'],
      default: 'all',
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const AdminSentNotification =
  mongoose.models.AdminSentNotification ||
  mongoose.model('AdminSentNotification', adminSentNotificationSchema);

export default AdminSentNotification;