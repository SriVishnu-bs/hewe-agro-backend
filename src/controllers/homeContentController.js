import HomeContent from '../models/HomeContent.js';
import cloudinary from '../config/cloudinary.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Offer from '../models/Offer.js';


const MAX_ACTIVE_BANNERS = 5;

const countActiveBanners = async (excludeId = null) => {
  const filter = {
    type: 'banner',
    isActive: true,
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return HomeContent.countDocuments(filter);
};
const normalizeType = (type) => {
  const allowed = ['banner', 'offer', 'promo', 'trust'];
  return allowed.includes(type) ? type : 'banner';
};
const validateHomeContentLink = async (
  linkType,
  linkValue
) => {
  if (
    !linkType ||
    linkType === 'none' ||
    !linkValue
  ) {
    return true;
  }

  if (linkType === 'product') {
    const exists = await Product.findById(linkValue);

    if (!exists) {
      throw new Error('Invalid product selected');
    }
  }

  if (linkType === 'category') {
    const exists = await Category.findOne({
      name: linkValue,
      isActive: true,
    });

    if (!exists) {
      throw new Error('Invalid category selected');
    }
  }

  if (linkType === 'offer') {
    const exists = await Offer.findById(linkValue);

    if (!exists) {
      throw new Error('Invalid offer selected');
    }
  }

  return true;
};
export const getActiveHomeContent = async (req, res) => {
  try {
    const { type } = req.query;

    const filter = {
      isActive: true,
    };

    if (type) {
      filter.type = normalizeType(type);
    }

    const items = await HomeContent.find(filter).sort({ sortOrder: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch home content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getAdminHomeContent = async (req, res) => {
  try {
    const { type } = req.query;

    const filter = {};

    if (type) {
      filter.type = normalizeType(type);
    }

    const items = await HomeContent.find(filter).sort({ sortOrder: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin home content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const uploadHomeContentImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded',
      });
    }

    return res.status(200).json({
      success: true,
      image: req.file.path,
      publicId: req.file.filename,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Image upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const deleteUploadedHomeContentImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required',
      });
    }

    await cloudinary.uploader.destroy(publicId);

    return res.status(200).json({
      success: true,
      message: 'Uploaded image deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete uploaded image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const createHomeContent = async (req, res) => {
  try {
    const payload = {
      type: normalizeType(req.body.type),
      title: req.body.title || '',
      subtitle: req.body.subtitle || '',
      image: req.body.image || '',
      imagePublicId: req.body.imagePublicId || '',
      icon: req.body.icon || '',
      color: req.body.color || '',
      couponCode: req.body.couponCode || '',
      linkType: req.body.linkType || 'none',
      linkValue: req.body.linkValue || '',
      isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
      sortOrder: Number(req.body.sortOrder || 0),
    };

    if (payload.type === 'banner' && !payload.image) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required',
      });
    }
if (payload.type === 'banner' && payload.isActive) {
  const activeBannerCount = await countActiveBanners();

  if (activeBannerCount >= MAX_ACTIVE_BANNERS) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 5 active hero banners allowed',
    });
  }
}
await validateHomeContentLink(
  payload.linkType,
  payload.linkValue
);
    const item = await HomeContent.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Home content created successfully',
      item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create home content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const updateHomeContent = async (req, res) => {
  try {
    await validateHomeContentLink(
  req.body.linkType,
  req.body.linkValue
);
    const existing = await HomeContent.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Home content not found',
      });
    }

    const oldPublicId = existing.imagePublicId;
    const newPublicId = req.body.imagePublicId;

    existing.type = req.body.type ? normalizeType(req.body.type) : existing.type;
    existing.title = req.body.title ?? existing.title;
    existing.subtitle = req.body.subtitle ?? existing.subtitle;
    existing.image = req.body.image ?? existing.image;
    existing.imagePublicId = req.body.imagePublicId ?? existing.imagePublicId;
    existing.icon = req.body.icon ?? existing.icon;
    existing.color = req.body.color ?? existing.color;
    existing.couponCode = req.body.couponCode ?? existing.couponCode;
    existing.linkType = req.body.linkType ?? existing.linkType;
    existing.linkValue = req.body.linkValue ?? existing.linkValue;

    if (req.body.isActive !== undefined) {
      existing.isActive = !!req.body.isActive;
    }

    if (req.body.sortOrder !== undefined) {
      existing.sortOrder = Number(req.body.sortOrder || 0);
    }

    if (existing.type === 'banner' && !existing.image) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required',
      });
    }
if (existing.type === 'banner' && existing.isActive) {
  const activeBannerCount = await countActiveBanners(existing._id);

  if (activeBannerCount >= MAX_ACTIVE_BANNERS) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 5 active hero banners allowed',
    });
  }
}
    await existing.save();

    if (oldPublicId && newPublicId && oldPublicId !== newPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (error) {
      
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Home content updated successfully',
      item: existing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update home content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const toggleHomeContentStatus = async (req, res) => {
  try {
    const item = await HomeContent.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Home content not found',
      });
    }
if (item.type === 'banner' && !item.isActive) {
  const activeBannerCount = await countActiveBanners(item._id);

  if (activeBannerCount >= MAX_ACTIVE_BANNERS) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 5 active hero banners allowed',
    });
  }
}
    item.isActive = !item.isActive;
    await item.save();

    return res.status(200).json({
      success: true,
      message: item.isActive ? 'Home content activated' : 'Home content disabled',
      item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle home content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const reorderHomeContent = async (req, res) => {
  try {
    const { type, orderedIds } = req.body;

    if (!type || !Array.isArray(orderedIds)) {
      return res.status(400).json({
        success: false,
        message: 'Type and orderedIds are required',
      });
    }

    const safeType = normalizeType(type);

    await Promise.all(
      orderedIds.map((id, index) =>
        HomeContent.findOneAndUpdate(
          { _id: id, type: safeType },
          { sortOrder: index + 1 }
        )
      )
    );

    return res.status(200).json({
      success: true,
      message: 'Home content reordered successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder home content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const deleteHomeContent = async (req, res) => {
  try {
    const item = await HomeContent.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Home content not found',
      });
    }

    if (item.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(item.imagePublicId);
      } catch (error) {
      
      }
    }

    await HomeContent.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Home content deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete home content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
