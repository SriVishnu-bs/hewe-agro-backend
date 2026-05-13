import Notification from "../models/Notification.js";
export const createNotification = async ({
  userId,
  title,
  message,
  type = 'general',
  data = {},
}) => {
  try {
    await Notification.create({
      userId,
      title,
      message,
      type,
      data,
    });
  } catch (error) {
    console.log('Create notification error:', error.message);
  }
};

export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user && userId !== req.user._id.toString()) {
  return res.status(403).json({
    success: false,
    message: 'Not allowed to view another user notifications',
  });
}

    const notifications = await Notification.find({ userId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
const notification = await Notification.findById(id);

if (!notification) {
  return res.status(404).json({
    success: false,
    message: 'Notification not found',
  });
}

if (req.user && notification.userId.toString() !== req.user._id.toString()) {
  return res.status(403).json({
    success: false,
    message: 'Not allowed to update this notification',
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

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user && userId !== req.user._id.toString()) {
  return res.status(403).json({
    success: false,
    message: 'Not allowed to update another user notifications',
  });
}

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
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