import AdminNotification from '../models/AdminNotification.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { createNotification } from './notificationController.js';
import AdminSentNotification from '../models/AdminSentNotification.js';
import sendPushNotification from '../utils/sendPushNotification.js';
export const createAdminNotification = async ({
  title,
  message,
  type = 'general',
  data = {},
}) => {
  try {
    await AdminNotification.create({
      title,
      message,
      type,
      data,
    });
  } catch (error) {
   
  }
};

export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await AdminNotification.find().sort({
      createdAt: -1,
    });

    const unreadCount = await AdminNotification.countDocuments({
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin notifications',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const markAdminNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await AdminNotification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const markAllAdminNotificationsAsRead = async (req, res) => {
  try {
    await AdminNotification.updateMany(
      { isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All admin notifications marked as read',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};
export const sendNotificationToUsers = async (req, res) => {
 

  
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access only',
      });
    }

    const {
      title,
      message,
      type = 'general',
      target = 'all',
      userId,
    } = req.body;

    const cleanTitle = String(title || '').trim();
    const cleanMessage = String(message || '').trim();
    const cleanType = String(type || 'general').trim();

    if (!cleanTitle || cleanTitle.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Title must be at least 3 characters',
      });
    }

    if (!cleanMessage || cleanMessage.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Message must be at least 10 characters',
      });
    }

    if (cleanTitle.length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Title must be below 80 characters',
      });
    }

    if (cleanMessage.length > 250) {
      return res.status(400).json({
        success: false,
        message: 'Message must be below 250 characters',
      });
    }

    if (!['general', 'offer', 'product', 'order'].includes(cleanType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type',
      });
    }

    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

    const duplicate = await Notification.findOne({
      title: cleanTitle,
      message: cleanMessage,
      type: cleanType,
      createdAt: { $gte: thirtySecondsAgo },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Same notification was sent recently. Please wait.',
      });
    }

    let users = [];

    if (target === 'single') {
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Select a user',
        });
      }

      const user = await User.findById(userId).select('_id');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      users = [user];
    } else {
      users = await User.find({ role: 'user' }).select('_id');
    }

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: 'No users found',
      });
    }

 await Promise.all(
  users.map(async (user) => {
    await createNotification({
      userId: user._id,
      title: cleanTitle,
      message: cleanMessage,
      type: cleanType,
      data: {
        sentByAdmin: true,
        target,
      },
    });

    const fullUser = await User.findById(user._id).select(
      'expoPushToken'
    );

 

if (fullUser?.expoPushToken) {
 

  await sendPushNotification({
    expoPushToken: fullUser.expoPushToken,
    title: cleanTitle,
    body: cleanMessage,
    data: {
      type: cleanType,
    },
  });

  
}
  })
);
    await AdminSentNotification.create({
  title: cleanTitle,
  message: cleanMessage,
  type: cleanType,
  target,
  targetUserId: target === 'single' ? userId : null,
  sentCount: users.length,
  sentBy: req.user?._id || null,
});

// keep only latest 10 sent notifications
const totalSaved = await AdminSentNotification.countDocuments();

if (totalSaved > 10) {
  const oldItems = await AdminSentNotification.find()
    .sort({ createdAt: 1 })
    .limit(totalSaved - 10)
    .select('_id');

  await AdminSentNotification.deleteMany({
    _id: { $in: oldItems.map((item) => item._id) },
  });
}

    return res.status(200).json({
      success: true,
      message:
        target === 'single'
          ? 'Notification sent to selected user'
          : `Notification sent to ${users.length} users`,
      sentCount: users.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send notification',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};
export const getAdminSentNotifications = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access only',
      });
    }

    const sentNotifications = await AdminSentNotification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('targetUserId', 'name phone email')
      .populate('sentBy', 'name phone');

    return res.status(200).json({
      success: true,
      sentNotifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sent notifications',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};