import express from 'express';
import {
  checkPhoneExists,
  loginUser,
  registerUser,
  resetPassword,
  sendOtp,refreshAccessToken,logoutUser,
  sendSignupOtp,
  verifyOtp,
  verifySignupOtp,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/check-phone', checkPhoneExists);

router.post('/send-signup-otp', sendSignupOtp);
router.post('/verify-signup-otp', verifySignupOtp);

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logoutUser);

export default router;