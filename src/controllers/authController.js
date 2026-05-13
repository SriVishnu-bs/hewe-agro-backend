import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PendingSignup from '../models/PendingSignup.js';
import { createAdminNotification } from './adminNotificationController.js';
const phoneRegex = /^[6-9]\d{9}$/;

const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_OTP_REQUESTS = 6;
const MAX_OTP_ATTEMPTS = 5;

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '15m',
    }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: '30d',
    }
  );
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const checkPhoneExists = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Enter valid 10-digit phone number',
      });
    }

    const user = await User.findOne({ phone: phone.trim() }).select('_id phone');

    return res.status(200).json({
      success: true,
      exists: !!user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check phone',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const sendSignupOtp = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone and password are required',
      });
    }

    const trimmedPhone = phone.trim();

    if (!phoneRegex.test(trimmedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Enter valid 10-digit phone number',
      });
    }

    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      });
    }

    const existingUser = await User.findOne({ phone: trimmedPhone });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already registered with this number',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    const existingPending = await PendingSignup.findOne({ phone: trimmedPhone });
const now = new Date();

let otpRequestCount = 1;
let otpWindowStart = now;

if (existingPending?.otpWindowStart) {
  const windowStillActive =
    now.getTime() - new Date(existingPending.otpWindowStart).getTime() <
    OTP_RATE_WINDOW_MS;

  if (windowStillActive) {
    if (Number(existingPending.otpRequestCount || 0) >= MAX_OTP_REQUESTS) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Try again after 10 minutes.',
      });
    }

    otpRequestCount = Number(existingPending.otpRequestCount || 0) + 1;
    otpWindowStart = existingPending.otpWindowStart;
  }
}
    await PendingSignup.findOneAndUpdate(
      { phone: trimmedPhone },
      {
        name: name.trim(),
        phone: trimmedPhone,
        email: email?.trim() || '',
        password: hashedPassword,
        otpAttempts: 0,
        otpRequestCount,
        otpWindowStart,
        otp,
        otpExpires,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(`Signup OTP for ${trimmedPhone}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      devOtp:
  process.env.NODE_ENV === 'development'
    ? otp
    : undefined,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone and OTP are required',
      });
    }

    const trimmedPhone = phone.trim();

    const pending = await PendingSignup.findOne({ phone: trimmedPhone });

    if (!pending) {
      return res.status(404).json({
        success: false,
        message: 'OTP not requested or expired',
      });
    }

    if (pending.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    if (pending.otpExpires < new Date()) {
      await PendingSignup.deleteOne({ phone: trimmedPhone });

      return res.status(400).json({
        success: false,
        message: 'OTP expired',
      });
    }

    const existingUser = await User.findOne({ phone: trimmedPhone });

    if (existingUser) {
      await PendingSignup.deleteOne({ phone: trimmedPhone });

      return res.status(409).json({
        success: false,
        message: 'User already registered with this number',
      });
    }

    const user = await User.create({
      name: pending.name,
      phone: pending.phone,
      email: pending.email || '',
      password: pending.password,
      isPhoneVerified: true,
      otp: '',
      otpExpires: null,
      profileImage: '',
      role: 'user',
    });
    await createAdminNotification({
  title: 'New User Registered',
  message: `${user.name} created a new account.`,
  type: 'user',
  data: {
    userId: user._id,
    name: user.name,
    phone: user.phone,
  },
});

    await PendingSignup.deleteOne({ phone: trimmedPhone });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Enter valid 10-digit phone number',
      });
    }

    const trimmedPhone = phone.trim();
    const user = await User.findOne({ phone: trimmedPhone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Create account first.',
      });
    }

    // ✅ RATE LIMIT START (INSERTED HERE)
    const now = new Date();

    if (user.otpWindowStart) {
      const windowStillActive =
        now.getTime() - new Date(user.otpWindowStart).getTime() <
        OTP_RATE_WINDOW_MS;

      if (windowStillActive) {
        if (Number(user.otpRequestCount || 0) >= MAX_OTP_REQUESTS) {
          return res.status(429).json({
            success: false,
            message: 'Too many OTP requests. Try again after 10 minutes.',
          });
        }

        user.otpRequestCount = Number(user.otpRequestCount || 0) + 1;
      } else {
        user.otpRequestCount = 1;
        user.otpWindowStart = now;
      }
    } else {
      user.otpRequestCount = 1;
      user.otpWindowStart = now;
    }
    // ✅ RATE LIMIT END

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);

    user.otp = otp;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0; // reset wrong attempts

    await user.save();

    console.log(`OTP for ${trimmedPhone}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      devOtp:
  process.env.NODE_ENV === 'development'
    ? otp
    : undefined,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};
export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone and OTP are required',
      });
    }

    const user = await User.findOne({ phone: phone.trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: 'OTP not requested',
      });
    }

    // ✅ WRONG OTP HANDLING (ADDED)
    if (user.otp !== otp.trim()) {
      user.otpAttempts = Number(user.otpAttempts || 0) + 1;
      await user.save();

      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        user.otp = '';
        user.otpExpires = null;
        user.otpAttempts = 0;
        await user.save();

        return res.status(429).json({
          success: false,
          message: 'Too many wrong OTP attempts. Please request a new OTP.',
        });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${MAX_OTP_ATTEMPTS - user.otpAttempts} attempts left.`,
      });
    }

    // ✅ EXPIRED OTP CHECK
    if (user.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired',
      });
    }

    // ✅ SUCCESS RESET
    user.isPhoneVerified = true;
    user.otp = '';
    user.otpExpires = null;

    user.otpAttempts = 0;
    user.otpRequestCount = 0;
    user.otpWindowStart = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const registerUser = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Use OTP signup flow',
  });
};

export const loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required',
      });
    }

    const user = await User.findOne({ phone: phone.trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone or password',
      });
    }

    const token = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);

user.refreshToken = refreshToken;
await user.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to login',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required',
      });
    }

    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      });
    }

    const user = await User.findOne({ phone: phone.trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone not verified',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing',
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    const newAccessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      token: newAccessToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token expired or invalid',
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await User.findOneAndUpdate(
        { refreshToken },
        { refreshToken: '' }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};