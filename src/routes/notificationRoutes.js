import express from 'express';
import {
    getUserNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/user/:userId',protect, getUserNotifications);
router.put('/:id/read', protect,markNotificationAsRead);
router.put('/user/:userId/read-all',protect, markAllNotificationsAsRead);

export default router;