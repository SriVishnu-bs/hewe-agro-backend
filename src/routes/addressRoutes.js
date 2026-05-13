import express from 'express';
import {
    createAddress,
    deleteAddress,
    getAddressesByUser,
    updateAddress,
} from '../controllers/addressController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect,createAddress);
router.get('/user/:userId',protect, getAddressesByUser);
router.put('/:id',protect, updateAddress);
router.delete('/:id', protect,deleteAddress);

export default router;