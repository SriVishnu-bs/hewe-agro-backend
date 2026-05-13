import express from 'express';

import {
  createCategory,
  deleteCategory,
  getActiveCategories,
  getAdminCategories,
  updateCategory,
} from '../controllers/categoryController.js';

import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.get('/active', getActiveCategories);

router.get(
  '/admin',
  protect,
  adminOnly,
  getAdminCategories
);

router.post(
  '/admin',
  protect,
  adminOnly,
  createCategory
);

router.put(
  '/admin/:id',
  protect,
  adminOnly,
  updateCategory
);

router.delete(
  '/admin/:id',
  protect,
  adminOnly,
  deleteCategory
);

export default router;