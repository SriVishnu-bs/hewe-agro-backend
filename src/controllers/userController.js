import User from '../models/User.js';
import Order from '../models/Order.js';
import cloudinary from '../config/cloudinary.js';
export const createOrUpdateUser = async (req, res) => {
  try {
    const { name, phone, email, profileImage, profileImagePublicId } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required',
      });
    }

    let user = await User.findOne({ phone: phone.trim() });

    if (user) {
      if (req.user && user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not allowed to update this user',
        });
      }

      user.name = name.trim();
      user.email = email?.trim() || '';
      user.profileImage = profileImage || '';
user.profileImagePublicId = profileImagePublicId || user.profileImagePublicId || '';
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user,
      });
    }

    user = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      profileImage: profileImage || '',
      profileImagePublicId: profileImagePublicId || '',
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create or update user',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const getUserByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    const user = await User.findOne({ phone: phone.trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.user && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to view this user',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined
    });
  }
};

export const uploadProfileImage = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (req.user && userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to upload for another user',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }

      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.profileImagePublicId) {
      try {
        await cloudinary.uploader.destroy(user.profileImagePublicId);
      } catch (e) {
        console.log('OLD PROFILE IMAGE DELETE ERROR:', e);
      }
    }

    user.profileImage = req.file.path;
    user.profileImagePublicId = req.file.filename;

    await user.save();

    return res.json({
      success: true,
      message: 'Profile image uploaded',
      imageUrl: user.profileImage,
      publicId: user.profileImagePublicId,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Upload failed',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};
export const deleteProfileImage = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    if (req.user && userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to delete another user photo',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.profileImagePublicId) {
      const deleteResult = await cloudinary.uploader.destroy(user.profileImagePublicId);
console.log('PROFILE CLOUDINARY DELETE:', deleteResult);
    }

    user.profileImage = '';
    user.profileImagePublicId = '';

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete profile photo',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};
export const getAllUsersForAdmin = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -otp -otpExpires')
      .sort({ createdAt: -1 })
      .lean();

    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$userId',
          ordersCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
    ]);

    const statsMap = {};
    stats.forEach((s) => {
      statsMap[s._id.toString()] = s;
    });

    const finalUsers = users.map((user) => {
      const s = statsMap[user._id.toString()];

      return {
        ...user,
        ordersCount: s?.ordersCount || 0,
        totalSpent: s?.totalSpent || 0,
        lastOrderDate: s?.lastOrderDate || null,
      };
    });

    res.status(200).json({
      success: true,
      users: finalUsers,
    });
  } catch (error) {
    console.log('Admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
};
export const saveExpoPushToken = async (req, res) => {
  try {
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token required',
      });
    }

    req.user.expoPushToken = expoPushToken;

    await req.user.save();

    return res.status(200).json({
      success: true,
      message: 'Push token saved',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save push token',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};