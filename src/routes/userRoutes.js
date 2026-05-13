import express from 'express';
import profileUpload from '../config/profileUpload.js';
import { createOrUpdateUser, getUserByPhone, uploadProfileImage,saveExpoPushToken,deleteProfileImage,getAllUsersForAdmin } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect,createOrUpdateUser);
router.get('/admin/all-users', protect, getAllUsersForAdmin);
router.get('/:phone', protect,getUserByPhone);

router.post(
  '/upload-profile',
  protect,
  profileUpload.single('image'),
  uploadProfileImage
);
router.put('/push-token', protect, saveExpoPushToken);
router.delete('/profile-image', protect, deleteProfileImage);
export default router;