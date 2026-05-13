import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'hewe-agro/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
  { width: 1200, height: 1200, crop: 'limit' },
  { quality: 'auto:good', fetch_format: 'auto' },
],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export default upload;