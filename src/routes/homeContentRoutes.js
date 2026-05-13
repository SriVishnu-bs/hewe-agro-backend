import express from 'express';
import {
  createHomeContent,
  deleteHomeContent,
  deleteUploadedHomeContentImage,
  getActiveHomeContent,
  getAdminHomeContent,
  toggleHomeContentStatus,
  updateHomeContent,
  uploadHomeContentImage,reorderHomeContent,
} from '../controllers/homeContentController.js';

import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import upload from '../config/upload.js';

const router = express.Router();

router.get('/active', getActiveHomeContent);

router.get(
  '/admin',
  protect,
  adminOnly,
  getAdminHomeContent
);

router.post(
  '/upload-image',
  protect,
  adminOnly,
  upload.single('image'),
  uploadHomeContentImage
);

router.delete(
  '/upload-image',
  protect,
  adminOnly,
  deleteUploadedHomeContentImage
);

router.post(
  '/admin',
  protect,
  adminOnly,
  createHomeContent
);
router.put(
  '/admin/reorder/list',
  protect,
  adminOnly,
  reorderHomeContent
);

router.put(
  '/admin/:id',
  protect,
  adminOnly,
  updateHomeContent
);

router.put(
  '/admin/:id/toggle',
  protect,
  adminOnly,
  toggleHomeContentStatus
);

router.delete(
  '/admin/:id',
  protect,
  adminOnly,
  deleteHomeContent
);

export default router;