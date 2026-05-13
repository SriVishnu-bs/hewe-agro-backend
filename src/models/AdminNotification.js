import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema(
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
      enum: [
        'order',
        'product',
        'offer',
        'payment',
        'user',
        'system',
        'general',
      ],
      default: 'general',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

adminNotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

const AdminNotification =
  mongoose.models.AdminNotification ||
  mongoose.model('AdminNotification', adminNotificationSchema);

export default AdminNotification;