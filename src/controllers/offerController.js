import Offer from '../models/Offer.js';
import User from '../models/User.js';
import AdminSentNotification from '../models/AdminSentNotification.js';
import { createNotification } from './notificationController.js';
import { createAdminNotification } from './adminNotificationController.js';
import sendPushNotification from '../utils/sendPushNotification.js';
const isAdmin = (req) => req.user && req.user.role === 'admin';

const cleanOfferPayload = (body) => {
 const {
  title,
  subtitle,
  code,
  discountType,
  discountValue,
  appliesTo,
  category,
  productId,
  comboProductIds,
  startDate,
  endDate,
  isActive,
  notifyUsers,
  minimumOrderAmount,
  usageLimit,
  perUserLimit,icon,
} = body;

 return {
  title: String(title || '').trim(),
  subtitle: String(subtitle || '').trim(),
  code: String(code || '').trim().toUpperCase(),
  discountType: discountType || 'percentage',
  discountValue: Number(discountValue || 0),

  minimumOrderAmount: Number(minimumOrderAmount || 0),

  usageLimit: Number(usageLimit || 0),

  perUserLimit: Number(perUserLimit || 1),

  appliesTo: appliesTo || 'all',

  category: String(category || '').trim(),

  productId: appliesTo === 'product' ? productId || null : null,

  comboProductIds:
    appliesTo === 'combo' && Array.isArray(comboProductIds)
      ? comboProductIds
      : [],

  startDate: startDate ? new Date(startDate) : null,

  endDate: endDate ? new Date(endDate) : null,

  isActive: typeof isActive === 'boolean' ? isActive : true,

  notifyUsers: typeof notifyUsers === 'boolean' ? notifyUsers : true,
  icon: String(icon || 'pricetag-outline'),
};
};

const validateOffer = (payload) => {
  if (!payload.title || payload.title.length < 3) {
    return 'Offer title must be at least 3 characters';
  }

  if (!payload.discountValue || payload.discountValue <= 0) {
    return 'Enter valid discount value';
  }
  if (payload.minimumOrderAmount < 0) {
  return 'Minimum order amount is invalid';
}

if (payload.usageLimit < 0) {
  return 'Usage limit is invalid';
}

if (payload.perUserLimit < 1) {
  return 'Per user limit is invalid';
}

  if (
    payload.discountType === 'percentage' &&
    payload.discountValue > 90
  ) {
    return 'Percentage discount cannot exceed 90%';
  }

  if (!['percentage', 'flat'].includes(payload.discountType)) {
    return 'Invalid discount type';
  }

  if (!['all', 'category', 'product','combo'].includes(payload.appliesTo)) {
    return 'Invalid offer scope';
  }

  if (payload.appliesTo === 'category' && !payload.category) {
    return 'Category is required';
  }

  if (payload.appliesTo === 'product' && !payload.productId) {
    return 'Product is required';
  }
  if (payload.appliesTo === 'combo' && (!payload.comboProductIds || payload.comboProductIds.length < 2)) {
  return 'Select at least 2 products for combo offer';
}

  if (!payload.startDate || Number.isNaN(payload.startDate.getTime())) {
    return 'Start date is required';
  }

  if (!payload.endDate || Number.isNaN(payload.endDate.getTime())) {
    return 'End date is required';
  }

  if (payload.endDate <= payload.startDate) {
    return 'End date must be after start date';
  }

  return '';
};

const sendOfferToUsers = async (offer) => {
  const users = await User.find({ role: 'user' }).select('_id');

  if (!users.length) return 0;

  const discountText =
    offer.discountType === 'percentage'
      ? `${offer.discountValue}% OFF`
      : `₹${offer.discountValue} OFF`;

await Promise.all(
  users.map(async (user) => {
    await createNotification({
      userId: user._id,
      title: 'New Offer Launched',
      message: `${discountText} ${offer.title}${offer.code ? ` · Use code ${offer.code}` : ''}`,
      type: 'offer',
      data: {
        offerId: offer._id,
        code: offer.code,
        sentByAdmin: true,
      },
    });

    const fullUser = await User.findById(user._id).select(
      'expoPushToken'
    );

    if (fullUser?.expoPushToken) {
      await sendPushNotification({
        expoPushToken: fullUser.expoPushToken,
        title: 'New Offer Launched',
        body: `${discountText} ${offer.title}${offer.code ? ` · Use code ${offer.code}` : ''}`,
        data: {
          type: 'offer',
        },
      });
    }
  })
);

  await AdminSentNotification.create({
    title: 'New Offer Launched',
    message: `${discountText} ${offer.title}`,
    type: 'offer',
    target: 'all',
    sentCount: users.length,
  });

  const totalSaved = await AdminSentNotification.countDocuments();

  if (totalSaved > 10) {
    const oldItems = await AdminSentNotification.find()
      .sort({ createdAt: 1 })
      .limit(totalSaved - 10)
      .select('_id');

    await AdminSentNotification.deleteMany({
      _id: { $in: oldItems.map((item) => item._id) },
    });
  }

  return users.length;
};

export const createOffer = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access only',
      });
    }

    const payload = cleanOfferPayload(req.body);
    const validationError = validateOffer(payload);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const offer = await Offer.create(payload);

    await createAdminNotification({
      title: 'New Offer Created',
      message: `${offer.title} offer was created.`,
      type: 'offer',
      data: {
        offerId: offer._id,
        code: offer.code,
      },
    });

    let sentCount = 0;

    if (offer.isActive && offer.notifyUsers) {
      sentCount = await sendOfferToUsers(offer);
    }

    return res.status(201).json({
      success: true,
      message:
        sentCount > 0
          ? `Offer created and sent to ${sentCount} users`
          : 'Offer created successfully',
      offer,
      sentCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create offer',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const getAdminOffers = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access only',
      });
    }

    const offers = await Offer.find()
      .populate('productId', 'name price image stock')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      offers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const getActiveOffers = async (req, res) => {
  try {
    const now = new Date();

    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('productId', 'name price image stock')
    .populate('comboProductIds', 'name price image stock')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      offers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active offers',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const updateOffer = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access only',
      });
    }

    const payload = cleanOfferPayload(req.body);
    const validationError = validateOffer(payload);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    await createAdminNotification({
      title: 'Offer Updated',
      message: `${offer.title} offer was updated.`,
      type: 'offer',
      data: {
        offerId: offer._id,
        code: offer.code,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      offer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update offer',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const toggleOfferStatus = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access only',
      });
    }

    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    await createAdminNotification({
      title: offer.isActive ? 'Offer Activated' : 'Offer Paused',
      message: `${offer.title} is now ${offer.isActive ? 'active' : 'paused'}.`,
      type: 'offer',
      data: {
        offerId: offer._id,
        code: offer.code,
      },
    });

    return res.status(200).json({
      success: true,
      message: offer.isActive ? 'Offer activated' : 'Offer paused',
      offer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update offer status',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access only',
      });
    }

    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    await createAdminNotification({
      title: 'Offer Deleted',
      message: `${offer.title} offer was deleted.`,
      type: 'offer',
      data: {
        offerId: offer._id,
        code: offer.code,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Offer deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete offer',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const validateOfferCoupon = async (req, res) => {
  try {
    const { code, items = [], userId } = req.body;

    if (!code?.trim()) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const offer = await Offer.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    const now = new Date();

    if (now < new Date(offer.startDate)) {
      return res.status(400).json({ success: false, message: 'Offer has not started yet' });
    }

    if (now > new Date(offer.endDate)) {
      return res.status(400).json({ success: false, message: 'Offer expired' });
    }
    if (
  offer.usageLimit > 0 &&
  offer.usedCount >= offer.usageLimit
) {
  return res.status(400).json({
    success: false,
    message: 'Coupon usage limit reached',
  });
}

    let eligibleSubtotal = 0;
    let cartSubtotal = 0;

    for (const item of items) {
      const lineTotal = Number(item.price || 0) * Number(item.qty || 0);
      cartSubtotal += lineTotal;

      if (offer.appliesTo === 'all') {
        eligibleSubtotal += lineTotal;
      }

      if (
        offer.appliesTo === 'product' &&
        String(item.productId || item.id) === String(offer.productId)
      ) {
        eligibleSubtotal += lineTotal;
      }

      if (
        offer.appliesTo === 'category' &&
        String(item.tag || '').toLowerCase() === String(offer.category || '').toLowerCase()
      ) {
        eligibleSubtotal += lineTotal;
      }
      if (
  offer.appliesTo === 'combo' &&
  (offer.comboProductIds || []).some(
    (id) => String(id) === String(item.productId || item.id)
  )
) {
  eligibleSubtotal += lineTotal;
}
    }

    if (eligibleSubtotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This coupon is not applicable to selected products',
      });
    }

    if (cartSubtotal < offer.minimumOrderAmount) {
  return res.status(400).json({
    success: false,
    message: `Minimum order should be ₹${offer.minimumOrderAmount}`,
  });
}
if (offer.appliesTo === 'combo') {
  const cartProductIds = items.map((item) =>
    String(item.productId || item.id)
  );

  const requiredIds = (offer.comboProductIds || []).map((id) =>
    String(id)
  );

  const hasAllComboProducts = requiredIds.every((id) =>
    cartProductIds.includes(id)
  );

  if (!hasAllComboProducts) {
    return res.status(400).json({
      success: false,
      message: 'Add all combo products to use this coupon',
    });
  }
}
    let discount =
      offer.discountType === 'percentage'
        ? (eligibleSubtotal * offer.discountValue) / 100
        : offer.discountValue;

    discount = Math.min(discount, eligibleSubtotal);
    discount = Math.round(discount);
    const existingUserUsage = offer.usedByUsers.find(
  (u) => String(u.userId) === String(userId)
);

if (
  existingUserUsage &&
  existingUserUsage.count >= offer.perUserLimit
) {
  return res.status(400).json({
    success: false,
    message: 'You already used this coupon maximum times',
  });
}

    const shipping = cartSubtotal >= 500 ? 0 : 50;
    const finalTotal = Math.max(cartSubtotal + shipping - discount, 0);

   return res.status(200).json({
  success: true,
  message: 'Coupon applied successfully',

  offer: {
    _id: offer._id,

    title: offer.title,

    code: offer.code,

    discountType: offer.discountType,

    discountValue: offer.discountValue,

    minimumOrderAmount: offer.minimumOrderAmount,

    usageLimit: offer.usageLimit,

    perUserLimit: offer.perUserLimit,

    appliesTo: offer.appliesTo,
  },

  eligibleSubtotal,

  discount,

  finalTotal,
});
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to validate coupon',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};