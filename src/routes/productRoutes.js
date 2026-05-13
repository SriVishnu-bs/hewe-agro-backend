import express from 'express';
import {
  addReview,
  editReview,
  getProductById,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteReviewByAdmin,
  deleteProductImage,
  deleteUploadedProductImage,
} from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import upload from '../config/upload.js';

const router = express.Router();

router.get('/', getProducts);

router.post(
  '/upload-image',
  protect,
  adminOnly,
  upload.single('image'),
  uploadProductImage
);

router.delete(
  '/upload-image',
  protect,
  adminOnly,
  deleteUploadedProductImage
);

router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

router.delete(
  '/:productId/image',
  protect,
  adminOnly,
  deleteProductImage
);

router.post('/:id/review', protect, addReview);
router.put('/:productId/review/:reviewId', protect, editReview);

router.delete(
  '/:productId/review/:reviewId/admin',
  protect,
  adminOnly,
  deleteReviewByAdmin
);

router.get('/:id', getProductById);

export default router;