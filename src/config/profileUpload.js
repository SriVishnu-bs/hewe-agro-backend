import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js';

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'hewe-agro/users',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 500, height: 500, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  },
});

const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

export default profileUpload;